import json

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from transport.models import Company


class SafeIntegerRendererTests(APITestCase):
    unsafe_id = 9_007_199_254_740_993

    def setUp(self):
        self.admin = User.objects.create_user(
            username='cockroach-admin',
            email='cockroach-admin@example.com',
            password='test-password',
        )
        self.company = Company.objects.create(
            id=self.unsafe_id,
            name='Cockroach Company',
            email='company@example.com',
            phone='+22890000000',
            admin_user=self.admin,
        )
        self.company.admins.add(self.admin)
        self.client.force_authenticate(self.admin)

    def test_me_and_company_detail_preserve_large_company_id(self):
        me_response = self.client.get('/api/me/')

        self.assertEqual(me_response.status_code, 200)
        me_payload = json.loads(me_response.content)
        self.assertEqual(me_payload['company_id'], str(self.unsafe_id))

        company_response = self.client.get(f'/api/companies/{me_payload["company_id"]}/')

        self.assertEqual(company_response.status_code, 200)
        company_payload = json.loads(company_response.content)
        self.assertEqual(company_payload['id'], str(self.unsafe_id))

    def test_safe_counts_remain_json_numbers(self):
        response = self.client.get(f'/api/companies/{self.unsafe_id}/stats/')

        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.content)
        self.assertIsInstance(payload['total_bookings'], int)
