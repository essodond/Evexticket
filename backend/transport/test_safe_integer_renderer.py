import json

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from transport.models import City, Company, Trip


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

    def test_large_city_ids_round_trip_as_strings_when_creating_trip(self):
        departure_id = self.unsafe_id + 2
        arrival_id = self.unsafe_id + 4
        City.objects.create(id=departure_id, name='Lomé CRDB', region='Maritime')
        City.objects.create(id=arrival_id, name='Kara CRDB', region='Kara')

        cities_response = self.client.get('/api/cities/')
        self.assertEqual(cities_response.status_code, 200)
        city_payload = json.loads(cities_response.content)
        self.assertEqual(
            {item['id'] for item in city_payload},
            {str(departure_id), str(arrival_id)},
        )

        trip_response = self.client.post(
            '/api/trips/',
            {
                'company': str(self.unsafe_id),
                'departure_city': str(departure_id),
                'arrival_city': str(arrival_id),
                'departure_time': '08:00',
                'arrival_time': '10:00',
                'price': '7500.00',
                'duration': 120,
                'bus_type': 'Standard',
                'capacity': 50,
            },
            format='json',
        )

        self.assertEqual(trip_response.status_code, 201, trip_response.data)
        trip = Trip.objects.get()
        self.assertEqual(trip.company_id, self.unsafe_id)
        self.assertEqual(trip.departure_city_id, departure_id)
        self.assertEqual(trip.arrival_city_id, arrival_id)
        response_payload = json.loads(trip_response.content)
        self.assertEqual(response_payload['company'], str(self.unsafe_id))
        self.assertEqual(response_payload['departure_city'], str(departure_id))
        self.assertEqual(response_payload['arrival_city'], str(arrival_id))

    def test_unsafe_json_integer_is_rejected_with_actionable_error(self):
        response = self.client.generic(
            'POST',
            '/api/trips/',
            json.dumps({
                'company': self.unsafe_id,
                'departure_city': self.unsafe_id + 2,
                'arrival_city': self.unsafe_id + 4,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('doivent être transmis sous forme de chaînes', response.data['detail'])
        self.assertFalse(Trip.objects.exists())

    def test_unsafe_exponential_json_number_is_also_rejected(self):
        response = self.client.generic(
            'POST',
            '/api/trips/',
            '{"company": 1.2008037870527447e18}',
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('doivent être transmis sous forme de chaînes', response.data['detail'])
