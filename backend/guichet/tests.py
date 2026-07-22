from datetime import time, timedelta

from django.contrib.auth.models import User
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from transport.models import AuditLog, City, Company, ScheduledTrip, Trip

from .models import Agence, AgentGuichet, ControlePassager, Guichet, VenteGuichet


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class GuichetApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin@alpha.test',
            email='admin@alpha.test',
            password='AdminPass123!',
        )
        self.company = Company.objects.create(
            name='Alpha Transport',
            description='Compagnie de test',
            address='Lomé',
            phone='90000001',
            email='contact@alpha.test',
            admin_user=self.admin,
        )
        self.company.admins.add(self.admin)

        self.agent_user = User.objects.create_user(
            username='guichet@alpha.test',
            email='guichet@alpha.test',
            password='AgentPass123!',
            first_name='Ama',
            last_name='Kossi',
        )
        self.agent = AgentGuichet.objects.create(
            user=self.agent_user,
            compagnie=self.company,
            nom='Kossi',
            prenom='Ama',
            telephone='90000002',
            created_by=self.admin,
        )

        self.client_user = User.objects.create_user(
            username='client@test.local',
            email='client@test.local',
            password='ClientPass123!',
        )

        self.other_admin = User.objects.create_user(
            username='admin@beta.test',
            email='admin@beta.test',
            password='AdminPass123!',
        )
        self.other_company = Company.objects.create(
            name='Beta Transport',
            description='Autre compagnie',
            address='Kara',
            phone='90000003',
            email='contact@beta.test',
            admin_user=self.other_admin,
        )
        self.other_company.admins.add(self.other_admin)
        self.other_agent_user = User.objects.create_user(
            username='guichet@beta.test',
            email='guichet@beta.test',
            password='AgentPass123!',
        )
        self.other_agent = AgentGuichet.objects.create(
            user=self.other_agent_user,
            compagnie=self.other_company,
            nom='Beta',
            prenom='Agent',
            telephone='90000005',
            created_by=self.other_admin,
        )

        departure = City.objects.create(name='Lomé Test', region='Maritime')
        arrival = City.objects.create(name='Kara Test', region='Kara')
        self.trip = Trip.objects.create(
            company=self.company,
            departure_city=departure,
            arrival_city=arrival,
            departure_time=time(8, 0),
            arrival_time=time(12, 0),
            price=5000,
            duration=240,
            bus_type='Standard',
            capacity=10,
        )
        self.voyage = ScheduledTrip.objects.create(
            trip=self.trip,
            date=timezone.localdate(),
            is_active=True,
        )

        self.other_trip = Trip.objects.create(
            company=self.other_company,
            departure_city=departure,
            arrival_city=arrival,
            departure_time=time(9, 0),
            arrival_time=time(13, 0),
            price=6000,
            duration=240,
            bus_type='Standard',
            capacity=8,
        )
        self.other_voyage = ScheduledTrip.objects.create(
            trip=self.other_trip,
            date=timezone.localdate(),
            is_active=True,
        )

    def authenticate_agent(self):
        self.client.force_authenticate(user=self.agent_user)

    def test_guichet_login_returns_agent_role(self):
        response = self.client.post(
            '/api/auth/guichet/login/',
            {'email': 'guichet@alpha.test', 'password': 'AgentPass123!'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['user']['is_guichet_agent'])
        self.assertEqual(response.data['user']['role'], 'AGENT_GUICHET')
        self.assertEqual(response.data['user']['company_id'], self.company.id)

    def test_guichet_agent_is_rejected_by_client_portal(self):
        response = self.client.post(
            '/api/auth/client/login/',
            {'email': 'guichet@alpha.test', 'password': 'AgentPass123!'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_shared_email_login_accepts_all_administrative_roles(self):
        super_admin = User.objects.create_superuser(
            username='global@evex.test',
            email='global@evex.test',
            password='GlobalPass123!',
        )
        credentials = [
            (super_admin.email, 'GlobalPass123!', 'SUPER_ADMIN'),
            (self.admin.email, 'AdminPass123!', 'ADMIN_COMPAGNIE'),
            (self.agent_user.email, 'AgentPass123!', 'AGENT_GUICHET'),
        ]

        for email, password, expected_role in credentials:
            with self.subTest(role=expected_role):
                response = self.client.post(
                    '/api/login/',
                    {'email': email, 'password': password},
                    format='json',
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data['user']['role'], expected_role)

    def test_shared_email_login_rejects_disabled_guichet_agent(self):
        self.agent.actif = False
        self.agent.save(update_fields=['actif'])

        response = self.client.post(
            '/api/login/',
            {'email': self.agent_user.email, 'password': 'AgentPass123!'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_returns_frontend_contract(self):
        self.authenticate_agent()

        response = self.client.get('/api/guichet/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['agent']['prenom'], 'Ama')
        self.assertEqual(response.data['billets_vendus'], 0)
        self.assertEqual(response.data['montant_collecte'], 0)
        self.assertGreaterEqual(response.data['voyages_actifs'], 1)
        self.assertIn('affectation_complete', response.data['agent'])
        self.assertIn('ventes_recentes', response.data)
        self.assertIn('controles_recents', response.data)

    def test_dashboard_and_default_trip_list_return_next_active_voyages(self):
        self.voyage.date = timezone.localdate() - timedelta(days=1)
        self.voyage.save(update_fields=['date'])
        future_voyage = ScheduledTrip.objects.filter(
            trip=self.trip,
            date__gt=timezone.localdate(),
            is_active=True,
        ).order_by('date', 'trip__departure_time').first()
        self.assertIsNotNone(future_voyage)
        self.authenticate_agent()

        dashboard_response = self.client.get('/api/guichet/dashboard/')
        default_list_response = self.client.get('/api/guichet/voyages/disponibles/')
        today_list_response = self.client.get(
            '/api/guichet/voyages/disponibles/',
            {'date': timezone.localdate().isoformat()},
        )

        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(dashboard_response.data['voyages_actifs'], 1)
        self.assertIn(future_voyage.id, [trip['id'] for trip in dashboard_response.data['voyages_du_jour']])
        self.assertEqual(default_list_response.status_code, status.HTTP_200_OK)
        self.assertIn(future_voyage.id, [trip['id'] for trip in default_list_response.data])
        self.assertEqual(today_list_response.data, [])

    def test_client_cannot_manage_agents(self):
        self.client.force_authenticate(user=self.client_user)

        list_response = self.client.get('/api/guichet/agents/')
        activation_response = self.client.patch(
            f'/api/guichet/agents/{self.agent.id}/activer/',
            {'actif': False},
            format='json',
        )

        self.assertEqual(list_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(activation_response.status_code, status.HTTP_403_FORBIDDEN)
        self.agent.refresh_from_db()
        self.assertTrue(self.agent.actif)

    def test_company_admin_cannot_update_another_company_agent(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            f'/api/guichet/agents/{self.other_agent.id}/activer/',
            {'actif': False},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.other_agent.refresh_from_db()
        self.assertTrue(self.other_agent.actif)

    def test_company_admin_can_create_list_and_disable_own_agent(self):
        self.client.force_authenticate(user=self.admin)

        create_response = self.client.post(
            '/api/guichet/agents/creer/',
            {
                'nom': 'Mensah',
                'prenom': 'Esi',
                'telephone': '90000007',
                'email': 'esi@alpha.test',
                'password': 'StrongAgentPass456!',
            },
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('token', create_response.data)
        created_agent = AgentGuichet.objects.get(id=create_response.data['agent_id'])
        self.assertEqual(created_agent.compagnie, self.company)

        list_response = self.client.get('/api/guichet/agents/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertIn('esi@alpha.test', [item['email'] for item in list_response.data])

        toggle_response = self.client.patch(
            f'/api/guichet/agents/{created_agent.id}/activer/',
            {'actif': False},
            format='json',
        )
        self.assertEqual(toggle_response.status_code, status.HTTP_200_OK)
        created_agent.refresh_from_db()
        self.assertFalse(created_agent.actif)

    def test_company_admin_can_update_only_own_company_with_audit(self):
        self.client.force_authenticate(user=self.admin)

        own_response = self.client.patch(
            f'/api/companies/{self.company.id}/',
            {'description': 'Description mise à jour'},
            format='json',
        )
        other_response = self.client.patch(
            f'/api/companies/{self.other_company.id}/',
            {'description': 'Modification interdite'},
            format='json',
        )

        self.assertEqual(own_response.status_code, status.HTTP_200_OK)
        self.assertEqual(other_response.status_code, status.HTTP_403_FORBIDDEN)
        self.company.refresh_from_db()
        self.assertEqual(self.company.description, 'Description mise à jour')
        self.assertTrue(AuditLog.objects.filter(
            user=self.admin,
            action='UPDATE',
            model_name='Company',
            object_id=str(self.company.id),
        ).exists())

    def test_company_admin_manages_agency_with_manager_and_soft_delete(self):
        self.client.force_authenticate(user=self.admin)
        city = self.trip.departure_city

        create_response = self.client.post(
            '/api/compagnie/agences/creer/',
            {
                'nom': 'Agence Lomé Gare',
                'ville_id': city.id,
                'adresse': 'Route de la gare routière',
                'telephone': '90000008',
                'gestionnaire_id': self.agent.id,
            },
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        agency_id = create_response.data['id']
        self.assertEqual(create_response.data['ville']['id'], city.id)
        self.assertEqual(create_response.data['gestionnaire']['id'], self.agent.id)
        self.agent.refresh_from_db()
        self.assertEqual(str(self.agent.agence_id), agency_id)

        list_response = self.client.get('/api/compagnie/agences/')
        detail_response = self.client.get(f'/api/compagnie/agences/{agency_id}/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)

        duplicate_manager_response = self.client.post(
            '/api/compagnie/agences/creer/',
            {
                'nom': 'Agence Lomé Deux',
                'ville_id': city.id,
                'adresse': 'Deuxième adresse',
                'telephone': '90000009',
                'gestionnaire_id': self.agent.id,
            },
            format='json',
        )
        self.assertEqual(duplicate_manager_response.status_code, status.HTTP_400_BAD_REQUEST)

        cross_company_response = self.client.patch(
            f'/api/compagnie/agences/{agency_id}/affecter-gestionnaire/',
            {'gestionnaire_id': self.other_agent.id},
            format='json',
        )
        self.assertEqual(cross_company_response.status_code, status.HTTP_400_BAD_REQUEST)

        update_response = self.client.patch(
            f'/api/compagnie/agences/{agency_id}/modifier/',
            {'adresse': 'Nouvelle adresse'},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['adresse'], 'Nouvelle adresse')

        self.client.force_authenticate(user=self.other_admin)
        other_list_response = self.client.get('/api/compagnie/agences/')
        forbidden_detail_response = self.client.get(f'/api/compagnie/agences/{agency_id}/')
        self.assertEqual(other_list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(other_list_response.data, [])
        self.assertEqual(forbidden_detail_response.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(user=self.admin)
        delete_response = self.client.delete(f'/api/compagnie/agences/{agency_id}/supprimer/')
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        self.assertFalse(Agence.objects.filter(id=agency_id).exists())
        self.assertTrue(Agence.all_objects.filter(id=agency_id, is_deleted=True).exists())
        self.assertTrue(AuditLog.objects.filter(
            user=self.admin,
            model_name='Agence',
            object_id=str(agency_id),
            action='DELETE',
        ).exists())

    def test_company_admin_manages_counters_assigns_agent_and_tracks_sale_origin(self):
        self.client.force_authenticate(user=self.admin)
        agency = Agence.objects.create(
            compagnie=self.company,
            nom='Agence Centrale',
            ville=self.trip.departure_city,
            adresse='Boulevard principal',
            telephone='90000010',
            created_by=self.admin,
            updated_by=self.admin,
        )

        create_response = self.client.post(
            f'/api/compagnie/agences/{agency.id}/guichets/creer/',
            {
                'code': 'g01',
                'nom': 'Guichet principal',
                'emplacement': "Hall d'entrée",
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        counter_id = create_response.data['id']
        self.assertEqual(create_response.data['code'], 'G01')

        duplicate_response = self.client.post(
            f'/api/compagnie/agences/{agency.id}/guichets/creer/',
            {'code': 'G01', 'nom': 'Doublon'},
            format='json',
        )
        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)

        assignment_response = self.client.patch(
            f'/api/compagnie/agents/{self.agent.id}/affectation/',
            {'agence_id': str(agency.id), 'guichet_id': counter_id},
            format='json',
        )
        self.assertEqual(assignment_response.status_code, status.HTTP_200_OK)
        self.assertEqual(assignment_response.data['agence']['id'], str(agency.id))
        self.assertEqual(assignment_response.data['guichet']['id'], counter_id)

        self.client.force_authenticate(user=self.other_admin)
        forbidden_response = self.client.get(
            f'/api/compagnie/agences/{agency.id}/guichets/',
        )
        self.assertEqual(forbidden_response.status_code, status.HTTP_404_NOT_FOUND)

        self.authenticate_agent()
        sale_response = self.client.post(
            '/api/guichet/ventes/creer/',
            {
                'voyage_id': self.voyage.id,
                'numero_siege': 3,
                'client_nom': 'Client Agence',
                'client_telephone': '90000011',
                'mode_paiement': 'cash',
            },
            format='json',
        )
        self.assertEqual(sale_response.status_code, status.HTTP_201_CREATED)
        vente = VenteGuichet.objects.get(reference_vente=sale_response.data['reference_vente'])
        self.assertEqual(vente.agence, agency)
        self.assertEqual(str(vente.guichet_id), counter_id)

        self.client.force_authenticate(user=self.admin)
        list_response = self.client.get(f'/api/compagnie/agences/{agency.id}/guichets/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]['nb_agents'], 1)
        self.assertEqual(list_response.data[0]['billets_vendus_mois'], 1)

        delete_response = self.client.delete(
            f'/api/compagnie/agences/{agency.id}/guichets/{counter_id}/supprimer/',
        )
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        self.agent.refresh_from_db()
        self.assertEqual(self.agent.agence, agency)
        self.assertIsNone(self.agent.guichet)
        self.assertFalse(Guichet.objects.filter(id=counter_id).exists())
        self.assertTrue(Guichet.all_objects.filter(id=counter_id, is_deleted=True).exists())
        self.assertTrue(AuditLog.objects.filter(
            user=self.admin,
            model_name='Guichet',
            object_id=counter_id,
            action='DELETE',
        ).exists())

    def test_integer_seat_route_is_scoped_to_agent_company(self):
        self.authenticate_agent()

        own_response = self.client.get(f'/api/guichet/voyages/{self.voyage.id}/sieges/')
        other_response = self.client.get(f'/api/guichet/voyages/{self.other_voyage.id}/sieges/')

        self.assertEqual(own_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(own_response.data['sieges']), self.trip.capacity)
        self.assertEqual(other_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sale_updates_availability_and_rejects_duplicate_seat(self):
        self.authenticate_agent()
        payload = {
            'voyage_id': self.voyage.id,
            'numero_siege': 1,
            'client_nom': 'Client Test',
            'client_telephone': '90000004',
            'mode_paiement': 'cash',
        }

        response = self.client.post('/api/guichet/ventes/creer/', payload, format='json')
        duplicate_response = self.client.post('/api/guichet/ventes/creer/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['qr_code_base64'])
        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(VenteGuichet.objects.count(), 1)
        self.voyage.refresh_from_db()
        self.assertEqual(self.voyage.available_seats, self.trip.capacity - 1)

    def test_sale_history_filters_and_only_seller_can_cancel(self):
        self.authenticate_agent()
        sale_response = self.client.post(
            '/api/guichet/ventes/creer/',
            {
                'voyage_id': self.voyage.id,
                'numero_siege': 4,
                'client_nom': 'Client Historique',
                'client_telephone': '90000012',
                'mode_paiement': 'flooz',
            },
            format='json',
        )
        self.assertEqual(sale_response.status_code, status.HTTP_201_CREATED)
        reference = sale_response.data['reference_vente']

        history_response = self.client.get(
            '/api/guichet/ventes/historique/',
            {'q': 'Historique', 'mode_paiement': 'flooz'},
        )
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        self.assertEqual(history_response.data['total_billets'], 1)
        self.assertEqual(history_response.data['total_valides'], 1)
        self.assertEqual(history_response.data['ventes'][0]['reference_vente'], reference)
        self.assertTrue(history_response.data['ventes'][0]['annulable'])

        colleague_user = User.objects.create_user(
            username='collegue@alpha.test',
            email='collegue@alpha.test',
            password='AgentPass123!',
        )
        AgentGuichet.objects.create(
            user=colleague_user,
            compagnie=self.company,
            nom='Agent',
            prenom='Collègue',
            telephone='90000013',
            created_by=self.admin,
        )
        self.client.force_authenticate(user=colleague_user)
        forbidden_cancel = self.client.delete(f'/api/guichet/ventes/{reference}/annuler/')
        self.assertEqual(forbidden_cancel.status_code, status.HTTP_404_NOT_FOUND)

        self.authenticate_agent()
        cancel_response = self.client.delete(f'/api/guichet/ventes/{reference}/annuler/')
        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
        history_after_cancel = self.client.get('/api/guichet/ventes/historique/')
        self.assertEqual(history_after_cancel.data['total_annules'], 1)
        self.assertEqual(history_after_cancel.data['total_montant'], 0)

    def test_scanner_marks_ticket_used_and_exposes_control_history(self):
        self.authenticate_agent()
        sale_response = self.client.post(
            '/api/guichet/ventes/creer/',
            {
                'voyage_id': self.voyage.id,
                'numero_siege': 5,
                'client_nom': 'Client Scanner',
                'client_telephone': '90000014',
                'mode_paiement': 'cash',
            },
            format='json',
        )
        qr_data = sale_response.data['qr_code_data']

        first_scan = self.client.post(
            '/api/guichet/controle/scanner/',
            {'qr_code_data': qr_data},
            format='json',
        )
        second_scan = self.client.post(
            '/api/guichet/controle/scanner/',
            {'qr_code_data': qr_data},
            format='json',
        )
        history_response = self.client.get('/api/guichet/controle/historique/')

        self.assertEqual(first_scan.status_code, status.HTTP_200_OK)
        self.assertEqual(first_scan.data['resultat'], 'valide')
        self.assertEqual(second_scan.data['resultat'], 'deja_utilise')
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        self.assertEqual(history_response.data['valides'], 1)
        self.assertEqual(history_response.data['deja_utilises'], 1)

    def test_company_stats_include_guichet_sales_and_agent_performance(self):
        self.authenticate_agent()
        sale_response = self.client.post(
            '/api/guichet/ventes/creer/',
            {
                'voyage_id': self.voyage.id,
                'numero_siege': 2,
                'client_nom': 'Client Guichet',
                'client_telephone': '90000006',
                'mode_paiement': 'cash',
            },
            format='json',
        )
        self.assertEqual(sale_response.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/companies/{self.company.id}/stats/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['mobile_bookings'], 0)
        self.assertEqual(response.data['guichet_sales'], 1)
        self.assertEqual(response.data['total_bookings'], 1)
        self.assertEqual(response.data['guichet_revenue'], '5000.00')
        self.assertEqual(response.data['agency_performance'][0]['tickets'], 1)
        self.assertEqual(response.data['recent_guichet_sales'][0]['source'], 'guichet')

    def test_agent_cannot_sell_for_another_company(self):
        self.authenticate_agent()

        response = self.client.post(
            '/api/guichet/ventes/creer/',
            {
                'voyage_id': self.other_voyage.id,
                'numero_siege': 1,
                'client_nom': 'Client Test',
                'client_telephone': '90000004',
                'mode_paiement': 'cash',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(VenteGuichet.objects.count(), 0)

    def test_unknown_qr_is_invalid_without_server_error(self):
        self.authenticate_agent()

        response = self.client.post(
            '/api/guichet/controle/scanner/',
            {'qr_code_data': {'type': 'guichet', 'reference': 'INCONNUE'}},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['resultat'], 'invalide')
        self.assertEqual(ControlePassager.objects.count(), 0)
