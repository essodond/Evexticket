from datetime import time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from guichet.models import Agence
from transport.models import Booking, City, Company, ScheduledTrip, Trip

from .models import BookingRiskAssessment, TripIntelligenceSnapshot
from .services import parse_natural_search


@override_settings(OPENAI_API_KEY="", EVEX_AI_ENABLED=True)
class AIAssistantApiTests(APITestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(
            username="client-ai",
            email="client-ai@example.test",
            password="secret123",
        )
        self.other_user = User.objects.create_user(
            username="other-ai",
            email="other-ai@example.test",
            password="secret123",
        )
        self.company_admin = User.objects.create_user(
            username="company-ai",
            email="company-ai@example.test",
            password="secret123",
        )
        self.super_admin = User.objects.create_superuser(
            username="platform-ai",
            email="platform-ai@example.test",
            password="secret123",
        )
        self.kara = City.objects.create(name="Kara IA", region="Kara")
        self.lome = City.objects.create(name="Lomé IA", region="Maritime")
        self.company = Company.objects.create(
            name="Transport IA",
            description="Tests",
            address="Kara",
            phone="90000000",
            email="transport-ai@example.test",
            admin_user=self.company_admin,
        )
        self.company.admins.add(self.company_admin)
        self.trip = Trip.objects.create(
            company=self.company,
            departure_city=self.kara,
            arrival_city=self.lome,
            departure_time=time(8, 0),
            arrival_time=time(14, 0),
            price=Decimal("7500"),
            duration=360,
            bus_type="Standard",
            capacity=50,
        )
        self.scheduled_trip, _ = ScheduledTrip.objects.get_or_create(
            trip=self.trip,
            date=timezone.localdate() + timedelta(days=1),
            defaults={"is_active": True, "available_seats": 50},
        )
        self.booking = Booking.objects.create(
            trip=self.trip,
            scheduled_trip=self.scheduled_trip,
            passenger_name="Client Test",
            passenger_email=self.client_user.email,
            passenger_phone="22890000000",
            seat_number="2",
            status="confirmed",
            payment_method="cash",
            total_price=Decimal("7500"),
            user=self.client_user,
        )

    def authenticate(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_fallback_parser_extracts_route_date_and_budget(self):
        result, provider = parse_natural_search(
            "Kara IA vers Lomé IA demain matin moins de 8000 pour 2 personnes",
            self.client_user,
        )
        self.assertEqual(provider, "fallback")
        self.assertEqual(result["departure_city"], "Kara IA")
        self.assertEqual(result["arrival_city"], "Lomé IA")
        self.assertEqual(result["max_price"], 8000)
        self.assertEqual(result["passengers"], 2)
        self.assertEqual(result["time_period"], "morning")

    def test_natural_search_requires_authentication(self):
        response = self.client.post("/api/ai/search/", {"query": "Kara IA vers Lomé IA demain"})
        self.assertEqual(response.status_code, 403)

    def test_natural_search_returns_real_scheduled_trip(self):
        self.authenticate(self.client_user)
        response = self.client.post(
            "/api/ai/search/",
            {"query": "Kara IA vers Lomé IA demain matin moins de 8000"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["provider"], "fallback")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["trips"][0]["id"], self.scheduled_trip.id)

    def test_recommendations_are_filtered_by_current_departure_city(self):
        Agence.objects.create(
            compagnie=self.company,
            nom="Gare Kara IA",
            ville=self.kara,
            adresse="Quartier centre, Kara",
            telephone="22890000001",
            latitude=Decimal("9.551100"),
            longitude=Decimal("1.186100"),
        )
        self.authenticate(self.client_user)
        response = self.client.get(
            "/api/ai/recommendations/",
            {"departure_city": self.kara.name},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["departure_city"], self.kara.name)
        self.assertGreater(len(response.data["trips"]), 0)
        self.assertTrue(
            all(
                item["trip_info"]["departure_city_name"] == self.kara.name
                for item in response.data["trips"]
            ),
        )
        station = response.data["trips"][0]["trip_info"]["departure_station"]
        self.assertEqual(station["name"], "Gare Kara IA")
        self.assertEqual(station["source"], "agency")
        self.assertEqual(str(station["latitude"]), "9.551100")

        empty_response = self.client.get(
            "/api/ai/recommendations/",
            {"departure_city": self.lome.name},
        )
        self.assertEqual(empty_response.status_code, 200)
        self.assertEqual(empty_response.data["trips"], [])

    def test_ticket_assistant_is_limited_to_owner(self):
        self.authenticate(self.other_user)
        response = self.client.post(
            f"/api/ai/tickets/{self.booking.id}/assistant/",
            {"question": "Quel est mon siège ?"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

        self.authenticate(self.client_user)
        response = self.client.post(
            f"/api/ai/tickets/{self.booking.id}/assistant/",
            {"question": "Quel est mon siège ?"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("2", response.data["answer"])

    def test_company_admin_can_forecast_own_trip(self):
        self.authenticate(self.company_admin)
        response = self.client.get(f"/api/ai/trips/{self.scheduled_trip.id}/insights/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["scheduled_trip_id"], self.scheduled_trip.id)
        self.assertTrue(TripIntelligenceSnapshot.objects.filter(scheduled_trip=self.scheduled_trip).exists())

    def test_client_cannot_open_management_copilot(self):
        self.authenticate(self.client_user)
        response = self.client.post("/api/ai/copilot/", {"question": "Résumé"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_management_copilot_works_without_reviews_or_openai_key(self):
        self.authenticate(self.company_admin)
        response = self.client.post(
            "/api/ai/copilot/",
            {"question": "Résume la situation"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["provider"], "fallback")
        self.assertIn("metrics", response.data)

    def test_super_admin_can_assess_booking_risk(self):
        self.authenticate(self.super_admin)
        response = self.client.get(f"/api/ai/bookings/{self.booking.id}/risk/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["booking_id"], self.booking.id)
        self.assertTrue(BookingRiskAssessment.objects.filter(booking=self.booking).exists())
