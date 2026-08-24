from transport.models import Booking


ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'completed']


def canonical_seat_number(value):
    """Retourne le numéro physique du siège ou lève ValueError.

    Booking stocke historiquement ce numéro en texte. La conversion centralisée
    garantit que ``04`` et ``4`` désignent toujours le même siège.
    """
    if isinstance(value, bool):
        raise ValueError('Numéro de siège invalide.')
    raw_value = str(value).strip()
    if not raw_value:
        raise ValueError('Numéro de siège invalide.')
    try:
        return int(raw_value, 10)
    except (TypeError, ValueError) as exc:
        raise ValueError('Numéro de siège invalide.') from exc


def occupied_booking_seat_numbers(
    scheduled_trip,
    *,
    exclude_booking_id=None,
    origin_stop=None,
    destination_stop=None,
):
    """Retourne les sièges Booking actifs sous forme d'entiers physiques."""
    occupied = set()
    capacity = scheduled_trip.trip.capacity
    bookings = Booking.objects.filter(
        scheduled_trip=scheduled_trip,
        status__in=ACTIVE_BOOKING_STATUSES,
    ).only('id', 'seat_number', 'origin_stop_id', 'destination_stop_id').select_related(
        'origin_stop',
        'destination_stop',
    )
    if exclude_booking_id is not None:
        bookings = bookings.exclude(pk=exclude_booking_id)

    for booking in bookings:
        try:
            number = canonical_seat_number(booking.seat_number)
        except ValueError:
            continue
        if not 1 <= number <= capacity:
            continue

        # Deux billets de segments disjoints peuvent réutiliser un siège. Un
        # billet sans segment ou une vente mobile/guichet couvre tout le trajet.
        if origin_stop is not None and destination_stop is not None:
            if booking.origin_stop_id and booking.destination_stop_id:
                if (
                    booking.destination_stop.sequence <= origin_stop.sequence
                    or booking.origin_stop.sequence >= destination_stop.sequence
                ):
                    continue
        occupied.add(number)
    return occupied


def booking_seat_is_occupied(
    scheduled_trip,
    seat_number,
    *,
    exclude_booking_id=None,
    origin_stop=None,
    destination_stop=None,
):
    """Vérifie un siège Booking sans dépendre de sa représentation textuelle."""
    target = canonical_seat_number(seat_number)
    return target in occupied_booking_seat_numbers(
        scheduled_trip,
        exclude_booking_id=exclude_booking_id,
        origin_stop=origin_stop,
        destination_stop=destination_stop,
    )
