import unittest
from tests.test_backend import client

class TrainingTests(unittest.TestCase):
    def test_filters_distinguish_provider_and_credential(self):
        rows=client.get('/api/training?region=Catalu%C3%B1a&mode=Presencial&credential=Oficial&provider=Privado').json()
        self.assertEqual([r['id'] for r in rows],['caz-pel'])
        rows=client.get('/api/training?mode=Online&category=Joyer%C3%ADa').json()
        self.assertEqual({r['id'] for r in rows},{'dom-cer','dom-res'})

    def test_verified_records_have_link_evidence_and_decision_fields(self):
        rows=client.get('/api/training').json()
        self.assertEqual(len({r['id'] for r in rows}),len(rows))
        for r in rows:
            for field in ['provider_type','credential_type','duration','access','practice','source','link_checked_at','link_status']:
                self.assertTrue(r[field],(r['id'],field))
            if r['verified']:
                self.assertEqual(r['link_status'],'ok')
                self.assertEqual(r['link_http_status'],200)
        pending=next(r for r in rows if r['id']=='unir-diseno')
        self.assertEqual(pending['status'],'unverified')
        self.assertFalse(pending['verified'])
        self.assertEqual(next(r for r in rows if r['id']=='caz-asesor')['modes'],['Semipresencial'])
