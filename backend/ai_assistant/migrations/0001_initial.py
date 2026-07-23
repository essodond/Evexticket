# Generated manually for the EVEX AI foundation.
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("transport", "0009_platformconfiguration_company_commission_rate"),
    ]

    operations = [
        migrations.CreateModel(
            name="AIInteractionLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("feature", models.CharField(choices=[("search", "Recherche"), ("recommendation", "Recommandation"), ("ticket_support", "Assistant billet"), ("copilot", "Copilote"), ("voice", "Commande vocale"), ("review", "Analyse avis")], max_length=30)),
                ("provider", models.CharField(default="fallback", max_length=30)),
                ("model_name", models.CharField(blank=True, max_length=80)),
                ("successful", models.BooleanField(default=True)),
                ("latency_ms", models.PositiveIntegerField(default=0)),
                ("error_code", models.CharField(blank=True, max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "Interaction IA", "verbose_name_plural": "Interactions IA", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="BookingRiskAssessment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("score", models.PositiveSmallIntegerField(default=0)),
                ("level", models.CharField(choices=[("low", "Faible"), ("medium", "Moyen"), ("high", "Élevé")], default="low", max_length=10)),
                ("flags", models.JSONField(blank=True, default=list)),
                ("reviewed", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("booking", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="risk_assessment", to="transport.booking")),
                ("reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "Évaluation de risque", "verbose_name_plural": "Évaluations de risque"},
        ),
        migrations.CreateModel(
            name="ReviewInsight",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sentiment", models.CharField(choices=[("positive", "Positif"), ("neutral", "Neutre"), ("negative", "Négatif")], max_length=12)),
                ("category", models.CharField(default="general", max_length=40)),
                ("urgency", models.PositiveSmallIntegerField(default=0)),
                ("summary", models.CharField(blank=True, max_length=240)),
                ("provider", models.CharField(default="fallback", max_length=30)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("review", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="ai_insight", to="transport.review")),
            ],
            options={"verbose_name": "Analyse d'avis", "verbose_name_plural": "Analyses d'avis"},
        ),
        migrations.CreateModel(
            name="TripIntelligenceSnapshot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("predicted_occupancy_rate", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("predicted_delay_minutes", models.PositiveIntegerField(default=0)),
                ("reported_delay_minutes", models.PositiveIntegerField(default=0)),
                ("confidence", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("signals", models.JSONField(blank=True, default=dict)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("scheduled_trip", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="intelligence_snapshot", to="transport.scheduledtrip")),
            ],
            options={"verbose_name": "Prévision de voyage", "verbose_name_plural": "Prévisions de voyage"},
        ),
    ]
