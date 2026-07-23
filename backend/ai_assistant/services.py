import hashlib
import json
import logging
import re
import time
from datetime import datetime, timedelta
from decimal import Decimal

import requests
from django.conf import settings
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from unidecode import unidecode

from transport.models import Booking, City, Company, Notification, Review, ScheduledTrip
from transport.serializers import ScheduledTripSerializer

from .models import (
    AIInteractionLog,
    BookingRiskAssessment,
    ReviewInsight,
    TripIntelligenceSnapshot,
)

logger = logging.getLogger(__name__)


SEARCH_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "departure_city": {"type": ["string", "null"]},
        "arrival_city": {"type": ["string", "null"]},
        "travel_date": {"type": ["string", "null"]},
        "time_period": {
            "type": ["string", "null"],
            "enum": ["morning", "afternoon", "evening", "any", None],
        },
        "max_price": {"type": ["integer", "null"]},
        "passengers": {"type": "integer", "minimum": 1, "maximum": 20},
        "sort_by": {
            "type": "string",
            "enum": ["recommended", "price", "departure", "duration"],
        },
        "reply": {"type": "string"},
    },
    "required": [
        "departure_city",
        "arrival_city",
        "travel_date",
        "time_period",
        "max_price",
        "passengers",
        "sort_by",
        "reply",
    ],
}

ANSWER_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "answer": {"type": "string"},
        "suggestions": {
            "type": "array",
            "items": {"type": "string"},
            "maxItems": 3,
        },
    },
    "required": ["answer", "suggestions"],
}


def _normalize(value):
    return unidecode(str(value or "")).lower().strip()


def _redact_sensitive_text(value):
    value = re.sub(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", "[email masqué]", str(value), flags=re.I)
    return re.sub(r"(?<!\d)(?:\+?\d[\s.-]?){8,15}(?!\d)", "[téléphone masqué]", value)


def _sanitize_for_provider(value):
    if isinstance(value, dict):
        return {key: _sanitize_for_provider(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize_for_provider(item) for item in value]
    if isinstance(value, str):
        return _redact_sensitive_text(value)
    return value


def _safe_user_identifier(user):
    raw = f"{settings.SECRET_KEY}:{getattr(user, 'pk', 'anonymous')}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def _extract_output_text(payload):
    if isinstance(payload.get("output_text"), str):
        return payload["output_text"]
    for item in payload.get("output", []):
        if item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if content.get("type") == "output_text" and content.get("text"):
                return content["text"]
    raise ValueError("Réponse OpenAI sans texte exploitable")


def call_structured_openai(*, feature, instructions, input_payload, schema, schema_name, user=None):
    """Appelle Responses API. Retourne (résultat, fournisseur) ou (None, fallback)."""

    api_key = settings.OPENAI_API_KEY
    if not settings.EVEX_AI_ENABLED or not api_key:
        return None, "fallback"

    started = time.monotonic()
    model_name = settings.OPENAI_AI_MODEL
    try:
        response = requests.post(
            f"{settings.OPENAI_BASE_URL.rstrip('/')}/responses",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model_name,
                "store": False,
                "safety_identifier": _safe_user_identifier(user),
                "instructions": instructions,
                "input": json.dumps(
                    _sanitize_for_provider(input_payload),
                    ensure_ascii=False,
                    default=str,
                ),
                "reasoning": {"effort": settings.OPENAI_REASONING_EFFORT},
                "max_output_tokens": 900,
                "text": {
                    "verbosity": "low",
                    "format": {
                        "type": "json_schema",
                        "name": schema_name,
                        "strict": True,
                        "schema": schema,
                    },
                },
            },
            timeout=settings.OPENAI_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        result = json.loads(_extract_output_text(response.json()))
        AIInteractionLog.objects.create(
            feature=feature,
            user=user if getattr(user, "is_authenticated", False) else None,
            provider="openai",
            model_name=model_name,
            successful=True,
            latency_ms=int((time.monotonic() - started) * 1000),
        )
        return result, "openai"
    except Exception as exc:
        logger.warning("OpenAI indisponible pour %s: %s", feature, exc.__class__.__name__)
        AIInteractionLog.objects.create(
            feature=feature,
            user=user if getattr(user, "is_authenticated", False) else None,
            provider="openai",
            model_name=model_name,
            successful=False,
            latency_ms=int((time.monotonic() - started) * 1000),
            error_code=exc.__class__.__name__[:80],
        )
        return None, "fallback"


def parse_natural_search(query, user=None):
    today = timezone.localdate()
    cities = list(City.objects.filter(is_active=True).values_list("name", flat=True))
    instructions = (
        "Tu extrais uniquement les critères d'une recherche de car au Togo. "
        f"La date locale est {today.isoformat()}. Convertis aujourd'hui/demain et les jours de semaine "
        "en date ISO future. Ne crée jamais une ville absente de la liste. "
        "Si un critère manque, renvoie null. Réponds en français, brièvement."
    )
    result, provider = call_structured_openai(
        feature="search",
        instructions=instructions,
        input_payload={"query": query, "available_cities": cities},
        schema=SEARCH_SCHEMA,
        schema_name="evex_trip_search",
        user=user,
    )
    if result:
        normalized_city_map = {_normalize(city): city for city in cities}
        for key in ("departure_city", "arrival_city"):
            value = result.get(key)
            result[key] = normalized_city_map.get(_normalize(value)) if value else None
        return result, provider
    return _fallback_search_parser(query, cities, today), "fallback"


def _fallback_search_parser(query, cities, today):
    normalized = _normalize(query)
    matched = []
    for city in sorted(cities, key=len, reverse=True):
        position = normalized.find(_normalize(city))
        if position >= 0:
            matched.append((position, city))
    matched = [item[1] for item in sorted(matched)[:2]]

    travel_date = today
    if "apres-demain" in normalized or "apres demain" in normalized:
        travel_date = today + timedelta(days=2)
    elif "demain" in normalized:
        travel_date = today + timedelta(days=1)
    elif "aujourd" in normalized:
        travel_date = today
    else:
        weekdays = {
            "lundi": 0,
            "mardi": 1,
            "mercredi": 2,
            "jeudi": 3,
            "vendredi": 4,
            "samedi": 5,
            "dimanche": 6,
        }
        for word, weekday in weekdays.items():
            if word in normalized:
                delta = (weekday - today.weekday()) % 7
                travel_date = today + timedelta(days=delta or 7)
                break

    iso_match = re.search(r"\b(20\d{2})-(\d{2})-(\d{2})\b", normalized)
    if iso_match:
        try:
            travel_date = datetime.strptime(iso_match.group(0), "%Y-%m-%d").date()
        except ValueError:
            pass

    time_period = "any"
    if any(word in normalized for word in ["matin", "tot", "avant midi"]):
        time_period = "morning"
    elif any(word in normalized for word in ["apres-midi", "apres midi"]):
        time_period = "afternoon"
    elif any(word in normalized for word in ["soir", "nuit"]):
        time_period = "evening"

    max_price = None
    price_match = re.search(r"(?:moins de|max(?:imum)?|budget)\D{0,12}(\d[\d\s.]*)", normalized)
    if price_match:
        try:
            max_price = int(re.sub(r"\D", "", price_match.group(1)))
        except ValueError:
            pass

    passenger_match = re.search(r"\b(\d+)\s*(?:personnes?|passagers?|places?|billets?)\b", normalized)
    passengers = min(max(int(passenger_match.group(1)), 1), 20) if passenger_match else 1
    sort_by = "price" if any(word in normalized for word in ["moins cher", "economique", "prix"]) else "recommended"
    if any(word in normalized for word in ["plus tot", "premier depart"]):
        sort_by = "departure"

    return {
        "departure_city": matched[0] if matched else None,
        "arrival_city": matched[1] if len(matched) > 1 else None,
        "travel_date": travel_date.isoformat(),
        "time_period": time_period,
        "max_price": max_price,
        "passengers": passengers,
        "sort_by": sort_by,
        "reply": "J’ai préparé les critères à partir de votre demande.",
    }


def _trip_available_seats(scheduled_trip):
    occupied = (
        Booking.objects.filter(
            scheduled_trip=scheduled_trip,
            status__in=["pending", "confirmed"],
        )
        .values("seat_number")
        .distinct()
        .count()
    )
    return max(scheduled_trip.trip.capacity - occupied, 0)


def search_trips(criteria):
    travel_date = criteria.get("travel_date") or timezone.localdate().isoformat()
    queryset = ScheduledTrip.objects.filter(
        is_active=True,
        trip__is_active=True,
        trip__company__is_active=True,
        date=travel_date,
    ).select_related("trip__company", "trip__departure_city", "trip__arrival_city")

    departure = _normalize(criteria.get("departure_city"))
    arrival = _normalize(criteria.get("arrival_city"))
    passengers = int(criteria.get("passengers") or 1)
    period = criteria.get("time_period")
    max_price = criteria.get("max_price")
    matches = []
    for scheduled_trip in queryset:
        trip = scheduled_trip.trip
        route_cities = [trip.departure_city.name]
        route_cities.extend(trip.stops.order_by("sequence").values_list("city__name", flat=True))
        route_cities.append(trip.arrival_city.name)
        normalized_route = [_normalize(city) for city in route_cities]
        if departure and not any(departure == city or departure in city for city in normalized_route):
            continue
        if arrival and not any(arrival == city or arrival in city for city in normalized_route):
            continue
        if departure and arrival:
            origin_indexes = [i for i, city in enumerate(normalized_route) if departure == city or departure in city]
            arrival_indexes = [i for i, city in enumerate(normalized_route) if arrival == city or arrival in city]
            if not any(origin < destination for origin in origin_indexes for destination in arrival_indexes):
                continue
        if max_price is not None and trip.price > Decimal(str(max_price)):
            continue
        hour = trip.departure_time.hour
        if period == "morning" and hour >= 12:
            continue
        if period == "afternoon" and not 12 <= hour < 18:
            continue
        if period == "evening" and hour < 18:
            continue
        if _trip_available_seats(scheduled_trip) < passengers:
            continue
        matches.append(scheduled_trip)

    sort_by = criteria.get("sort_by")
    if sort_by == "price":
        matches.sort(key=lambda item: (item.trip.price, item.trip.departure_time))
    elif sort_by == "duration":
        matches.sort(key=lambda item: (item.trip.duration, item.trip.price))
    else:
        matches.sort(key=lambda item: (item.date, item.trip.departure_time, item.trip.price))
    return matches


def serialize_scheduled_trips(trips):
    data = ScheduledTripSerializer(trips, many=True).data
    for item, trip in zip(data, trips):
        item["available_seats"] = _trip_available_seats(trip)
    return data


def get_recommendations(user, limit=5, departure_city=None):
    today = timezone.localdate()
    bookings = Booking.objects.filter(user=user).select_related(
        "trip__departure_city",
        "trip__arrival_city",
    )
    favorite_routes = list(
        bookings.values("trip__departure_city_id", "trip__arrival_city_id")
        .annotate(total=Count("id"))
        .order_by("-total")[:3]
    )
    route_weight = {
        (item["trip__departure_city_id"], item["trip__arrival_city_id"]): item["total"]
        for item in favorite_routes
    }
    candidates = ScheduledTrip.objects.filter(
        date__gte=today,
        is_active=True,
        trip__is_active=True,
        trip__company__is_active=True,
    )
    if departure_city:
        candidates = candidates.filter(
            trip__departure_city__name__iexact=departure_city.strip()
        )
    candidates = candidates.select_related(
        "trip__company", "trip__departure_city", "trip__arrival_city"
    )[:100]
    ranked = []
    for candidate in candidates:
        available = _trip_available_seats(candidate)
        if available <= 0:
            continue
        route = (candidate.trip.departure_city_id, candidate.trip.arrival_city_id)
        score = route_weight.get(route, 0) * 30
        score += max(0, 14 - (candidate.date - today).days)
        score += min(available, 10)
        if departure_city:
            reason = f"Départ proche de vous à {candidate.trip.departure_city.name}"
        else:
            reason = (
                "Trajet proche de vos habitudes"
                if route in route_weight
                else "Bon équilibre horaire, prix et disponibilité"
            )
        ranked.append((score, candidate, reason))
    ranked.sort(key=lambda item: (-item[0], item[1].date, item[1].trip.price))
    selected = ranked[:limit]
    serialized = serialize_scheduled_trips([item[1] for item in selected])
    for output, (_, _, reason) in zip(serialized, selected):
        output["ai_reason"] = reason
    return serialized


def get_booking_context(booking):
    trip = booking.trip
    scheduled = booking.scheduled_trip
    return {
        "reference": f"EVEX-{booking.id:06d}",
        "status": booking.status,
        "passenger": booking.passenger_name,
        "seat": booking.seat_number,
        "company": trip.company.name,
        "departure_city": trip.departure_city.name,
        "arrival_city": trip.arrival_city.name,
        "travel_date": scheduled.date.isoformat() if scheduled else None,
        "departure_time": str(trip.departure_time),
        "arrival_time": str(trip.arrival_time),
        "price_fcfa": int(booking.total_price),
    }


def answer_ticket_question(booking, question, user):
    context = get_booking_context(booking)
    normalized = _normalize(question)
    fallback = None
    if any(word in normalized for word in ["heure", "depart", "quand"]):
        fallback = (
            f"Votre départ {context['departure_city']} → {context['arrival_city']} est prévu "
            f"le {context['travel_date']} à {context['departure_time'][:5]}."
        )
    elif any(word in normalized for word in ["siege", "place"]):
        fallback = f"Votre siège est le {context['seat']}."
    elif any(word in normalized for word in ["compagnie", "transporteur"]):
        fallback = f"Votre voyage est assuré par {context['company']}."
    elif any(word in normalized for word in ["annul", "rembours"]):
        fallback = (
            "Je peux vous expliquer la procédure, mais je ne modifie pas votre billet. "
            "Utilisez l’action d’annulation du billet ou contactez le support EVEX."
        )
    elif any(word in normalized for word in ["qr", "scanner", "code"]):
        fallback = "Présentez le QR code de ce billet au contrôle d’embarquement, avec une pièce d’identité."
    else:
        fallback = (
            f"Billet {context['reference']} confirmé pour {context['passenger']}, siège {context['seat']}, "
            f"{context['departure_city']} → {context['arrival_city']}."
        )

    result, provider = call_structured_openai(
        feature="ticket_support",
        instructions=(
            "Tu es l'assistant EVEX Ticket. Réponds en français uniquement à partir du billet fourni. "
            "N'invente aucune information. Tu ne peux ni annuler, ni modifier, ni rembourser. "
            "Pour toute action, explique la procédure ou oriente vers le support. Réponse courte."
        ),
        input_payload={
            "ticket": {
                key: value
                for key, value in context.items()
                if key not in {"reference", "passenger"}
            },
            "question": question,
        },
        schema=ANSWER_SCHEMA,
        schema_name="evex_ticket_answer",
        user=user,
    )
    if result:
        return {**result, "provider": provider, "ticket": context}
    return {
        "answer": fallback,
        "suggestions": ["Où et quand part mon car ?", "Quel est mon siège ?", "Comment présenter mon QR code ?"],
        "provider": "fallback",
        "ticket": context,
    }


def forecast_trip(scheduled_trip):
    capacity = max(scheduled_trip.trip.capacity, 1)
    current_bookings = Booking.objects.filter(
        scheduled_trip=scheduled_trip,
        status__in=["pending", "confirmed"],
    ).count()
    current_rate = min(current_bookings / capacity, 1)
    historical = (
        ScheduledTrip.objects.filter(
            trip=scheduled_trip.trip,
            date__lt=scheduled_trip.date,
            date__gte=scheduled_trip.date - timedelta(days=120),
        )
        .annotate(
            booked=Count(
                "bookings",
                filter=Q(bookings__status__in=["pending", "confirmed"]),
            )
        )
    )
    historical_rates = [min(item.booked / capacity, 1) for item in historical]
    historical_rate = sum(historical_rates) / len(historical_rates) if historical_rates else current_rate
    days_left = max((scheduled_trip.date - timezone.localdate()).days, 0)
    progress = max(0.2, min(1.0, 1 - days_left / 14))
    projected = max(current_rate, min(1.0, current_rate / progress))
    predicted_rate = min(1.0, projected * 0.65 + historical_rate * 0.35)
    confidence = min(0.9, 0.35 + len(historical_rates) * 0.07)

    snapshot, _ = TripIntelligenceSnapshot.objects.get_or_create(scheduled_trip=scheduled_trip)
    predicted_delay = snapshot.reported_delay_minutes
    snapshot.predicted_occupancy_rate = round(predicted_rate * 100, 2)
    snapshot.predicted_delay_minutes = predicted_delay
    snapshot.confidence = round((0.9 if snapshot.reported_delay_minutes else confidence) * 100, 2)
    snapshot.signals = {
        "current_occupancy_rate": round(current_rate * 100, 2),
        "historical_samples": len(historical_rates),
        "delay_source": "reported" if snapshot.reported_delay_minutes else "no_live_signal",
    }
    snapshot.save()
    return {
        "scheduled_trip_id": scheduled_trip.id,
        "occupancy_forecast_percent": float(snapshot.predicted_occupancy_rate),
        "current_occupancy_percent": round(current_rate * 100, 2),
        "predicted_delay_minutes": snapshot.predicted_delay_minutes,
        "reported_delay_minutes": snapshot.reported_delay_minutes,
        "confidence_percent": float(snapshot.confidence),
        "delay_message": (
            f"Retard signalé : environ {snapshot.reported_delay_minutes} min"
            if snapshot.reported_delay_minutes
            else "Aucun signal de retard disponible"
        ),
        "updated_at": snapshot.updated_at,
    }


def assess_booking_risk(booking):
    flags = []
    score = 0
    since = booking.booking_date - timedelta(hours=24)
    same_user_count = Booking.all_objects.filter(
        user=booking.user,
        booking_date__gte=since,
    ).count() if booking.user_id else 0
    same_phone_count = Booking.all_objects.filter(
        passenger_phone=booking.passenger_phone,
        booking_date__gte=since,
    ).count()
    cancelled_count = Booking.all_objects.filter(
        Q(user=booking.user) if booking.user_id else Q(passenger_phone=booking.passenger_phone),
        status="cancelled",
        booking_date__gte=booking.booking_date - timedelta(days=30),
    ).count()
    if same_user_count >= 5:
        score += 30
        flags.append("volume_utilisateur_24h")
    if same_phone_count >= 4:
        score += 25
        flags.append("telephone_reutilise_24h")
    if cancelled_count >= 3:
        score += 25
        flags.append("annulations_repetees")
    if booking.scheduled_trip:
        departure = timezone.make_aware(
            datetime.combine(booking.scheduled_trip.date, booking.trip.departure_time),
            timezone.get_current_timezone(),
        )
        if departure - booking.booking_date < timedelta(hours=2):
            score += 15
            flags.append("reservation_derniere_minute")
    if not booking.passenger_email:
        score += 5
        flags.append("email_absent")
    score = min(score, 100)
    level = "high" if score >= 60 else "medium" if score >= 30 else "low"
    assessment, _ = BookingRiskAssessment.objects.update_or_create(
        booking=booking,
        defaults={"score": score, "level": level, "flags": flags},
    )
    return {
        "booking_id": booking.id,
        "score": assessment.score,
        "level": assessment.level,
        "flags": assessment.flags,
        "reviewed": assessment.reviewed,
        "updated_at": assessment.updated_at,
    }


def analyze_review(review, user=None):
    normalized = _normalize(review.comment)
    negative_terms = ["retard", "sale", "mauvais", "danger", "impoli", "panne", "annule", "vol"]
    category_map = {
        "retard": ["retard", "attente", "heure"],
        "proprete": ["sale", "propre", "odeur"],
        "personnel": ["chauffeur", "agent", "impoli", "accueil"],
        "securite": ["danger", "vitesse", "securite"],
        "confort": ["siege", "clim", "confort"],
    }
    sentiment = "positive" if review.rating >= 4 else "negative" if review.rating <= 2 else "neutral"
    category = next(
        (name for name, terms in category_map.items() if any(term in normalized for term in terms)),
        "general",
    )
    urgency = min(100, (6 - review.rating) * 12 + sum(term in normalized for term in negative_terms) * 8)
    insight, _ = ReviewInsight.objects.update_or_create(
        review=review,
        defaults={
            "sentiment": sentiment,
            "category": category,
            "urgency": urgency,
            "summary": review.comment[:237] + ("..." if len(review.comment) > 237 else ""),
            "provider": "fallback",
        },
    )
    return {
        "review_id": review.id,
        "sentiment": insight.sentiment,
        "category": insight.category,
        "urgency": insight.urgency,
        "summary": insight.summary,
        "provider": insight.provider,
    }


def build_smart_notifications(user, create=False):
    now = timezone.now()
    suggestions = []
    bookings = Booking.objects.filter(
        user=user,
        status__in=["pending", "confirmed"],
        scheduled_trip__date__gte=timezone.localdate(),
    ).select_related("scheduled_trip", "trip__departure_city", "trip__arrival_city")
    for booking in bookings:
        departure = timezone.make_aware(
            datetime.combine(booking.scheduled_trip.date, booking.trip.departure_time),
            timezone.get_current_timezone(),
        )
        delta = departure - now
        if timedelta(0) < delta <= timedelta(hours=24):
            title = "Votre voyage approche"
            message = (
                f"{booking.trip.departure_city.name} → {booking.trip.arrival_city.name}, "
                f"départ à {booking.trip.departure_time.strftime('%H:%M')}. "
                "Présentez-vous au moins 30 minutes avant."
            )
            item = {
                "booking_id": booking.id,
                "type": "booking_reminder",
                "title": title,
                "message": message,
                "departure_at": departure,
            }
            suggestions.append(item)
            if create and not Notification.objects.filter(
                user=user,
                type="booking_reminder",
                title=title,
                message=message,
                created_at__date=timezone.localdate(),
            ).exists():
                Notification.objects.create(
                    user=user,
                    type="booking_reminder",
                    title=title,
                    message=message,
                )
    return suggestions


def platform_metrics(company=None):
    booking_filter = Q(status="confirmed")
    if company:
        booking_filter &= Q(trip__company=company)
    bookings = Booking.objects.filter(booking_filter)
    trips = ScheduledTrip.objects.filter(date__gte=timezone.localdate(), is_active=True)
    if company:
        trips = trips.filter(trip__company=company)
    reviews = Review.objects.filter(booking__trip__company=company) if company else Review.objects.all()
    average_rating = reviews.aggregate(value=Avg("rating"))["value"] or 0
    return {
        "confirmed_bookings": bookings.count(),
        "revenue_fcfa": int(bookings.aggregate(total=Sum("total_price"))["total"] or 0),
        "upcoming_trips": trips.count(),
        "active_companies": Company.objects.filter(is_active=True).count() if not company else 1,
        "average_rating": round(float(average_rating), 2),
        "high_risk_bookings": BookingRiskAssessment.objects.filter(
            level="high",
            **({"booking__trip__company": company} if company else {}),
        ).count(),
    }


def copilot_answer(question, user, company=None):
    metrics = platform_metrics(company=company)
    scope = f"la compagnie {company.name}" if company else "la plateforme EVEX"
    fallback = (
        f"Résumé de {scope} : {metrics['confirmed_bookings']} billets confirmés, "
        f"{metrics['revenue_fcfa']:,} FCFA de revenus, {metrics['upcoming_trips']} voyages à venir, "
        f"note moyenne {metrics['average_rating']}/5 et {metrics['high_risk_bookings']} alerte(s) à risque élevé."
    ).replace(",", " ")
    result, provider = call_structured_openai(
        feature="copilot",
        instructions=(
            "Tu es le copilote de gestion EVEX. Réponds en français uniquement avec les indicateurs fournis. "
            "N'invente pas de tendance ni de cause. Donne une conclusion, puis au maximum trois actions concrètes. "
            "Tu n'exécutes aucune action et tu ne révèles aucune donnée personnelle."
        ),
        input_payload={"scope": scope, "metrics": metrics, "question": question},
        schema=ANSWER_SCHEMA,
        schema_name="evex_management_copilot",
        user=user,
    )
    if result:
        return {**result, "provider": provider, "metrics": metrics}
    return {
        "answer": fallback,
        "suggestions": [
            "Examiner les voyages au remplissage faible",
            "Traiter les avis urgents",
            "Contrôler les alertes de risque élevé",
        ],
        "provider": "fallback",
        "metrics": metrics,
    }
