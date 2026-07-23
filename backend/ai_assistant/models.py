from django.conf import settings
from django.db import models


class AIInteractionLog(models.Model):
    """Journal technique sans contenu utilisateur ni donnée sensible."""

    FEATURE_CHOICES = [
        ("search", "Recherche"),
        ("recommendation", "Recommandation"),
        ("ticket_support", "Assistant billet"),
        ("copilot", "Copilote"),
        ("voice", "Commande vocale"),
        ("review", "Analyse avis"),
    ]
    feature = models.CharField(max_length=30, choices=FEATURE_CHOICES)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    provider = models.CharField(max_length=30, default="fallback")
    model_name = models.CharField(max_length=80, blank=True)
    successful = models.BooleanField(default=True)
    latency_ms = models.PositiveIntegerField(default=0)
    error_code = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Interaction IA"
        verbose_name_plural = "Interactions IA"


class TripIntelligenceSnapshot(models.Model):
    scheduled_trip = models.OneToOneField(
        "transport.ScheduledTrip",
        on_delete=models.CASCADE,
        related_name="intelligence_snapshot",
    )
    predicted_occupancy_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    predicted_delay_minutes = models.PositiveIntegerField(default=0)
    reported_delay_minutes = models.PositiveIntegerField(default=0)
    confidence = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    signals = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Prévision de voyage"
        verbose_name_plural = "Prévisions de voyage"


class BookingRiskAssessment(models.Model):
    LEVEL_CHOICES = [
        ("low", "Faible"),
        ("medium", "Moyen"),
        ("high", "Élevé"),
    ]
    booking = models.OneToOneField(
        "transport.Booking",
        on_delete=models.CASCADE,
        related_name="risk_assessment",
    )
    score = models.PositiveSmallIntegerField(default=0)
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default="low")
    flags = models.JSONField(default=list, blank=True)
    reviewed = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Évaluation de risque"
        verbose_name_plural = "Évaluations de risque"


class ReviewInsight(models.Model):
    SENTIMENT_CHOICES = [
        ("positive", "Positif"),
        ("neutral", "Neutre"),
        ("negative", "Négatif"),
    ]
    review = models.OneToOneField(
        "transport.Review",
        on_delete=models.CASCADE,
        related_name="ai_insight",
    )
    sentiment = models.CharField(max_length=12, choices=SENTIMENT_CHOICES)
    category = models.CharField(max_length=40, default="general")
    urgency = models.PositiveSmallIntegerField(default=0)
    summary = models.CharField(max_length=240, blank=True)
    provider = models.CharField(max_length=30, default="fallback")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Analyse d'avis"
        verbose_name_plural = "Analyses d'avis"
