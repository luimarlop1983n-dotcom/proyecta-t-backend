import os, tempfile, unittest, json
from datetime import datetime, timedelta, timezone
from pathlib import Path

_tmp = tempfile.TemporaryDirectory()
os.environ['DATABASE_URL'] = 'sqlite:///' + str(Path(_tmp.name)/'test.db')
os.environ['ADMIN_TOKEN'] = 'test-only'
from app import main as m
from app.freshness import state
from fastapi.testclient import TestClient
from sqlalchemy import select
client = TestClient(m.app)
NOW = datetime(2026,9,17,12,tzinfo=timezone.utc)

class CatalogTests(unittest.TestCase):
    def test_freshness_boundaries(self):
        def ev(days): return {'verified':True,'evidence':'Employer accepts applications','last_activity_at':(NOW-timedelta(days=days)).isoformat()}
        self.assertEqual(state('open','',ev(30),NOW),'verified')
        self.assertEqual(state('open','',ev(30.001),NOW),'stale')
        self.assertEqual(state('open','',{'verified':True},NOW),'stale')
        self.assertEqual(state('open','',ev(-1),NOW),'stale')
        self.assertEqual(state('closed','',ev(0),NOW),'closed')
        self.assertEqual(state('open','2026-09-16',ev(0),NOW),'closed')
        self.assertEqual(state('open','2026-09-17',ev(0),NOW),'verified')
        self.assertEqual(state('open','2026-09-17',ev(0),NOW.replace(hour=22)),'closed')
        self.assertEqual(state('open','',dict(ev(0),verified=False),NOW),'unverified')

    def test_additive_release_preserves_users_and_ids(self):
        with m.SessionLocal() as db:
            o=db.scalar(select(m.Opportunity)); oid=o.id
            db.add(m.User(email='keep@example.org',password_hash='keep',salt='00',name='Keep'))
            db.flush();u=db.scalar(select(m.User).where(m.User.email=='keep@example.org'))
            db.add(m.Favorite(user_id=u.id,opportunity_id=oid));db.commit()
            old=m.evidence_for(o,db)
        m.import_catalog()
        with m.SessionLocal() as db:
            self.assertEqual(db.scalar(select(m.User).where(m.User.email=='keep@example.org')).name,'Keep')
            self.assertEqual(db.scalar(select(m.Favorite)).opportunity_id,oid)
            self.assertEqual(m.evidence_for(db.get(m.Opportunity,oid),db),old)

    def test_catalog_and_training(self):
        public=client.get('/api/catalog').json()
        self.assertTrue(public)
        self.assertTrue(all(x['status']=='verified' and x['source'] and x['last_activity_at'] for x in public))
        all_rows=client.get('/api/catalog?include_inactive=true').json()
        self.assertGreater(len(all_rows),len(public))
        self.assertTrue(any(x['status']=='closed' for x in all_rows))
        self.assertTrue(any(x['status']=='stale' for x in all_rows))
        self.assertEqual(len(client.get('/api/categories').json()),30)
        self.assertTrue(client.get('/api/training?category=Tatuaje&mode=Online').json())
        self.assertTrue(all('Tatuaje' in x['categories'] for x in client.get('/api/training?category=Tatuaje').json()))

    def test_routes_and_cors(self):
        for path in ['/','/radar.html','/radar/','/cuenta/index.html','/estudios.html','/training.js','/api-config.js','/api/health']:
            self.assertEqual(client.get(path).status_code,200,path)
        self.assertEqual(client.get('/api/catalog').headers['cache-control'],'no-store')
        r=client.options('/api/login',headers={'Origin':'https://localhost','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'})
        self.assertEqual(r.status_code,200)
        self.assertIn(r.headers['access-control-allow-origin'],['*','https://localhost'])
        self.assertEqual(client.post('/api/admin/seed').status_code,403)

    def test_authenticated_shared_catalog_and_closed_guard(self):
        r=client.post('/api/signup',json={'email':'test@example.org','password':'test-password','name':'Test'})
        self.assertEqual(r.status_code,200,r.text)
        h={'Authorization':'Bearer '+r.json()['token']}
        rows=client.get('/api/opportunities?include_inactive=true',headers=h).json()
        public=client.get('/api/catalog?include_inactive=true').json()
        self.assertEqual({o['id'] for o in rows},{o['id'] for o in public})
        closed=next(o for o in rows if o['status']=='closed')
        self.assertEqual(client.post('/api/applications/'+str(closed['id']),headers=h).status_code,400)
        self.assertEqual(client.post('/api/dossier',json={'opportunity_id':99999999,'project_focus':'test'},headers=h).status_code,404)
        self.assertEqual(client.get('/api/opportunities').status_code,401)

    def test_reimport_cannot_refresh_or_reopen(self):
        with m.SessionLocal() as db:
            raw=m.verified_seed()[0];o=db.scalar(select(m.Opportunity).where(m.Opportunity.external_key==raw.external_key));o.status='closed';before=m.evidence_for(o,db)
            m.upsert(db,raw);db.commit()
            self.assertEqual(o.status,'closed');self.assertEqual(m.evidence_for(o,db),before)

if __name__=='__main__': unittest.main()
