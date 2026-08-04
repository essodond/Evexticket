from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from guichet.permissions import get_admin_company
from transport.models import Booking, Review, ScheduledTrip

from .models import TripIntelligenceSnapshot
from .services import (
    analyze_review,
    answer_ticket_question,
    assess_booking_risk,
    build_smart_notifications,
    copilot_answer,
    forecast_trip,
    get_recommendations,
    parse_natural_search,
    search_trips,
    serialize_scheduled_trips,
)


class AIUserRateThrottle(UserRateThrottle):
    def __init__(self):
        raw_rate = getattr(settings, "EVEX_AI_RATE_LIMIT", "20/min")
        if raw_rate in {None, "", "none", "off", "disabled"}:
            self.rate = None
        else:
            self.rate = raw_rate
        super().__init__()


class AIAPIView(APIView):
    """Base des analyses EVEX locales, sans consommation du quota fournisseur."""


class AIProviderAPIView(AIAPIView):
    """Limite uniquement les endpoints susceptibles d'appeler le fournisseur IA."""

    throttle_classes = [AIUserRateThrottle]


def _company_for_user(user):
    if user.is_superuser:
        return None
    company = get_admin_company(user)
    if company:
        return company
    if hasattr(user, "agentguichet"):
        return user.agentguichet.compagnie
    return None


def _can_manage_trip(user, scheduled_trip):
    if user.is_superuser:
        return True
    company = _company_for_user(user)
    return bool(company and scheduled_trip.trip.company_id == company.id)


class AIStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.conf import settings

        return Response(
            {
                "enabled": settings.EVEX_AI_ENABLED,
                "provider_ready": bool(settings.OPENAI_API_KEY),
                "model": settings.OPENAI_AI_MODEL if settings.OPENAI_API_KEY else None,
                "fallback_ready": True,
            }
        )


class NaturalTripSearchView(AIProviderAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        query = str(request.data.get("query") or "").strip()
        if len(query) < 3:
            return Response(
                {"detail": "Décrivez votre voyage en au moins 3 caractères."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        criteria, provider = parse_natural_search(query[:500], request.user)
        missing = [
            label
            for key, label in (
                ("departure_city", "ville de départ"),
                ("arrival_city", "ville d’arrivée"),
            )
            if not criteria.get(key)
        ]
        trips = search_trips(criteria) if not missing else []
        return Response(
            {
                "criteria": criteria,
                "provider": provider,
                "missing": missing,
                "trips": serialize_scheduled_trips(trips[:20]),
                "count": min(len(trips), 20),
            }
        )


class RecommendationsView(AIAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        departure_city = request.query_params.get("departure_city")
        return Response({
            "trips": get_recommendations(
                request.user,
                departure_city=departure_city,
            ),
            "departure_city": departure_city,
            "provider": "evex-ranking",
        })


class TicketAssistantView(AIProviderAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):
        booking = get_object_or_404(
            Booking.objects.select_related(
                "trip__company",
                "trip__departure_city",
                "trip__arrival_city",
                "scheduled_trip",
            ),
            pk=booking_id,
        )
        if booking.user_id != request.user.id and not request.user.is_superuser:
            return Response({"detail": "Billet non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        question = str(request.data.get("question") or "").strip()
        if not question:
            return Response({"detail": "La question est requise."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(answer_ticket_question(booking, question[:500], request.user))


class SmartNotificationsView(AIAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        suggestions = build_smart_notifications(request.user, create=False)
        return Response({"notifications": suggestions})

    def post(self, request):
        suggestions = build_smart_notifications(request.user, create=True)
        return Response({"created_or_existing": len(suggestions), "notifications": suggestions})


class TripInsightsView(AIAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, trip_id):
        scheduled_trip = get_object_or_404(
            ScheduledTrip.objects.select_related("trip__company"),
            pk=trip_id,
        )
        if not _can_manage_trip(request.user, scheduled_trip):
            return Response({"detail": "Accès non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        return Response(forecast_trip(scheduled_trip))

    def patch(self, request, trip_id):
        scheduled_trip = get_object_or_404(
            ScheduledTrip.objects.select_related("trip__company"),
            pk=trip_id,
        )
        if not _can_manage_trip(request.user, scheduled_trip):
            return Response({"detail": "Accès non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        try:
            delay = max(0, min(int(request.data.get("reported_delay_minutes", 0)), 1440))
        except (TypeError, ValueError):
            return Response({"detail": "Retard invalide."}, status=status.HTTP_400_BAD_REQUEST)
        TripIntelligenceSnapshot.objects.update_or_create(
            scheduled_trip=scheduled_trip,
            defaults={"reported_delay_minutes": delay},
        )
        return Response(forecast_trip(scheduled_trip))


class BookingRiskView(AIAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):
        booking = get_object_or_404(
            Booking.objects.select_related("trip__company", "scheduled_trip"),
            pk=booking_id,
        )
        company = _company_for_user(request.user)
        if not request.user.is_superuser and (not company or booking.trip.company_id != company.id):
            return Response({"detail": "Accès non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        return Response(assess_booking_risk(booking))


class ReviewAnalysisView(AIAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = _company_for_user(request.user)
        if not request.user.is_superuser and not company:
            return Response({"detail": "Accès non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        reviews = Review.objects.select_related("booking__trip__company")
        if company:
            reviews = reviews.filter(booking__trip__company=company)
        results = [analyze_review(review, request.user) for review in reviews[:100]]
        summary = {
            "positive": sum(item["sentiment"] == "positive" for item in results),
            "neutral": sum(item["sentiment"] == "neutral" for item in results),
            "negative": sum(item["sentiment"] == "negative" for item in results),
            "urgent": sum(item["urgency"] >= 60 for item in results),
        }
        return Response({"summary": summary, "reviews": results})


class ManagementCopilotView(AIProviderAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        company = _company_for_user(request.user)
        if not request.user.is_superuser and not company:
            return Response({"detail": "Accès non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        question = str(request.data.get("question") or "Résume la situation").strip()
        return Response(copilot_answer(question[:600], request.user, company=company))


class VoiceCommandView(AIProviderAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, "agentguichet") and not request.user.is_superuser:
            return Response({"detail": "Accès guichet requis."}, status=status.HTTP_403_FORBIDDEN)
        transcript = str(request.data.get("transcript") or "").strip()
        if not transcript:
            return Response({"detail": "Transcription requise."}, status=status.HTTP_400_BAD_REQUEST)
        criteria, provider = parse_natural_search(transcript[:500], request.user)
        trips = search_trips(criteria)
        company = _company_for_user(request.user)
        if company:
            trips = [trip for trip in trips if trip.trip.company_id == company.id]
        return Response(
            {
                "intent": "search_trip",
                "criteria": criteria,
                "provider": provider,
                "trips": serialize_scheduled_trips(trips[:10]),
            }
        )
