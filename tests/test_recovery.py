import os, re, time, unittest
from unittest.mock import patch
from sqlalchemy import select, delete, update
from tests.test_backend import client, m

class RecoveryTests(unittest.TestCase):
    def setUp(self):
        with m.SessionLocal() as db:
            db.execute(delete(m.PasswordReset)); db.execute(delete(m.RecoveryLimit)); db.commit()
        self.env=patch.dict(os.environ,{'SMTP_HOST':'smtp.example.org','SMTP_USER':'test','SMTP_PASSWORD':'test','SMTP_FROM':'test@example.org','PUBLIC_APP_URL':'https://app.example.org'})
        self.env.start();self.addCleanup(self.env.stop)

    def account(self):
        email='reset-'+str(time.time_ns())+'@example.org'
        result=client.post('/api/signup',json={'email':email,'password':'old-password'})
        self.assertEqual(result.status_code,200)
        return email,result.json()['token']

    def test_recovery_single_use_replaces_password_and_revokes_sessions(self):
        email,session=self.account()
        with patch('app.password_reset.send_email') as send:
            result=client.post('/api/password/forgot',json={'email':email})
            unknown=client.post('/api/password/forgot',json={'email':'unknown@example.org'})
            self.assertEqual(result.json(),unknown.json())
            self.assertEqual(send.call_count,1)
            raw=re.search(r'#reset=([^\s]+)',send.call_args.args[2])[1]
        with m.SessionLocal() as db:
            self.assertNotEqual(db.scalar(select(m.PasswordReset)).digest,raw)
        self.assertEqual(client.post('/api/password/reset',json={'token':raw,'password':'short'}).status_code,422)
        self.assertEqual(client.post('/api/password/reset',json={'token':raw,'password':'new-password'}).status_code,200)
        self.assertEqual(client.post('/api/password/reset',json={'token':raw,'password':'another-password'}).status_code,400)
        self.assertEqual(client.get('/api/me',headers={'Authorization':'Bearer '+session}).status_code,401)
        self.assertEqual(client.post('/api/login',json={'email':email,'password':'old-password'}).status_code,401)
        self.assertEqual(client.post('/api/login',json={'email':email,'password':'new-password'}).status_code,200)

    def test_expired_link_delivery_failure_and_rate_limit(self):
        email,_=self.account()
        with patch('app.password_reset.send_email') as send:
            for _ in range(5):self.assertEqual(client.post('/api/password/forgot',json={'email':email}).status_code,202)
            self.assertEqual(send.call_count,3)
            raw=re.search(r'#reset=([^\s]+)',send.call_args.args[2])[1]
        with m.SessionLocal() as db:
            db.execute(update(m.PasswordReset).values(expires=int(time.time())-1)); db.commit()
        self.assertEqual(client.post('/api/password/reset',json={'token':raw,'password':'new-password'}).status_code,400)
        email,_=self.account()
        with patch('app.password_reset.send_email',side_effect=RuntimeError('test')):
            self.assertEqual(client.post('/api/password/forgot',json={'email':email}).status_code,202)
        with m.SessionLocal() as db:self.assertIsNone(db.scalar(select(m.PasswordReset)))

    def test_unconfigured_email_fails_honestly(self):
        with patch.dict(os.environ,{'SMTP_HOST':''}):
            self.assertEqual(client.post('/api/password/forgot',json={'email':'any@example.org'}).status_code,503)
