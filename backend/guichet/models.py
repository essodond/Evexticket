from django.db import models
from django.contrib.auth.models import User
import uuid
from transport.models import Company, ScheduledTrip, Siege, Reservation
from transport.models.mixins import SoftDeleteModel


class AgentGuichet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agentguichet')
    compagnie = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='agents_guichet')
    nom = models.CharField(max_length=150)
    prenom = models.CharField(max_length=150)
    telephone = models.CharField(max_length=30)
    agence = models.ForeignKey(
        'Agence',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agents',
    )
    guichet = models.ForeignKey(
        'Guichet',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agents',
    )
    actif = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='agents_crees')

    def __str__(self):
        return f"{self.nom} {self.prenom} ({self.compagnie.name})"


class Agence(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    compagnie = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='agences')
    nom = models.CharField(max_length=200)
    ville = models.ForeignKey('transport.City', on_delete=models.PROTECT, related_name='agences')
    adresse = models.CharField(max_length=300)
    telephone = models.CharField(max_length=30)
    gestionnaire = models.ForeignKey(
        AgentGuichet,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agences_gerees',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']
        constraints = [
            models.UniqueConstraint(
                fields=['compagnie', 'nom'],
                condition=models.Q(is_deleted=False),
                name='unique_active_agence_name_per_company',
            ),
        ]

    def __str__(self):
        return f"{self.nom} ({self.compagnie.name})"


class Guichet(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agence = models.ForeignKey(Agence, on_delete=models.CASCADE, related_name='guichets')
    code = models.CharField(max_length=30)
    nom = models.CharField(max_length=150)
    emplacement = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code', 'nom']
        constraints = [
            models.UniqueConstraint(
                fields=['agence', 'code'],
                condition=models.Q(is_deleted=False),
                name='unique_active_guichet_code_per_agence',
            ),
        ]

    def __str__(self):
        return f"{self.code} - {self.nom} ({self.agence.nom})"


class VenteGuichet(models.Model):
    MODE_CHOICES = [
        ('cash', 'Cash'),
        ('flooz', 'Flooz'),
        ('tmoney', 'T-Money'),
    ]
    STATUT_CHOICES = [
        ('valide', 'Valide'),
        ('annule', 'Annule'),
        ('utilise', 'Utilise'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(AgentGuichet, on_delete=models.CASCADE, related_name='ventes')
    agence = models.ForeignKey(
        Agence,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ventes',
    )
    guichet = models.ForeignKey(
        Guichet,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ventes',
    )
    voyage = models.ForeignKey(ScheduledTrip, on_delete=models.PROTECT, related_name='ventes_guichet')
    siege = models.ForeignKey(Siege, on_delete=models.PROTECT, related_name='ventes_guichet')
    client_nom = models.CharField(max_length=200)
    client_telephone = models.CharField(max_length=30)
    montant_billet = models.IntegerField()
    frais_evex = models.IntegerField(default=300)
    montant_total = models.IntegerField()
    mode_paiement = models.CharField(max_length=10, choices=MODE_CHOICES)
    reference_vente = models.CharField(max_length=64, unique=True)
    qr_code_data = models.TextField()
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='valide')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reference_vente} - {self.client_nom}"


class ControlePassager(models.Model):
    RESULTAT_CHOICES = [
        ('valide', 'Valide'),
        ('invalide', 'Invalide'),
        ('deja_utilise', 'Deja utilise'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(AgentGuichet, on_delete=models.SET_NULL, null=True, related_name='controles')
    vente = models.ForeignKey(VenteGuichet, on_delete=models.SET_NULL, null=True, blank=True, related_name='controles')
    reservation = models.ForeignKey(Reservation, on_delete=models.SET_NULL, null=True, blank=True, related_name='controles')
    voyage = models.ForeignKey(ScheduledTrip, on_delete=models.PROTECT, related_name='controles')
    resultat = models.CharField(max_length=20, choices=RESULTAT_CHOICES)
    message = models.CharField(max_length=400, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Controle {self.id} - {self.resultat}"
