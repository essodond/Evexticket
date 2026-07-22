from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver
from .mixins import SoftDeleteModel
import uuid


def get_reservation_expiry():
    """Calcul de la date d'expiration de la réservation (5 minutes)"""
    return timezone.now() + timedelta(minutes=5)

# Signal pour initialiser le nombre de places disponibles lors de la création d'un ScheduledTrip
@receiver(post_save, sender='transport.ScheduledTrip')
def set_initial_available_seats(sender, instance, created, **kwargs):
    if created:
        instance.available_seats = instance.trip.capacity
        instance.save()

class Company(SoftDeleteModel):
    """Modèle pour les compagnies de transport"""
    name = models.CharField(max_length=200, verbose_name="Nom de la compagnie")
    description = models.TextField(verbose_name="Description")
    address = models.CharField(max_length=300, verbose_name="Adresse")
    phone = models.CharField(max_length=20, verbose_name="Téléphone")
    email = models.EmailField(verbose_name="Email")
    website = models.URLField(blank=True, null=True, verbose_name="Site web")
    logo = models.URLField(blank=True, null=True, verbose_name="URL du logo")
    is_active = models.BooleanField(default=True, verbose_name="Compagnie active")
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=10.00,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Commission EVEX (%)",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Date de mise à jour")
    
    # Lien avec l'utilisateur administrateur de la compagnie
    admin_user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='company_admin',
        verbose_name="Administrateur de la compagnie",
        null=True,
        blank=True,
    )

    # Permettre plusieurs administrateurs par compagnie
    admins = models.ManyToManyField(
        User,
        related_name='admin_companies',
        blank=True,
        verbose_name='Administrateurs'
    )

    class Meta:
        verbose_name = "Compagnie"
        verbose_name_plural = "Compagnies"
        ordering = ['name']

    def __str__(self):
        return self.name


class PlatformConfiguration(models.Model):
    """Configuration singleton de la plateforme, modifiable par le super administrateur."""

    service_fee = models.PositiveIntegerField(default=300, verbose_name="Frais de service (FCFA)")
    default_commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=10.00,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Commission par défaut (%)",
    )
    cancellation_delay_hours = models.PositiveIntegerField(
        default=2,
        verbose_name="Délai minimal d'annulation (heures)",
    )
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=True)
    maintenance_mode = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
    )

    class Meta:
        verbose_name = "Configuration de la plateforme"
        verbose_name_plural = "Configuration de la plateforme"

    @classmethod
    def load(cls):
        configuration, _ = cls.objects.get_or_create(pk=1)
        return configuration

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)


class City(models.Model):
    """Modèle pour les villes du Togo"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Nom de la ville")
    region = models.CharField(max_length=100, verbose_name="Région")
    is_active = models.BooleanField(default=True, verbose_name="Ville active")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")

    class Meta:
        verbose_name = "Ville"
        verbose_name_plural = "Villes"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.region})"


class Trip(SoftDeleteModel):
    """Modèle pour les trajets de transport"""
    BUS_TYPES = [
        ('Standard', 'Standard'),
        ('Premium', 'Premium'),
        ('VIP', 'VIP'),
        ('Luxury', 'Luxury'),
    ]

    company = models.ForeignKey(
        Company, 
        on_delete=models.CASCADE, 
        related_name='trips',
        verbose_name="Compagnie"
    )
    departure_city = models.ForeignKey(
        City, 
        on_delete=models.CASCADE, 
        related_name='departure_trips',
        verbose_name="Ville de départ"
    )
    arrival_city = models.ForeignKey(
        City, 
        on_delete=models.CASCADE, 
        related_name='arrival_trips',
        verbose_name="Ville d'arrivée"
    )
    departure_time = models.TimeField(verbose_name="Heure de départ")
    arrival_time = models.TimeField(verbose_name="Heure d'arrivée")
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(0)],
        verbose_name="Prix (FCFA)"
    )
    duration = models.PositiveIntegerField(
        help_text="Durée en minutes",
        verbose_name="Durée (minutes)"
    )
    bus_type = models.CharField(
        max_length=20, 
        choices=BUS_TYPES, 
        default='Standard',
        verbose_name="Type de bus"
    )
    capacity = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        verbose_name="Capacité (places)"
    )
    is_active = models.BooleanField(default=True, verbose_name="Trajet actif")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Date de mise à jour")

    class Meta:
        verbose_name = "Trajet"
        verbose_name_plural = "Trajets"
        ordering = ['departure_time']

    def __str__(self):
        return f"{self.departure_city.name} → {self.arrival_city.name} ({self.departure_time})"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.departure_city == self.arrival_city:
            raise ValidationError("La ville de départ et d'arrivée doivent être différentes.")


    

class ScheduledTrip(models.Model):
    """Instance planifiée d'un Trip pour une date donnée."""
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='scheduled_trips')
    date = models.DateField(verbose_name="Date")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    available_seats = models.PositiveIntegerField(default=0, verbose_name="Places disponibles")

    class Meta:
        unique_together = ('trip', 'date')
        ordering = ['-date']
        verbose_name = "Voyage programmé"
        verbose_name_plural = "Voyages programmés"

    def __str__(self):
        return f"{self.trip} @ {self.date}"


class BoardingZone(models.Model):
    """Zone d'embarquement spécifique à une ville et un arrêt de trajet."""
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='boarding_zones', verbose_name='Ville')
    trip_stop = models.ForeignKey('TripStop', on_delete=models.CASCADE, related_name='boarding_zones', verbose_name='Arrêt de trajet')
    name = models.CharField(max_length=100, verbose_name="Nom de la zone")
    description = models.TextField(blank=True, verbose_name="Description")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Latitude")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Longitude")

    class Meta:
        unique_together = ('trip_stop', 'name')
        verbose_name = "Zone d'embarquement"
        verbose_name_plural = "Zones d'embarquement"

    def __str__(self):
        return f"{self.name} ({self.city.name} - {self.trip_stop.trip.id})"


class Booking(SoftDeleteModel):
    """Modèle pour les réservations"""
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('confirmed', 'Confirmé'),
        ('cancelled', 'Annulé'),
        ('completed', 'Terminé'),
    ]

    PAYMENT_METHODS = [
        ('mobile_money', 'Mobile Money'),
        ('bank_card', 'Carte bancaire'),
        ('cash', 'Espèces'),
    ]

    trip = models.ForeignKey(
        Trip, 
        on_delete=models.PROTECT, 
        related_name='bookings',
        verbose_name="Trajet"
    )
    scheduled_trip = models.ForeignKey(
        'ScheduledTrip',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
        verbose_name="Voyage programmé"
    )
    passenger_name = models.CharField(max_length=200, verbose_name="Nom du passager")
    passenger_email = models.EmailField(verbose_name="Email du passager")
    passenger_phone = models.CharField(max_length=20, verbose_name="Téléphone du passager")
    seat_number = models.CharField(max_length=10, verbose_name="Numéro de siège")
    origin_stop = models.ForeignKey(
        'TripStop', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='origin_bookings'
    )
    destination_stop = models.ForeignKey(
        'TripStop', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='destination_bookings'
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        verbose_name="Statut"
    )
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHODS,
        verbose_name="Méthode de paiement"
    )
    total_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        verbose_name="Prix total (FCFA)"
    )
    booking_date = models.DateTimeField(auto_now_add=True, verbose_name="Date de réservation")
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
        verbose_name="Utilisateur"
    )

    class Meta:
        verbose_name = "Réservation"
        verbose_name_plural = "Réservations"
        ordering = ['-booking_date']

    def __str__(self):
        return f"{self.passenger_name} - {self.trip} ({self.status})"


class Payment(models.Model):
    """Modèle pour les paiements"""
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('completed', 'Complété'),
        ('failed', 'Échoué'),
        ('refunded', 'Remboursé'),
    ]

    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name="Réservation"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Montant (FCFA)"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=Booking.PAYMENT_METHODS,
        verbose_name="Méthode de paiement"
    )
    transaction_id = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="ID de transaction"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Statut"
    )
    evex_commission = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        verbose_name="Commission Evex (FCFA)"
    )
    company_revenue = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        verbose_name="Revenu Compagnie (FCFA)"
    )
    payment_date = models.DateTimeField(auto_now_add=True, verbose_name="Date de paiement")

    class Meta:
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
        ordering = ['-payment_date']

    def __str__(self):
        return f"{self.booking} - {self.amount} FCFA ({self.status})"


class Review(models.Model):
    """Modèle pour les avis"""
    RATING_CHOICES = [
        (1, '1 étoile'),
        (2, '2 étoiles'),
        (3, '3 étoiles'),
        (4, '4 étoiles'),
        (5, '5 étoiles'),
    ]

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name='review',
        verbose_name="Réservation"
    )
    rating = models.PositiveSmallIntegerField(
        choices=RATING_CHOICES,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Note"
    )
    comment = models.TextField(verbose_name="Commentaire")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")

    class Meta:
        verbose_name = "Avis"
        verbose_name_plural = "Avis"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.booking.passenger_name} - {self.rating} étoiles"


class Notification(models.Model):
    """Modèle pour les notifications"""
    TYPE_CHOICES = [
        ('booking_confirmation', 'Confirmation de réservation'),
        ('booking_reminder', 'Rappel de réservation'),
        ('payment_confirmation', 'Confirmation de paiement'),
        ('trip_update', 'Mise à jour du trajet'),
        ('system', 'Notification système'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Utilisateur"
    )
    type = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        default='system',
        verbose_name="Type"
    )
    title = models.CharField(max_length=200, verbose_name="Titre")
    message = models.TextField(verbose_name="Message")
    is_read = models.BooleanField(default=False, verbose_name="Lu")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class TripStop(models.Model):
    """Un arrêt (stop) pour un Trip, ordonné par `sequence`.

    On stocke un prix cumulatif `price_from_start` qui représente le tarif
    depuis le premier arrêt du trajet jusqu'à cette escale. Le prix entre
    deux escales est la différence des `price_from_start`.
    """
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='stops')
    city = models.ForeignKey(City, on_delete=models.CASCADE, verbose_name='Ville')
    sequence = models.PositiveIntegerField(verbose_name='Ordre')
    # Prix du segment partant de cette escale vers l'escale suivante.
    # Les compagnies doivent renseigner ces prix manuellement.
    segment_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Prix du segment vers l'arrêt suivant")

    class Meta:
        unique_together = ('trip', 'sequence')
        ordering = ['trip', 'sequence']
        verbose_name = "Arrêt"
        verbose_name_plural = "Arrêts"

    def __str__(self):
        return f"{self.trip} - {self.city.name} (#{self.sequence})"


class Siege(models.Model):
    STATUT_LIBRE = 'libre'
    STATUT_RESERVE_TEMP = 'reserve_temp'
    STATUT_OCCUPE = 'occupe'

    STATUT_CHOICES = [
        (STATUT_LIBRE, 'Libre'),
        (STATUT_RESERVE_TEMP, 'Reserve temporairement'),
        (STATUT_OCCUPE, 'Occupe'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voyage = models.ForeignKey(
        ScheduledTrip,
        on_delete=models.CASCADE,
        related_name='sieges',
        verbose_name='Voyage',
    )
    numero = models.IntegerField(verbose_name='Numero de siege')
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default=STATUT_LIBRE,
        verbose_name='Statut',
    )
    reserve_at = models.DateTimeField(null=True, blank=True, verbose_name='Reserve le')

    class Meta:
        unique_together = ('voyage', 'numero')
        ordering = ['voyage', 'numero']
        verbose_name = 'Siege'
        verbose_name_plural = 'Sieges'

    def __str__(self):
        return f"{self.voyage} - siege {self.numero}"


class Reservation(models.Model):
    OPERATEUR_FLOOZ = 'FLOOZ'
    OPERATEUR_TMONEY = 'TMONEY'

    OPERATEUR_CHOICES = [
        (OPERATEUR_FLOOZ, 'Flooz'),
        (OPERATEUR_TMONEY, 'T-Money'),
    ]

    STATUT_EN_ATTENTE = 'en_attente'
    STATUT_PAYE = 'paye'
    STATUT_ECHOUE = 'echoue'
    STATUT_EXPIRE = 'expire'
    STATUT_REMBOURSE = 'rembourse'

    STATUT_PAIEMENT_CHOICES = [
        (STATUT_EN_ATTENTE, 'En attente'),
        (STATUT_PAYE, 'Paye'),
        (STATUT_ECHOUE, 'Echoue'),
        (STATUT_EXPIRE, 'Expire'),
        (STATUT_REMBOURSE, 'Rembourse'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voyage = models.ForeignKey(
        ScheduledTrip,
        on_delete=models.PROTECT,
        related_name='reservations_evex',
        verbose_name='Voyage',
    )
    siege = models.ForeignKey(
        Siege,
        on_delete=models.PROTECT,
        related_name='reservations',
        verbose_name='Siege',
    )
    client_nom = models.CharField(max_length=200, verbose_name='Nom du client')
    client_telephone = models.CharField(max_length=30, verbose_name='Telephone du client')
    montant_billet = models.IntegerField(verbose_name='Montant billet')
    frais_evex = models.IntegerField(default=300, verbose_name='Frais EVEX')
    montant_total = models.IntegerField(verbose_name='Montant total')
    frais_qos = models.IntegerField(verbose_name='Frais QOS')
    revenu_net_evex = models.IntegerField(verbose_name='Revenu net EVEX')
    montant_reverse_compagnie = models.IntegerField(verbose_name='Montant reverse compagnie')
    operateur = models.CharField(max_length=10, choices=OPERATEUR_CHOICES)
    reference_evex = models.CharField(max_length=32, unique=True)
    reference_qos = models.CharField(max_length=100, null=True, blank=True)
    transaction_id_qos = models.CharField(max_length=100, null=True, blank=True)
    statut_paiement = models.CharField(
        max_length=20,
        choices=STATUT_PAIEMENT_CHOICES,
        default=STATUT_EN_ATTENTE,
    )
    reversement_effectue = models.BooleanField(default=False)
    reversement_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(default=get_reservation_expiry)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Reservation EVEX'
        verbose_name_plural = 'Reservations EVEX'

    def __str__(self):
        return f"{self.reference_evex} - {self.client_nom}"


class CompteCagnotte(models.Model):
    compagnie = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name='cagnotte',
        verbose_name='Compagnie',
    )
    solde_a_reverser = models.IntegerField(default=0)
    total_reverse = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Compte cagnotte'
        verbose_name_plural = 'Comptes cagnotte'

    def __str__(self):
        return f"Cagnotte {self.compagnie} - {self.solde_a_reverser} FCFA"


class HistoriqueReversement(models.Model):
    STATUT_EN_ATTENTE = 'en_attente'
    STATUT_EFFECTUE = 'effectue'
    STATUT_ECHOUE = 'echoue'

    STATUT_CHOICES = [
        (STATUT_EN_ATTENTE, 'En attente'),
        (STATUT_EFFECTUE, 'Effectue'),
        (STATUT_ECHOUE, 'Echoue'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    compagnie = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='historiques_reversement',
    )
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name='historiques_reversement',
    )
    montant = models.IntegerField()
    reference_qos_reversement = models.CharField(max_length=100, null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=STATUT_EN_ATTENTE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Historique reversement'
        verbose_name_plural = 'Historiques reversement'

    def __str__(self):
        return f"{self.reservation.reference_evex} - {self.montant} FCFA ({self.statut})"


# ──────────────────────────────────────────────────────────────
# Signals
# ──────────────────────────────────────────────────────────────

@receiver(post_save, sender=Trip)
def create_scheduled_trips_on_trip_creation(sender, instance, created, **kwargs):
    """À la création d'un Trip, génère automatiquement les ScheduledTrip pour les 14 prochains jours."""
    if not created:
        return
    try:
        today = timezone.localdate()
        for n in range(1, 15):
            d = today + timedelta(days=n)
            ScheduledTrip.objects.get_or_create(
                trip=instance,
                date=d,
                defaults={'is_active': True, 'available_seats': instance.capacity},
            )
    except Exception:
        pass


def _recalculate_scheduled_trip_seats(scheduled_trip):
    """Recalcule available_seats pour un ScheduledTrip en comptant les sièges uniques
    des réservations actives (pending + confirmed)."""
    try:
        booked_count = (
            Booking.objects.filter(
                scheduled_trip=scheduled_trip,
                status__in=['pending', 'confirmed'],
            )
            .values_list('seat_number', flat=True)
            .distinct()
            .count()
        )
        available = max(scheduled_trip.trip.capacity - booked_count, 0)
        ScheduledTrip.objects.filter(pk=scheduled_trip.pk).update(available_seats=available)
    except Exception:
        pass


@receiver(post_save, sender=Booking)
def update_scheduled_trip_seats_on_booking(sender, instance, **kwargs):
    """Met à jour available_seats du ScheduledTrip chaque fois qu'une réservation
    est créée ou modifiée (changement de statut inclus)."""
    if instance.scheduled_trip_id:
        _recalculate_scheduled_trip_seats(instance.scheduled_trip)

