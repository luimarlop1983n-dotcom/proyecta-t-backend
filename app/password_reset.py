"""Password recovery with hashed, expiring, single-use tokens and durable limits."""
import os, time, hashlib, secrets, ssl, smtplib, logging
from email.message import EmailMessage
from urllib.parse import urlsplit
from fastapi import HTTPException, Depends, BackgroundTasks, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Column, String, Integer, ForeignKey, select, delete, update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as pg_insert

class RecoveryRequest(BaseModel):
    email: EmailStr

class RecoveryConfirm(BaseModel):
    token: str = Field(min_length=32, max_length=200)
    password: str = Field(min_length=8, max_length=1024)

MESSAGE = 'Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña. Revisa también spam.'

def mail_config():
    origin = os.getenv('PUBLIC_APP_URL', '').rstrip('/')
    parsed = urlsplit(origin)
    if not all(os.getenv(k) for k in ('SMTP_HOST','SMTP_USER','SMTP_PASSWORD','SMTP_FROM')) or parsed.scheme != 'https' or not parsed.netloc or parsed.username or parsed.query or parsed.fragment:
        raise HTTPException(503, 'La recuperación por correo aún no está disponible. Inténtalo más tarde.')
    return origin

def send_email(recipient, subject, body):
    message = EmailMessage()
    message['From'] = os.environ['SMTP_FROM']; message['To'] = recipient; message['Subject'] = subject
    message.set_content(body)
    port = int(os.getenv('SMTP_PORT', '587'))
    context = ssl.create_default_context()
    client = smtplib.SMTP_SSL(os.environ['SMTP_HOST'], port, timeout=15, context=context) if port == 465 else smtplib.SMTP(os.environ['SMTP_HOST'], port, timeout=15)
    with client as smtp:
        if port != 465: smtp.starttls(context=context)
        smtp.login(os.environ['SMTP_USER'], os.environ['SMTP_PASSWORD'])
        smtp.send_message(message)

def install(app, Base, engine, SessionLocal, dbdep, User, SessionToken, hashpw):
    class Reset(Base):
        __tablename__ = 'password_resets'
        digest = Column(String(64), primary_key=True)
        user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
        expires = Column(Integer, nullable=False)
    class Limit(Base):
        __tablename__ = 'recovery_limits'
        key = Column(String(100), primary_key=True)
        bucket = Column(Integer, primary_key=True)
        count = Column(Integer, nullable=False, default=0)
    Base.metadata.create_all(engine)

    def rate(db, scope, identity, maximum):
        bucket = int(time.time()) // 3600
        key = scope + ':' + hashlib.sha256(identity.encode()).hexdigest()
        insert = pg_insert if engine.dialect.name == 'postgresql' else sqlite_insert
        db.execute(insert(Limit).values(key=key, bucket=bucket, count=0).on_conflict_do_nothing())
        result = db.execute(update(Limit).where(Limit.key==key, Limit.bucket==bucket, Limit.count<maximum).values(count=Limit.count+1))
        db.execute(delete(Limit).where(Limit.bucket < bucket-1))
        db.commit()
        return result.rowcount == 1

    def deliver(email, origin):
        # Run equally for known and unknown addresses after the generic response.
        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.email==email))
            if not user: return
            raw = secrets.token_urlsafe(32); digest = hashlib.sha256(raw.encode()).hexdigest()
            db.execute(delete(Reset).where(Reset.expires < int(time.time())))
            db.add(Reset(digest=digest, user_id=user.id, expires=int(time.time())+1800)); db.commit()
            try:
                send_email(email, 'Cambia tu contraseña · Proyecta-T', 'Abre este enlace para elegir una contraseña nueva (caduca en 30 minutos):\n\n'+origin+'/cuenta/recuperar.html#reset='+raw+'\n\nSi no lo has solicitado, ignora este mensaje. Tu contraseña no ha cambiado.')
            except Exception:
                db.execute(delete(Reset).where(Reset.digest==digest)); db.commit()
                logging.getLogger(__name__).error('Recovery email delivery failed; reset token revoked')

    @app.post('/api/password/forgot', status_code=202)
    def forgot(data: RecoveryRequest, request: Request, tasks: BackgroundTasks, db=Depends(dbdep)):
        origin = mail_config()
        email = str(data.email).lower()
        if not rate(db, 'request', request.client.host if request.client else 'unknown', 30):
            raise HTTPException(429, 'Demasiados intentos. Prueba más tarde.')
        if rate(db, 'email', email, 3): tasks.add_task(deliver, email, origin)
        return {'message': MESSAGE}

    @app.post('/api/password/reset')
    def reset(data: RecoveryConfirm, request: Request, db=Depends(dbdep)):
        if not rate(db, 'confirm', request.client.host if request.client else 'unknown', 30):
            raise HTTPException(429, 'Demasiados intentos. Prueba más tarde.')
        digest = hashlib.sha256(data.token.encode()).hexdigest()
        record = db.scalar(select(Reset).where(Reset.digest==digest, Reset.expires>int(time.time())))
        if not record: raise HTTPException(400, 'El enlace ha caducado o ya se ha utilizado. Solicita uno nuevo.')
        # One transactional winner, even if two requests present the same token.
        user_id = record.user_id
        consumed = db.execute(delete(Reset).where(Reset.digest==digest, Reset.expires>int(time.time())))
        if consumed.rowcount != 1:
            db.rollback(); raise HTTPException(400, 'El enlace ya se ha utilizado. Solicita uno nuevo.')
        user = db.get(User, user_id)
        salt = secrets.token_hex(16); user.salt=salt; user.password_hash=hashpw(data.password,salt)
        db.execute(delete(SessionToken).where(SessionToken.user_id==user_id))
        db.execute(delete(Reset).where(Reset.user_id==user_id))
        db.commit()
        return {'message':'Contraseña actualizada. Entra con tu nueva contraseña.'}
    return Reset, Limit
