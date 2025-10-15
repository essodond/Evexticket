from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta
from django.db.models.signals import post_save
from django.dispatch import receiver


class Company(models.Model):
    """Modèle pour les compagnies de transport"""
    name = models.CharField(max_length=200, verbose_name="Nom de la compagnie")
    description = models.TextField(verbose_name="Description")
    address = models.CharField(max_length=300, verbose_name="Adresse")
    phone = models.CharField(max_length=20, verbose_name="Téléphone")
    email = models.EmailField(verbose_name="Email")
    website = models.URLField(blank=True, null=True, verbose_name="Site web")
    logo = models.URLField(blank=True, null=True, verbose_name="URL du logo")
    is_active = models.BooleanField(default=True, verbose_name="Compagnie active")
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


class Trip(models.Model):
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


class TripStop(models.Model):
    """Une escale (stop) pour un Trip, ordonnée par `sequence`.

    On stocke un prix cumulatif `price_from_start` qui représente le tarif
    depuis le premier arrêt du trajet jusqu'à cette escale. Le prix entre
    deux escales est la différence des `price_from_start`.
    """
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='stops')
    city = models.ForeignKey(City, on_delete=models.CASCADE, verbose_name='Ville')
    sequence = models.PositiveIntegerField(verbose_name='Ordre')
    price_from_start = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ('trip', 'sequence')
        ordering = ['trip', 'sequence']

    def __str__(self):
        return f"{self.trip} - {self.city.name} (#{self.sequence})"


class Booking(models.Model):
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
        on_delete=models.CASCADE, 
        related_name='bookings',
        verbose_name="Trajet"
    )
    passenger_name = models.CharField(max_length=200, verbose_name="Nom du passager")
    passenger_email = models.EmailField(verbose_name="Email du passager")
    passenger_phone = models.CharField(max_length=20, verbose_name="Téléphone du passager")
    seat_number = models.CharField(max_length=10, verbose_name="Numéro de siège")
    # Optional origin/destination stops for segment bookings
    origin_stop = models.ForeignKey('TripStop', on_delete=models.SET_NULL, null=True, blank=True, related_name='origin_bookings')
    destination_stop = models.ForeignKey('TripStop', on_delete=models.SET_NULL, null=True, blank=True, related_name='destination_bookings')
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
    travel_date = models.DateField(verbose_name="Date de voyage")
    notes = models.TextField(blank=True, null=True, verbose_name="Notes")
    
    # Lien avec l'utilisateur si connecté
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
        return f"{self.passenger_name} - {self.trip} ({self.travel_date})"


class Payment(models.Model):
    """Modèle pour les paiements"""
    PAYMENT_STATUS = [
        ('pending', 'En attente'),
        ('completed', 'Terminé'),
        ('failed', 'Échoué'),
        ('refunded', 'Remboursé'),
    ]

    booking = models.OneToOneField(
        Booking, 
        on_delete=models.CASCADE, 
        related_name='payment',
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
    status = models.CharField(
        max_length=20, 
        choices=PAYMENT_STATUS, 
        default='pending',
        verbose_name="Statut du paiement"
    )
    transaction_id = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        verbose_name="ID de transaction"
    )
    payment_date = models.DateTimeField(
        auto_now_add=True, 
        verbose_name="Date de paiement"
    )
    notes = models.TextField(blank=True, null=True, verbose_name="Notes")

    class Meta:
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
        ordering = ['-payment_date']

    def __str__(self):
        return f"Paiement {self.booking.passenger_name} - {self.amount} FCFA"


class Review(models.Model):
    """Modèle pour les avis des passagers"""
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
    rating = models.PositiveIntegerField(
        choices=RATING_CHOICES,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Note"
    )
    comment = models.TextField(verbose_name="Commentaire")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    is_approved = models.BooleanField(default=False, verbose_name="Avis approuvé")

    class Meta:
        verbose_name = "Avis"
        verbose_name_plural = "Avis"
        ordering = ['-created_at']

    def __str__(self):
        return f"Avis {self.booking.passenger_name} - {self.rating} étoiles"


class Notification(models.Model):
    """Modèle pour les notifications"""
    NOTIFICATION_TYPES = [
        ('booking_confirmed', 'Réservation confirmée'),
        ('booking_cancelled', 'Réservation annulée'),
        ('payment_received', 'Paiement reçu'),
        ('trip_reminder', 'Rappel de voyage'),
        ('general', 'Général'),
    ]

    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        verbose_name="Utilisateur"
    )
    title = models.CharField(max_length=200, verbose_name="Titre")
    message = models.TextField(verbose_name="Message")
    notification_type = models.CharField(
        max_length=30, 
        choices=NOTIFICATION_TYPES,
        verbose_name="Type de notification"
    )
    is_read = models.BooleanField(default=False, verbose_name="Lu")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class ScheduledTrip(models.Model):
    """Représente un voyage daté (instance d'un Trip pour une date donnée).

    Permet d'activer / désactiver un voyage pour une date spécifique sans
    toucher le trajet permanent (Trip).
    """
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='scheduled_trips', verbose_name='Trajet')
    date = models.DateField(verbose_name='Date du voyage')
    is_active = models.BooleanField(default=True, verbose_name='Voyage actif')
    available_seats = models.PositiveIntegerField(null=True, blank=True, verbose_name='Places disponibles')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')

    class Meta:
        verbose_name = 'Voyage planifié'
        verbose_name_plural = 'Voyages planifiés'
        unique_together = ('trip', 'date')
        ordering = ['date', 'trip__departure_time']

    def __str__(self):
        return f"{self.trip} @ {self.date}"

    def save(self, *args, **kwargs):
        # Si available_seats n'est pas précisé, initialiser à la capacité du bus
        if self.available_seats is None:
            self.available_seats = self.trip.capacity
        super().save(*args, **kwargs)


# Lorsque un Trip est créé via l'admin ou API, créer automatiquement les
# ScheduledTrip pour les 14 prochains jours (fenêtre glissante).
@receiver(post_save, sender=Trip)
def create_scheduled_trips_on_trip_creation(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        start_offset = 1
        days = 14
        today = timezone.localdate()
        start_date = today + timedelta(days=start_offset)
        for n in range(days):
            d = start_date + timedelta(days=n)
            # importer ici ScheduledTrip qui est défini dans ce même module
            ScheduledTrip.objects.get_or_create(
                trip=instance,
                date=d,
                defaults={'is_active': True, 'available_seats': instance.capacity}
            )
    except Exception:
        # Ne pas lever d'exception lors de la sauvegarde du Trip — log possible si besoin
        pass