from datetime import time

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import (
    BoardingZone,
    Booking,
    BusPosition,
    City,
    Company,
    ScheduledTrip,
    Trip,
    TripStop,
    TripTrackingSession,
)


class LiveTripTrackingTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.driver = User.objects.create_user('driver', password='secret')
        self.passenger = User.objects.create_user('passenger', password='secret')
        self.stranger = User.objects.create_user('stranger', password='secret')
        self.company = Company.objects.create(
            name='Live GPS Transport',
            description='Test',
            address='Lomé',
            phone='90000100',
            email='live-gps@example.com',
        )
        self.company.admins.add(self.driver)
        departure = City.objects.create(name='Lomé Live', region='Maritime')
        middle = City.objects.create(name='Atakpamé Live', region='Plateaux')
        arrival = City.objects.create(name='Kara Live', region='Kara')
        self.trip = Trip.objects.create(
            company=self.company,
            departure_city=departure,
            arrival_city=arrival,
            departure_time=time(8, 0),
            arrival_time=time(14, 0),
            price=6000,
            duration=360,
            capacity=50,
        )
        self.departure_stop = TripStop.objects.create(trip=self.trip, city=departure, sequence=0)
        middle_stop = TripStop.objects.create(trip=self.trip, city=middle, sequence=1)
        arrival_stop = TripStop.objects.create(trip=self.trip, city=arrival, sequence=2)
        BoardingZone.objects.create(
            city=departure,
            trip_stop=self.departure_stop,
            name='Gare Lomé Live',
            latitude='6.172500',
            longitude='1.231400',
        )
        BoardingZone.objects.create(
            city=middle,
            trip_stop=middle_stop,
            name='Gare Atakpamé Live',
            latitude='7.526500',
            longitude='1.126900',
        )
        BoardingZone.objects.create(
            city=arrival,
            trip_stop=arrival_stop,
            name='Gare Kara Live',
            latitude='9.553000',
            longitude='1.192700',
        )
        self.scheduled_trip = ScheduledTrip.objects.create(
            trip=self.trip,
            date=timezone.localdate(),
            available_seats=49,
        )
        Booking.objects.create(
            trip=self.trip,
            scheduled_trip=self.scheduled_trip,
            passenger_name='Passager GPS',
            passenger_email='passenger@example.com',
            passenger_phone='90000101',
            seat_number='8',
            origin_stop=self.departure_stop,
            status='confirmed',
            payment_method='mobile_money',
            total_price=6000,
            user=self.passenger,
        )
        self.client = APIClient()
        self.base_url = f'/api/scheduled_trips/{self.scheduled_trip.id}/tracking'

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_driver_sends_real_positions_and_passenger_reads_snapshot(self):
        self.authenticate(self.driver)
        start_response = self.client.post(f'{self.base_url}/start/', {}, format='json')
        position_response = self.client.post(
            f'{self.base_url}/position/',
            {
                'latitude': 6.2025,
                'longitude': 1.2314,
                'accuracy_m': 8,
                'speed_mps': 15,
                'heading': 5,
                'recorded_at': timezone.now().isoformat(),
            },
            format='json',
        )

        self.assertEqual(start_response.status_code, status.HTTP_200_OK)
        self.assertEqual(position_response.status_code, status.HTTP_200_OK)
        self.assertEqual(position_response.data['status'], 'live')
        self.assertAlmostEqual(position_response.data['current_position']['speed_kmh'], 54.0)
        self.assertIsNotNone(position_response.data['estimated_arrival_at'])
        self.assertIsNotNone(position_response.data['distance_remaining_km'])
        self.assertEqual(BusPosition.objects.count(), 1)

        self.authenticate(self.passenger)
        passenger_response = self.client.get(f'{self.base_url}/')

        self.assertEqual(passenger_response.status_code, status.HTTP_200_OK)
        self.assertEqual(passenger_response.data['current_position']['latitude'], 6.2025)
        self.assertTrue(passenger_response.data['approach_alert']['active'])
        self.assertEqual(passenger_response.data['approach_alert']['stop_name'], 'Gare Lomé Live')
        self.assertEqual(passenger_response.data['history'], [])

    def test_tracking_is_private_and_driver_can_stop_it(self):
        self.authenticate(self.driver)
        self.client.post(f'{self.base_url}/start/', {}, format='json')

        self.authenticate(self.stranger)
        forbidden = self.client.get(f'{self.base_url}/')
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.driver)
        stop_response = self.client.post(f'{self.base_url}/stop/', {}, format='json')
        self.assertEqual(stop_response.status_code, status.HTTP_200_OK)
        self.assertEqual(stop_response.data['status'], 'stopped')
        self.assertFalse(TripTrackingSession.objects.get().is_active)

    def test_position_requires_started_session_and_valid_coordinates(self):
        self.authenticate(self.driver)
        before_start = self.client.post(
            f'{self.base_url}/position/',
            {'latitude': 6.2, 'longitude': 1.2},
            format='json',
        )
        invalid = self.client.post(
            f'{self.base_url}/position/',
            {'latitude': 120, 'longitude': 1.2},
            format='json',
        )
        self.assertEqual(before_start.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)

    def test_company_user_gets_manageable_trip_list(self):
        self.authenticate(self.driver)
        response = self.client.get('/api/tracking/trips/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['id'], self.scheduled_trip.id)
