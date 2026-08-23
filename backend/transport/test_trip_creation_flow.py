from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import City, Company, ScheduledTrip, Trip


class TripCreationFlowTests(APITestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username="trip-admin",
            password="test-password",
        )
        self.company = Company.objects.create(
            name="Compagnie trajet",
            email="trajet@example.com",
            phone="+22890000001",
            admin_user=self.admin,
        )
        self.company.admins.add(self.admin)
        self.departure = City.objects.create(name="Lomé trajet", region="Maritime")
        self.arrival = City.objects.create(name="Kara trajet", region="Kara")
        self.client.force_authenticate(self.admin)

    def test_company_is_required_with_an_actionable_error(self):
        response = self.client.post(
            "/api/trips/",
            {
                "departure_city": str(self.departure.id),
                "arrival_city": str(self.arrival.id),
                "departure_time": "08:00",
                "arrival_time": "14:00",
                "price": "7500.00",
                "duration": 360,
                "bus_type": "Standard",
                "capacity": 50,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("company", response.data)

    def test_selected_date_reuses_the_schedule_generated_with_the_trip(self):
        trip_response = self.client.post(
            "/api/trips/",
            {
                "company": str(self.company.id),
                "departure_city": str(self.departure.id),
                "arrival_city": str(self.arrival.id),
                "departure_time": "08:00",
                "arrival_time": "14:00",
                "price": "7500.00",
                "duration": 360,
                "bus_type": "Standard",
                "capacity": 50,
            },
            format="json",
        )

        self.assertEqual(trip_response.status_code, status.HTTP_201_CREATED, trip_response.data)
        trip_id = trip_response.data["id"]
        selected_date = timezone.localdate() + timedelta(days=1)
        generated_schedule = ScheduledTrip.objects.get(
            trip_id=trip_id,
            date=selected_date,
        )

        scheduled_response = self.client.post(
            "/api/scheduled_trips/",
            {
                "trip": str(trip_id),
                "date": selected_date.isoformat(),
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(
            scheduled_response.status_code,
            status.HTTP_201_CREATED,
            scheduled_response.data,
        )
        self.assertEqual(scheduled_response.data["id"], generated_schedule.id)
        self.assertEqual(
            ScheduledTrip.objects.filter(trip_id=trip_id, date=selected_date).count(),
            1,
        )

        generated_schedule.is_active = False
        generated_schedule.save(update_fields=["is_active"])
        repeated_response = self.client.post(
            "/api/scheduled_trips/",
            {
                "trip": str(trip_id),
                "date": selected_date.isoformat(),
            },
            format="json",
        )
        self.assertEqual(repeated_response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(repeated_response.data["is_active"])

    def test_company_admin_cannot_move_a_route_or_schedule_to_another_company(self):
        other_company = Company.objects.create(
            name="Autre compagnie",
            email="autre@example.com",
            phone="+22890000002",
        )
        owned_trip = Trip.objects.create(
            company=self.company,
            departure_city=self.departure,
            arrival_city=self.arrival,
            departure_time="08:00",
            arrival_time="14:00",
            price=7500,
            duration=360,
            bus_type="Standard",
            capacity=50,
        )
        other_trip = Trip.objects.create(
            company=other_company,
            departure_city=self.departure,
            arrival_city=self.arrival,
            departure_time="09:00",
            arrival_time="15:00",
            price=8000,
            duration=360,
            bus_type="Standard",
            capacity=50,
        )

        route_response = self.client.patch(
            f"/api/trips/{owned_trip.id}/",
            {"company": str(other_company.id)},
            format="json",
        )
        self.assertEqual(route_response.status_code, status.HTTP_400_BAD_REQUEST)
        owned_trip.refresh_from_db()
        self.assertEqual(owned_trip.company_id, self.company.id)

        owned_schedule = owned_trip.scheduled_trips.first()
        schedule_response = self.client.patch(
            f"/api/scheduled_trips/{owned_schedule.id}/",
            {"trip": str(other_trip.id)},
            format="json",
        )
        self.assertEqual(schedule_response.status_code, status.HTTP_400_BAD_REQUEST)
        owned_schedule.refresh_from_db()
        self.assertEqual(owned_schedule.trip_id, owned_trip.id)
