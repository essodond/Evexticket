from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import City, Company, Trip, ScheduledTrip, Booking

class CityModelTest(TestCase):
    def test_city_creation(self):
        city = City.objects.create(name="Test City", is_active=True)
        self.assertEqual(city.name, "Test City")
        self.assertTrue(city.is_active)


class BookingCancelEndpointTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='testuser', password='password')
        self.city_departure = City.objects.create(name="City A", is_active=True, region="Region")
        self.city_arrival = City.objects.create(name="City B", is_active=True, region="Region")
        self.company = Company.objects.create(
            name="Transport Co",
            description="Test company",
            address="123 Avenue",
            phone="123456789",
            email="test@example.com",
            is_active=True,
        )
        self.trip = Trip.objects.create(
            company=self.company,
            departure_city=self.city_departure,
            arrival_city=self.city_arrival,
            departure_time="08:00",
            arrival_time="10:00",
            price=100.00,
            duration=120,
            bus_type='Standard',
            capacity=50,
            is_active=True,
        )
        self.scheduled_trip = ScheduledTrip.objects.create(
            trip=self.trip,
            date="2025-01-01",
            is_active=True,
            available_seats=50,
        )
        self.booking = Booking.objects.create(
            trip=self.trip,
            scheduled_trip=self.scheduled_trip,
            passenger_name="John Doe",
            passenger_email="john@example.com",
            passenger_phone="1234567890",
            seat_number="1A",
            status="pending",
            payment_method="cash",
            total_price=100.00,
            user=self.user,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_cancel_booking_sets_soft_delete(self):
        response = self.client.post(f'/api/bookings/{self.booking.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertTrue(self.booking.is_deleted)
        self.assertEqual(self.booking.status, 'cancelled')
        self.assertIsNotNone(self.booking.deleted_at)
        self.assertEqual(self.booking.deleted_by, self.user)
