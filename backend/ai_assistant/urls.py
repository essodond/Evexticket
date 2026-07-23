from django.urls import path

from .views import (
    AIStatusView,
    BookingRiskView,
    ManagementCopilotView,
    NaturalTripSearchView,
    RecommendationsView,
    ReviewAnalysisView,
    SmartNotificationsView,
    TicketAssistantView,
    TripInsightsView,
    VoiceCommandView,
)


urlpatterns = [
    path("status/", AIStatusView.as_view(), name="ai-status"),
    path("search/", NaturalTripSearchView.as_view(), name="ai-search"),
    path("recommendations/", RecommendationsView.as_view(), name="ai-recommendations"),
    path("tickets/<int:booking_id>/assistant/", TicketAssistantView.as_view(), name="ai-ticket-assistant"),
    path("notifications/", SmartNotificationsView.as_view(), name="ai-notifications"),
    path("trips/<int:trip_id>/insights/", TripInsightsView.as_view(), name="ai-trip-insights"),
    path("bookings/<int:booking_id>/risk/", BookingRiskView.as_view(), name="ai-booking-risk"),
    path("reviews/analysis/", ReviewAnalysisView.as_view(), name="ai-review-analysis"),
    path("copilot/", ManagementCopilotView.as_view(), name="ai-copilot"),
    path("voice-command/", VoiceCommandView.as_view(), name="ai-voice-command"),
]
