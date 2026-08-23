import json
import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory

from .models import (
    Booking,
    City,
    Company,
    SafetyIncident,
    ScheduledTrip,
    Trip,
    TripTrackingSession,
)
from .serializers import BookingCreateSerializer, ScheduledTripSerializer
from .services import reservation_service


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class SafetyIncidentApiTests(TestCase):
    unsafe_trip_id = 9_007_199_254_740_993

    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user('safety-admin', password='secret')
        self.passenger = User.objects.create_user('safety-passenger', password='secret')
        self.stranger = User.objects.create_user('safety-stranger', password='secret')
        self.other_admin = User.objects.create_user('other-safety-admin', password='secret')

        self.company = Company.objects.create(
            name='Safety Transport', description='Test', address='Lomé',
            phone='90001000', email='safety@example.com',
        )
        self.company.admins.add(self.admin)
        self.other_company = Company.objects.create(
            name='Other Transport', description='Test', address='Kara',
            phone='90001001', email='other-safety@example.com',
        )
        self.other_company.admins.add(self.other_admin)

        departure = City.objects.create(name='Lomé Safety', region='Maritime')
        arrival = City.objects.create(name='Kara Safety', region='Kara')
        local_now = timezone.localtime()
        departure_datetime = local_now - timedelta(hours=1)
        arrival_datetime = local_now + timedelta(hours=4)
        departure_time = departure_datetime.time().replace(tzinfo=None, microsecond=0)
        arrival_time = arrival_datetime.time().replace(tzinfo=None, microsecond=0)

        self.trip = Trip.objects.create(
            company=self.company,
            departure_city=departure,
            arrival_city=arrival,
            departure_time=departure_time,
            arrival_time=arrival_time,
            price=7000,
            duration=420,
            capacity=45,
        )
        self.scheduled_trip = ScheduledTrip.objects.create(
            id=self.unsafe_trip_id,
            trip=self.trip,
            date=departure_datetime.date(),
            available_seats=44,
        )
        Booking.objects.create(
            trip=self.trip,
            scheduled_trip=self.scheduled_trip,
            passenger_name='Voyageur sécurité',
            passenger_email='voyageur-safety@example.com',
            passenger_phone='90001002',
            seat_number='4',
            status='confirmed',
            payment_method='mobile_money',
            total_price=7000,
            user=self.passenger,
        )

        other_departure = City.objects.create(name='Sokodé Safety', region='Centrale')
        other_arrival = City.objects.create(name='Dapaong Safety', region='Savanes')
        other_trip = Trip.objects.create(
            company=self.other_company,
            departure_city=other_departure,
            arrival_city=other_arrival,
            departure_time=departure_time,
            arrival_time=arrival_time,
            price=5000,
            duration=240,
            capacity=30,
        )
        self.other_scheduled_trip = ScheduledTrip.objects.create(
            trip=other_trip,
            date=departure_datetime.date(),
            available_seats=30,
        )

        self.client = APIClient()
        self.report_url = f'/api/scheduled_trips/{self.scheduled_trip.id}/incidents/'
        self.payload = {
            'incident_type': 'accident',
            'travel_state': 'stopped',
            'description': 'Le véhicule a quitté la chaussée.',
            'injured_count': 2,
            'emergency_services_contacted': True,
            'latitude': 6.1725,
            'longitude': 1.2314,
            'accuracy_m': 9,
            'occurred_at': timezone.now().isoformat(),
            'idempotency_key': str(uuid.uuid4()),
            # Ces champs doivent toujours être ignorés côté serveur.
            'status': 'resolved',
            'severity': 'low',
            'reported_by': self.stranger.id,
        }

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def report(self, payload=None):
        return self.client.post(self.report_url, payload or self.payload, format='json')

    def test_report_is_server_controlled_uuid_safe_and_idempotent(self):
        self.authenticate(self.admin)

        first = self.report()
        second = self.report()

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(SafetyIncident.objects.count(), 1)
        incident = SafetyIncident.objects.get()
        self.assertIsInstance(incident.id, uuid.UUID)
        self.assertEqual(incident.reported_by, self.admin)
        self.assertEqual(incident.status, SafetyIncident.Status.REPORTED)
        self.assertEqual(incident.severity, SafetyIncident.Severity.CRITICAL)
        self.assertEqual(incident.location_source, SafetyIncident.LocationSource.DEVICE)

        rendered = json.loads(first.content)
        self.assertEqual(rendered['scheduled_trip'], str(self.unsafe_trip_id))
        self.assertEqual(rendered['id'], str(incident.id))
        self.assertEqual(rendered['status'], 'reported')
        self.assertEqual(rendered['severity'], 'critical')

    def test_only_same_company_personnel_can_report(self):
        anonymous = self.report()
        self.assertEqual(anonymous.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.passenger)
        passenger = self.report({**self.payload, 'idempotency_key': str(uuid.uuid4())})
        self.assertEqual(passenger.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.other_admin)
        other_company = self.report({**self.payload, 'idempotency_key': str(uuid.uuid4())})
        self.assertEqual(other_company.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(SafetyIncident.objects.count(), 0)

    def test_recent_tracking_position_is_used_and_invalid_coordinates_are_rejected(self):
        TripTrackingSession.objects.create(
            scheduled_trip=self.scheduled_trip,
            driver=self.admin,
            latitude='6.200000',
            longitude='1.220000',
            accuracy_m=12,
            last_position_at=timezone.now(),
        )
        self.authenticate(self.admin)
        without_position = {
            key: value for key, value in self.payload.items()
            if key not in ['latitude', 'longitude', 'accuracy_m']
        }

        response = self.report(without_position)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        incident = SafetyIncident.objects.get()
        self.assertEqual(incident.location_source, SafetyIncident.LocationSource.TRACKING)
        self.assertEqual(str(incident.latitude), '6.200000')

        invalid = self.report({
            **self.payload,
            'idempotency_key': str(uuid.uuid4()),
            'latitude': 91,
        })
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(SafetyIncident.objects.count(), 1)

    def test_passenger_tracking_only_exposes_public_alert_and_resolution_hides_it(self):
        self.authenticate(self.admin)
        created = self.report()
        incident_id = created.data['id']

        self.authenticate(self.passenger)
        tracking = self.client.get(f'/api/scheduled_trips/{self.scheduled_trip.id}/tracking/')
        self.assertEqual(tracking.status_code, status.HTTP_200_OK)
        self.assertEqual(tracking.data['safety']['status'], 'incident_active')
        alert = tracking.data['safety']['alerts'][0]
        self.assertEqual(alert['id'], incident_id)
        self.assertNotIn('description', alert)
        self.assertNotIn('reporter_name', alert)
        self.assertNotIn('injured_count', alert)

        self.authenticate(self.admin)
        missing_note = self.client.patch(
            f'/api/safety/incidents/{incident_id}/',
            {'status': 'resolved'},
            format='json',
        )
        self.assertEqual(missing_note.status_code, status.HTTP_400_BAD_REQUEST)
        resolved = self.client.patch(
            f'/api/safety/incidents/{incident_id}/',
            {'status': 'resolved', 'resolution_note': 'Voyage interrompu et passagers pris en charge.'},
            format='json',
        )
        self.assertEqual(resolved.status_code, status.HTTP_200_OK)

        self.authenticate(self.passenger)
        after_resolution = self.client.get(f'/api/scheduled_trips/{self.scheduled_trip.id}/tracking/')
        self.assertEqual(after_resolution.data['safety'], {'status': 'normal', 'alerts': []})

    def test_incident_list_and_status_actions_are_company_scoped(self):
        self.authenticate(self.admin)
        created = self.report()
        incident_id = created.data['id']

        self.authenticate(self.other_admin)
        forbidden = self.client.patch(
            f'/api/safety/incidents/{incident_id}/',
            {'status': 'acknowledged'},
            format='json',
        )
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/safety/incidents/').data, [])

        self.authenticate(self.admin)
        acknowledged = self.client.patch(
            f'/api/safety/incidents/{incident_id}/',
            {'status': 'acknowledged'},
            format='json',
        )
        self.assertEqual(acknowledged.status_code, status.HTTP_200_OK)
        self.assertEqual(acknowledged.data['status'], 'acknowledged')
        active = self.client.get('/api/safety/incidents/?status=active')
        self.assertEqual(active.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id'] for item in active.data], [incident_id])

        resolved = self.client.patch(
            f'/api/safety/incidents/{incident_id}/',
            {'status': 'resolved', 'resolution_note': 'Situation sécurisée.'},
            format='json',
        )
        self.assertEqual(resolved.status_code, status.HTTP_200_OK)
        cannot_reopen = self.client.patch(
            f'/api/safety/incidents/{incident_id}/',
            {'status': 'acknowledged'},
            format='json',
        )
        self.assertEqual(cannot_reopen.status_code, status.HTTP_409_CONFLICT)

    def test_critical_incident_suspends_app_and_mobile_payment_bookings(self):
        self.authenticate(self.admin)
        created = self.report()
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        request = APIRequestFactory().post('/api/bookings/')
        request.user = self.passenger
        serializer = BookingCreateSerializer(data={
            'scheduled_trip': str(self.scheduled_trip.id),
            'passenger_name': 'Nouveau voyageur',
            'passenger_email': 'nouveau@example.com',
            'passenger_phone': '90001003',
            'seat_number': '5',
        }, context={'request': request})
        self.assertFalse(serializer.is_valid())
        self.assertIn('scheduled_trip', serializer.errors)

        trip_payload = ScheduledTripSerializer(self.scheduled_trip).data
        self.assertTrue(trip_payload['safety_blocked'])
        self.assertTrue(trip_payload['booking_closed'])
        self.assertEqual(trip_payload['available_seats'], 0)
        self.assertEqual(trip_payload['badge'], 'safety_suspended')

        with self.assertRaises(reservation_service.SafetyBookingSuspended):
            reservation_service.reserver_siege_temporaire(self.scheduled_trip.id, 5)

    def test_inactive_or_future_trip_cannot_receive_live_incident(self):
        self.authenticate(self.admin)
        self.scheduled_trip.is_active = False
        self.scheduled_trip.save(update_fields=['is_active'])
        inactive = self.report()
        self.assertEqual(inactive.status_code, status.HTTP_409_CONFLICT)

        future_trip = self.trip.scheduled_trips.filter(
            date__gte=timezone.localdate() + timedelta(days=2),
        ).first()
        self.assertIsNotNone(future_trip)
        future_url = f'/api/scheduled_trips/{future_trip.id}/incidents/'
        future = self.client.post(
            future_url,
            {**self.payload, 'idempotency_key': str(uuid.uuid4())},
            format='json',
        )
        self.assertEqual(future.status_code, status.HTTP_409_CONFLICT)

    def test_tracking_rejects_invalid_future_and_retrograde_timestamps(self):
        now = timezone.now()
        TripTrackingSession.objects.create(
            scheduled_trip=self.scheduled_trip,
            driver=self.admin,
            is_active=True,
            latitude='6.200000',
            longitude='1.220000',
            last_position_at=now,
        )
        self.authenticate(self.admin)
        url = f'/api/scheduled_trips/{self.scheduled_trip.id}/tracking/position/'
        base = {'latitude': 6.21, 'longitude': 1.23, 'accuracy_m': 8}

        invalid = self.client.post(url, {**base, 'recorded_at': 'pas-une-date'}, format='json')
        future = self.client.post(
            url,
            {**base, 'recorded_at': (now + timedelta(minutes=3)).isoformat()},
            format='json',
        )
        retrograde = self.client.post(
            url,
            {**base, 'recorded_at': (now - timedelta(minutes=1)).isoformat()},
            format='json',
        )

        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(future.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(retrograde.status_code, status.HTTP_409_CONFLICT)

    def test_incident_history_prevents_destructive_trip_delete(self):
        self.authenticate(self.admin)
        self.assertEqual(self.report().status_code, status.HTTP_201_CREATED)

        response = self.client.delete(f'/api/scheduled_trips/{self.scheduled_trip.id}/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(ScheduledTrip.objects.filter(pk=self.scheduled_trip.id).exists())

    def test_database_rejects_inconsistent_incident_location(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            SafetyIncident.objects.create(
                scheduled_trip=self.scheduled_trip,
                reported_by=self.admin,
                incident_type=SafetyIncident.IncidentType.OTHER,
                travel_state=SafetyIncident.TravelState.CONTINUING,
                severity=SafetyIncident.Severity.LOW,
                public_message='Incident test.',
                latitude='6.100000',
                longitude=None,
                location_source=SafetyIncident.LocationSource.DEVICE,
                idempotency_key=uuid.uuid4(),
            )

    def test_active_incident_cap_limits_duplicate_spam(self):
        for index in range(10):
            SafetyIncident.objects.create(
                scheduled_trip=self.scheduled_trip,
                reported_by=self.admin,
                incident_type=SafetyIncident.IncidentType.OTHER,
                travel_state=SafetyIncident.TravelState.CONTINUING,
                severity=SafetyIncident.Severity.LOW,
                public_message=f'Incident test {index}.',
                idempotency_key=uuid.uuid4(),
            )
        self.authenticate(self.admin)

        response = self.report({
            **self.payload,
            'incident_type': 'other',
            'travel_state': 'continuing',
            'idempotency_key': str(uuid.uuid4()),
        })

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(SafetyIncident.objects.count(), 10)
