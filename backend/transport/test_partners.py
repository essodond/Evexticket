from datetime import time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from guichet.models import Agence

from .models import Booking, City, Company, ScheduledTrip, Trip


class PartnerCompanyApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='partner-client',
            email='partner-client@example.test',
            password='secret123',
        )
        self.other_user = User.objects.create_user(
            username='partner-other',
            email='partner-other@example.test',
            password='secret123',
        )
        self.kara = City.objects.create(name='Kara Partenaire', region='Kara')
        self.lome = City.objects.create(name='Lomé Partenaire', region='Maritime')
        self.company = Company.objects.create(
            name='Partenaire Mobile',
            description='Compagnie partenaire de test',
            address='Kara',
            phone='90001111',
            email='partenaire@example.test',
        )
        self.trip = Trip.objects.create(
            company=self.company,
            departure_city=self.kara,
            arrival_city=self.lome,
            departure_time=time(8, 0),
            arrival_time=time(14, 0),
            price=Decimal('7500'),
            duration=360,
            bus_type='Standard',
            capacity=50,
        )
        self.scheduled_trip = ScheduledTrip.objects.create(
            trip=self.trip,
            date=timezone.localdate() + timedelta(days=1),
            is_active=True,
        )
        self.booking = Booking.objects.create(
            trip=self.trip,
            scheduled_trip=self.scheduled_trip,
            passenger_name='Client Partenaire',
            passenger_email=self.user.email,
            passenger_phone='22890001111',
            seat_number='4',
            status='confirmed',
            payment_method='cash',
            total_price=Decimal('7500'),
            user=self.user,
        )
        self.station = Agence.objects.create(
            compagnie=self.company,
            nom='Gare Kara Centre',
            ville=self.kara,
            adresse='Centre-ville, Kara',
            telephone='22890002222',
            latitude=Decimal('9.551100'),
            longitude=Decimal('1.186100'),
        )

    def authenticate(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_public_partner_list_contains_station_and_rating_summary(self):
        response = self.client.get('/api/partners/')
        self.assertEqual(response.status_code, 200)
        partner = next(item for item in response.data if item['id'] == self.company.id)
        self.assertEqual(partner['stations'][0]['name'], self.station.nom)
        self.assertEqual(str(partner['stations'][0]['latitude']), '9.551100')
        self.assertEqual(partner['rating_average'], 0.0)
        self.assertEqual(partner['review_count'], 0)

    def test_authenticated_client_can_rate_only_a_company_they_booked(self):
        self.authenticate(self.user)
        response = self.client.post(
            f'/api/partners/{self.company.id}/reviews/',
            {
                'booking_id': self.booking.id,
                'rating': 5,
                'comment': 'Très bon voyage.',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['rating_average'], 5.0)

        detail = self.client.get(f'/api/partners/{self.company.id}/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['review_count'], 1)
        self.assertEqual(detail.data['eligible_bookings'][0]['existing_rating'], 5)

        update = self.client.post(
            f'/api/partners/{self.company.id}/reviews/',
            {
                'booking_id': self.booking.id,
                'rating': 4,
                'comment': 'Avis mis à jour.',
            },
            format='json',
        )
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.data['rating_average'], 4.0)

    def test_client_cannot_rate_with_another_users_booking(self):
        self.authenticate(self.other_user)
        response = self.client.post(
            f'/api/partners/{self.company.id}/reviews/',
            {'booking_id': self.booking.id, 'rating': 5},
            format='json',
        )
        self.assertEqual(response.status_code, 404)
