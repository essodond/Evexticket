from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import City, Company, PlatformConfiguration, ScheduledTrip, Trip


class PlatformAdminApiTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_superuser(
            username='platform@evex.test',
            email='platform@evex.test',
            password='PlatformPass123!',
        )
        self.regular_user = User.objects.create_user(
            username='client@evex.test',
            email='client@evex.test',
            password='ClientPass123!',
        )
        departure = City.objects.create(name='Admin Test Lomé', region='Maritime')
        arrival = City.objects.create(name='Admin Test Kara', region='Kara')
        self.company = Company.objects.create(
            name='Compagnie API Admin',
            description='Test',
            address='Lomé',
            phone='90000000',
            email='company-admin@test.local',
        )
        trip = Trip.objects.create(
            company=self.company,
            departure_city=departure,
            arrival_city=arrival,
            departure_time='08:00',
            arrival_time='14:00',
            price=5000,
            duration=360,
            capacity=50,
        )
        ScheduledTrip.objects.create(
            trip=trip,
            date=timezone.localdate() + timedelta(days=30),
            available_seats=50,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_dashboard_uses_real_platform_data(self):
        response = self.client.get('/api/platform-admin/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['overview']['companies'], 1)
        self.assertGreaterEqual(response.data['overview']['users'], 2)
        self.assertEqual(len(response.data['monthly']), 12)

    def test_regular_user_cannot_access_platform_admin(self):
        self.client.force_authenticate(self.regular_user)
        response = self.client.get('/api/platform-admin/companies/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_company_also_creates_company_admin(self):
        response = self.client.post('/api/platform-admin/companies/', {
            'name': 'Nouvelle Compagnie',
            'description': 'Partenaire',
            'address': 'Kara',
            'phone': '91111111',
            'email': 'contact@nouvelle.test',
            'commission_rate': 12.5,
            'admin_first_name': 'Ama',
            'admin_last_name': 'Test',
            'admin_email': 'admin@nouvelle.test',
            'admin_password': 'CompanyPass123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        company = Company.objects.get(name='Nouvelle Compagnie')
        self.assertEqual(company.admin_user.email, 'admin@nouvelle.test')
        self.assertTrue(company.admins.filter(email='admin@nouvelle.test').exists())
        self.assertEqual(float(company.commission_rate), 12.5)

    def test_company_suspension_requires_reason(self):
        response = self.client.patch(
            f'/api/platform-admin/companies/{self.company.id}/status/',
            {'is_active': False},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        accepted = self.client.patch(
            f'/api/platform-admin/companies/{self.company.id}/status/',
            {'is_active': False, 'reason': 'Contrôle administratif'},
            format='json',
        )
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.company.refresh_from_db()
        self.assertFalse(self.company.is_active)

    def test_platform_settings_are_persisted(self):
        response = self.client.patch('/api/platform-admin/settings/', {
            'service_fee': 350,
            'default_commission_rate': 11,
            'sms_notifications': False,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        configuration = PlatformConfiguration.load()
        self.assertEqual(configuration.service_fee, 350)
        self.assertFalse(configuration.sms_notifications)

    def test_all_read_modules_are_available(self):
        for endpoint in [
            '/api/platform-admin/companies/',
            '/api/platform-admin/users/',
            '/api/platform-admin/voyages/',
            '/api/platform-admin/tickets/',
            '/api/platform-admin/finance/',
            '/api/platform-admin/analytics/',
            '/api/platform-admin/audit/',
            '/api/platform-admin/settings/',
        ]:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
