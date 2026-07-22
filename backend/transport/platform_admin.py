import csv
from datetime import datetime, time, timedelta
from decimal import Decimal, InvalidOperation

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from guichet.models import Agence, AgentGuichet, Guichet, VenteGuichet

from .models import (
    AuditLog,
    Booking,
    Company,
    CompteCagnotte,
    Payment,
    PlatformConfiguration,
    Reservation,
    ScheduledTrip,
    Siege,
    Trip,
)
from .models.audit import log_action


class IsPlatformAdmin(permissions.BasePermission):
    """Réserve l'administration générale aux super administrateurs actifs."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active and request.user.is_superuser)


class PlatformConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformConfiguration
        fields = [
            'service_fee',
            'default_commission_rate',
            'cancellation_delay_hours',
            'email_notifications',
            'sms_notifications',
            'maintenance_mode',
            'updated_at',
        ]
        read_only_fields = ['updated_at']


def client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR')


def as_number(value):
    return float(value or 0)


def month_key(value):
    return value.strftime('%Y-%m')


def month_label(value):
    labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    return labels[value.month - 1]


def last_months(count=12):
    current = timezone.localdate().replace(day=1)
    months = []
    for _ in range(count):
        months.insert(0, current)
        current = (current - timedelta(days=1)).replace(day=1)
    return months


def user_role(user):
    if user.is_superuser:
        return 'SUPER_ADMIN'
    if user.admin_companies.exists() or hasattr(user, 'company_admin'):
        return 'ADMIN_COMPAGNIE'
    if hasattr(user, 'agentguichet'):
        return 'AGENT_GUICHET'
    return 'CLIENT'


def user_company(user):
    company = user.admin_companies.first()
    if company:
        return company
    if hasattr(user, 'company_admin'):
        return user.company_admin
    if hasattr(user, 'agentguichet'):
        return user.agentguichet.compagnie
    return None


def serialize_user(user):
    company = user_company(user)
    profile = getattr(user, 'profile', None)
    return {
        'id': user.id,
        'email': user.email or user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'phone': getattr(profile, 'phone', None),
        'role': user_role(user),
        'company_id': company.id if company else None,
        'company_name': company.name if company else None,
        'is_active': user.is_active,
        'last_login': user.last_login,
        'date_joined': user.date_joined,
    }


def serialize_company(company):
    admins = list(company.admins.all())
    if company.admin_user and all(item.id != company.admin_user_id for item in admins):
        admins.insert(0, company.admin_user)
    cagnotte = getattr(company, 'cagnotte', None)
    return {
        'id': company.id,
        'name': company.name,
        'description': company.description,
        'address': company.address,
        'phone': company.phone,
        'email': company.email,
        'website': company.website,
        'logo': company.logo,
        'is_active': company.is_active,
        'commission_rate': as_number(company.commission_rate),
        'created_at': company.created_at,
        'updated_at': company.updated_at,
        'admins': [serialize_user(user) for user in admins],
        'counts': {
            'agencies': company.agences.filter(is_active=True).count(),
            'counters': Guichet.objects.filter(agence__compagnie=company, is_active=True).count(),
            'agents': company.agents_guichet.filter(actif=True).count(),
            'routes': company.trips.filter(is_active=True).count(),
            'voyages': ScheduledTrip.objects.filter(trip__company=company, is_active=True).count(),
        },
        'wallet': {
            'pending': getattr(cagnotte, 'solde_a_reverser', 0),
            'paid': getattr(cagnotte, 'total_reverse', 0),
        },
    }


def serialize_voyage(voyage):
    capacity = voyage.trip.capacity
    booking_count = Booking.objects.filter(
        scheduled_trip=voyage,
        status__in=['pending', 'confirmed', 'completed'],
    ).count()
    reservation_count = voyage.reservations_evex.filter(statut_paiement=Reservation.STATUT_PAYE).count()
    counter_count = voyage.ventes_guichet.exclude(statut='annule').count()
    sold = max(booking_count + reservation_count + counter_count, capacity - voyage.available_seats)
    return {
        'id': voyage.id,
        'company_id': voyage.trip.company_id,
        'company_name': voyage.trip.company.name,
        'route': f'{voyage.trip.departure_city.name} → {voyage.trip.arrival_city.name}',
        'departure_city': voyage.trip.departure_city.name,
        'arrival_city': voyage.trip.arrival_city.name,
        'date': voyage.date,
        'departure_time': voyage.trip.departure_time,
        'arrival_time': voyage.trip.arrival_time,
        'capacity': capacity,
        'sold_seats': min(sold, capacity),
        'available_seats': max(capacity - sold, 0),
        'occupancy_rate': round((sold / capacity * 100) if capacity else 0, 1),
        'price': as_number(voyage.trip.price),
        'is_active': voyage.is_active,
        'is_past': voyage.date < timezone.localdate(),
    }


def serialize_booking_ticket(item):
    company = item.trip.company
    return {
        'id': str(item.id),
        'source': 'booking',
        'reference': f'BOOK-{item.id}',
        'client_name': item.passenger_name,
        'client_phone': item.passenger_phone,
        'company_id': company.id,
        'company_name': company.name,
        'route': f'{item.trip.departure_city.name} → {item.trip.arrival_city.name}',
        'travel_date': item.scheduled_trip.date if item.scheduled_trip else None,
        'seat': item.seat_number,
        'amount': as_number(item.total_price),
        'payment_method': item.payment_method,
        'status': item.status,
        'created_at': item.booking_date,
    }


def serialize_reservation_ticket(item):
    company = item.voyage.trip.company
    return {
        'id': str(item.id),
        'source': 'mobile',
        'reference': item.reference_evex,
        'client_name': item.client_nom,
        'client_phone': item.client_telephone,
        'company_id': company.id,
        'company_name': company.name,
        'route': f'{item.voyage.trip.departure_city.name} → {item.voyage.trip.arrival_city.name}',
        'travel_date': item.voyage.date,
        'seat': item.siege.numero,
        'amount': item.montant_total,
        'payment_method': item.operateur.lower(),
        'status': item.statut_paiement,
        'created_at': item.created_at,
    }


def serialize_counter_ticket(item):
    company = item.voyage.trip.company
    return {
        'id': str(item.id),
        'source': 'guichet',
        'reference': item.reference_vente,
        'client_name': item.client_nom,
        'client_phone': item.client_telephone,
        'company_id': company.id,
        'company_name': company.name,
        'route': f'{item.voyage.trip.departure_city.name} → {item.voyage.trip.arrival_city.name}',
        'travel_date': item.voyage.date,
        'seat': item.siege.numero,
        'amount': item.montant_total,
        'payment_method': item.mode_paiement,
        'status': item.statut,
        'created_at': item.created_at,
    }


def ticket_collection(limit=250):
    bookings = Booking.objects.select_related(
        'trip__company', 'trip__departure_city', 'trip__arrival_city', 'scheduled_trip'
    ).order_by('-booking_date')[:limit]
    reservations = Reservation.objects.select_related(
        'voyage__trip__company', 'voyage__trip__departure_city', 'voyage__trip__arrival_city', 'siege'
    ).order_by('-created_at')[:limit]
    counter_sales = VenteGuichet.objects.select_related(
        'voyage__trip__company', 'voyage__trip__departure_city', 'voyage__trip__arrival_city', 'siege'
    ).order_by('-created_at')[:limit]
    items = [serialize_booking_ticket(item) for item in bookings]
    items += [serialize_reservation_ticket(item) for item in reservations]
    items += [serialize_counter_ticket(item) for item in counter_sales]
    return sorted(items, key=lambda item: item['created_at'], reverse=True)


def revenue_totals(start=None):
    booking_filter = Q(status__in=['confirmed', 'completed'])
    reservation_filter = Q(statut_paiement=Reservation.STATUT_PAYE)
    counter_filter = Q(statut__in=['valide', 'utilise'])
    payment_filter = Q(status='completed')
    if start:
        if not isinstance(start, datetime):
            start = timezone.make_aware(datetime.combine(start, time.min), timezone.get_current_timezone())
        booking_filter &= Q(booking_date__gte=start)
        reservation_filter &= Q(created_at__gte=start)
        counter_filter &= Q(created_at__gte=start)
        payment_filter &= Q(payment_date__gte=start)

    gross = as_number(Booking.objects.filter(booking_filter).aggregate(total=Sum('total_price'))['total'])
    gross += as_number(Reservation.objects.filter(reservation_filter).aggregate(total=Sum('montant_total'))['total'])
    gross += as_number(VenteGuichet.objects.filter(counter_filter).aggregate(total=Sum('montant_total'))['total'])

    evex = as_number(Payment.objects.filter(payment_filter).aggregate(total=Sum('evex_commission'))['total'])
    evex += as_number(Reservation.objects.filter(reservation_filter).aggregate(total=Sum('revenu_net_evex'))['total'])
    evex += as_number(VenteGuichet.objects.filter(counter_filter).aggregate(total=Sum('frais_evex'))['total'])

    company_due = as_number(Payment.objects.filter(payment_filter).aggregate(total=Sum('company_revenue'))['total'])
    company_due += as_number(Reservation.objects.filter(reservation_filter).aggregate(total=Sum('montant_reverse_compagnie'))['total'])
    company_due += as_number(VenteGuichet.objects.filter(counter_filter).aggregate(total=Sum('montant_billet'))['total'])
    return {'gross': gross, 'evex': evex, 'company_due': company_due}


def build_monthly_series(count=12):
    months = last_months(count)
    start = months[0]
    start_datetime = timezone.make_aware(datetime.combine(start, time.min), timezone.get_current_timezone())
    series = {
        month_key(item): {'month': month_label(item), 'key': month_key(item), 'tickets': 0, 'revenue': 0, 'users': 0}
        for item in months
    }

    def merge(queryset, date_field, count_field, amount_field):
        rows = queryset.filter(**{f'{date_field}__gte': start_datetime}).annotate(
            month=TruncMonth(date_field)
        ).values('month').annotate(tickets=Count(count_field), revenue=Sum(amount_field))
        for row in rows:
            key = month_key(row['month'])
            if key in series:
                series[key]['tickets'] += row['tickets'] or 0
                series[key]['revenue'] += as_number(row['revenue'])

    merge(Booking.objects.filter(status__in=['confirmed', 'completed']), 'booking_date', 'id', 'total_price')
    merge(Reservation.objects.filter(statut_paiement=Reservation.STATUT_PAYE), 'created_at', 'id', 'montant_total')
    merge(VenteGuichet.objects.filter(statut__in=['valide', 'utilise']), 'created_at', 'id', 'montant_total')

    user_rows = User.objects.filter(date_joined__gte=start_datetime).annotate(
        month=TruncMonth('date_joined')
    ).values('month').annotate(total=Count('id'))
    for row in user_rows:
        key = month_key(row['month'])
        if key in series:
            series[key]['users'] = row['total']
    return list(series.values())


class PlatformDashboardView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        today = timezone.localdate()
        month_start = today.replace(day=1)
        totals = revenue_totals()
        month_totals = revenue_totals(month_start)
        paid_reservations = Reservation.objects.filter(statut_paiement=Reservation.STATUT_PAYE).count()
        valid_counter_sales = VenteGuichet.objects.filter(statut__in=['valide', 'utilise']).count()
        active_bookings = Booking.objects.filter(status__in=['confirmed', 'completed']).count()
        ticket_total = paid_reservations + valid_counter_sales + active_bookings
        total_capacity = ScheduledTrip.objects.aggregate(total=Sum('trip__capacity'))['total'] or 0
        occupied = sum(max(item.trip.capacity - item.available_seats, 0) for item in ScheduledTrip.objects.select_related('trip'))

        top_companies = []
        for company in Company.objects.all():
            bookings = Booking.objects.filter(trip__company=company, status__in=['confirmed', 'completed'])
            reservations = Reservation.objects.filter(voyage__trip__company=company, statut_paiement=Reservation.STATUT_PAYE)
            counter_sales = VenteGuichet.objects.filter(voyage__trip__company=company, statut__in=['valide', 'utilise'])
            revenue = as_number(bookings.aggregate(total=Sum('total_price'))['total'])
            revenue += as_number(reservations.aggregate(total=Sum('montant_total'))['total'])
            revenue += as_number(counter_sales.aggregate(total=Sum('montant_total'))['total'])
            top_companies.append({
                'id': company.id,
                'name': company.name,
                'tickets': bookings.count() + reservations.count() + counter_sales.count(),
                'revenue': revenue,
                'active': company.is_active,
            })
        top_companies.sort(key=lambda item: item['revenue'], reverse=True)

        alerts = []
        inactive_companies = Company.objects.filter(is_active=False).count()
        failed_payments = Reservation.objects.filter(statut_paiement=Reservation.STATUT_ECHOUE).count()
        unassigned_agents = AgentGuichet.objects.filter(Q(agence__isnull=True) | Q(guichet__isnull=True), actif=True).count()
        if inactive_companies:
            alerts.append({'tone': 'amber', 'title': 'Compagnies suspendues', 'value': inactive_companies})
        if failed_payments:
            alerts.append({'tone': 'red', 'title': 'Paiements échoués', 'value': failed_payments})
        if unassigned_agents:
            alerts.append({'tone': 'blue', 'title': 'Agents non affectés', 'value': unassigned_agents})

        recent_audit = AuditLog.objects.select_related('user')[:8]
        return Response({
            'overview': {
                'companies': Company.objects.count(),
                'active_companies': Company.objects.filter(is_active=True).count(),
                'users': User.objects.count(),
                'active_users': User.objects.filter(is_active=True).count(),
                'agencies': Agence.objects.filter(is_active=True).count(),
                'counters': Guichet.objects.filter(is_active=True).count(),
                'routes': Trip.objects.filter(is_active=True).count(),
                'upcoming_trips': ScheduledTrip.objects.filter(date__gte=today, is_active=True).count(),
                'tickets': ticket_total,
                'gross_revenue': totals['gross'],
                'month_revenue': month_totals['gross'],
                'evex_revenue': totals['evex'],
                'company_due': totals['company_due'],
                'occupancy_rate': round((occupied / total_capacity * 100) if total_capacity else 0, 1),
            },
            'monthly': build_monthly_series(),
            'top_companies': top_companies[:8],
            'alerts': alerts,
            'recent_activity': [{
                'id': item.id,
                'action': item.action,
                'model': item.model_name,
                'object': item.object_repr,
                'user': item.user.email if item.user else 'Système',
                'timestamp': item.timestamp,
            } for item in recent_audit],
        })


class PlatformCompaniesView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        queryset = Company.objects.prefetch_related('admins').select_related('admin_user')
        query = request.query_params.get('q', '').strip()
        state = request.query_params.get('status', 'all')
        if query:
            queryset = queryset.filter(Q(name__icontains=query) | Q(email__icontains=query) | Q(phone__icontains=query))
        if state == 'active':
            queryset = queryset.filter(is_active=True)
        elif state == 'inactive':
            queryset = queryset.filter(is_active=False)
        return Response([serialize_company(company) for company in queryset.order_by('name')])

    def post(self, request):
        data = request.data
        required = ['name', 'address', 'phone', 'email', 'admin_email', 'admin_password']
        missing = [field for field in required if not str(data.get(field, '')).strip()]
        if missing:
            return Response({'detail': f"Champs requis : {', '.join(missing)}"}, status=status.HTTP_400_BAD_REQUEST)
        admin_email = str(data['admin_email']).strip().lower()
        if User.objects.filter(Q(username__iexact=admin_email) | Q(email__iexact=admin_email)).exists():
            return Response({'detail': 'Un compte utilise déjà cet email.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(str(data['admin_password']))
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        try:
            commission = Decimal(str(data.get('commission_rate') or PlatformConfiguration.load().default_commission_rate))
            if commission < 0 or commission > 100:
                raise InvalidOperation
        except (InvalidOperation, ValueError):
            return Response({'detail': 'Le taux de commission doit être compris entre 0 et 100.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            company = Company.objects.create(
                name=str(data['name']).strip(),
                description=str(data.get('description', '')).strip(),
                address=str(data['address']).strip(),
                phone=str(data['phone']).strip(),
                email=str(data['email']).strip().lower(),
                website=str(data.get('website', '')).strip() or None,
                logo=str(data.get('logo', '')).strip() or None,
                commission_rate=commission,
                created_by=request.user,
            )
            admin = User.objects.create_user(
                username=admin_email,
                email=admin_email,
                password=str(data['admin_password']),
                first_name=str(data.get('admin_first_name', '')).strip(),
                last_name=str(data.get('admin_last_name', '')).strip(),
            )
            company.admin_user = admin
            company.admins.add(admin)
            company.save(update_fields=['admin_user'])
            log_action(request.user, 'CREATE', company, new_values={'name': company.name, 'admin_email': admin_email}, ip_address=client_ip(request))
        return Response(serialize_company(company), status=status.HTTP_201_CREATED)


class PlatformCompanyDetailView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get_object(self, pk):
        return Company.objects.prefetch_related('admins').select_related('admin_user').filter(pk=pk).first()

    def get(self, request, pk):
        company = self.get_object(pk)
        if not company:
            return Response({'detail': 'Compagnie introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        data = serialize_company(company)
        data['agencies'] = [{
            'id': str(item.id), 'name': item.nom, 'city': item.ville.name,
            'address': item.adresse, 'active': item.is_active,
            'counters': item.guichets.filter(is_active=True).count(),
        } for item in company.agences.select_related('ville')]
        data['recent_trips'] = [serialize_voyage(item) for item in ScheduledTrip.objects.filter(
            trip__company=company
        ).select_related('trip__company', 'trip__departure_city', 'trip__arrival_city').order_by('-date')[:8]]
        return Response(data)

    def patch(self, request, pk):
        company = self.get_object(pk)
        if not company:
            return Response({'detail': 'Compagnie introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        allowed = ['name', 'description', 'address', 'phone', 'email', 'website', 'logo', 'commission_rate']
        old_values = {}
        new_values = {}
        for field in allowed:
            if field not in request.data:
                continue
            value = request.data[field]
            if field == 'commission_rate':
                try:
                    value = Decimal(str(value))
                    if value < 0 or value > 100:
                        raise InvalidOperation
                except (InvalidOperation, ValueError):
                    return Response({'detail': 'Commission invalide.'}, status=status.HTTP_400_BAD_REQUEST)
            old_values[field] = str(getattr(company, field, '') or '')
            setattr(company, field, value)
            new_values[field] = str(value)
        company.updated_by = request.user
        company.save()
        log_action(request.user, 'UPDATE', company, old_values=old_values, new_values=new_values, ip_address=client_ip(request))
        return Response(serialize_company(company))


class PlatformCompanyStatusView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        company = Company.objects.filter(pk=pk).first()
        if not company:
            return Response({'detail': 'Compagnie introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        active = request.data.get('is_active')
        if not isinstance(active, bool):
            return Response({'detail': 'is_active doit être un booléen.'}, status=status.HTTP_400_BAD_REQUEST)
        reason = str(request.data.get('reason', '')).strip()
        if not active and not reason:
            return Response({'detail': 'Une justification est requise pour suspendre une compagnie.'}, status=status.HTTP_400_BAD_REQUEST)
        old = company.is_active
        company.is_active = active
        company.updated_by = request.user
        company.save(update_fields=['is_active', 'updated_by', 'updated_at'])
        log_action(request.user, 'UPDATE', company, old_values={'is_active': old}, new_values={'is_active': active, 'reason': reason}, ip_address=client_ip(request))
        return Response(serialize_company(company))


class PlatformCompanyAdminsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        company = Company.objects.filter(pk=pk).first()
        if not company:
            return Response({'detail': 'Compagnie introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        email = str(request.data.get('email', '')).strip().lower()
        password = str(request.data.get('password', ''))
        if not email or not password:
            return Response({'detail': 'Email et mot de passe requis.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(Q(username__iexact=email) | Q(email__iexact=email)).exists():
            return Response({'detail': 'Cet email est déjà utilisé.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(password)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=str(request.data.get('first_name', '')).strip(),
            last_name=str(request.data.get('last_name', '')).strip(),
        )
        company.admins.add(user)
        if not company.admin_user_id:
            company.admin_user = user
            company.save(update_fields=['admin_user'])
        log_action(request.user, 'CREATE', user, new_values={'role': 'ADMIN_COMPAGNIE', 'company_id': company.id}, ip_address=client_ip(request))
        return Response(serialize_user(user), status=status.HTTP_201_CREATED)


class PlatformUsersView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        queryset = User.objects.select_related('profile').prefetch_related('admin_companies').order_by('-date_joined')
        query = request.query_params.get('q', '').strip()
        role = request.query_params.get('role', '')
        state = request.query_params.get('status', '')
        company_id = request.query_params.get('company', '')
        if query:
            queryset = queryset.filter(Q(email__icontains=query) | Q(username__icontains=query) | Q(first_name__icontains=query) | Q(last_name__icontains=query) | Q(profile__phone__icontains=query))
        if state == 'active':
            queryset = queryset.filter(is_active=True)
        elif state == 'inactive':
            queryset = queryset.filter(is_active=False)
        if company_id:
            queryset = queryset.filter(Q(admin_companies__id=company_id) | Q(company_admin__id=company_id) | Q(agentguichet__compagnie_id=company_id)).distinct()
        items = [serialize_user(user) for user in queryset]
        if role:
            items = [item for item in items if item['role'] == role]
        return Response(items)

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        password = str(request.data.get('password', ''))
        if not email or not password:
            return Response({'detail': 'Email et mot de passe requis.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(Q(username__iexact=email) | Q(email__iexact=email)).exists():
            return Response({'detail': 'Cet email est déjà utilisé.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(password)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=str(request.data.get('first_name', '')).strip(),
            last_name=str(request.data.get('last_name', '')).strip(),
            is_staff=True,
            is_superuser=True,
        )
        log_action(request.user, 'CREATE', user, new_values={'role': 'SUPER_ADMIN'}, ip_address=client_ip(request))
        return Response(serialize_user(user), status=status.HTTP_201_CREATED)


class PlatformUserStatusView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        user = User.objects.filter(pk=pk).first()
        if not user:
            return Response({'detail': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if user == request.user and request.data.get('is_active') is False:
            return Response({'detail': 'Vous ne pouvez pas suspendre votre propre compte.'}, status=status.HTTP_400_BAD_REQUEST)
        active = request.data.get('is_active')
        if not isinstance(active, bool):
            return Response({'detail': 'is_active doit être un booléen.'}, status=status.HTTP_400_BAD_REQUEST)
        reason = str(request.data.get('reason', '')).strip()
        if not active and not reason:
            return Response({'detail': 'Une justification est requise.'}, status=status.HTTP_400_BAD_REQUEST)
        old = user.is_active
        user.is_active = active
        user.save(update_fields=['is_active'])
        if not active:
            Token.objects.filter(user=user).delete()
        log_action(request.user, 'UPDATE', user, old_values={'is_active': old}, new_values={'is_active': active, 'reason': reason}, ip_address=client_ip(request))
        return Response(serialize_user(user))


class PlatformUserPasswordView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        user = User.objects.filter(pk=pk).first()
        if not user:
            return Response({'detail': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        password = str(request.data.get('new_password', ''))
        try:
            validate_password(password, user=user)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save(update_fields=['password'])
        Token.objects.filter(user=user).delete()
        log_action(request.user, 'UPDATE', user, new_values={'password_reset': True, 'sessions_revoked': True}, ip_address=client_ip(request))
        return Response({'detail': 'Mot de passe réinitialisé et sessions révoquées.'})


class PlatformUserSessionsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        user = User.objects.filter(pk=pk).first()
        if not user:
            return Response({'detail': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        deleted, _ = Token.objects.filter(user=user).delete()
        log_action(request.user, 'UPDATE', user, new_values={'sessions_revoked': True}, ip_address=client_ip(request))
        return Response({'detail': 'Sessions révoquées.', 'tokens_deleted': deleted})


class PlatformVoyagesView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        queryset = ScheduledTrip.objects.select_related('trip__company', 'trip__departure_city', 'trip__arrival_city').order_by('-date', 'trip__departure_time')
        query = request.query_params.get('q', '').strip()
        company_id = request.query_params.get('company', '')
        state = request.query_params.get('status', '')
        date_value = request.query_params.get('date', '')
        if query:
            queryset = queryset.filter(Q(trip__company__name__icontains=query) | Q(trip__departure_city__name__icontains=query) | Q(trip__arrival_city__name__icontains=query))
        if company_id:
            queryset = queryset.filter(trip__company_id=company_id)
        if state == 'active':
            queryset = queryset.filter(is_active=True, date__gte=timezone.localdate())
        elif state == 'inactive':
            queryset = queryset.filter(is_active=False)
        elif state == 'past':
            queryset = queryset.filter(date__lt=timezone.localdate())
        if date_value:
            queryset = queryset.filter(date=date_value)
        return Response([serialize_voyage(item) for item in queryset[:300]])


class PlatformVoyageStatusView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        voyage = ScheduledTrip.objects.select_related('trip__company').filter(pk=pk).first()
        if not voyage:
            return Response({'detail': 'Voyage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        active = request.data.get('is_active')
        reason = str(request.data.get('reason', '')).strip()
        if not isinstance(active, bool):
            return Response({'detail': 'is_active doit être un booléen.'}, status=status.HTTP_400_BAD_REQUEST)
        if not active and not reason:
            return Response({'detail': 'Une justification est requise pour annuler un voyage.'}, status=status.HTTP_400_BAD_REQUEST)
        old = voyage.is_active
        voyage.is_active = active
        voyage.save(update_fields=['is_active'])
        log_action(request.user, 'UPDATE', voyage, old_values={'is_active': old}, new_values={'is_active': active, 'reason': reason}, ip_address=client_ip(request))
        return Response(serialize_voyage(voyage))


class PlatformTicketsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        items = ticket_collection()
        query = request.query_params.get('q', '').strip().lower()
        source = request.query_params.get('source', '')
        state = request.query_params.get('status', '')
        company_id = request.query_params.get('company', '')
        if query:
            items = [item for item in items if query in ' '.join([item['reference'], item['client_name'], item['client_phone'], item['company_name']]).lower()]
        if source:
            items = [item for item in items if item['source'] == source]
        if state:
            items = [item for item in items if item['status'] == state]
        if company_id:
            items = [item for item in items if str(item['company_id']) == str(company_id)]
        return Response(items[:300])


class PlatformTicketActionView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, source, pk):
        action = str(request.data.get('action', 'cancel')).strip()
        reason = str(request.data.get('reason', '')).strip()
        if action not in ['cancel', 'refund'] or not reason:
            return Response({'detail': 'Action valide et justification requises.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            if source == 'booking':
                item = Booking.all_objects.select_related('scheduled_trip').filter(pk=pk).first()
                if not item:
                    return Response({'detail': 'Billet introuvable.'}, status=status.HTTP_404_NOT_FOUND)
                old = item.status
                item.status = 'cancelled'
                item.save(update_fields=['status'])
                if action == 'refund':
                    item.payments.filter(status='completed').update(status='refunded')
                instance = item
            elif source == 'mobile':
                item = Reservation.objects.select_related('siege', 'voyage__trip').filter(pk=pk).first()
                if not item:
                    return Response({'detail': 'Billet introuvable.'}, status=status.HTTP_404_NOT_FOUND)
                old = item.statut_paiement
                if action == 'refund' and old != Reservation.STATUT_PAYE:
                    return Response({'detail': 'Seul un paiement confirmé peut être remboursé.'}, status=status.HTTP_400_BAD_REQUEST)
                item.statut_paiement = Reservation.STATUT_REMBOURSE if action == 'refund' else Reservation.STATUT_EXPIRE
                item.save(update_fields=['statut_paiement'])
                item.siege.statut = Siege.STATUT_LIBRE
                item.siege.reserve_at = None
                item.siege.save(update_fields=['statut', 'reserve_at'])
                instance = item
            elif source == 'guichet':
                item = VenteGuichet.objects.select_related('siege', 'voyage__trip').filter(pk=pk).first()
                if not item:
                    return Response({'detail': 'Billet introuvable.'}, status=status.HTTP_404_NOT_FOUND)
                if item.statut == 'utilise':
                    return Response({'detail': 'Un billet utilisé ne peut plus être annulé.'}, status=status.HTTP_400_BAD_REQUEST)
                old = item.statut
                item.statut = 'annule'
                item.save(update_fields=['statut'])
                item.siege.statut = Siege.STATUT_LIBRE
                item.siege.save(update_fields=['statut'])
                item.voyage.available_seats = min(item.voyage.trip.capacity, item.voyage.available_seats + 1)
                item.voyage.save(update_fields=['available_seats'])
                instance = item
            else:
                return Response({'detail': 'Source inconnue.'}, status=status.HTTP_400_BAD_REQUEST)
            log_action(request.user, 'UPDATE', instance, old_values={'status': old}, new_values={'action': action, 'reason': reason}, ip_address=client_ip(request))
        detail = 'Statut de remboursement enregistré ; le remboursement monétaire opérateur reste à exécuter.' if action == 'refund' else 'Annulation enregistrée.'
        return Response({'detail': detail})


class PlatformFinanceView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        totals = revenue_totals()
        pending_payouts = CompteCagnotte.objects.aggregate(total=Sum('solde_a_reverser'))['total'] or 0
        refunds = Reservation.objects.filter(statut_paiement=Reservation.STATUT_REMBOURSE).aggregate(total=Sum('montant_total'))['total'] or 0
        refunds += Payment.objects.filter(status='refunded').aggregate(total=Sum('amount'))['total'] or 0
        companies = []
        for company in Company.objects.all():
            mobile = Reservation.objects.filter(voyage__trip__company=company, statut_paiement=Reservation.STATUT_PAYE)
            counter = VenteGuichet.objects.filter(voyage__trip__company=company, statut__in=['valide', 'utilise'])
            legacy = Payment.objects.filter(booking__trip__company=company, status='completed')
            gross = as_number(mobile.aggregate(total=Sum('montant_total'))['total']) + as_number(counter.aggregate(total=Sum('montant_total'))['total']) + as_number(legacy.aggregate(total=Sum('amount'))['total'])
            evex = as_number(mobile.aggregate(total=Sum('revenu_net_evex'))['total']) + as_number(counter.aggregate(total=Sum('frais_evex'))['total']) + as_number(legacy.aggregate(total=Sum('evex_commission'))['total'])
            cagnotte = getattr(company, 'cagnotte', None)
            companies.append({'id': company.id, 'name': company.name, 'gross': gross, 'evex': evex, 'company_revenue': gross - evex, 'pending_payout': getattr(cagnotte, 'solde_a_reverser', 0)})
        companies.sort(key=lambda item: item['gross'], reverse=True)
        return Response({
            'totals': {**totals, 'pending_payouts': pending_payouts, 'refunds': refunds},
            'monthly': build_monthly_series(),
            'companies': companies,
            'channels': [
                {'name': 'Réservations mobiles', 'tickets': Reservation.objects.filter(statut_paiement=Reservation.STATUT_PAYE).count(), 'revenue': as_number(Reservation.objects.filter(statut_paiement=Reservation.STATUT_PAYE).aggregate(total=Sum('montant_total'))['total'])},
                {'name': 'Ventes guichet', 'tickets': VenteGuichet.objects.filter(statut__in=['valide', 'utilise']).count(), 'revenue': as_number(VenteGuichet.objects.filter(statut__in=['valide', 'utilise']).aggregate(total=Sum('montant_total'))['total'])},
                {'name': 'Réservations historiques', 'tickets': Booking.objects.filter(status__in=['confirmed', 'completed']).count(), 'revenue': as_number(Booking.objects.filter(status__in=['confirmed', 'completed']).aggregate(total=Sum('total_price'))['total'])},
            ],
        })


class PlatformAnalyticsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        routes = Trip.objects.annotate(
            booking_count=Count('bookings', filter=Q(bookings__status__in=['confirmed', 'completed']), distinct=True),
            voyage_count=Count('scheduled_trips', distinct=True),
        ).select_related('company', 'departure_city', 'arrival_city')
        route_items = [{
            'route': f'{item.departure_city.name} → {item.arrival_city.name}',
            'company': item.company.name,
            'bookings': item.booking_count,
            'voyages': item.voyage_count,
            'capacity': item.capacity,
        } for item in routes]
        route_items.sort(key=lambda item: item['bookings'], reverse=True)
        cities = Trip.objects.values('departure_city__name').annotate(total=Count('scheduled_trips')).order_by('-total')[:10]
        return Response({
            'monthly': build_monthly_series(),
            'routes': route_items[:12],
            'cities': [{'name': item['departure_city__name'], 'departures': item['total']} for item in cities],
            'roles': [
                {'name': 'Voyageurs', 'value': sum(1 for user in User.objects.all() if user_role(user) == 'CLIENT')},
                {'name': 'Admins compagnie', 'value': sum(1 for user in User.objects.all() if user_role(user) == 'ADMIN_COMPAGNIE')},
                {'name': 'Agents guichet', 'value': sum(1 for user in User.objects.all() if user_role(user) == 'AGENT_GUICHET')},
                {'name': 'Admins plateforme', 'value': User.objects.filter(is_superuser=True).count()},
            ],
        })


class PlatformAuditView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        queryset = AuditLog.objects.select_related('user')
        query = request.query_params.get('q', '').strip()
        action = request.query_params.get('action', '')
        if query:
            queryset = queryset.filter(Q(object_repr__icontains=query) | Q(model_name__icontains=query) | Q(user__email__icontains=query))
        if action:
            queryset = queryset.filter(action=action)
        return Response([{
            'id': item.id,
            'action': item.action,
            'model': item.model_name,
            'object_id': item.object_id,
            'object': item.object_repr,
            'user': item.user.email if item.user else 'Système',
            'old_values': item.old_values,
            'new_values': item.new_values,
            'ip_address': item.ip_address,
            'timestamp': item.timestamp,
        } for item in queryset[:300]])


class PlatformSettingsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        return Response(PlatformConfigurationSerializer(PlatformConfiguration.load()).data)

    def patch(self, request):
        configuration = PlatformConfiguration.load()
        serializer = PlatformConfigurationSerializer(configuration, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        old_values = PlatformConfigurationSerializer(configuration).data
        configuration = serializer.save(updated_by=request.user)
        log_action(request.user, 'UPDATE', configuration, old_values=old_values, new_values=serializer.data, ip_address=client_ip(request))
        return Response(PlatformConfigurationSerializer(configuration).data)


class PlatformExportView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request, resource):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="evex-{resource}-{timezone.localdate()}.csv"'
        response.write('\ufeff')
        output = csv.writer(response)
        if resource == 'companies':
            output.writerow(['ID', 'Compagnie', 'Email', 'Téléphone', 'Statut', 'Commission'])
            for company in Company.objects.all():
                output.writerow([company.id, company.name, company.email, company.phone, 'active' if company.is_active else 'suspendue', company.commission_rate])
        elif resource == 'users':
            output.writerow(['ID', 'Email', 'Nom', 'Rôle', 'Compagnie', 'Statut', 'Inscription'])
            for user in User.objects.all():
                item = serialize_user(user)
                output.writerow([item['id'], item['email'], f"{item['first_name']} {item['last_name']}", item['role'], item['company_name'] or '', 'actif' if item['is_active'] else 'suspendu', item['date_joined']])
        elif resource == 'tickets':
            output.writerow(['Référence', 'Canal', 'Client', 'Téléphone', 'Compagnie', 'Voyage', 'Montant', 'Statut', 'Date'])
            for item in ticket_collection(1000):
                output.writerow([item['reference'], item['source'], item['client_name'], item['client_phone'], item['company_name'], item['route'], item['amount'], item['status'], item['created_at']])
        elif resource == 'finance':
            output.writerow(['Compagnie', 'Brut', 'Commission EVEX', 'À reverser'])
            finance = PlatformFinanceView().get(request).data
            for item in finance['companies']:
                output.writerow([item['name'], item['gross'], item['evex'], item['pending_payout']])
        else:
            return Response({'detail': 'Export inconnu.'}, status=status.HTTP_404_NOT_FOUND)
        return response
