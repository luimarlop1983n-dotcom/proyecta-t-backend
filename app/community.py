"""Anonymous, idempotent counters shared by web and Android."""
import hashlib, time
from uuid import UUID
from fastapi import Depends
from pydantic import BaseModel
from sqlalchemy import Column, String, BigInteger, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as pg_insert

class VisitRequest(BaseModel):
    session_id: UUID

class HelpedRequest(BaseModel):
    visitor_id: UUID

def install(app, Base, engine, dbdep):
    class Event(Base):
        __tablename__ = 'community_events'
        key = Column(String(80), primary_key=True)
        kind = Column(String(16), nullable=False)
        created_at = Column(BigInteger, nullable=False)
    class Total(Base):
        __tablename__ = 'community_totals'
        kind = Column(String(16), primary_key=True)
        value = Column(BigInteger, nullable=False, default=0)
    Base.metadata.create_all(engine)
    insert = pg_insert if engine.dialect.name == 'postgresql' else sqlite_insert

    def totals(db):
        values = dict(db.execute(select(Total.kind, Total.value)).all())
        return {'visits':values.get('visits',0), 'helped':values.get('helped',0)}

    def record(db, kind, identity):
        key = kind+':'+hashlib.sha256(str(identity).encode()).hexdigest()
        # The unique event and total change commit together: retries cannot double count.
        result = db.execute(insert(Event).values(key=key,kind=kind,created_at=int(time.time())).on_conflict_do_nothing(index_elements=['key']))
        added = result.rowcount == 1
        if added:
            db.execute(insert(Total).values(kind=kind,value=1).on_conflict_do_update(index_elements=['kind'],set_={'value':Total.value+1}))
        db.commit()
        return {**totals(db),'already_counted':not added}

    @app.get('/api/community')
    def get_counts(db=Depends(dbdep)):
        return totals(db)

    @app.post('/api/community/visit')
    def visit(data: VisitRequest, db=Depends(dbdep)):
        return record(db,'visits',data.session_id)

    @app.post('/api/community/helped')
    def helped(data: HelpedRequest, db=Depends(dbdep)):
        return record(db,'helped',data.visitor_id)

    return Event, Total
