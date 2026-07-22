from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from transport.models import ScheduledTrip, Siege, Reservation, Booking, PlatformConfiguration
from .models import Agence, AgentGuichet, Guichet, VenteGuichet, ControlePassager
from .serializers import AgenceSerializer, AgentGuichetSerializer, GuichetSerializer, VenteGuichetSerializer, ControlePassagerSerializer, VoyageDisponibleSerializer, PassagerSerializer
from .permissions import IsAgentGuichet, IsAdminCompagnie, get_admin_company
from .utils_qr import generer_qr_code_base64
from transport.models.audit import log_action
import uuid
import json


def get_client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR')


def agence_snapshot(agence):
    return {
        'nom': agence.nom,
        'ville_id': agence.ville_id,
        'adresse': agence.adresse,
        'telephone': agence.telephone,
        'gestionnaire_id': agence.gestionnaire_id,
        'is_active': agence.is_active,
        'is_deleted': agence.is_deleted,
    }


def tracer_agence(request, agence, action, old_values=None, new_values=None):
    old_values = old_values or {}
    new_values = new_values or {}
    changed_fields = set(old_values) | set(new_values)
    logged = False
    for field in changed_fields:
        old_value = old_values.get(field)
        new_value = new_values.get(field)
        if old_value == new_value:
            continue
        log_action(
            user=request.user,
            action=action,
            instance=agence,
            old_values={field: old_value},
            new_values={field: new_value},
            ip_address=get_client_ip(request),
        )
        logged = True
    if not logged:
        log_action(
            user=request.user,
            action=action,
            instance=agence,
            old_values=old_values or None,
            new_values=new_values or None,
            ip_address=get_client_ip(request),
        )


def guichet_snapshot(guichet):
    return {
        'agence_id': str(guichet.agence_id),
        'code': guichet.code,
        'nom': guichet.nom,
        'emplacement': guichet.emplacement,
        'is_active': guichet.is_active,
        'is_deleted': guichet.is_deleted,
    }


def agent_affectation_snapshot(agent):
    return {
        'agence_id': str(agent.agence_id) if agent.agence_id else None,
        'guichet_id': str(agent.guichet_id) if agent.guichet_id else None,
    }


def tracer_changements(request, instance, action, old_values=None, new_values=None):
    old_values = old_values or {}
    new_values = new_values or {}
    changed_fields = set(old_values) | set(new_values)
    logged = False
    for field in changed_fields:
        old_value = old_values.get(field)
        new_value = new_values.get(field)
        if old_value == new_value:
            continue
        log_action(
            user=request.user,
            action=action,
            instance=instance,
            old_values={field: old_value},
            new_values={field: new_value},
            ip_address=get_client_ip(request),
        )
        logged = True
    if not logged:
        log_action(
            user=request.user,
            action=action,
            instance=instance,
            old_values=old_values or None,
            new_values=new_values or None,
            ip_address=get_client_ip(request),
        )


def synchroniser_gestionnaire_agence(agence):
    if not agence.gestionnaire_id:
        return
    gestionnaire = agence.gestionnaire
    fields = []
    if gestionnaire.agence_id != agence.id:
        gestionnaire.agence = agence
        fields.append('agence')
    if gestionnaire.guichet_id and gestionnaire.guichet.agence_id != agence.id:
        gestionnaire.guichet = None
        fields.append('guichet')
    if fields:
        gestionnaire.save(update_fields=fields)


def agent_payload(agent):
    agence = agent.agence
    guichet = agent.guichet
    return {
        'id': agent.id,
        'nom': agent.nom,
        'prenom': agent.prenom,
        'telephone': agent.telephone,
        'email': agent.user.email,
        'actif': agent.actif,
        'agence': ({'id': str(agence.id), 'nom': agence.nom} if agence else None),
        'guichet': ({
            'id': str(guichet.id),
            'code': guichet.code,
            'nom': guichet.nom,
        } if guichet else None),
        'est_gestionnaire': bool(
            agence and agence.gestionnaire_id == agent.id
        ),
    }


class ListeAgencesView(APIView):
    permission_classes = [IsAdminCompagnie]

    def get(self, request):
        compagnie = get_admin_company(request.user)
        agences = Agence.objects.filter(compagnie=compagnie).select_related(
            'ville', 'gestionnaire__user'
        )
        ville_id = request.query_params.get('ville_id')
        statut = request.query_params.get('statut')
        if ville_id:
            agences = agences.filter(ville_id=ville_id)
        if statut == 'active':
            agences = agences.filter(is_active=True)
        elif statut == 'inactive':
            agences = agences.filter(is_active=False)
        return Response(AgenceSerializer(agences, many=True, context={'compagnie': compagnie}).data)


class CreerAgenceView(APIView):
    permission_classes = [IsAdminCompagnie]

    def post(self, request):
        compagnie = get_admin_company(request.user)
        serializer = AgenceSerializer(
            data=request.data,
            context={'compagnie': compagnie},
        )
        serializer.is_valid(raise_exception=True)
        agence = serializer.save(
            compagnie=compagnie,
            created_by=request.user,
            updated_by=request.user,
        )
        synchroniser_gestionnaire_agence(agence)
        tracer_agence(request, agence, 'CREATE', new_values=agence_snapshot(agence))
        return Response(
            AgenceSerializer(agence, context={'compagnie': compagnie}).data,
            status=status.HTTP_201_CREATED,
        )


class DetailAgenceView(APIView):
    permission_classes = [IsAdminCompagnie]

    def get_agence(self, request, id):
        try:
            return Agence.objects.select_related('ville', 'gestionnaire__user').get(
                id=id,
                compagnie=get_admin_company(request.user),
            )
        except Agence.DoesNotExist:
            return None

    def get(self, request, id=None):
        agence = self.get_agence(request, id)
        if not agence:
            return Response({'detail': 'Agence introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AgenceSerializer(
            agence,
            context={'compagnie': agence.compagnie},
        ).data)


class ModifierAgenceView(DetailAgenceView):
    def patch(self, request, id=None):
        agence = self.get_agence(request, id)
        if not agence:
            return Response({'detail': 'Agence introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        old_values = agence_snapshot(agence)
        serializer = AgenceSerializer(
            agence,
            data=request.data,
            partial=True,
            context={'compagnie': agence.compagnie},
        )
        serializer.is_valid(raise_exception=True)
        agence = serializer.save(updated_by=request.user)
        synchroniser_gestionnaire_agence(agence)
        tracer_agence(request, agence, 'UPDATE', old_values, agence_snapshot(agence))
        return Response(AgenceSerializer(
            agence,
            context={'compagnie': agence.compagnie},
        ).data)


class AffecterGestionnaireAgenceView(DetailAgenceView):
    def patch(self, request, id=None):
        if 'gestionnaire_id' not in request.data:
            return Response(
                {'detail': 'Le champ gestionnaire_id est requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        agence = self.get_agence(request, id)
        if not agence:
            return Response({'detail': 'Agence introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        old_values = agence_snapshot(agence)
        serializer = AgenceSerializer(
            agence,
            data={'gestionnaire_id': request.data.get('gestionnaire_id')},
            partial=True,
            context={'compagnie': agence.compagnie},
        )
        serializer.is_valid(raise_exception=True)
        agence = serializer.save(updated_by=request.user)
        synchroniser_gestionnaire_agence(agence)
        tracer_agence(request, agence, 'UPDATE', old_values, agence_snapshot(agence))
        return Response(AgenceSerializer(
            agence,
            context={'compagnie': agence.compagnie},
        ).data)


class SupprimerAgenceView(DetailAgenceView):
    def delete(self, request, id=None):
        agence = self.get_agence(request, id)
        if not agence:
            return Response({'detail': 'Agence introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        old_values = agence_snapshot(agence)
        with transaction.atomic():
            agence.agents.update(agence=None, guichet=None)
            for guichet in agence.guichets.all():
                guichet.is_active = False
                guichet.updated_by = request.user
                guichet.save(update_fields=['is_active', 'updated_by', 'updated_at'])
                guichet.soft_delete(user=request.user)
            agence.is_active = False
            agence.updated_by = request.user
            agence.save(update_fields=['is_active', 'updated_by', 'updated_at'])
            agence.soft_delete(user=request.user)
        tracer_agence(request, agence, 'DELETE', old_values, agence_snapshot(agence))
        return Response({'status': 'ok', 'detail': 'Agence désactivée.'})


class ListeGuichetsAgenceView(DetailAgenceView):
    def get(self, request, id=None):
        agence = self.get_agence(request, id)
        if not agence:
            return Response({'detail': 'Agence introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        guichets = agence.guichets.all().prefetch_related('agents')
        return Response(GuichetSerializer(
            guichets,
            many=True,
            context={'agence': agence},
        ).data)


class CreerGuichetAgenceView(DetailAgenceView):
    def post(self, request, id=None):
        agence = self.get_agence(request, id)
        if not agence:
            return Response({'detail': 'Agence introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if not agence.is_active:
            return Response(
                {'detail': "Impossible de créer un guichet dans une agence désactivée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = GuichetSerializer(data=request.data, context={'agence': agence})
        serializer.is_valid(raise_exception=True)
        guichet = serializer.save(
            agence=agence,
            created_by=request.user,
            updated_by=request.user,
        )
        tracer_changements(
            request,
            guichet,
            'CREATE',
            new_values=guichet_snapshot(guichet),
        )
        return Response(
            GuichetSerializer(guichet, context={'agence': agence}).data,
            status=status.HTTP_201_CREATED,
        )


class GuichetAgenceMixin(DetailAgenceView):
    def get_guichet(self, request, id, guichet_id):
        agence = self.get_agence(request, id)
        if not agence:
            return None, None
        try:
            guichet = Guichet.objects.prefetch_related('agents').get(
                id=guichet_id,
                agence=agence,
            )
        except Guichet.DoesNotExist:
            return agence, None
        return agence, guichet


class ModifierGuichetAgenceView(GuichetAgenceMixin):
    def patch(self, request, id=None, guichet_id=None):
        agence, guichet = self.get_guichet(request, id, guichet_id)
        if not agence or not guichet:
            return Response({'detail': 'Guichet introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        old_values = guichet_snapshot(guichet)
        serializer = GuichetSerializer(
            guichet,
            data=request.data,
            partial=True,
            context={'agence': agence},
        )
        serializer.is_valid(raise_exception=True)
        guichet = serializer.save(updated_by=request.user)
        tracer_changements(
            request,
            guichet,
            'UPDATE',
            old_values,
            guichet_snapshot(guichet),
        )
        return Response(GuichetSerializer(guichet, context={'agence': agence}).data)


class SupprimerGuichetAgenceView(GuichetAgenceMixin):
    def delete(self, request, id=None, guichet_id=None):
        agence, guichet = self.get_guichet(request, id, guichet_id)
        if not agence or not guichet:
            return Response({'detail': 'Guichet introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        old_values = guichet_snapshot(guichet)
        with transaction.atomic():
            guichet.agents.update(guichet=None)
            guichet.is_active = False
            guichet.updated_by = request.user
            guichet.save(update_fields=['is_active', 'updated_by', 'updated_at'])
            guichet.soft_delete(user=request.user)
        tracer_changements(
            request,
            guichet,
            'DELETE',
            old_values,
            guichet_snapshot(guichet),
        )
        return Response({'status': 'ok', 'detail': 'Guichet désactivé.'})


class AffecterAgentAgenceView(APIView):
    permission_classes = [IsAdminCompagnie]

    def patch(self, request, id=None):
        compagnie = get_admin_company(request.user)
        try:
            agent = AgentGuichet.objects.select_related(
                'user', 'agence', 'guichet',
            ).get(id=id, compagnie=compagnie)
        except AgentGuichet.DoesNotExist:
            return Response({'detail': 'Agent introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        agence_id = request.data.get('agence_id')
        guichet_id = request.data.get('guichet_id')
        agence = None
        guichet = None
        if agence_id:
            try:
                agence = Agence.objects.get(
                    id=agence_id,
                    compagnie=compagnie,
                    is_active=True,
                )
            except (Agence.DoesNotExist, ValueError):
                return Response({'detail': 'Agence introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if guichet_id:
            if not agence:
                return Response(
                    {'detail': 'Une agence est requise pour affecter un guichet.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                guichet = Guichet.objects.get(
                    id=guichet_id,
                    agence=agence,
                    is_active=True,
                )
            except (Guichet.DoesNotExist, ValueError):
                return Response({'detail': 'Guichet introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        agence_dirigee = Agence.objects.filter(gestionnaire=agent).first()
        if agence_dirigee and agence_dirigee != agence:
            return Response(
                {'detail': "Retirez d'abord cet agent de son rôle de gestionnaire."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_values = agent_affectation_snapshot(agent)
        agent.agence = agence
        agent.guichet = guichet
        agent.save(update_fields=['agence', 'guichet'])
        tracer_changements(
            request,
            agent,
            'UPDATE',
            old_values,
            agent_affectation_snapshot(agent),
        )
        agent = AgentGuichet.objects.select_related(
            'user', 'agence', 'guichet',
        ).get(pk=agent.pk)
        return Response(agent_payload(agent))


class CreerAgentView(APIView):
    permission_classes = [IsAdminCompagnie]

    def post(self, request):
        user = request.user
        compagnie = get_admin_company(user)
        data = request.data
        email = str(data.get('email') or '').strip().lower()
        password = data.get('password')
        nom = str(data.get('nom') or '').strip()
        prenom = str(data.get('prenom') or '').strip()
        telephone = str(data.get('telephone') or '').strip()
        if not email or not password:
            return Response({'detail': 'Email et mot de passe requis.'}, status=400)
        if not nom or not prenom or not telephone:
            return Response({'detail': 'Nom, prénom et téléphone requis.'}, status=400)
        if User.objects.filter(username__iexact=email).exists() or User.objects.filter(email__iexact=email).exists():
            return Response({'detail': 'Un utilisateur utilise déjà cet email.'}, status=400)
        try:
            validate_password(password)
        except ValidationError as validation_error:
            return Response({'detail': ' '.join(validation_error.messages)}, status=400)
        with transaction.atomic():
            u = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=prenom,
                last_name=nom,
            )
            agent = AgentGuichet.objects.create(
                user=u,
                compagnie=compagnie,
                nom=nom,
                prenom=prenom,
                telephone=telephone,
                created_by=user,
            )
            return Response({
                'agent_id': agent.id,
                'nom': agent.nom,
                'prenom': agent.prenom,
                'telephone': agent.telephone,
                'email': u.email,
                'actif': agent.actif,
            }, status=201)


class ListeAgentsView(APIView):
    permission_classes = [IsAdminCompagnie]

    def get(self, request):
        compagnie = get_admin_company(request.user)
        qs = AgentGuichet.objects.filter(compagnie=compagnie).select_related(
            'user', 'agence', 'guichet',
        )
        result = []
        for a in qs:
            ventes = VenteGuichet.objects.filter(agent=a, statut__in=['valide', 'utilise'])
            ventes_today = ventes.filter(created_at__date=timezone.localdate()).count()
            ventes_total = ventes.count()
            item = agent_payload(a)
            item.update({
                'nb_ventes_aujourd_hui': ventes_today,
                'nb_ventes_total': ventes_total,
            })
            result.append(item)
        return Response(result)


class ActiverAgentView(APIView):
    permission_classes = [IsAdminCompagnie]

    def patch(self, request, id=None):
        actif = request.data.get('actif')
        if not isinstance(actif, bool):
            return Response({'detail': 'Le champ actif doit être un booléen.'}, status=400)
        try:
            agent = AgentGuichet.objects.get(id=id, compagnie=get_admin_company(request.user))
        except AgentGuichet.DoesNotExist:
            return Response({'detail':'Agent non trouvé'}, status=404)
        agent.actif = actif
        agent.save(update_fields=['actif'])
        return Response({'status':'ok','actif':agent.actif})


def vente_payload(vente):
    return {
        'reference_vente': vente.reference_vente,
        'client_nom': vente.client_nom,
        'client_telephone': vente.client_telephone,
        'voyage_id': vente.voyage_id,
        'trajet': f'{vente.voyage.trip.departure_city.name} → {vente.voyage.trip.arrival_city.name}',
        'date_voyage': vente.voyage.date,
        'heure_depart': vente.voyage.trip.departure_time,
        'numero_siege': vente.siege.numero,
        'montant_billet': vente.montant_billet,
        'frais_evex': vente.frais_evex,
        'montant_total': vente.montant_total,
        'mode_paiement': vente.mode_paiement,
        'statut': vente.statut,
        'agence': vente.agence.nom if vente.agence else None,
        'guichet': vente.guichet.nom if vente.guichet else None,
        'created_at': vente.created_at,
        'annulable': (
            vente.statut == 'valide'
            and vente.voyage.date >= timezone.localdate()
        ),
    }


def controle_payload(controle):
    reference = None
    source = None
    if controle.vente:
        reference = controle.vente.reference_vente
        source = 'guichet'
    elif controle.reservation:
        reference = controle.reservation.reference_evex
        source = 'mobile'
    return {
        'id': str(controle.id),
        'reference': reference,
        'source': source,
        'resultat': controle.resultat,
        'message': controle.message,
        'voyage_id': controle.voyage_id,
        'created_at': controle.created_at,
    }


class DashboardGuichetView(APIView):
    permission_classes = [IsAgentGuichet]

    def get(self, request):
        agent = AgentGuichet.objects.select_related(
            'user', 'compagnie', 'agence__ville', 'guichet',
        ).get(user=request.user)
        today = timezone.localdate()
        ventes_du_jour = VenteGuichet.objects.filter(
            agent=agent,
            created_at__date=today,
            statut__in=['valide', 'utilise'],
        )
        billets_vendus = ventes_du_jour.count()
        montant_collecte = ventes_du_jour.aggregate(total=Sum('montant_total'))['total'] or 0
        prochains_voyages = ScheduledTrip.objects.filter(
            trip__company=agent.compagnie,
            date__gte=today,
            is_active=True,
        ).select_related(
            'trip__departure_city', 'trip__arrival_city',
        ).order_by('date', 'trip__departure_time')
        voyages_actifs = prochains_voyages.count()
        voyages = prochains_voyages[:8]
        voyages_list = []
        for v in voyages:
            places_total = v.trip.capacity
            places_libres = v.available_seats if v.available_seats is not None else places_total
            places_occupees = places_total - places_libres
            voyages_list.append({
                'id': v.id,
                'trajet': f"{v.trip.departure_city.name}→{v.trip.arrival_city.name}",
                'date': v.date,
                'heure_depart': v.trip.departure_time,
                'heure_arrivee': v.trip.arrival_time,
                'prix': v.trip.price,
                'places_libres': places_libres,
                'places_occupees': places_occupees,
                'places_total': places_total,
                'statut': 'actif' if v.is_active else 'inactif',
            })
        paiement = {
            row['mode_paiement']: {
                'billets': row['billets'],
                'montant': row['montant'] or 0,
            }
            for row in ventes_du_jour.values('mode_paiement').annotate(
                billets=Count('id'),
                montant=Sum('montant_total'),
            )
        }
        ventes_recentes = VenteGuichet.objects.filter(agent=agent).select_related(
            'voyage__trip__departure_city',
            'voyage__trip__arrival_city',
            'siege', 'agence', 'guichet',
        ).order_by('-created_at')[:5]
        controles_recents = ControlePassager.objects.filter(agent=agent).select_related(
            'vente', 'reservation', 'voyage',
        ).order_by('-created_at')[:5]
        return Response({
            'agent': {
                'id': agent.id,
                'nom': agent.nom,
                'prenom': agent.prenom,
                'email': agent.user.email,
                'compagnie': agent.compagnie.name,
                'agence': ({
                    'id': str(agent.agence_id),
                    'nom': agent.agence.nom,
                    'ville': agent.agence.ville.name,
                    'adresse': agent.agence.adresse,
                } if agent.agence else None),
                'guichet': ({
                    'id': str(agent.guichet_id),
                    'code': agent.guichet.code,
                    'nom': agent.guichet.nom,
                } if agent.guichet else None),
                'affectation_complete': bool(agent.agence_id and agent.guichet_id),
            },
            'billets_vendus': billets_vendus,
            'montant_collecte': montant_collecte,
            'voyages_actifs': voyages_actifs,
            'stats_aujourd_hui': {
                'billets_vendus': billets_vendus,
                'montant_collecte': montant_collecte,
                'voyages_actifs': voyages_actifs,
                'paiements': paiement,
            },
            'voyages_du_jour': voyages_list,
            'ventes_recentes': [vente_payload(vente) for vente in ventes_recentes],
            'controles_recents': [controle_payload(controle) for controle in controles_recents],
        })


class VoyagesDisponiblesView(APIView):
    permission_classes = [IsAgentGuichet]

    def get(self, request):
        agent = request.user.agentguichet
        date = request.query_params.get('date')
        if date:
            try:
                from datetime import datetime
                date_obj = datetime.fromisoformat(date).date()
            except Exception:
                date_obj = timezone.localdate()
            date_filter = {'date': date_obj}
        else:
            date_filter = {'date__gte': timezone.localdate()}
        qs = ScheduledTrip.objects.filter(
            trip__company=agent.compagnie,
            is_active=True,
            **date_filter,
        ).select_related(
            'trip__departure_city', 'trip__arrival_city',
        ).order_by('date', 'trip__departure_time')
        serializer = VoyageDisponibleSerializer(qs, many=True)
        return Response(serializer.data)


class SiegesVoyageView(APIView):
    permission_classes = [IsAgentGuichet]

    def get(self, request, vid=None):
        try:
            voyage = ScheduledTrip.objects.select_related(
                'trip__departure_city', 'trip__arrival_city',
            ).get(
                id=vid,
                trip__company=request.user.agentguichet.compagnie,
            )
        except ScheduledTrip.DoesNotExist:
            return Response({'detail':'Voyage introuvable'}, status=404)
        existing_seats = {seat.numero: seat for seat in voyage.sieges.all()}
        booked_seats = {
            int(number)
            for number in Booking.objects.filter(
                scheduled_trip=voyage,
                status__in=['confirmed', 'pending'],
            ).values_list('seat_number', flat=True)
            if str(number).isdigit()
        }
        seat_list = []
        for number in range(1, voyage.trip.capacity + 1):
            seat = existing_seats.get(number)
            seat_status = seat.statut if seat else Siege.STATUT_LIBRE
            if number in booked_seats:
                seat_status = Siege.STATUT_OCCUPE
            seat_list.append({
                'id': str(seat.id) if seat else None,
                'numero': number,
                'statut': seat_status,
            })

        libres = sum(1 for seat in seat_list if seat['statut'] == Siege.STATUT_LIBRE)
        resume = {
            'total': voyage.trip.capacity,
            'libres': libres,
            'occupes': voyage.trip.capacity - libres,
        }
        return Response({
            'voyage_id': voyage.id,
            'voyage': {
                'trajet': f'{voyage.trip.departure_city.name} → {voyage.trip.arrival_city.name}',
                'date': voyage.date,
                'heure_depart': voyage.trip.departure_time,
                'prix': voyage.trip.price,
            },
            'sieges': seat_list,
            'resume': resume,
        })


class CreerVenteView(APIView):
    permission_classes = [IsAgentGuichet]

    def post(self, request):
        # Relire l'affectation au moment exact de la vente afin de conserver
        # l'agence et le guichet courants, même si l'agent vient d'être déplacé.
        agent = AgentGuichet.objects.select_related('agence', 'guichet').get(
            user=request.user,
        )
        data = request.data
        voyage_id = data.get('voyage_id')
        numero_siege = data.get('numero_siege')
        client_nom = str(data.get('client_nom') or '').strip()
        client_telephone = str(data.get('client_telephone') or '').strip()
        mode_paiement = data.get('mode_paiement')
        if not all([voyage_id, numero_siege, client_nom, client_telephone, mode_paiement]):
            return Response({'detail':'Champs manquants'}, status=400)
        if mode_paiement not in dict(VenteGuichet.MODE_CHOICES):
            return Response({'detail': 'Mode de paiement invalide.'}, status=400)
        try:
            seat_number = int(numero_siege)
        except (TypeError, ValueError):
            return Response({'detail': 'Numéro de siège invalide.'}, status=400)
        try:
            with transaction.atomic():
                voyage = ScheduledTrip.objects.select_for_update().select_related('trip__company').get(
                    id=voyage_id,
                    trip__company=agent.compagnie,
                    is_active=True,
                    date__gte=timezone.localdate(),
                )
                if seat_number < 1 or seat_number > voyage.trip.capacity:
                    return Response({'detail': 'Numéro de siège hors capacité.'}, status=400)
                if Booking.objects.filter(
                    scheduled_trip=voyage,
                    seat_number=str(seat_number),
                    status__in=['confirmed', 'pending'],
                ).exists():
                    return Response({'detail': 'Siège non disponible.'}, status=400)

                siege, _ = Siege.objects.select_for_update().get_or_create(
                    voyage=voyage,
                    numero=seat_number,
                )
                if siege.statut != Siege.STATUT_LIBRE:
                    return Response({'detail':'Siège non disponible.'}, status=400)
                siege.statut = Siege.STATUT_OCCUPE
                siege.save(update_fields=['statut'])
                montant_billet = int(voyage.trip.price)
                frais_evex = PlatformConfiguration.load().service_fee
                montant_total = montant_billet + frais_evex
                ref = f"GUICHET-{timezone.localdate().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
                qr_payload = {
                    'type': 'guichet',
                    'reference': ref,
                    'voyage_id': str(voyage.id),
                    'siege': seat_number,
                    'client': client_nom,
                    'compagnie': voyage.trip.company.name,
                    'agence': agent.agence.nom if agent.agence else None,
                    'guichet': agent.guichet.code if agent.guichet else None,
                }
                qr_b64 = generer_qr_code_base64(qr_payload)
                vente = VenteGuichet.objects.create(
                    agent=agent,
                    agence=agent.agence,
                    guichet=agent.guichet,
                    voyage=voyage,
                    siege=siege,
                    client_nom=client_nom,
                    client_telephone=client_telephone,
                    montant_billet=montant_billet,
                    frais_evex=frais_evex,
                    montant_total=montant_total,
                    mode_paiement=mode_paiement,
                    reference_vente=ref,
                    qr_code_data=json.dumps(qr_payload),
                )
                voyage.available_seats = max(0, voyage.available_seats - 1)
                voyage.save(update_fields=['available_seats'])
                return Response({
                    'reference_vente': vente.reference_vente,
                    'qr_code_data': qr_payload,
                    'qr_code_base64': qr_b64,
                    'client_nom': vente.client_nom,
                    'client_telephone': vente.client_telephone,
                    'voyage': {'trajet': f"{voyage.trip.departure_city.name}→{voyage.trip.arrival_city.name}", 'heure_depart': voyage.trip.departure_time, 'date': voyage.date},
                    'siege': siege.numero,
                    'montant_billet': montant_billet,
                    'frais_evex': frais_evex,
                    'montant_total': montant_total,
                    'mode_paiement': vente.mode_paiement,
                    'agence': agent.agence.nom if agent.agence else None,
                    'guichet': agent.guichet.nom if agent.guichet else None,
                    'created_at': vente.created_at,
                }, status=201)
        except ScheduledTrip.DoesNotExist:
            return Response({'detail':'Voyage introuvable'}, status=404)


class AnnulerVenteView(APIView):
    permission_classes = [IsAgentGuichet]

    def delete(self, request, ref=None):
        agent = request.user.agentguichet
        with transaction.atomic():
            try:
                vente = VenteGuichet.objects.select_for_update().select_related(
                    'voyage__trip',
                    'siege',
                ).get(
                    reference_vente=ref,
                    agent=agent,
                )
            except VenteGuichet.DoesNotExist:
                return Response({'detail':'Vente introuvable'}, status=404)
            if vente.statut == 'annule':
                return Response({'detail': 'Vente déjà annulée.'}, status=400)
            if vente.statut == 'utilise':
                return Response({'detail': 'Un billet déjà utilisé ne peut pas être annulé.'}, status=400)
            if vente.voyage.date < timezone.localdate():
                return Response({'detail':'Voyage déjà passé'}, status=400)

            vente.statut = 'annule'
            vente.save(update_fields=['statut'])
            vente.siege.statut = Siege.STATUT_LIBRE
            vente.siege.save(update_fields=['statut'])
            vente.voyage.available_seats = min(
                vente.voyage.trip.capacity,
                vente.voyage.available_seats + 1,
            )
            vente.voyage.save(update_fields=['available_seats'])
        return Response({'status':'ok'})


class ScannerQRView(APIView):
    permission_classes = [IsAgentGuichet]

    def post(self, request):
        agent = request.user.agentguichet
        raw = request.data.get('qr_code_data')
        try:
            data = json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            return Response({'detail':'QR invalide'}, status=400)
        if not isinstance(data, dict):
            return Response({'detail': 'QR invalide'}, status=400)

        type_ = data.get('type')
        resultat = 'invalide'
        message = 'QR invalide'
        vente_obj = None
        reservation_obj = None
        voyage_obj = None
        if type_ == 'guichet':
            ref = data.get('reference')
            try:
                vente_obj = VenteGuichet.objects.select_related('voyage__trip', 'siege').get(
                    reference_vente=ref,
                    voyage__trip__company=agent.compagnie,
                )
                voyage_obj = vente_obj.voyage
                if vente_obj.statut == 'utilise':
                    resultat = 'deja_utilise'
                    message = 'Billet déjà utilisé'
                elif vente_obj.statut == 'annule':
                    resultat = 'invalide'
                    message = 'Billet annulé'
                else:
                    vente_obj.statut = 'utilise'
                    vente_obj.save(update_fields=['statut'])
                    resultat = 'valide'
                    message = f"Billet valide — {vente_obj.client_nom} — Siège {vente_obj.siege.numero}"
            except VenteGuichet.DoesNotExist:
                resultat = 'invalide'
                message = 'Vente introuvable'
        elif type_ == 'mobile':
            ref = data.get('reference')
            try:
                reservation_obj = Reservation.objects.select_related('voyage__trip', 'siege').get(
                    reference_evex=ref,
                    voyage__trip__company=agent.compagnie,
                )
                voyage_obj = reservation_obj.voyage
                if reservation_obj.statut_paiement != Reservation.STATUT_PAYE:
                    resultat = 'invalide'
                    message = 'Réservation non payée'
                else:
                    # check if already used via ControlePassager
                    already = ControlePassager.objects.filter(reservation=reservation_obj, resultat='valide').exists()
                    if already:
                        resultat = 'deja_utilise'
                        message = 'Billet déjà utilisé'
                    else:
                        resultat = 'valide'
                        message = f"Billet mobile valide — {reservation_obj.client_nom} — Siège {reservation_obj.siege.numero}"
            except Reservation.DoesNotExist:
                resultat = 'invalide'
                message = 'Réservation introuvable'

        if voyage_obj is not None:
            ControlePassager.objects.create(
                agent=agent,
                vente=vente_obj,
                reservation=reservation_obj,
                voyage=voyage_obj,
                resultat=resultat,
                message=message,
            )

        return Response({
            'resultat': resultat,
            'message': message,
            'reference': data.get('reference'),
            'source': type_,
            'voyage_id': voyage_obj.id if voyage_obj else None,
            'client_nom': vente_obj.client_nom if vente_obj else (reservation_obj.client_nom if reservation_obj else None),
            'numero_siege': vente_obj.siege.numero if vente_obj else (reservation_obj.siege.numero if reservation_obj else None),
        })


class HistoriqueVentesView(APIView):
    permission_classes = [IsAgentGuichet]

    def get(self, request):
        agent = request.user.agentguichet
        date = request.query_params.get('date')
        date_debut = request.query_params.get('date_debut') or date
        date_fin = request.query_params.get('date_fin') or date
        statut_filtre = request.query_params.get('statut')
        paiement_filtre = request.query_params.get('mode_paiement')
        recherche = str(request.query_params.get('q') or '').strip()
        qs = VenteGuichet.objects.filter(agent=agent).select_related(
            'voyage__trip__departure_city',
            'voyage__trip__arrival_city',
            'siege', 'agence', 'guichet',
        )
        if date_debut:
            try:
                from datetime import datetime
                qs = qs.filter(created_at__date__gte=datetime.fromisoformat(date_debut).date())
            except (TypeError, ValueError):
                pass
        if date_fin:
            try:
                from datetime import datetime
                qs = qs.filter(created_at__date__lte=datetime.fromisoformat(date_fin).date())
            except (TypeError, ValueError):
                pass
        if statut_filtre in dict(VenteGuichet.STATUT_CHOICES):
            qs = qs.filter(statut=statut_filtre)
        if paiement_filtre in dict(VenteGuichet.MODE_CHOICES):
            qs = qs.filter(mode_paiement=paiement_filtre)
        if recherche:
            qs = qs.filter(
                Q(reference_vente__icontains=recherche)
                | Q(client_nom__icontains=recherche)
                | Q(client_telephone__icontains=recherche)
            )

        ventes_valides = qs.filter(statut__in=['valide', 'utilise'])
        return Response({
            'total_billets': qs.count(),
            'total_valides': ventes_valides.count(),
            'total_annules': qs.filter(statut='annule').count(),
            'total_montant': ventes_valides.aggregate(total=Sum('montant_total'))['total'] or 0,
            'ventes': [vente_payload(vente) for vente in qs.order_by('-created_at')],
        })


class HistoriqueControlesView(APIView):
    permission_classes = [IsAgentGuichet]

    def get(self, request):
        agent = request.user.agentguichet
        resultat = request.query_params.get('resultat')
        date = request.query_params.get('date')
        qs = ControlePassager.objects.filter(agent=agent).select_related(
            'vente', 'reservation', 'voyage',
        )
        if resultat in dict(ControlePassager.RESULTAT_CHOICES):
            qs = qs.filter(resultat=resultat)
        if date:
            try:
                from datetime import datetime
                qs = qs.filter(created_at__date=datetime.fromisoformat(date).date())
            except (TypeError, ValueError):
                pass
        return Response({
            'total': qs.count(),
            'valides': qs.filter(resultat='valide').count(),
            'invalides': qs.filter(resultat='invalide').count(),
            'deja_utilises': qs.filter(resultat='deja_utilise').count(),
            'controles': [controle_payload(controle) for controle in qs.order_by('-created_at')[:100]],
        })


class PassagersVoyageView(APIView):
    permission_classes = [IsAgentGuichet | IsAdminCompagnie]

    def get(self, request, vid=None):
        if hasattr(request.user, 'agentguichet'):
            company = request.user.agentguichet.compagnie
        else:
            company = get_admin_company(request.user)
        try:
            voyage = ScheduledTrip.objects.get(id=vid, trip__company=company)
        except ScheduledTrip.DoesNotExist:
            return Response({'detail':'Voyage introuvable'}, status=404)
        # ventes guichet
        ventes = VenteGuichet.objects.filter(voyage=voyage).exclude(statut='annule')
        bookings = Booking.objects.filter(scheduled_trip=voyage, status__in=['confirmed','pending'])
        passengers = []
        for v in ventes:
            passengers.append({'numero_siege': v.siege.numero, 'client_nom': v.client_nom, 'client_telephone': v.client_telephone, 'source': 'guichet', 'reference': v.reference_vente, 'statut_controle': 'en_attente'})
        for b in bookings:
            passengers.append({'numero_siege': b.seat_number, 'client_nom': b.passenger_name, 'client_telephone': b.passenger_phone, 'source': 'mobile', 'reference': getattr(b, 'reference_evex', ''), 'statut_controle': 'en_attente'})
        # sort by seat number (numeric if possible)
        def seat_key(x):
            try:
                return int(x['numero_siege'])
            except Exception:
                return x['numero_siege']
        passengers_sorted = sorted(passengers, key=seat_key)
        serializer = PassagerSerializer(passengers_sorted, many=True)
        return Response(serializer.data)
