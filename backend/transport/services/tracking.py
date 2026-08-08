import math
from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone

from transport.models import Booking, BusPosition, TripTrackingSession


APPROACH_RADIUS_KM = 5
STOP_REACHED_RADIUS_KM = 2
STALE_AFTER_SECONDS = 120


def haversine_km(first, second):
    lat1, lon1 = math.radians(first[0]), math.radians(first[1])
    lat2, lon2 = math.radians(second[0]), math.radians(second[1])
    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    value = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    )
    return 6371 * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def _agency_coordinate(company_id, city_id):
    try:
        from guichet.models import Agence

        agency = (
            Agence.objects.filter(
                compagnie_id=company_id,
                ville_id=city_id,
                is_active=True,
                is_deleted=False,
            )
            .exclude(latitude__isnull=True)
            .exclude(longitude__isnull=True)
            .order_by('nom')
            .first()
        )
    except (ImportError, LookupError):
        agency = None
    if not agency:
        return None, None
    return (float(agency.latitude), float(agency.longitude)), agency.nom


def _stop_coordinate(stop):
    zone = next(
        (
            item
            for item in stop.boarding_zones.all()
            if item.latitude is not None and item.longitude is not None
        ),
        None,
    )
    if zone:
        return (float(zone.latitude), float(zone.longitude)), zone.name
    return _agency_coordinate(stop.trip.company_id, stop.city_id)


def tracking_stops(scheduled_trip):
    trip = scheduled_trip.trip
    stops = list(
        trip.stops.select_related('city', 'trip').prefetch_related('boarding_zones').order_by('sequence')
    )
    result = []
    for stop in stops:
        coordinate, station_name = _stop_coordinate(stop)
        result.append({
            'id': str(stop.id),
            'trip_stop_id': stop.id,
            'sequence': stop.sequence,
            'city_name': stop.city.name,
            'station_name': station_name or stop.city.name,
            'latitude': coordinate[0] if coordinate else None,
            'longitude': coordinate[1] if coordinate else None,
        })

    present_city_ids = {stop.city_id for stop in stops}
    if trip.departure_city_id not in present_city_ids:
        coordinate, station_name = _agency_coordinate(trip.company_id, trip.departure_city_id)
        result.insert(0, {
            'id': 'departure',
            'trip_stop_id': None,
            'sequence': -1,
            'city_name': trip.departure_city.name,
            'station_name': station_name or trip.departure_city.name,
            'latitude': coordinate[0] if coordinate else None,
            'longitude': coordinate[1] if coordinate else None,
        })
    if trip.arrival_city_id not in present_city_ids:
        coordinate, station_name = _agency_coordinate(trip.company_id, trip.arrival_city_id)
        result.append({
            'id': 'arrival',
            'trip_stop_id': None,
            'sequence': 100000,
            'city_name': trip.arrival_city.name,
            'station_name': station_name or trip.arrival_city.name,
            'latitude': coordinate[0] if coordinate else None,
            'longitude': coordinate[1] if coordinate else None,
        })
    return result


def _planned_arrival(scheduled_trip):
    trip = scheduled_trip.trip
    departure = datetime.combine(scheduled_trip.date, trip.departure_time)
    arrival = datetime.combine(scheduled_trip.date, trip.arrival_time)
    if arrival <= departure:
        arrival += timedelta(days=1)
    return timezone.make_aware(arrival, timezone.get_current_timezone())


def _remaining_distance(current, stops, passed_ids):
    remaining = [
        item for item in stops
        if item['id'] not in passed_ids
        and item['latitude'] is not None
        and item['longitude'] is not None
    ]
    if not remaining:
        return 0.0
    total = haversine_km(current, (remaining[0]['latitude'], remaining[0]['longitude']))
    for first, second in zip(remaining, remaining[1:]):
        total += haversine_km(
            (first['latitude'], first['longitude']),
            (second['latitude'], second['longitude']),
        )
    return total * 1.12


def _mark_reached_stops(current, stops, passed_stop_ids):
    passed = {str(item) for item in (passed_stop_ids or [])}
    geolocated = [
        item for item in stops
        if item['latitude'] is not None and item['longitude'] is not None
    ]
    for index, item in enumerate(geolocated):
        distance = haversine_km(current, (item['latitude'], item['longitude']))
        if distance <= STOP_REACHED_RADIUS_KM:
            passed.update(stop['id'] for stop in geolocated[:index + 1])
    return sorted(passed)


def _effective_speed(session, scheduled_trip, stops):
    if session and session.speed_kmh is not None and session.speed_kmh >= 5:
        return min(float(session.speed_kmh), 130)
    geolocated = [
        (item['latitude'], item['longitude'])
        for item in stops
        if item['latitude'] is not None and item['longitude'] is not None
    ]
    route_distance = sum(haversine_km(a, b) for a, b in zip(geolocated, geolocated[1:]))
    if route_distance and scheduled_trip.trip.duration:
        return max(25, min(route_distance / (scheduled_trip.trip.duration / 60), 90))
    return 45


def _passenger_alert(user, scheduled_trip, current, stops, passed_ids):
    if not user or not current:
        return {'active': False, 'stop_name': None, 'distance_km': None}
    booking = (
        Booking.objects.filter(
            user=user,
            scheduled_trip=scheduled_trip,
            status__in=['pending', 'confirmed', 'completed'],
        )
        .select_related('origin_stop__city', 'origin_stop__trip')
        .order_by('-booking_date')
        .first()
    )
    if not booking:
        return {'active': False, 'stop_name': None, 'distance_km': None}

    target = None
    if booking.origin_stop_id:
        target = next(
            (item for item in stops if item['trip_stop_id'] == booking.origin_stop_id),
            None,
        )
    if not target:
        target = next(
            (
                item for item in stops
                if item['latitude'] is not None and item['longitude'] is not None
            ),
            None,
        )
    if not target or target['id'] in passed_ids:
        return {'active': False, 'stop_name': target['station_name'] if target else None, 'distance_km': None}

    distance = haversine_km(current, (target['latitude'], target['longitude']))
    return {
        'active': distance <= APPROACH_RADIUS_KM,
        'stop_name': target['station_name'],
        'distance_km': round(distance, 1),
    }


def serialize_tracking(scheduled_trip, session=None, user=None, include_history=False):
    stops = tracking_stops(scheduled_trip)
    passed_ids = {str(item) for item in (session.passed_stop_ids if session else [])}
    current = None
    if session and session.latitude is not None and session.longitude is not None:
        current = (float(session.latitude), float(session.longitude))

    distance_remaining = _remaining_distance(current, stops, passed_ids) if current else None
    speed = _effective_speed(session, scheduled_trip, stops) if current else None
    eta_minutes = math.ceil((distance_remaining / speed) * 60) if distance_remaining is not None and speed else None
    estimated_arrival = timezone.now() + timedelta(minutes=eta_minutes) if eta_minutes is not None else None
    planned_arrival = _planned_arrival(scheduled_trip)
    delay_minutes = (
        round((estimated_arrival - planned_arrival).total_seconds() / 60)
        if estimated_arrival else 0
    )
    intelligence = getattr(scheduled_trip, 'intelligence_snapshot', None)
    if intelligence and intelligence.reported_delay_minutes:
        delay_minutes = max(delay_minutes, intelligence.reported_delay_minutes)
    last_position_at = session.last_position_at if session else None
    is_stale = bool(
        last_position_at
        and (timezone.now() - last_position_at).total_seconds() > STALE_AFTER_SECONDS
    )
    if not session or not session.started_at:
        tracking_status = 'not_started'
    elif session.is_active and is_stale:
        tracking_status = 'offline'
    elif session.is_active:
        tracking_status = 'live'
    else:
        tracking_status = 'stopped'

    next_stop_found = False
    serialized_stops = []
    for item in stops:
        if item['id'] in passed_ids:
            stop_status = 'passed'
        elif not next_stop_found:
            stop_status = 'next'
            next_stop_found = True
        else:
            stop_status = 'upcoming'
        serialized_stops.append({**item, 'status': stop_status})

    payload = {
        'scheduled_trip_id': scheduled_trip.id,
        'status': tracking_status,
        'is_active': bool(session and session.is_active),
        'is_stale': is_stale,
        'route': {
            'departure_city': scheduled_trip.trip.departure_city.name,
            'arrival_city': scheduled_trip.trip.arrival_city.name,
            'departure_time': scheduled_trip.trip.departure_time,
            'planned_arrival_at': planned_arrival,
        },
        'current_position': (
            {
                'latitude': current[0],
                'longitude': current[1],
                'accuracy_m': session.accuracy_m,
                'speed_kmh': round(float(session.speed_kmh or 0), 1),
                'heading': session.heading,
                'recorded_at': last_position_at,
            }
            if current else None
        ),
        'estimated_arrival_at': estimated_arrival,
        'eta_minutes': eta_minutes,
        'delay_minutes': delay_minutes,
        'distance_remaining_km': round(distance_remaining, 1) if distance_remaining is not None else None,
        'stops': serialized_stops,
        'approach_alert': _passenger_alert(user, scheduled_trip, current, stops, passed_ids),
        'updated_at': last_position_at,
        'server_time': timezone.now(),
    }
    if include_history and session:
        payload['history'] = [
            {
                'id': position.id,
                'latitude': float(position.latitude),
                'longitude': float(position.longitude),
                'accuracy_m': position.accuracy_m,
                'speed_kmh': position.speed_kmh,
                'heading': position.heading,
                'recorded_at': position.recorded_at,
            }
            for position in session.positions.all()[:30]
        ]
    else:
        payload['history'] = []
    return payload


@transaction.atomic
def start_tracking(scheduled_trip, driver):
    session, _ = TripTrackingSession.objects.select_for_update().get_or_create(
        scheduled_trip=scheduled_trip,
    )
    was_active = session.is_active
    session.driver = driver
    session.is_active = True
    if not was_active:
        session.started_at = timezone.now()
        session.stopped_at = None
        session.passed_stop_ids = []
    session.save()
    return session


@transaction.atomic
def record_position(scheduled_trip, driver, data):
    session = TripTrackingSession.objects.select_for_update().get(scheduled_trip=scheduled_trip)
    if not session.is_active:
        raise ValueError('Le suivi GPS doit être démarré avant l’envoi des positions.')

    recorded_at = data.get('recorded_at') or timezone.now()
    speed_mps = data.get('speed_mps')
    speed_kmh = max(float(speed_mps) * 3.6, 0) if speed_mps is not None else None
    current = (float(data['latitude']), float(data['longitude']))
    stops = tracking_stops(scheduled_trip)
    passed_ids = _mark_reached_stops(current, stops, session.passed_stop_ids)

    position = BusPosition.objects.create(
        session=session,
        latitude=data['latitude'],
        longitude=data['longitude'],
        accuracy_m=data.get('accuracy_m'),
        speed_kmh=speed_kmh,
        heading=data.get('heading'),
        recorded_at=recorded_at,
    )
    session.driver = driver
    session.latitude = data['latitude']
    session.longitude = data['longitude']
    session.accuracy_m = data.get('accuracy_m')
    session.speed_kmh = speed_kmh
    session.heading = data.get('heading')
    session.passed_stop_ids = passed_ids
    session.last_position_at = recorded_at
    session.save()
    return session, position


@transaction.atomic
def stop_tracking(scheduled_trip, driver):
    session = TripTrackingSession.objects.select_for_update().get(scheduled_trip=scheduled_trip)
    session.driver = driver
    session.is_active = False
    session.stopped_at = timezone.now()
    session.save(update_fields=['driver', 'is_active', 'stopped_at', 'updated_at'])
    return session
