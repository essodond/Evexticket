from datetime import time, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import Booking, City, Company, Reservation, ScheduledTrip, Siege, Trip


@override_settings(
    QOSPAY_BASE_URL='https://qos.example',
    QOSPAY_API_USERNAME='evex',
    QOSPAY_CLIENT_ID_TOGOCEL='tmoney-client',
    QOSPAY_API_PASSWORD_TOGOCEL='tmoney-secret',
    QOSPAY_REQUEST_URL_TOGOCEL='/tmoney/request',
    QOSPAY_STATUS_URL_TOGOCEL='/tmoney/status',
    QOSPAY_CLIENT_ID_MOOV='flooz-client',
    QOSPAY_API_PASSWORD_MOOV='flooz-secret',
    QOSPAY_REQUEST_URL_MOOV='/flooz/request',
    QOSPAY_STATUS_URL_MOOV='/flooz/status',
)
class QosOperatorConfigurationTests(SimpleTestCase):
    def test_each_operator_uses_its_own_credentials_and_urls(self):
        from payments.services import QosPayService

        service = QosPayService()
        tmoney = service.get_operator_config('TMONEY')
        flooz = service.get_operator_config('FLOOZ')

        self.assertEqual(tmoney['client_id'], 'tmoney-client')
        self.assertEqual(tmoney['password'], 'tmoney-secret')
        self.assertEqual(tmoney['status_url'], 'https://qos.example/tmoney/status')
        self.assertEqual(flooz['client_id'], 'flooz-client')
        self.assertEqual(flooz['password'], 'flooz-secret')
        self.assertEqual(flooz['request_url'], 'https://qos.example/flooz/request')

    @patch('transport.services.qos_service.QosPayService.initiate_payment')
    def test_adapter_reuses_evex_reference_as_qos_transref(self, initiate):
        from .services import qos_service

        initiate.return_value = {'responsecode': '00', 'transref': 'EVEX-IDEMPOTENT-001'}
        result = qos_service.initier_paiement(
            '22890123456',
            6300,
            'EVEX-IDEMPOTENT-001',
            Reservation.OPERATEUR_TMONEY,
        )

        self.assertTrue(result['succes'])
        initiate.assert_called_once_with(
            amount=6300,
            phone_number='22890123456',
            operator=Reservation.OPERATEUR_TMONEY,
            transref='EVEX-IDEMPOTENT-001',
        )

    @patch(
        'transport.services.qos_service.QosPayService.initiate_payment',
        side_effect=ImproperlyConfigured('identifiants absents'),
    )
    def test_local_configuration_error_is_not_an_indeterminate_debit(self, _initiate):
        from .services import qos_service

        result = qos_service.initier_paiement(
            '22890123456',
            6300,
            'EVEX-CONFIG-001',
            Reservation.OPERATEUR_TMONEY,
        )

        self.assertFalse(result['succes'])
        self.assertFalse(result['indetermine'])

    @patch('transport.services.qos_service.QosPayService.initiate_payment')
    def test_malformed_provider_response_is_treated_as_indeterminate(self, initiate):
        from .services import qos_service

        initiate.return_value = ['réponse', 'inattendue']
        result = qos_service.initier_paiement(
            '22890123456',
            6300,
            'EVEX-MALFORMED-001',
            Reservation.OPERATEUR_TMONEY,
        )

        self.assertFalse(result['succes'])
        self.assertTrue(result['indetermine'])


class MobilePaymentTicketFlowTests(TestCase):
    def setUp(self):
        cache.clear()
        User = get_user_model()
        self.passenger = User.objects.create_user(
            username='mobile-passenger',
            email='mobile@example.com',
            password='secret',
        )
        self.passenger.profile.phone = '22890123456'
        self.passenger.profile.save(update_fields=['phone'])
        self.stranger = User.objects.create_user('mobile-stranger', password='secret')

        self.company = Company.objects.create(
            name='Mobile Tickets',
            description='Test',
            address='Lomé',
            phone='90000000',
            email='mobile-tickets@example.com',
        )
        departure = City.objects.create(name='Lomé Mobile', region='Maritime')
        arrival = City.objects.create(name='Kara Mobile', region='Kara')
        self.trip = Trip.objects.create(
            company=self.company,
            departure_city=departure,
            arrival_city=arrival,
            departure_time=time(8, 0),
            arrival_time=time(14, 0),
            price=6000,
            duration=360,
            capacity=40,
        )
        self.voyage = ScheduledTrip.objects.get(
            trip=self.trip,
            date=timezone.localdate() + timedelta(days=1),
        )
        self.client = APIClient()

    @patch('transport.services.qos_service.initier_paiement')
    def test_confirmed_payment_is_immediately_visible_and_tracks_for_owner(self, initiate):
        initiate.return_value = {
            'succes': True,
            'transaction_id': 'QOS-MOBILE-001',
            'reference_qos': 'QOS-MOBILE-001',
        }
        self.client.force_authenticate(self.passenger)

        initiated = self.client.post(
            '/api/payment/initier/',
            {
                'voyage_id': str(self.voyage.id),
                'numero_siege': '7',
                'client_nom': 'Passager Mobile',
                'client_telephone': '90 12 34 56',
                'montant_billet': 6000,
                'operateur': 'flooz',
            },
            format='json',
        )

        self.assertEqual(initiated.status_code, status.HTTP_200_OK)
        reservation = Reservation.objects.get(reference_evex=initiated.data['reference_evex'])
        self.assertEqual(reservation.user, self.passenger)
        self.assertEqual(reservation.client_telephone, '22890123456')
        self.assertEqual(reservation.operateur, Reservation.OPERATEUR_FLOOZ)

        with patch(
            'transport.services.qos_service.verifier_paiement',
            return_value={'statut': Reservation.STATUT_EN_ATTENTE},
        ):
            unverified_webhook = self.client.post(
                '/api/payment/webhook/',
                {'reference': reservation.reference_evex, 'status': 'SUCCESS'},
                format='json',
            )
        self.assertEqual(unverified_webhook.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        reservation.refresh_from_db()
        self.assertEqual(reservation.statut_paiement, Reservation.STATUT_EN_ATTENTE)

        with patch(
            'transport.services.qos_service.verifier_paiement',
            return_value={'statut': Reservation.STATUT_PAYE},
        ):
            verified = self.client.get(
                f'/api/payment/verifier/{reservation.reference_evex}/',
            )

        self.assertEqual(verified.status_code, status.HTTP_200_OK)
        self.assertTrue(verified.data['paye'])
        reservation.refresh_from_db()
        self.assertEqual(reservation.statut_paiement, Reservation.STATUT_PAYE)
        self.assertEqual(Siege.objects.get(pk=reservation.siege_id).statut, Siege.STATUT_OCCUPE)

        failed_after_payment = self.client.post(
            '/api/payment/webhook/',
            {'reference': reservation.reference_evex, 'status': 'FAILED'},
            format='json',
        )
        self.assertEqual(failed_after_payment.status_code, status.HTTP_200_OK)
        reservation.refresh_from_db()
        self.assertEqual(reservation.statut_paiement, Reservation.STATUT_PAYE)

        tickets = self.client.get('/api/my-bookings/')
        self.assertEqual(tickets.status_code, status.HTTP_200_OK)
        self.assertEqual(len(tickets.data), 1)
        self.assertEqual(tickets.data[0]['reference'], reservation.reference_evex)
        self.assertEqual(tickets.data[0]['scheduled_trip'], self.voyage.id)
        self.assertEqual(tickets.data[0]['status'], 'confirmed')
        self.assertEqual(tickets.data[0]['source'], 'mobile')

        tracking = self.client.get(
            f'/api/scheduled_trips/{self.voyage.id}/tracking/',
        )
        self.assertEqual(tracking.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get('/api/my-bookings/').data, [])
        forbidden = self.client.get(
            f'/api/scheduled_trips/{self.voyage.id}/tracking/',
        )
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

    def test_payment_rejects_tampered_price_and_invalid_seat(self):
        self.client.force_authenticate(self.passenger)
        base_payload = {
            'voyage_id': str(self.voyage.id),
            'numero_siege': '2',
            'client_nom': 'Passager Mobile',
            'client_telephone': '90123456',
            'montant_billet': 1,
            'operateur': 'tmoney',
        }

        wrong_price = self.client.post('/api/payment/initier/', base_payload, format='json')
        self.assertEqual(wrong_price.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(wrong_price.data['erreur'], 'MONTANT_INVALIDE')

        invalid_seat = self.client.post(
            '/api/payment/initier/',
            {**base_payload, 'montant_billet': 6000, 'numero_siege': 999},
            format='json',
        )
        self.assertEqual(invalid_seat.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_seat.data['erreur'], 'SIEGE_INVALIDE')

    @patch('transport.services.qos_service.initier_paiement')
    def test_payment_rejects_an_overlong_name_before_holding_or_debiting(self, initiate):
        self.client.force_authenticate(self.passenger)
        response = self.client.post('/api/payment/initier/', {
            'voyage_id': str(self.voyage.id),
            'numero_siege': '4',
            'client_nom': 'X' * 201,
            'client_telephone': '90123456',
            'montant_billet': 6000,
            'operateur': 'flooz',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['erreur'], 'CLIENT_INVALIDE')
        self.assertFalse(Reservation.objects.exists())
        self.assertFalse(Siege.objects.filter(voyage=self.voyage, numero=4).exists())
        initiate.assert_not_called()

    @patch('transport.services.qos_service.initier_paiement')
    def test_payment_requires_authentication_reuses_pending_request_and_protects_status(self, initiate):
        initiate.return_value = {
            'succes': True,
            'transaction_id': 'QOS-IDEMPOTENT-001',
            'reference_qos': 'QOS-IDEMPOTENT-001',
        }
        payload = {
            'voyage_id': str(self.voyage.id),
            'numero_siege': '9',
            'client_nom': 'Passager Mobile',
            'client_telephone': '90123456',
            'montant_billet': 6000,
            'operateur': 'tmoney',
        }

        anonymous = self.client.post('/api/payment/initier/', payload, format='json')
        self.assertIn(anonymous.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

        self.client.force_authenticate(self.passenger)
        first = self.client.post('/api/payment/initier/', payload, format='json')
        second = self.client.post('/api/payment/initier/', payload, format='json')
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data['reference_evex'], first.data['reference_evex'])
        self.assertTrue(second.data['reutilisee'])
        self.assertEqual(initiate.call_count, 1)

        self.client.force_authenticate(self.stranger)
        protected = self.client.get(f"/api/payment/verifier/{first.data['reference_evex']}/")
        self.assertEqual(protected.status_code, status.HTTP_404_NOT_FOUND)

    @patch('transport.services.qos_service.initier_paiement')
    def test_pending_payment_does_not_silently_change_customer_coordinates(self, initiate):
        initiate.return_value = {
            'succes': True,
            'transaction_id': 'QOS-LOCKED-DATA-001',
            'reference_qos': 'QOS-LOCKED-DATA-001',
        }
        payload = {
            'voyage_id': str(self.voyage.id),
            'numero_siege': '10',
            'client_nom': 'Passager Mobile',
            'client_telephone': '90123456',
            'montant_billet': 6000,
            'operateur': 'tmoney',
        }
        self.client.force_authenticate(self.passenger)
        first = self.client.post('/api/payment/initier/', payload, format='json')
        changed = self.client.post('/api/payment/initier/', {
            **payload,
            'client_telephone': '91123456',
            'operateur': 'flooz',
        }, format='json')

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(changed.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(changed.data['erreur'], 'PAIEMENT_DEJA_INITIE')
        self.assertEqual(initiate.call_count, 1)

    @patch('payments.services.QosPayService.initiate_payment')
    def test_legacy_payment_endpoint_cannot_debit_without_creating_a_ticket(self, initiate):
        self.client.force_authenticate(self.passenger)

        response = self.client.post('/api/payments/pay/', {
            'operator': 'MOOV',
            'phone': '90123456',
            'amount': 6300,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_410_GONE)
        initiate.assert_not_called()
        self.assertFalse(Reservation.objects.exists())

    @patch('transport.services.qos_service.initier_paiement')
    def test_closed_or_imminent_trip_cannot_start_payment(self, initiate):
        self.client.force_authenticate(self.passenger)
        self.voyage.is_active = False
        self.voyage.save(update_fields=['is_active'])

        response = self.client.post('/api/payment/initier/', {
            'voyage_id': str(self.voyage.id),
            'numero_siege': '3',
            'client_nom': 'Passager Mobile',
            'client_telephone': '90123456',
            'montant_billet': 6000,
            'operateur': 'flooz',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data['erreur'], 'VOYAGE_FERME')
        initiate.assert_not_called()

    @patch('transport.services.qos_service.initier_paiement')
    def test_paid_seat_cannot_be_released_by_a_late_failure(self, initiate):
        from .services import reservation_service

        initiate.return_value = {
            'succes': True,
            'transaction_id': 'QOS-RACE-001',
            'reference_qos': 'QOS-RACE-001',
        }
        self.client.force_authenticate(self.passenger)
        initiated = self.client.post('/api/payment/initier/', {
            'voyage_id': str(self.voyage.id),
            'numero_siege': '11',
            'client_nom': 'Passager Mobile',
            'client_telephone': '90123456',
            'montant_billet': 6000,
            'operateur': 'flooz',
        }, format='json')
        reference = initiated.data['reference_evex']
        paid = reservation_service.confirmer_paiement(reference, 'QOS-RACE-001')

        reservation_service.terminer_paiement(reference, Reservation.STATUT_ECHOUE)
        paid.refresh_from_db()
        paid.siege.refresh_from_db()
        self.assertEqual(paid.statut_paiement, Reservation.STATUT_PAYE)
        self.assertEqual(paid.siege.statut, Siege.STATUT_OCCUPE)
        self.assertEqual(paid.historiques_reversement.count(), 1)

        reservation_service.declencher_reversement(paid)
        self.assertEqual(paid.historiques_reversement.count(), 1)

    @patch('transport.services.qos_service.initier_paiement')
    def test_uncertain_qos_initiation_stays_pending_and_can_later_confirm(self, initiate):
        initiate.return_value = {
            'succes': False,
            'indetermine': True,
            'erreur': 'timeout',
        }
        self.client.force_authenticate(self.passenger)
        initiated = self.client.post('/api/payment/initier/', {
            'voyage_id': str(self.voyage.id),
            'numero_siege': '13',
            'client_nom': 'Passager Mobile',
            'client_telephone': '90123456',
            'montant_billet': 6000,
            'operateur': 'flooz',
        }, format='json')

        self.assertEqual(initiated.status_code, status.HTTP_202_ACCEPTED)
        reservation = Reservation.objects.get(reference_evex=initiated.data['reference_evex'])
        self.assertEqual(reservation.statut_paiement, Reservation.STATUT_EN_ATTENTE)
        self.assertIsNone(reservation.transaction_id_qos)
        self.assertEqual(reservation.siege.statut, Siege.STATUT_RESERVE_TEMP)

        with patch(
            'transport.services.qos_service.verifier_paiement',
            return_value={'statut': Reservation.STATUT_PAYE},
        ) as verify:
            confirmed = self.client.get(
                f'/api/payment/verifier/{reservation.reference_evex}/',
            )
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)
        self.assertTrue(confirmed.data['paye'])
        verify.assert_called_once_with(
            reservation.reference_evex,
            Reservation.OPERATEUR_FLOOZ,
        )

    @patch('transport.services.qos_service.initier_paiement')
    def test_late_success_after_expiry_restores_ticket_when_seat_is_free(self, initiate):
        from .services import reservation_service

        initiate.return_value = {
            'succes': True,
            'transaction_id': 'QOS-LATE-FREE-001',
            'reference_qos': 'QOS-LATE-FREE-001',
        }
        self.client.force_authenticate(self.passenger)
        initiated = self.client.post('/api/payment/initier/', {
            'voyage_id': str(self.voyage.id),
            'numero_siege': '16',
            'client_nom': 'Passager Mobile',
            'client_telephone': '90123456',
            'montant_billet': 6000,
            'operateur': 'flooz',
        }, format='json')
        reservation = Reservation.objects.get(reference_evex=initiated.data['reference_evex'])
        reservation_service.terminer_paiement(reservation.reference_evex, Reservation.STATUT_EXPIRE)

        with patch(
            'transport.services.qos_service.verifier_paiement',
            return_value={'statut': Reservation.STATUT_PAYE},
        ):
            verified = self.client.get(f'/api/payment/verifier/{reservation.reference_evex}/')

        self.assertEqual(verified.status_code, status.HTTP_200_OK)
        reservation.refresh_from_db()
        reservation.siege.refresh_from_db()
        self.assertEqual(reservation.statut_paiement, Reservation.STATUT_PAYE)
        self.assertEqual(reservation.siege.statut, Siege.STATUT_OCCUPE)
        self.assertEqual(len(self.client.get('/api/my-bookings/').data), 1)

    @patch('transport.services.qos_service.initier_paiement')
    def test_late_success_with_resold_seat_is_durable_and_refundable(self, initiate):
        from .services import reservation_service
        from .ticketing import perform_ticket_action

        initiate.return_value = {
            'succes': True,
            'transaction_id': 'QOS-LATE-TAKEN-001',
            'reference_qos': 'QOS-LATE-TAKEN-001',
        }
        self.client.force_authenticate(self.passenger)
        initiated = self.client.post('/api/payment/initier/', {
            'voyage_id': str(self.voyage.id),
            'numero_siege': '17',
            'client_nom': 'Passager Mobile',
            'client_telephone': '90123456',
            'montant_billet': 6000,
            'operateur': 'tmoney',
        }, format='json')
        reservation = Reservation.objects.get(reference_evex=initiated.data['reference_evex'])
        reservation_service.terminer_paiement(reservation.reference_evex, Reservation.STATUT_EXPIRE)
        Booking.objects.create(
            user=self.stranger,
            trip=self.trip,
            scheduled_trip=self.voyage,
            passenger_name='Passager du canal web',
            passenger_email='web-passenger@example.com',
            passenger_phone='22891111111',
            seat_number='017',
            status='confirmed',
            payment_method='mobile_money',
            total_price=6000,
        )

        with patch(
            'transport.services.qos_service.verifier_paiement',
            return_value={'statut': Reservation.STATUT_PAYE},
        ):
            verified = self.client.get(f'/api/payment/verifier/{reservation.reference_evex}/')

        self.assertEqual(verified.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(verified.data['statut'], Reservation.STATUT_A_RAPPROCHER)
        reservation.refresh_from_db()
        self.assertEqual(reservation.statut_paiement, Reservation.STATUT_A_RAPPROCHER)
        self.assertIsNotNone(reservation.paid_at)
        self.assertFalse(reservation.historiques_reversement.exists())

        refunded = perform_ticket_action(
            user=self.passenger,
            company=self.company,
            source='mobile',
            pk=reservation.pk,
            action='refund',
            reason='Siège déjà réattribué après expiration.',
        )
        self.assertEqual(refunded['status'], Reservation.STATUT_REMBOURSE)
        self.voyage.refresh_from_db()
        self.assertEqual(self.voyage.available_seats, self.trip.capacity - 1)
        self.assertTrue(Booking.objects.filter(
            scheduled_trip=self.voyage,
            seat_number='017',
            status='confirmed',
        ).exists())

    @patch('transport.services.qos_service.initier_paiement')
    def test_legacy_configured_webhook_confirms_new_mobile_ticket(self, initiate):
        initiate.return_value = {
            'succes': True,
            'transaction_id': 'EVEX-WEBHOOK-COMPAT',
            'reference_qos': 'EVEX-WEBHOOK-COMPAT',
        }
        self.client.force_authenticate(self.passenger)
        initiated = self.client.post('/api/payment/initier/', {
            'voyage_id': str(self.voyage.id),
            'numero_siege': '15',
            'client_nom': 'Passager Mobile',
            'client_telephone': '90123456',
            'montant_billet': 6000,
            'operateur': 'flooz',
        }, format='json')
        reference = initiated.data['reference_evex']

        with patch(
            'transport.services.qos_service.verifier_paiement',
            side_effect=[
                {'statut': Reservation.STATUT_EN_ATTENTE},
                {'statut': Reservation.STATUT_PAYE},
            ],
        ) as verify:
            pending_callback = self.client.post(
                '/api/payments/webhook/',
                {'transref': reference, 'responsecode': '00'},
                format='json',
            )
            paid_callback = self.client.post(
                '/api/payments/webhook/',
                {'transref': reference, 'responsecode': '00'},
                format='json',
            )

        self.assertEqual(pending_callback.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(paid_callback.status_code, status.HTTP_200_OK)
        self.assertEqual(verify.call_count, 2)
        self.assertEqual(Reservation.objects.get(reference_evex=reference).statut_paiement, Reservation.STATUT_PAYE)
        self.assertEqual(len(self.client.get('/api/my-bookings/').data), 1)
