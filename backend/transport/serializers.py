from django.contrib.auth import get_user_model
from rest_framework import serializers
from decimal import Decimal
import uuid
from rest_framework.authtoken.models import Token


from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Company, City, Trip, TripStop, Booking, Payment, Review, Notification, ScheduledTrip, BoardingZone
import unicodedata
import re


def _normalize_string_for_matching(s: str) -> str:
    if s is None:
        return ''
    # remove parenthetical parts and normalize unicode (strip accents)
    try:
        raw = str(s).strip()
    except Exception:
        raw = ''
    without_paren = re.sub(r"\s*\(.*\)\s*", "", raw).strip()
    nfkd = unicodedata.normalize('NFKD', without_paren)
    no_diacritics = ''.join([c for c in nfkd if not unicodedata.combining(c)])
    return no_diacritics.lower()


def _resolve_city_id(value):
    """Try to resolve a city identifier which may be numeric id, numeric-string, exact name,
    name with parenthetical suffix, startswith or contains. Returns integer id or None."""
    from .models import City as CityModel
    # direct numeric id
    if value is None and value != 0:
        return None
    if isinstance(value, int) or (isinstance(value, str) and str(value).isdigit()):
        try:
            return int(value)
        except Exception:
            return None

    raw = str(value).strip()
    if not raw:
        return None

    # try exact case-insensitive match first
    c = CityModel.objects.filter(name__iexact=raw).first()
    if c:
        return c.id

    # normalized matching (remove diacritics and parenthetical suffixes)
    norm = _normalize_string_for_matching(raw)
    # try to find exact normalized match by scanning candidates (SQLite lacks unaccent)
    for candidate in CityModel.objects.all():
        if _normalize_string_for_matching(candidate.name) == norm:
            return candidate.id

    # startswith / contains on normalized form
    for candidate in CityModel.objects.all():
        cnorm = _normalize_string_for_matching(candidate.name)
        if cnorm.startswith(norm) or norm in cnorm:
            return candidate.id

    return None

# Serializer pour l'inscription d'utilisateur
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    token = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password', 'password2', 'phone', 'token')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data):
        password2 = validated_data.pop('password2', None)
        phone = validated_data.pop('phone', '').strip()
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password']
        )
        try:
            from .models import UserProfile
            profile = getattr(user, 'profile', None)
            if not profile:
                profile = UserProfile.objects.create(user=user)
            if phone:
                profile.phone = phone
                profile.save()
        except Exception:
            # Ne pas bloquer l'inscription si le profil ne peut pas être créé
            pass
        token, created = Token.objects.get_or_create(user=user)
        user.token = token.key
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer pour les utilisateurs"""
    is_company_admin = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    company_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        # Exposer également les flags de rôle pour que le frontend puisse
        # décider de la redirection (is_staff => Admin Général, is_company_admin calculé côté /me/)
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'is_superuser', 'date_joined', 'is_company_admin', 'phone_number', 'company_id'
        ]
        read_only_fields = ['id', 'date_joined', 'is_company_admin', 'phone_number', 'company_id']

    def get_is_company_admin(self, obj):
        # Vérifie si l'utilisateur est admin d'au moins une compagnie
        return obj.admin_companies.exists()

    def get_phone_number(self, obj):
        try:
            profile = getattr(obj, 'profile', None)
            return profile.phone if profile else None
        except Exception:
            return None

    def get_company_id(self, obj):
        # Récupère l'ID de la première compagnie administrée par l'utilisateur
        company = obj.admin_companies.first()
        return company.id if company else None


class CitySerializer(serializers.ModelSerializer):
    """Serializer pour les villes"""
    class Meta:
        model = City
        fields = ['id', 'name', 'region', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class CompanySerializer(serializers.ModelSerializer):
    """Serializer pour les compagnies"""
    admin_user = UserSerializer(read_only=True)
    admins = UserSerializer(many=True, read_only=True)
    # Champs write-only pour créer un administrateur lors de la création d'une compagnie
    admin_email = serializers.EmailField(write_only=True, required=False, allow_null=True)
    admin_password = serializers.CharField(write_only=True, required=False, allow_null=True)
    trips_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'description', 'address', 'phone', 'email', 
            'website', 'logo', 'is_active', 'created_at', 'updated_at',
            'admin_user', 'admins', 'trips_count', 'admin_email', 'admin_password'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'trips_count']

    def get_trips_count(self, obj):
        return obj.trips.count()

    def create(self, validated_data):
        # Extraire les champs pour création d'utilisateur si fournis
        admin_email = validated_data.pop('admin_email', None)
        admin_password = validated_data.pop('admin_password', None)

        company = super().create(validated_data)

        if admin_email and admin_password:
            # Créer l'utilisateur admin pour la compagnie
            from django.contrib.auth.models import User
            from django.db import IntegrityError
            try:
                # Utiliser l'email comme username pour simplifier
                if User.objects.filter(username=admin_email).exists():
                    # Ne pas écraser l'utilisateur existant, ajouter erreur
                    raise serializers.ValidationError({'admin_email': 'Un utilisateur avec cet email existe déjà.'})

                user = User.objects.create_user(username=admin_email, email=admin_email, password=admin_password)
                # Ajouter aux administrateurs M2M
                try:
                    company.admins.add(user)
                except Exception:
                    pass
                # Si admin_user legacy non défini, l'assigner pour compatibilité
                if not company.admin_user:
                    company.admin_user = user
                    company.save()
            except IntegrityError:
                raise serializers.ValidationError({'admin_email': 'Impossible de créer l\'utilisateur admin (conflit).'})

        return company


class TripStopSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)

    class Meta:
        model = TripStop
        fields = ['id', 'city', 'city_name', 'sequence', 'segment_price']


class BoardingZoneSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    trip_name = serializers.CharField(source='trip.__str__', read_only=True)

    class Meta:
        model = BoardingZone
        fields = [
            'id', 'company', 'company_name', 'trip', 'trip_name', 'name', 
            'address', 'latitude', 'longitude', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# Supprimé: StopSerializer (le modèle canonique est TripStop)


class TripSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all(), required=False)
    """Serializer pour les trajets (aligné avec models.base.Trip)"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    departure_city_name = serializers.CharField(source='departure_city.name', read_only=True)
    arrival_city_name = serializers.CharField(source='arrival_city.name', read_only=True)
    bookings_count = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()
    stops = TripStopSerializer(many=True, required=False)

    class Meta:
        model = Trip
        fields = [
            'id',
            'company',
            'company_name', 'departure_city', 'departure_city_name', 'arrival_city', 'arrival_city_name',
            'price', 'departure_time', 'arrival_time',
            'duration', 'bus_type', 'capacity',
            'bookings_count', 'available_seats', 'stops'
        ]
        read_only_fields = [
            'id', 'company_name', 'departure_city_name', 'arrival_city_name',
            'bookings_count', 'available_seats'
        ]


    def get_bookings_count(self, obj):
        return obj.bookings.filter(status__in=['confirmed', 'pending']).count()

    def get_available_seats(self, obj):
        confirmed_bookings = obj.bookings.filter(status='confirmed').count()
        return obj.capacity - confirmed_bookings

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Récupérer les arrêts associés à ce voyage et les sérialiser
        stops = instance.stops.all().order_by('sequence')
        representation['stops'] = TripStopSerializer(stops, many=True).data
        return representation


    def create(self, validated_data):
        stops_data = validated_data.pop('stops', None)
        trip = super().create(validated_data)
        # create stops if provided
        if stops_data:
            # delete any pre-existing (shouldn't exist on create) and recreate
            for idx, s in enumerate(stops_data):
                city_id = s.get('city')
                # allow either numeric id or city name from frontend
                if not city_id and city_id != 0:
                    # Rollback the trip creation by deleting it to avoid inconsistent state
                    trip.delete()
                    raise serializers.ValidationError({f'stops[{idx}].city': 'La ville de l\'arrêt est requise.'})
                resolved_city_id = _resolve_city_id(city_id)
                if not resolved_city_id:
                    trip.delete()
                    raise serializers.ValidationError({f'stops[{idx}].city': f"Ville d'arrêt invalide: {city_id}"})

                try:
                    TripStop.objects.create(
                        trip=trip,
                        city_id=resolved_city_id,
                        sequence=s.get('sequence') if s.get('sequence') is not None else idx,
                        segment_price=s.get('segment_price')
                    )
                except Exception as e:
                    trip.delete()
                    raise serializers.ValidationError({f'stops[{idx}]': f"Erreur lors de la création de l'arrêt: {e}"})
        return trip

    def update(self, instance, validated_data):
        stops_data = validated_data.pop('stops', None)
        trip = super().update(instance, validated_data)
        if stops_data is not None:
            # Simple approach: remove existing stops and recreate from provided list
            TripStop.objects.filter(trip=trip).delete()
            for idx, s in enumerate(stops_data):
                city_id = s.get('city')
                if not city_id and city_id != 0:
                    raise serializers.ValidationError({f'stops[{idx}].city': 'La ville de l\'arrêt est requise.'})

                resolved_city_id = _resolve_city_id(city_id)
                if not resolved_city_id:
                    raise serializers.ValidationError({f'stops[{idx}].city': f"Ville d'arrêt invalide: {city_id}"})

                try:
                    TripStop.objects.create(
                        trip=trip,
                        city_id=resolved_city_id,
                        sequence=s.get('sequence') if s.get('sequence') is not None else idx,
                        segment_price=s.get('segment_price')
                    )
                except Exception as e:
                    raise serializers.ValidationError({f'stops[{idx}]': f"Erreur lors de la création de l'arrêt: {e}"})
        return trip

    def validate(self, data):
        # Use .get to avoid KeyError and provide nicer errors
        dep = data.get('departure_city')
        arr = data.get('arrival_city')
        if dep is not None and arr is not None and dep == arr:
            raise serializers.ValidationError("La ville de départ et d'arrivée doivent être différentes.")

        # Validate stops if provided
        stops = data.get('stops')
        if stops is not None:
            if not isinstance(stops, list):
                raise serializers.ValidationError({'stops': 'La valeur des arrêts doit être une liste.'})
            for idx, s in enumerate(stops):
                # s is expected to be a dict with key 'city' (id)
                city_id = s.get('city') if isinstance(s, dict) else None
                if not city_id:
                    raise serializers.ValidationError({f'stops[{idx}].city': 'La ville de l\'arrêt est requise.'})
        return data


class BookingSerializer(serializers.ModelSerializer):
    """Serializer pour les réservations"""
    trip_details = TripSerializer(source='trip', read_only=True)
    passenger_full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = [
            'id', 'trip', 'trip_details', 'passenger_name', 'passenger_email',
            'passenger_phone', 'seat_number', 'origin_stop', 'destination_stop', 'status', 'payment_method',
            'total_price', 'booking_date', 'user',
            'passenger_full_name'
        ]
        read_only_fields = ['id', 'booking_date', 'passenger_full_name']

    def get_passenger_full_name(self, obj):
        return f"{obj.passenger_name}"

    def validate_seat_number(self, value):
        # Vérifier que le siège n'est pas déjà pris pour ce voyage programmé
        # If booking includes origin/destination stops, we must check overlap by sequence indices
        origin = None
        destination = None
        if self.initial_data.get('origin_stop'):
            try:
                origin = TripStop.objects.get(pk=self.initial_data.get('origin_stop'))
            except TripStop.DoesNotExist:
                origin = None
        if self.initial_data.get('destination_stop'):
            try:
                destination = TripStop.objects.get(pk=self.initial_data.get('destination_stop'))
            except TripStop.DoesNotExist:
                destination = None

        if self.instance:
            # Mode édition
            existing_booking = Booking.objects.filter(
                scheduled_trip=self.instance.scheduled_trip,
                seat_number=value,
                status__in=['confirmed', 'pending']
            ).exclude(id=self.instance.id)
        else:
            # Mode création
            scheduled_trip_id = self.initial_data.get('scheduled_trip')
            if scheduled_trip_id:
                # If origin/destination provided, determine overlapping bookings by stop sequence
                qs = Booking.objects.filter(scheduled_trip=scheduled_trip_id, seat_number=value, status__in=['confirmed', 'pending'])
                if origin and destination:
                    # bookings that overlap segment [origin.sequence, destination.sequence)
                    overlapping = []
                    for b in qs.select_related('origin_stop', 'destination_stop'):
                        if b.origin_stop and b.destination_stop:
                            if not (b.destination_stop.sequence <= origin.sequence or b.origin_stop.sequence >= destination.sequence):
                                overlapping.append(b)
                        else:
                            # If existing booking has no stops, treat as full-journey conflict
                            overlapping.append(b)
                    existing_booking = Trip.objects.none() if not overlapping else qs.filter(id__in=[bb.id for bb in overlapping])
                else:
                    existing_booking = qs
            else:
                existing_booking = Booking.objects.none()

        if existing_booking.exists():
            raise serializers.ValidationError("Ce siège est déjà réservé pour ce voyage.")

    def create(self, validated_data):
        # Commission rate for Evex (e.g., 10%)
        EVEX_COMMISSION_RATE = Decimal('0.10')

        # Create the booking instance
        booking = super().create(validated_data)

        # Calculate total price (assuming it's already set on the booking instance or can be derived)
        total_price = booking.total_price

        # Calculate commission and company revenue
        evex_commission = total_price * EVEX_COMMISSION_RATE
        company_revenue = total_price - evex_commission

        # Create the Payment instance
        Payment.objects.create(
            booking=booking,
            amount=total_price,
            payment_method=booking.payment_method,
            status='completed',  # Assuming payment is completed upon booking creation
            evex_commission=evex_commission,
            company_revenue=company_revenue,
            transaction_id=str(uuid.uuid4())
        )

        return booking


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer pour les paiements"""
    booking_details = BookingSerializer(source='booking', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'booking', 'booking_details', 'amount', 'payment_method',
            'status', 'transaction_id', 'evex_commission', 'company_revenue', 'payment_date'
        ]
        read_only_fields = ['id', 'payment_date', 'evex_commission', 'company_revenue']


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer pour les avis"""
    booking_details = BookingSerializer(source='booking', read_only=True)
    
    class Meta:
        model = Review
        fields = [
            'id', 'booking', 'booking_details', 'rating', 'comment',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer pour les notifications"""
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'title', 'message', 'type',
            'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ScheduledTripSerializer(serializers.ModelSerializer):
    """Serializer unifié pour les voyages planifiés.

    Fournit :
    - `trip_info` : détails du trajet
    - `departure_city_display` / `arrival_city_display` : valeurs adaptées au contexte de recherche
    - `stops` : arrêts ordonnés du trajet
    - `available_seats` : calculé selon le segment demandé si présent dans le contexte
    - `seats` : liste de tous les sièges avec leur statut (occupé/disponible)
    """
    # Champ writeable pour permettre la création via l'ID du Trip
    trip = serializers.PrimaryKeyRelatedField(queryset=Trip.objects.all(), write_only=True, required=True)
    trip_info = TripSerializer(source='trip', read_only=True)
    departure_city_display = serializers.SerializerMethodField()
    arrival_city_display = serializers.SerializerMethodField()
    stops = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()
    seats = serializers.SerializerMethodField()

    class Meta:
        model = ScheduledTrip
        fields = [
            'id', 'trip', 'trip_info', 'date', 'departure_city_display', 'arrival_city_display', 'stops', 'available_seats', 'seats'
        ]

    def get_departure_city_display(self, obj):
        request = self.context.get('request')
        if request:
            departure_city_id = request.query_params.get('departure_city')
            if departure_city_id:
                for stop in obj.trip.stops.all().order_by('sequence'):
                    if str(stop.city.id) == departure_city_id:
                        return stop.city.name
        return obj.trip.departure_city.name

    def get_arrival_city_display(self, obj):
        request = self.context.get('request')
        if request:
            arrival_city_id = request.query_params.get('arrival_city')
            if arrival_city_id:
                for stop in obj.trip.stops.all().order_by('sequence'):
                    if str(stop.city.id) == arrival_city_id:
                        return stop.city.name
        return obj.trip.arrival_city.name

    def get_stops(self, obj):
        # Retourne les arrêts du trajet triés par séquence
        return TripStopSerializer(obj.trip.stops.all().order_by('sequence'), many=True).data

    def get_available_seats(self, obj):
        request = self.context.get('request')
        if request:
            departure_city_id = request.query_params.get('departure_city')
            arrival_city_id = request.query_params.get('arrival_city')

            if departure_city_id and arrival_city_id:
                # Convertir les IDs en entiers
                try:
                    departure_city_id = int(departure_city_id)
                    arrival_city_id = int(arrival_city_id)
                except ValueError:
                    return obj.trip.capacity # Ou gérer l'erreur différemment

                # Trouver les objets TripStop pour les villes de départ et d'arrivée du segment
                departure_stop = obj.trip.stops.filter(city__id=departure_city_id).first()
                arrival_stop = obj.trip.stops.filter(city__id=arrival_city_id).first()

                if departure_stop and arrival_stop:
                    # Récupérer toutes les réservations confirmées ou en attente pour ce voyage planifié
                    all_bookings = Booking.objects.filter(
                        scheduled_trip=obj,
                        status__in=['confirmed', 'pending']
                    ).select_related('origin_stop', 'destination_stop')

                    overlapping_bookings_count = 0
                    for booking in all_bookings:
                        # Si la réservation n'a pas d'arrêts spécifiques, elle couvre tout le trajet
                        if not booking.origin_stop or not booking.destination_stop:
                            overlapping_bookings_count += 1
                            continue

                        # Vérifier si la réservation chevauche le segment demandé
                        # Un chevauchement se produit si :
                        # (départ_réservation < arrivée_segment ET arrivée_réservation > départ_segment)
                        if (booking.origin_stop.sequence < arrival_stop.sequence and
                                booking.destination_stop.sequence > departure_stop.sequence):
                            overlapping_bookings_count += 1

                    return obj.trip.capacity - overlapping_bookings_count

            # Logique par défaut si pas de segment ou d'erreur
            confirmed_bookings = Booking.objects.filter(
                scheduled_trip=obj,
                status__in=['confirmed', 'pending']
            ).count()
            return obj.trip.capacity - confirmed_bookings
        return obj.trip.capacity

    def get_seats(self, obj):
        """
        Retourne la liste de tous les sièges avec leur statut.
        - id: format "seat-{seat_number}"
        - status: 'available' ou 'occupied'
        - number: numéro du siège (1 à capacity)
        """
        # Récupérer tous les sièges réservés pour ce voyage planifié
        booked_seats = set()
        booked_bookings = Booking.objects.filter(
            scheduled_trip=obj,
            status__in=['confirmed', 'pending']
        ).values_list('seat_number', flat=True)
        # Convertir les numéros de siège en entiers pour la comparaison
        for seat_num in booked_bookings:
            if seat_num:
                try:
                    booked_seats.add(int(seat_num))
                except (ValueError, TypeError):
                    pass

        # Créer la liste de tous les sièges
        seats = []
        for seat_number in range(1, obj.trip.capacity + 1):
            seat_id = f"seat-{seat_number}"
            status = 'occupied' if seat_number in booked_seats else 'available'
            seats.append({
                'id': seat_id,
                'status': status,
                'number': seat_number
            })

        return seats


class BookingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer pour la création de réservations.
    Permet de spécifier le ScheduledTrip par son ID.
    """
    scheduled_trip = serializers.PrimaryKeyRelatedField(queryset=ScheduledTrip.objects.all(), write_only=True)
    trip = serializers.SerializerMethodField(read_only=True) # Pour afficher le trip après création

    class Meta:
        model = Booking
        fields = [
            'id', 'scheduled_trip', 'trip', 'passenger_name', 'passenger_email',
            'passenger_phone', 'seat_number', 'origin_stop', 'destination_stop',
            'total_price', 'user'
        ]
        read_only_fields = ['id', 'trip','total_price']

    def get_trip(self, obj):
        return obj.trip.id # Retourne l'ID du trip associé

    def validate(self, data):
        scheduled_trip = data.get('scheduled_trip')
        seat_number = data.get('seat_number')
        origin_stop = data.get('origin_stop')
        destination_stop = data.get('destination_stop')

        if not scheduled_trip:
            raise serializers.ValidationError("Le voyage planifié (scheduled_trip) est requis.")
        
        # Vérifier la disponibilité du siège pour ce voyage programmé spécifique
        if seat_number:
            # Vérifier si le siège est déjà pris pour ce voyage programmé
            if Booking.objects.filter(
                scheduled_trip=scheduled_trip,
                seat_number=seat_number,
                status__in=['confirmed', 'pending']
            ).exists():
                raise serializers.ValidationError(f"Le siège {seat_number} est déjà réservé pour ce voyage.")

        # Vérifier si le voyage programmé a des places disponibles
        if scheduled_trip.available_seats <= 0:
            raise serializers.ValidationError("Aucune place disponible pour ce voyage.")

        # Calculer le prix total en fonction du segment si spécifié
        if origin_stop and destination_stop:
            try:
                origin_stop_obj = TripStop.objects.get(id=origin_stop.id, trip=scheduled_trip.trip)
                destination_stop_obj = TripStop.objects.get(id=destination_stop.id, trip=scheduled_trip.trip)
            except TripStop.DoesNotExist:
                raise serializers.ValidationError("Les arrêts d'origine ou de destination spécifiés ne sont pas valides pour ce voyage.")

            # Récupérer tous les arrêts entre l'origine et la destination (inclus)
            segment_stops = scheduled_trip.trip.stops.filter(
                sequence__gte=origin_stop_obj.sequence,
                sequence__lte=destination_stop_obj.sequence
            ).order_by('sequence')

            if not segment_stops.exists() or segment_stops.first() != origin_stop_obj or segment_stops.last() != destination_stop_obj:
                raise serializers.ValidationError("Le segment de voyage spécifié est invalide.")

            total_price = Decimal(0)
            # Additionner les prix des segments intermédiaires
            for i in range(len(segment_stops) - 1):
                current_stop = segment_stops[i]
                next_stop = segment_stops[i+1]
                # Le prix du segment est stocké sur l'arrêt de départ de ce segment
                total_price += current_stop.segment_price
            data['total_price'] = total_price
        else:
            # Si pas de segment, utiliser le prix total du voyage
            data['total_price'] = scheduled_trip.trip.price

        data['trip'] = scheduled_trip.trip # Associer le trip réel
        return data

    def create(self, validated_data):
        scheduled_trip = validated_data.pop('scheduled_trip')
        validated_data['trip'] = scheduled_trip.trip
        validated_data['scheduled_trip'] = scheduled_trip
        # EN MODE DEVELOPPEMENT: créer la réservation directement en statut 'confirmed'
        # (sans attendre la confirmation de paiement)
        validated_data['status'] = 'confirmed'

        # Créer la réservation
        booking = super().create(validated_data)
        
        # Mettre à jour le nombre de places disponibles
        scheduled_trip.available_seats = max(0, scheduled_trip.available_seats - 1)
        scheduled_trip.save()
        
        return booking


class CompanyStatsSerializer(serializers.Serializer):
    scheduled_trips = serializers.IntegerField()
    total_bookings = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_occupancy = serializers.FloatField()

class DashboardStatsSerializer(serializers.Serializer):
    scheduled_trips = serializers.IntegerField()
    total_bookings = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_occupancy = serializers.FloatField()
    upcoming_trips = ScheduledTripSerializer(many=True)
    recent_bookings = BookingSerializer(many=True)

class TripSearchSerializer(serializers.Serializer):
    departure_city = serializers.CharField(required=True)
    arrival_city = serializers.CharField(required=True)
    travel_date = serializers.DateField(required=True)
    passengers = serializers.IntegerField(required=False, min_value=1, default=1)
    company = serializers.IntegerField(required=False)
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    departure_time_after = serializers.TimeField(required=False)
    departure_time_before = serializers.TimeField(required=False)

    def validate(self, data):
        departure_city = data.get('departure_city')
        arrival_city = data.get('arrival_city')

        if departure_city and arrival_city and departure_city == arrival_city:
            raise serializers.ValidationError("La ville de départ et d'arrivée ne peuvent pas être identiques.")

        return data
