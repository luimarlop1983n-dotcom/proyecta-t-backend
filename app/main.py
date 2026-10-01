
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, ForeignKey, UniqueConstraint, select, delete
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pathlib import Path
from typing import Optional
from datetime import date
import os, secrets, hashlib, json, csv, io
from datetime import datetime, timezone
from .freshness import state as freshness_state

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
class OpportunityEvidence(Base):
    __tablename__ = "opportunity_evidence"
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), primary_key=True)
    payload = Column(Text, nullable=False, default="{}")

class CatalogRelease(Base):
    __tablename__ = "catalog_releases"
    version = Column(String(100), primary_key=True)

Base.metadata.create_all(engine)
CATEGORIES = json.loads((ROOT/"app/data/categories.json").read_text())

def evidence_for(o, db):
    record = db.get(OpportunityEvidence, o.id)
    return json.loads(record.payload) if record else {}

def availability(o, db):
    return freshness_state(o.status, o.deadline, evidence_for(o, db))

def serialize(o, db):
    evidence = evidence_for(o, db)
    current = freshness_state(o.status, o.deadline, evidence)
    return {**{k:getattr(o,k) for k in ("id","title","org","type","location","deadline","amount","summary","source","source_name","tags")},
            "status": current, "verified": current == "verified", "categories": evidence.get("categories", []),
            "last_activity_at": evidence.get("last_activity_at"), "last_checked_at": evidence.get("last_checked_at"),
            "evidence": evidence.get("evidence", "Sin comprobación documentada"),
            "legacy": evidence.get("legacy"), "eligibility_notes": o.eligibility_notes}


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
    if not os.getenv("ADMIN_TOKEN") or not x_admin_token or not secrets.compare_digest(x_admin_token, os.environ["ADMIN_TOKEN"]): raise HTTPException(403,"Admin no autorizado")
    return True

def upsert(db,raw):
    o=db.scalar(select(Opportunity).where(Opportunity.external_key==raw.external_key))
    if not o: o=Opportunity(external_key=raw.external_key); db.add(o)
    for k in ["title","org","type","location","deadline","amount","summary","source","verified","tags","min_age","max_age","source_name","source_kind"]:
        setattr(o,k,getattr(raw,k))
    o.eligibility_notes="\n".join(raw.eligibility_notes)
    # Discovery is not proof of activity; never reopen a closed record on import.
    if not o.status: o.status="open"
    return o

def eligibility(o,u,db):
    reasons=[]; unknown=[]
    current = availability(o, db)
    if current == "closed": reasons.append("Convocatoria cerrada")
    elif current in ("stale", "unverified"): unknown.append("Actividad de la oferta sin verificar")
    if o.eligibility_notes: unknown.append(o.eligibility_notes)
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

app=FastAPI(title="PROYECTA+ API",version="0.5.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static",StaticFiles(directory=ROOT/"app"/"static"),name="static")

class Signup(BaseModel): email:EmailStr; password:str; name:str=""
class Login(BaseModel): email:EmailStr; password:str
class Profile(BaseModel): name:str=""; discipline:str=""; location:str=""; interests:str=""; birth_year:Optional[int]=None
class DossierReq(BaseModel): opportunity_id:int; project_focus:str

@app.get("/")
def home(): return FileResponse(ROOT/"dist"/"index.html")
@app.post("/api/signup")
def signup(d:Signup,db:Session=Depends(dbdep)):
    if not 8 <= len(d.password) <= 1024: raise HTTPException(400,"Contraseña mínima 8 caracteres")
    if db.scalar(select(User).where(User.email==d.email.lower())): raise HTTPException(409,"Email registrado")
    salt=secrets.token_hex(16); u=User(email=d.email.lower(),password_hash=hashpw(d.password,salt),salt=salt,name=d.name)
    db.add(u); db.flush(); tok=secrets.token_urlsafe(32); db.add(SessionToken(token=tok,user_id=u.id)); db.commit(); return {"token":tok}
@app.post("/api/login")
def login(d:Login,db:Session=Depends(dbdep)):
    u=db.scalar(select(User).where(User.email==d.email.lower()))
    if not u or hashpw(d.password,u.salt)!=u.password_hash: raise HTTPException(401,"Credenciales incorrectas")
    tok=secrets.token_urlsafe(32); db.add(SessionToken(token=tok,user_id=u.id)); db.commit(); return {"token":tok}
from .password_reset import install as install_recovery
PasswordReset, RecoveryLimit = install_recovery(app, Base, engine, SessionLocal, dbdep, User, SessionToken, hashpw)

@app.get("/api/me")
def me(u:User=Depends(current_user)): return {"id":u.id,"email":u.email,"name":u.name,"discipline":u.discipline,"location":u.location,"interests":u.interests,"birth_year":u.birth_year,"plan":u.plan}
@app.put("/api/me")
def update_me(d:Profile,u:User=Depends(current_user),db:Session=Depends(dbdep)):
    for k,v in d.model_dump().items(): setattr(u,k,v)
    db.commit(); return {"ok":True}
@app.get("/api/categories")
def categories(): return CATEGORIES

@app.get("/api/catalog")
def public_catalog(include_inactive:bool=False, category:str="", db:Session=Depends(dbdep)):
    rows = [serialize(o,db) for o in db.scalars(select(Opportunity).where(Opportunity.source_kind=="opportunity")).all()]
    return [o for o in rows if (include_inactive or o["status"] == "verified") and (not category or category in o["categories"])]

@app.get("/api/catalog.csv")
def catalog_csv(db:Session=Depends(dbdep)):
    output=io.StringIO()
    writer=csv.writer(output)
    writer.writerow(["Título","Organización","Estado","Plazo","Fuente","Última comprobación"])
    for o in public_catalog(include_inactive=True, db=db):
        # Prevent formula execution when a downloaded CSV is opened in a spreadsheet.
        values=[o[k] or "" for k in ("title","org","status","deadline","source","last_checked_at")]
        writer.writerow(["'"+str(v) if str(v).startswith(("=","+","-","@")) else v for v in values])
    return Response(output.getvalue(),media_type="text/csv; charset=utf-8",headers={"Content-Disposition":"attachment; filename=proyecta-t-catalogo.csv"})

@app.get("/api/training")
def training(category:str="", region:str="", mode:str="", credential:str="", provider:str=""):
    rows=json.loads((ROOT/"app/data/training.json").read_text())
    for row in rows:
        row["status"] = freshness_state("open", "", row)
    return [r for r in rows if (not category or category in r["categories"]) and (not region or region == r["region"]) and (not mode or mode in r["modes"]) and (not credential or credential == r.get("credential_type")) and (not provider or provider == r.get("provider_type"))]

@app.get("/api/opportunities")
def list_opportunities(include_inactive:bool=False,u:User=Depends(current_user),db:Session=Depends(dbdep)):
    out=[]
    for o in db.scalars(select(Opportunity).where(Opportunity.source_kind=="opportunity")).all():
        row=serialize(o,db)
        if not include_inactive and row["status"] in ("closed", "stale"): continue
        e=eligibility(o,u,db)
        out.append({**row,"match":score(o,u,e),"eligibility":e})
    return sorted(out,key=lambda x:(x["verified"],x["match"]),reverse=True)
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
    e=eligibility(o,u,db)
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
    o=db.get(Opportunity,d.opportunity_id)
    if not o: raise HTTPException(404,"No encontrada")
    e=eligibility(o,u,db)
    if not e["eligible"] or not e["complete"]: raise HTTPException(400,"Elegibilidad no confirmada")
    return {"bio":f"{u.name or 'Profesional creativo/a'} desarrolla su trabajo en {u.discipline or 'el ámbito cultural'}, con intereses en {u.interests or 'creación contemporánea'}.",
            "motivation":f"Presento esta propuesta a «{o.title}» por su encaje con mi trayectoria y con el proyecto: {d.project_focus}. Revisar siempre contra las bases oficiales.",
            "checklist":["Leer bases","Confirmar requisitos","Adaptar CV","Preparar memoria","Revisar y enviar"]}
@app.post("/api/admin/seed")
def seed(_:bool=Depends(admin),db:Session=Depends(dbdep)):
    rows=[dataset_descriptor()]
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
def health(): return {"ok":True,"version":"0.5.0"}


def import_catalog():
    """Additive release, executed once. Old IDs, favorites and applications survive."""
    with SessionLocal() as db:
        # PostgreSQL serializes rolling deployments before checking the release marker.
        if engine.dialect.name == "postgresql":
            from sqlalchemy import text
            db.execute(text("SELECT pg_advisory_xact_lock(20260917)"))
        if db.get(CatalogRelease, "2026-09-17-v1"): return
        rows=json.loads((ROOT/"app/data/catalog.json").read_text())
        for row in rows:
            o=db.scalar(select(Opportunity).where(Opportunity.external_key==row["external_key"]))
            if not o:
                o=Opportunity(external_key=row["external_key"])
                db.add(o)
            for k in ("title","org","type","location","deadline","amount","summary","source","source_name","tags","status","min_age","max_age","eligibility_notes"):
                if k in row: setattr(o,k,row[k])
            o.source_kind="opportunity"
            o.verified=bool(row.get("verified"))
            db.flush()
            ev=db.get(OpportunityEvidence,o.id)
            if not ev: ev=OpportunityEvidence(opportunity_id=o.id); db.add(ev)
            ev.payload=json.dumps({k:row.get(k) for k in ("categories","last_activity_at","last_checked_at","verified","evidence","legacy")},ensure_ascii=False)
        db.add(CatalogRelease(version="2026-09-17-v1"))
        db.commit()

import_catalog()

@app.middleware("http")
async def live_cache_policy(request, call_next):
    response=await call_next(request)
    if request.url.path.startswith("/api/") or request.url.path.endswith((".html", ".js")) or request.url.path == "/":
        response.headers["Cache-Control"]="no-store"
    return response

@app.get("/downloads/Proyecta-T-1.2.1.apk")
def download_android():
    return FileResponse(ROOT/"releases/Proyecta-T-1.2.1.apk", media_type="application/vnd.android.package-archive", filename="Proyecta-T-1.2.1.apk", headers={"X-Content-Type-Options":"nosniff"})

# Keep API routes before the shared website mount; HTML directory aliases work on Android too.
app.mount("/", StaticFiles(directory=ROOT/"dist", html=True), name="web")
