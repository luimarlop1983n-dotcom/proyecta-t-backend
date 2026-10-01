import unittest
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
from sqlalchemy import delete, select
from tests.test_backend import client, m

class CommunityTests(unittest.TestCase):
    def setUp(self):
        with m.SessionLocal() as db:
            db.execute(delete(m.CommunityEvent));db.execute(delete(m.CommunityTotal));db.commit()

    def test_visits_and_feedback_are_separate_and_idempotent(self):
        session=str(uuid4());visitor=str(uuid4())
        self.assertEqual(client.get('/api/community').json(),{'visits':0,'helped':0})
        for _ in range(2):self.assertEqual(client.post('/api/community/visit',json={'session_id':session}).json()['visits'],1)
        self.assertFalse(client.post('/api/community/helped',json={'visitor_id':visitor}).json()['already_counted'])
        self.assertTrue(client.post('/api/community/helped',json={'visitor_id':visitor}).json()['already_counted'])
        self.assertEqual(client.get('/api/community').json(),{'visits':1,'helped':1})
        with m.SessionLocal() as db:
            keys=list(db.scalars(select(m.CommunityEvent.key)))
            self.assertTrue(all(session not in k and visitor not in k for k in keys))
        self.assertEqual(client.post('/api/community/visit',json={'session_id':'arbitrary'}).status_code,422)

    def test_parallel_retries_increment_only_once(self):
        session=str(uuid4())
        with ThreadPoolExecutor(max_workers=5) as ex:
            responses=list(ex.map(lambda _:client.post('/api/community/visit',json={'session_id':session}),range(10)))
        self.assertTrue(all(r.status_code==200 for r in responses))
        self.assertEqual(client.get('/api/community').json()['visits'],1)
        with ThreadPoolExecutor(max_workers=5) as ex:
            responses=list(ex.map(lambda _:client.post('/api/community/visit',json={'session_id':str(uuid4())}),range(10)))
        self.assertTrue(all(r.status_code==200 for r in responses))
        self.assertEqual(client.get('/api/community').json()['visits'],11)
