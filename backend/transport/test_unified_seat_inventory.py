from datetime import time, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import OperationalError
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import Booking, City, Company, ScheduledTrip, Siege, Trip
from .services import reservation_service


class UnifiedSeatInventoryTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='seat-passenger',
            email='seat-passenger@example.com',
            password='secret',
        )
        company = Company.objects.create(
            name='Inventaire commun',
            description='Test',
            address='Lomé',
            phone='90000000',
            email='inventory@example.com',
        )
        departure = City.objects.create(name='Lomé Inventaire', region='Maritime')
        arrival = City.objects.create(name='Kara Inventaire', region='Kara')
        self.trip = Trip.objects.create(
            company=company,
            departure_city=departure,
            arrival_city=arrival,
            departure_time=time(8, 0),
            arrival_time=time(14, 0),
            price=6000,
            duration=360,
            capacity=12,
        )
        self.voyage = ScheduledTrip.objects.get(
            trip=self.trip,
            date=timezone.localdate() + timedelta(days=1),
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _booking(self, seat_number):
        return Booking.objects.create(
            trip=self.trip,
            scheduled_trip=self.voyage,
            passenger_name='Passager existant',
            passenger_email='passager@example.com',
            passenger_phone='22890123456',
            seat_number=str(seat_number),
            status='confirmed',
            payment_method='mobile_money',
            total_price=self.trip.price,
            user=self.user,
        )

    def test_mobile_payment_cannot_hold_a_seat_already_booked(self):
        used_booking = self._booking(4)
        used_booking.status = 'completed'
        used_booking.save(update_fields=['status'])

        seat_id = reservation_service.reserver_siege_temporaire(self.voyage.id, 4)

        self.assertIsNone(seat_id)
        self.assertFalse(Siege.objects.filter(voyage=self.voyage, numero=4).exists())

    def test_noncanonical_legacy_seat_still_blocks_the_same_physical_seat(self):
        self._booking('04')

        seat_id = reservation_service.reserver_siege_temporaire(self.voyage.id, 4)

        self.assertIsNone(seat_id)
        self.assertFalse(Siege.objects.filter(voyage=self.voyage, numero=4).exists())

    def test_temporary_mobile_hold_updates_and_releases_shared_capacity(self):
        seat_id = reservation_service.reserver_siege_temporaire(self.voyage.id, 8)
        self.assertIsNotNone(seat_id)
        self.voyage.refresh_from_db()
        self.assertEqual(self.voyage.available_seats, self.trip.capacity - 1)

        self.assertTrue(reservation_service.liberer_siege(seat_id))
        self.voyage.refresh_from_db()
        self.assertEqual(self.voyage.available_seats, self.trip.capacity)

    def test_temporary_hold_retries_a_cockroach_serialization_conflict(self):
        retryable_error = OperationalError('restart transaction')
        retryable_error.pgcode = '40001'

        with patch(
            'transport.services.reservation_service.is_booking_suspended_for_safety',
            side_effect=[retryable_error, False],
        ) as safety_check:
            seat_id = reservation_service.reserver_siege_temporaire(self.voyage.id, 9)

        self.assertIsNotNone(seat_id)
        self.assertEqual(safety_check.call_count, 2)

    def test_legacy_booking_cannot_take_a_mobile_or_counter_seat(self):
        Siege.objects.create(
            voyage=self.voyage,
            numero=5,
            statut=Siege.STATUT_RESERVE_TEMP,
            reserve_at=timezone.now(),
        )

        response = self.client.post(
            '/api/bookings/',
            {
                'scheduled_trip': self.voyage.id,
                'passenger_name': 'Nouveau passager',
                'passenger_email': 'nouveau@example.com',
                'passenger_phone': '22891123456',
                'seat_number': '5',
                'origin_stop': None,
                'destination_stop': None,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('seat_number', response.data)
        self.assertFalse(Booking.objects.filter(scheduled_trip=self.voyage, seat_number='5').exists())

    def test_booking_seat_is_canonical_and_bounded_by_vehicle_capacity(self):
        payload = {
            'scheduled_trip': self.voyage.id,
            'passenger_name': 'Passager canonique',
            'passenger_email': 'canonique@example.com',
            'passenger_phone': '22891123456',
            'seat_number': '03',
            'origin_stop': None,
            'destination_stop': None,
        }

        created = self.client.post('/api/bookings/', payload, format='json')
        outside_capacity = self.client.post(
            '/api/bookings/',
            {**payload, 'seat_number': str(self.trip.capacity + 1)},
            format='json',
        )

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Booking.objects.get(pk=created.data['id']).seat_number, '3')
        self.assertEqual(outside_capacity.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('seat_number', outside_capacity.data)

    def test_passenger_cannot_move_or_reprice_an_existing_ticket(self):
        booking = self._booking(6)
        target_voyage = ScheduledTrip.objects.filter(trip=self.trip).exclude(
            pk=self.voyage.pk,
        ).first()
        other_user = get_user_model().objects.create_user(
            username='seat-target-user',
            password='secret',
        )

        response = self.client.patch(
            f'/api/bookings/{booking.pk}/',
            {
                'scheduled_trip': target_voyage.pk,
                'trip': self.trip.pk,
                'seat_number': '07',
                'status': 'completed',
                'payment_method': 'cash',
                'total_price': 1,
                'user': other_user.pk,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.scheduled_trip_id, self.voyage.pk)
        self.assertEqual(booking.seat_number, '6')
        self.assertEqual(booking.status, 'confirmed')
        self.assertEqual(booking.total_price, self.trip.price)
        self.assertEqual(booking.user_id, self.user.pk)

    def test_public_seat_map_and_count_merge_all_sales_channels(self):
        Siege.objects.create(
            voyage=self.voyage,
            numero=2,
            statut=Siege.STATUT_OCCUPE,
        )
        booking_response = self.client.post(
            '/api/bookings/',
            {
                'scheduled_trip': self.voyage.id,
                'passenger_name': 'Passager carte',
                'passenger_email': 'carte@example.com',
                'passenger_phone': '22892123456',
                'seat_number': '3',
                'origin_stop': None,
                'destination_stop': None,
            },
            format='json',
        )
        self.assertEqual(booking_response.status_code, status.HTTP_201_CREATED)

        self.voyage.refresh_from_db()
        self.assertEqual(self.voyage.available_seats, self.trip.capacity - 2)

        response = self.client.get(f'/api/scheduled_trips/{self.voyage.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        seats = {seat['number']: seat['status'] for seat in response.data['seats']}
        self.assertEqual(seats[2], 'occupied')
        self.assertEqual(seats[3], 'occupied')
        self.assertEqual(response.data['available_seats'], self.trip.capacity - 2)
