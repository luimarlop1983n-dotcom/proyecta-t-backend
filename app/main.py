
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, ForeignKey, UniqueConstraint, select, delete
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pathlib import Path
from typing import Optional
from datetime import date
import os, secrets, hashlib

from .sources.manual import verified_seed
from .sources.cultura import fetch_index as cultura_fetch
from .sources.boe import fetch_recent as boe_fetch
from .sources.gva_history import dataset_descriptor

ROOT=Path(__file__).resolve().parent.parent
DATABASE_URL=os.getenv("DATABASE_URL","sqlite:///./proyecta.db")
if DATABASE_URL.startswith("postgres://"): DATABASE_URL=DATABASE_URL.replace("postgres://","postgresql+psycopg://",1)
elif DATABASE_URL.startswith("postgresql://"): DATABASE_URL=DATABASE_URL.replace("postgresql://","postgresql+psycopg://",1)
engine=create_engine(DATABASE_URL,pool_pre_ping=True,connect_args={"check_same_thread":False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal=sessionmaker(bind=engine,autoflush=False,autocommit=False)
Base=declarative_base()

class User(Base):
    __tablename__="users"; id=Column(Integer,primary_key=True); email=Column(String(320),unique=True,index=True,nullable=False)
    password_hash=Column(String(128),nullable=False); salt=Column(String(64),nullable=False); name=Column(String(160),default="")
    discipline=Column(String(200),default=""); location=Column(String(200),default=""); interests=Column(Text,default="")
    birth_year=Column(Integer,nullable=True); plan=Column(String(30),default="free")
class SessionToken(Base):
    __tablename__="sessions"; token=Column(String(200),primary_key=True); user_id=Column(Integer,ForeignKey("users.id"))
class Opportunity(Base):
    __tablename__="opportunities"; id=Column(Integer,primary_key=True); external_key=Column(String(300),unique=True,index=True,nullable=False)
    title=Column(String(500)); org=Column(String(300)); type=Column(String(80)); location=Column(String(200)); deadline=Column(String(40)); amount=Column(String(200))
    summary=Column(Text); source=Column(Text); verified=Column(Boolean,default=False); tags=Column(Text,default="")
    min_age=Column(Integer,nullable=True); max_age=Column(Integer,nullable=True); eligibility_notes=Column(Text,default="")
    status=Column(String(30),default="open"); source_name=Column(String(100),default=""); source_kind=Column(String(30),default="opportunity")
class Favorite(Base):
    __tablename__="favorites"; id=Column(Integer,primary_key=True); user_id=Column(Integer,ForeignKey("users.id")); opportunity_id=Column(Integer,ForeignKey("opportunities.id"))
    __table_args__=(UniqueConstraint("user_id","opportunity_id"),)
class Application(Base):
    __tablename__="applications"; id=Column(Integer,primary_key=True); user_id=Column(Integer,ForeignKey("users.id")); opportunity_id=Column(Integer,ForeignKey("opportunities.id"))
    status=Column(String(80),default="En preparación"); __table_args__=(UniqueConstraint("user_id","opportunity_id"),)
Base.metadata.create_all(engine)

def dbdep():
    db=SessionLocal()
    try: yield db
    finally: db.close()

def hashpw(p,s): return hashlib.pbkdf2_hmac("sha256",p.encode(),bytes.fromhex(s),150000).hex()
def current_user(authorization:Optional[str]=Header(None),db:Session=Depends(dbdep)):
    if not authorization or not authorization.startswith("Bearer "): raise HTTPException(401,"No autenticado")
    st=db.get(SessionToken,authorization.split(" ",1)[1])
    if not st: raise HTTPException(401,"Sesión inválida")
    return db.get(User,st.user_id)
def admin(x_admin_token:Optional[str]=Header(None)):
    if x_admin_token!=os.getenv("ADMIN_TOKEN",""): raise HTTPException(403,"Admin no autorizado")
    return True

def upsert(db,raw):
    o=db.scalar(select(Opportunity).where(Opportunity.external_key==raw.external_key))
    if not o: o=Opportunity(external_key=raw.external_key); db.add(o)
    for k in ["title","org","type","location","deadline","amount","summary","source","verified","tags","min_age","max_age","source_name","source_kind"]:
        setattr(o,k,getattr(raw,k))
    o.eligibility_notes="\n".join(raw.eligibility_notes); o.status="open"
    return o

def eligibility(o,u):
    reasons=[]; unknown=[]
    if o.source_kind!="opportunity": return {"eligible":False,"reasons":["No es una convocatoria abierta"],"unknown":[],"complete":True}
    if o.min_age is not None or o.max_age is not None:
        if not u.birth_year: unknown.append("Año de nacimiento")
        else:
            age=date.today().year-u.birth_year
            if o.min_age is not None and age<o.min_age: reasons.append(f"Edad mínima {o.min_age}")
            if o.max_age is not None and age>o.max_age: reasons.append(f"Edad máxima {o.max_age}")
    return {"eligible":not reasons,"reasons":reasons,"unknown":unknown,"complete":not unknown}

def score(o,u,e):
    if not e["eligible"] or o.source_kind!="opportunity": return 0
    text=(o.title+" "+o.summary+" "+o.tags+" "+o.location).lower()
    profile=(u.discipline+" "+u.location+" "+u.interests).lower()
    words={w.strip(" ,.;:/") for w in profile.split() if len(w)>3}
    hits=sum(1 for w in words if w in text)
    s=48+hits*8+(8 if o.verified else 0)-(8 if not e["complete"] else 0)
    return max(1,min(98,s))

app=FastAPI(title="PROYECTA+ API",version="0.4.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)app.mount("/static",StaticFiles(directory=ROOT/"app"/"static"),name="static")

class Signup(BaseModel): email:EmailStr; password:str; name:str=""
class Login(BaseModel): email:EmailStr; password:str
class Profile(BaseModel): name:str=""; discipline:str=""; location:str=""; interests:str=""; birth_year:Optional[int]=None
class DossierReq(BaseModel): opportunity_id:int; project_focus:str

@app.get("/")
def home(): return FileResponse(ROOT/"app"/"static"/"index.html")
@app.post("/api/signup")
def signup(d:Signup,db:Session=Depends(dbdep)):
    if len(d.password)<8: raise HTTPException(400,"Contraseña mínima 8 caracteres")
    if db.scalar(select(User).where(User.email==d.email.lower())): raise HTTPException(409,"Email registrado")
    salt=secrets.token_hex(16); u=User(email=d.email.lower(),password_hash=hashpw(d.password,salt),salt=salt,name=d.name)
    db.add(u); db.flush(); tok=secrets.token_urlsafe(32); db.add(SessionToken(token=tok,user_id=u.id)); db.commit(); return {"token":tok}
@app.post("/api/login")
def login(d:Login,db:Session=Depends(dbdep)):
    u=db.scalar(select(User).where(User.email==d.email.lower()))
    if not u or hashpw(d.password,u.salt)!=u.password_hash: raise HTTPException(401,"Credenciales incorrectas")
    tok=secrets.token_urlsafe(32); db.add(SessionToken(token=tok,user_id=u.id)); db.commit(); return {"token":tok}
@app.get("/api/me")
def me(u:User=Depends(current_user)): return {"id":u.id,"email":u.email,"name":u.name,"discipline":u.discipline,"location":u.location,"interests":u.interests,"birth_year":u.birth_year,"plan":u.plan}
@app.put("/api/me")
def update_me(d:Profile,u:User=Depends(current_user),db:Session=Depends(dbdep)):
    for k,v in d.model_dump().items(): setattr(u,k,v)
    db.commit(); return {"ok":True}
@app.get("/api/opportunities")
def list_opportunities(u:User=Depends(current_user),db:Session=Depends(dbdep)):
    out=[]
    for o in db.scalars(select(Opportunity).where(Opportunity.status=="open",Opportunity.source_kind=="opportunity")).all():
        e=eligibility(o,u)
        out.append({"id":o.id,"title":o.title,"org":o.org,"type":o.type,"location":o.location,"deadline":o.deadline,"amount":o.amount,
                    "summary":o.summary,"source":o.source,"verified":o.verified,"source_name":o.source_name,"match":score(o,u,e),"eligibility":e})
    return sorted(out,key=lambda x:(x["eligibility"]["eligible"],x["match"],x["verified"]),reverse=True)
@app.get("/api/intelligence/historical")
def historical(u:User=Depends(current_user),db:Session=Depends(dbdep)):
    return [{"id":o.id,"title":o.title,"org":o.org,"summary":o.summary,"source":o.source,"source_name":o.source_name}
            for o in db.scalars(select(Opportunity).where(Opportunity.source_kind=="historical")).all()]
@app.get("/api/favorites")
def favs(u:User=Depends(current_user),db:Session=Depends(dbdep)): return [f.opportunity_id for f in db.scalars(select(Favorite).where(Favorite.user_id==u.id)).all()]
@app.post("/api/favorites/{oid}")
def addfav(oid:int,u:User=Depends(current_user),db:Session=Depends(dbdep)):
    if not db.scalar(select(Favorite).where(Favorite.user_id==u.id,Favorite.opportunity_id==oid)): db.add(Favorite(user_id=u.id,opportunity_id=oid)); db.commit()
    return {"ok":True}
@app.delete("/api/favorites/{oid}")
def delfav(oid:int,u:User=Depends(current_user),db:Session=Depends(dbdep)):
    db.execute(delete(Favorite).where(Favorite.user_id==u.id,Favorite.opportunity_id==oid)); db.commit(); return {"ok":True}
@app.get("/api/applications")
def apps(u:User=Depends(current_user),db:Session=Depends(dbdep)):
    out=[]
    for a in db.scalars(select(Application).where(Application.user_id==u.id)).all():
        o=db.get(Opportunity,a.opportunity_id); out.append({"opportunity_id":o.id,"title":o.title,"deadline":o.deadline,"status":a.status})
    return out
@app.post("/api/applications/{oid}")
def makeapp(oid:int,u:User=Depends(current_user),db:Session=Depends(dbdep)):
    o=db.get(Opportunity,oid)
    if not o: raise HTTPException(404,"No encontrada")
    e=eligibility(o,u)
    if not e["eligible"] or not e["complete"]: raise HTTPException(400,"Elegibilidad no confirmada")
    if not db.scalar(select(Application).where(Application.user_id==u.id,Application.opportunity_id==oid)): db.add(Application(user_id=u.id,opportunity_id=oid)); db.commit()
    return {"ok":True}
@app.put("/api/applications/{oid}/sent")
def sent(oid:int,u:User=Depends(current_user),db:Session=Depends(dbdep)):
    a=db.scalar(select(Application).where(Application.user_id==u.id,Application.opportunity_id==oid))
    if not a: raise HTTPException(404,"No encontrada")
    a.status="Enviada"; db.commit(); return {"ok":True}
@app.post("/api/dossier")
def dossier(d:DossierReq,u:User=Depends(current_user),db:Session=Depends(dbdep)):
    o=db.get(Opportunity,d.opportunity_id); e=eligibility(o,u)
    if not e["eligible"] or not e["complete"]: raise HTTPException(400,"Elegibilidad no confirmada")
    return {"bio":f"{u.name or 'Profesional creativo/a'} desarrolla su trabajo en {u.discipline or 'el ámbito cultural'}, con intereses en {u.interests or 'creación contemporánea'}.",
            "motivation":f"Presento esta propuesta a «{o.title}» por su encaje con mi trayectoria y con el proyecto: {d.project_focus}. Revisar siempre contra las bases oficiales.",
            "checklist":["Leer bases","Confirmar requisitos","Adaptar CV","Preparar memoria","Revisar y enviar"]}
@app.post("/api/admin/seed")
def seed(_:bool=Depends(admin),db:Session=Depends(dbdep)):
    rows=verified_seed()+[dataset_descriptor()]
    for r in rows: upsert(db,r)
    db.commit(); return {"ok":True,"count":len(rows)}
@app.post("/api/admin/sync/cultura")
def sync_cultura(_:bool=Depends(admin),db:Session=Depends(dbdep)):
    rows=cultura_fetch()
    for r in rows: upsert(db,r)
    db.commit(); return {"ok":True,"count":len(rows)}
@app.post("/api/admin/sync/boe")
def sync_boe(_:bool=Depends(admin),db:Session=Depends(dbdep)):
    rows=boe_fetch(7)
    for r in rows: upsert(db,r)
    db.commit(); return {"ok":True,"count":len(rows)}
@app.get("/api/admin/stats")
def stats(_:bool=Depends(admin),db:Session=Depends(dbdep)):
    all_rows=list(db.scalars(select(Opportunity)).all())
    return {"total":len(all_rows),"opportunities":sum(1 for o in all_rows if o.source_kind=="opportunity"),"historical":sum(1 for o in all_rows if o.source_kind=="historical"),"verified":sum(1 for o in all_rows if o.verified)}
@app.get("/api/health")
def health(): return {"ok":True,"version":"0.4.0"}
