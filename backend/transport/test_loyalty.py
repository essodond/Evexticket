from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import Booking, City, Company, ScheduledTrip, Trip, XPTransaction


class LoyaltyXPTest(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='xp-traveler',
            email='xp@example.com',
            password='secret',
        )
        departure = City.objects.create(name='Lomé XP', region='Maritime')
        arrival = City.objects.create(name='Kara XP', region='Kara')
        company = Company.objects.create(
            name='XP Transport',
            description='Compagnie de test XP',
            address='Lomé',
            phone='90000099',
            email='xp-transport@example.com',
        )
        trip = Trip.objects.create(
            company=company,
            departure_city=departure,
            arrival_city=arrival,
            departure_time='08:00',
            arrival_time='14:00',
            price=5000,
            duration=360,
            capacity=50,
        )
        scheduled_trip = ScheduledTrip.objects.create(
            trip=trip,
            date=date(2030, 8, 4),
            available_seats=49,
        )
        self.booking = Booking.objects.create(
            trip=trip,
            scheduled_trip=scheduled_trip,
            passenger_name='Voyageur XP',
            passenger_email='xp@example.com',
            passenger_phone='90000098',
            seat_number='7',
            status='confirmed',
            payment_method='mobile_money',
            total_price=5000,
            user=self.user,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_completed_trip_awards_xp_only_once(self):
        self.booking.status = 'completed'
        self.booking.save(update_fields=['status'])
        self.booking.save(update_fields=['status'])

        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.xp_total, 100)
        self.assertEqual(
            XPTransaction.objects.filter(
                user=self.user,
                event_type=XPTransaction.EVENT_TRIP_COMPLETED,
            ).count(),
            1,
        )

    def test_cancelled_completed_trip_reverses_xp(self):
        self.booking.status = 'completed'
        self.booking.save(update_fields=['status'])
        self.booking.status = 'cancelled'
        self.booking.save(update_fields=['status'])

        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.xp_total, 0)
        self.assertEqual(XPTransaction.objects.filter(user=self.user).count(), 2)

    def test_loyalty_endpoint_returns_level_progress_and_history(self):
        self.booking.status = 'completed'
        self.booking.save(update_fields=['status'])

        response = self.client.get('/api/loyalty/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_xp'], 100)
        self.assertEqual(response.data['completed_trips_count'], 1)
        self.assertEqual(response.data['xp_per_completed_trip'], 100)
        self.assertEqual(response.data['level']['label'], 'Explorateur')
        self.assertEqual(response.data['level']['xp_to_next_level'], 400)
        self.assertEqual(response.data['history'][0]['points'], 100)

    def test_current_user_contains_loyalty_summary(self):
        response = self.client.get('/api/me/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['loyalty']['total_xp'], 0)
        self.assertEqual(response.data['loyalty']['level']['progress_percent'], 0)
