from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from guichet.models import Agence

from .models import Booking, Company, Review


def _review_queryset(company):
    return Review.objects.filter(
        booking__trip__company=company,
    ).select_related(
        'booking',
        'booking__user',
        'booking__trip__departure_city',
        'booking__trip__arrival_city',
        'booking__scheduled_trip',
    )


def _rating_summary(company):
    reviews = _review_queryset(company)
    aggregate = reviews.aggregate(average=Avg('rating'), count=Count('id'))
    return {
        'rating_average': round(float(aggregate['average'] or 0), 1),
        'review_count': aggregate['count'],
    }


def _serialize_station(agency):
    return {
        'id': str(agency.id),
        'name': agency.nom,
        'city_id': agency.ville_id,
        'city_name': agency.ville.name,
        'region': agency.ville.region,
        'address': agency.adresse,
        'phone': agency.telephone,
        'latitude': agency.latitude,
        'longitude': agency.longitude,
        'has_coordinates': (
            agency.latitude is not None and agency.longitude is not None
        ),
    }


def _company_stations(company):
    return list(
        Agence.objects.filter(
            compagnie=company,
            is_active=True,
            is_deleted=False,
        )
        .select_related('ville')
        .order_by('ville__name', 'nom')
    )


def _serialize_company(company, request=None, include_details=False):
    stations = _company_stations(company)
    rating = _rating_summary(company)
    cities = sorted({agency.ville.name for agency in stations})
    data = {
        'id': company.id,
        'name': company.name,
        'description': company.description,
        'address': company.address,
        'phone': company.phone,
        'email': company.email,
        'website': company.website,
        'logo': company.logo,
        'rating_average': rating['rating_average'],
        'review_count': rating['review_count'],
        'stations_count': len(stations),
        'cities': cities,
        'active_trips_count': company.trips.filter(is_active=True).count(),
        'stations': [_serialize_station(agency) for agency in stations],
    }
    if not include_details:
        return data

    reviews = _review_queryset(company)
    distribution_rows = reviews.values('rating').annotate(total=Count('id'))
    distribution = {str(value): 0 for value in range(1, 6)}
    for row in distribution_rows:
        distribution[str(row['rating'])] = row['total']

    data['rating_distribution'] = distribution
    data['reviews'] = [
        {
            'id': review.id,
            'rating': review.rating,
            'comment': review.comment,
            'created_at': review.created_at,
            'passenger_name': review.booking.passenger_name,
            'route': (
                f'{review.booking.trip.departure_city.name} → '
                f'{review.booking.trip.arrival_city.name}'
            ),
        }
        for review in reviews.order_by('-created_at')[:20]
    ]

    eligible_bookings = []
    if request and request.user.is_authenticated:
        bookings = (
            Booking.objects.filter(
                user=request.user,
                trip__company=company,
                status__in=['confirmed', 'completed'],
            )
            .select_related(
                'trip__departure_city',
                'trip__arrival_city',
                'scheduled_trip',
                'review',
            )
            .order_by('-booking_date')
        )
        for booking in bookings:
            existing_review = getattr(booking, 'review', None)
            eligible_bookings.append({
                'id': booking.id,
                'reference': f'EVEX-{booking.id:06d}',
                'route': (
                    f'{booking.trip.departure_city.name} → '
                    f'{booking.trip.arrival_city.name}'
                ),
                'travel_date': (
                    booking.scheduled_trip.date
                    if booking.scheduled_trip
                    else None
                ),
                'existing_rating': (
                    existing_review.rating if existing_review else None
                ),
                'existing_comment': (
                    existing_review.comment if existing_review else ''
                ),
            })
    data['eligible_bookings'] = eligible_bookings
    return data


class PartnerCompanyListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        companies = (
            Company.objects.filter(is_active=True, is_deleted=False)
            .order_by('name')
        )
        return Response([
            _serialize_company(company, request=request)
            for company in companies
        ])


class PartnerCompanyDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, company_id):
        company = get_object_or_404(
            Company.objects.filter(is_active=True, is_deleted=False),
            pk=company_id,
        )
        return Response(
            _serialize_company(
                company,
                request=request,
                include_details=True,
            )
        )


class PartnerCompanyReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, company_id):
        company = get_object_or_404(
            Company.objects.filter(is_active=True, is_deleted=False),
            pk=company_id,
        )
        booking_id = request.data.get('booking_id')
        try:
            rating = int(request.data.get('rating'))
        except (TypeError, ValueError):
            return Response(
                {'rating': 'Choisissez une note entre 1 et 5.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if rating < 1 or rating > 5:
            return Response(
                {'rating': 'La note doit être comprise entre 1 et 5.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        comment = str(request.data.get('comment') or '').strip()
        if len(comment) > 1500:
            return Response(
                {'comment': 'Le commentaire ne peut pas dépasser 1500 caractères.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking = get_object_or_404(
            Booking.objects.filter(
                user=request.user,
                trip__company=company,
                status__in=['confirmed', 'completed'],
            ),
            pk=booking_id,
        )
        review, created = Review.objects.update_or_create(
            booking=booking,
            defaults={'rating': rating, 'comment': comment},
        )
        summary = _rating_summary(company)
        return Response(
            {
                'id': review.id,
                'booking_id': booking.id,
                'rating': review.rating,
                'comment': review.comment,
                'created_at': review.created_at,
                **summary,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
