from django.contrib.auth import get_user_model
from rest_framework import serializers



from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Company, City, Trip, Booking, Payment, Review, Notification, ScheduledTrip
from .models import TripStop


class TripStopSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripStop
        fields = ['id', 'city', 'sequence', 'segment_price']
        read_only_fields = ['id']

# Serializer pour l'inscription d'utilisateur
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password']
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer pour les utilisateurs"""
    is_company_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        # Exposer également les flags de rôle pour que le frontend puisse
        # décider de la redirection (is_staff => Admin Général, is_company_admin calculé côté /me/)
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'is_superuser', 'date_joined', 'is_company_admin'
        ]
        read_only_fields = ['id', 'date_joined', 'is_company_admin']

    def get_is_company_admin(self, obj):
        # Vérifie si l'utilisateur est admin d'au moins une compagnie
        return obj.admin_companies.exists()


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


class TripSerializer(serializers.ModelSerializer):
    """Serializer pour les trajets"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    departure_city_name = serializers.CharField(source='departure_city.name', read_only=True)
    arrival_city_name = serializers.CharField(source='arrival_city.name', read_only=True)
    bookings_count = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()
    # Allow reading and writing stops as nested objects
    stops = TripStopSerializer(many=True, required=False)
    
    class Meta:
        model = Trip
        fields = [
            'id', 'company', 'company_name', 'departure_city', 'departure_city_name',
            'arrival_city', 'arrival_city_name', 'departure_time', 'arrival_time',
            'price', 'duration', 'bus_type', 'capacity', 'is_active',
            'created_at', 'updated_at', 'bookings_count', 'available_seats'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'bookings_count', 'available_seats']

    def get_bookings_count(self, obj):
        return obj.bookings.filter(status__in=['confirmed', 'pending']).count()

    def get_available_seats(self, obj):
        confirmed_bookings = obj.bookings.filter(status='confirmed').count()
        return obj.capacity - confirmed_bookings

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # include stops ordered for frontend convenience
        stops = TripStop.objects.filter(trip=instance).order_by('sequence')
        data['stops'] = [
            {
                'id': s.id,
                'city_id': s.city_id,
                'city_name': s.city.name,
                'sequence': s.sequence,
                'segment_price': (str(s.segment_price) if s.segment_price is not None else None)
            }
            for s in stops
        ]
        return data

    def create(self, validated_data):
        stops_data = validated_data.pop('stops', None)
        trip = super().create(validated_data)
        # create stops if provided
        if stops_data:
            # delete any pre-existing (shouldn't exist on create) and recreate
            for s in stops_data:
                TripStop.objects.create(
                    trip=trip,
                    city_id=s.get('city'),
                    sequence=s.get('sequence') if s.get('sequence') is not None else 0,
                    segment_price=s.get('segment_price')
                )
        return trip

    def update(self, instance, validated_data):
        stops_data = validated_data.pop('stops', None)
        trip = super().update(instance, validated_data)
        if stops_data is not None:
            # Simple approach: remove existing stops and recreate from provided list
            TripStop.objects.filter(trip=trip).delete()
            for s in stops_data:
                TripStop.objects.create(
                    trip=trip,
                    city_id=s.get('city'),
                    sequence=s.get('sequence') if s.get('sequence') is not None else 0,
                    segment_price=s.get('segment_price')
                )
        return trip

    def validate(self, data):
        if data['departure_city'] == data['arrival_city']:
            raise serializers.ValidationError("La ville de départ et d'arrivée doivent être différentes.")
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
            'total_price', 'booking_date', 'travel_date', 'notes', 'user',
            'passenger_full_name'
        ]
        read_only_fields = ['id', 'booking_date', 'passenger_full_name']

    def get_passenger_full_name(self, obj):
        return f"{obj.passenger_name}"

    def validate_seat_number(self, value):
        # Vérifier que le siège n'est pas déjà pris pour ce trajet et cette date
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
                trip=self.instance.trip,
                travel_date=self.instance.travel_date,
                seat_number=value,
                status__in=['confirmed', 'pending']
            ).exclude(id=self.instance.id)
        else:
            # Mode création
            trip = self.initial_data.get('trip')
            travel_date = self.initial_data.get('travel_date')
            if trip and travel_date:
                # If origin/destination provided, determine overlapping bookings by stop sequence
                qs = Booking.objects.filter(trip=trip, travel_date=travel_date, seat_number=value, status__in=['confirmed', 'pending'])
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
            raise serializers.ValidationError("Ce siège est déjà réservé pour ce trajet.")
        return value


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer pour les paiements"""
    booking_details = BookingSerializer(source='booking', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'booking', 'booking_details', 'amount', 'payment_method',
            'status', 'transaction_id', 'payment_date', 'notes'
        ]
        read_only_fields = ['id', 'payment_date']


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer pour les avis"""
    booking_details = BookingSerializer(source='booking', read_only=True)
    
    class Meta:
        model = Review
        fields = [
            'id', 'booking', 'booking_details', 'rating', 'comment',
            'created_at', 'is_approved'
        ]
        read_only_fields = ['id', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer pour les notifications"""
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'title', 'message', 'notification_type',
            'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TripSearchSerializer(serializers.Serializer):
    """Serializer pour la recherche de trajets"""
    departure_city = serializers.CharField(required=True)
    arrival_city = serializers.CharField(required=True)
    travel_date = serializers.DateField(required=True)
    passengers = serializers.IntegerField(min_value=1, max_value=10, default=1)


class BookingCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de réservations"""
    class Meta:
        model = Booking
        fields = [
            'trip', 'passenger_name', 'passenger_email', 'passenger_phone',
            'seat_number', 'origin_stop', 'destination_stop', 'payment_method', 'travel_date', 'notes'
        ]

    def create(self, validated_data):
        trip = validated_data['trip']
        origin = validated_data.get('origin_stop')
        destination = validated_data.get('destination_stop')

        total = None
        try:
            if origin and destination:
                # Ensure origin and destination belong to the trip
                if origin.trip_id != trip.id or destination.trip_id != trip.id:
                    raise serializers.ValidationError('Origin/Destination stops must belong to the selected trip.')
                if origin.sequence >= destination.sequence:
                    raise serializers.ValidationError('Origin must be before destination.')

                # Sum segment_price for sequences [origin.sequence, destination.sequence)
                segments = TripStop.objects.filter(trip=trip, sequence__gte=origin.sequence, sequence__lt=destination.sequence)
                prices = [s.segment_price for s in segments]
                if any(p is None for p in prices):
                    # Fallback to trip.price if some segments lack pricing
                    total = trip.price
                else:
                    total = sum(prices)
            else:
                total = trip.price
        except Exception:
            total = trip.price

        validated_data['total_price'] = total
        validated_data['status'] = 'pending'
        return super().create(validated_data)


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques du dashboard"""
    total_users = serializers.IntegerField()
    total_companies = serializers.IntegerField()
    total_trips = serializers.IntegerField()
    total_bookings = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_growth = serializers.FloatField()


class CompanyStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques de la compagnie"""
    total_trips = serializers.IntegerField()
    total_bookings = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    active_users = serializers.IntegerField()


class ScheduledTripSerializer(serializers.ModelSerializer):
    trip_info = TripSerializer(source='trip', read_only=True)

    class Meta:
        model = ScheduledTrip
        fields = ['id', 'trip', 'trip_info', 'date', 'is_active', 'available_seats', 'created_at']
        read_only_fields = ['id', 'created_at']
