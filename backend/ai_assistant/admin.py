from django.contrib import admin

from .models import (
    AIInteractionLog,
    BookingRiskAssessment,
    ReviewInsight,
    TripIntelligenceSnapshot,
)


@admin.register(AIInteractionLog)
class AIInteractionLogAdmin(admin.ModelAdmin):
    list_display = ("feature", "provider", "model_name", "successful", "latency_ms", "created_at")
    list_filter = ("feature", "provider", "successful")
    readonly_fields = [field.name for field in AIInteractionLog._meta.fields]


@admin.register(TripIntelligenceSnapshot)
class TripIntelligenceSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        "scheduled_trip",
        "predicted_occupancy_rate",
        "predicted_delay_minutes",
        "reported_delay_minutes",
        "confidence",
        "updated_at",
    )


@admin.register(BookingRiskAssessment)
class BookingRiskAssessmentAdmin(admin.ModelAdmin):
    list_display = ("booking", "score", "level", "reviewed", "updated_at")
    list_filter = ("level", "reviewed")


@admin.register(ReviewInsight)
class ReviewInsightAdmin(admin.ModelAdmin):
    list_display = ("review", "sentiment", "category", "urgency", "provider", "updated_at")
    list_filter = ("sentiment", "category", "provider")
