import logging
import uuid
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from transport.models import (
    CompteCagnotte,
    HistoriqueReversement,
    Reservation,
    ScheduledTrip,
    Siege,
    PlatformConfiguration,
)
from transport.services.db_retry import run_in_transaction
from transport.services.safety import is_booking_suspended_for_safety
from transport.services.seat_inventory import booking_seat_is_occupied

logger = logging.getLogger(__name__)

TAUX_FRAIS_QOS = Decimal('0.017')


class SafetyBookingSuspended(Exception):
    pass


class PaymentStateConflict(Exception):
    pass


class PaymentReconciliationRequired(Exception):
    def __init__(self, reservation):
        self.reservation = reservation
        super().__init__(
            f'Le paiement {reservation.reference_evex} est confirmé mais son siège n’est plus disponible.'
        )


def _recalculate_availability(voyage):
    # Import local pour conserver le service de réservation indépendant du
    # module d'opérations de billets lors du chargement de Django.
    from transport.ticketing import recalculate_voyage_availability

    recalculate_voyage_availability(voyage)


def reserver_siege_temporaire(voyage_id, numero_siege):
    logger.info("Temporary seat reservation requested voyage=%s siege=%s", voyage_id, numero_siege)
    def reserve():
        voyage = ScheduledTrip.objects.select_for_update().get(pk=voyage_id)
        if is_booking_suspended_for_safety(voyage):
            raise SafetyBookingSuspended
        if booking_seat_is_occupied(voyage, numero_siege):
            logger.info(
                "Temporary seat reservation refused: legacy booking occupies voyage=%s siege=%s",
                voyage_id,
                numero_siege,
            )
            return None
        siege = (
            Siege.objects
            .select_for_update()
            .filter(voyage_id=voyage_id, numero=numero_siege)
            .first()
        )
        if not siege:
            siege = Siege.objects.create(voyage_id=voyage_id, numero=numero_siege)

        if siege.statut != Siege.STATUT_LIBRE:
            logger.info("Temporary seat reservation refused siege=%s statut=%s", siege.id, siege.statut)
            return None

        siege.statut = Siege.STATUT_RESERVE_TEMP
        siege.reserve_at = timezone.now()
        siege.save(update_fields=['statut', 'reserve_at'])
        _recalculate_availability(voyage)
        logger.info("Temporary seat reservation succeeded siege=%s", siege.id)
        return siege.id

    return run_in_transaction(reserve)


def _generer_reference_evex():
    return f"EVEX-{timezone.localdate().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


def _calculer_frais_qos(montant_total):
    return int((Decimal(montant_total) * TAUX_FRAIS_QOS).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def creer_reservation(
    voyage_id,
    siege_id,
    client_nom,
    client_telephone,
    montant_billet,
    operateur,
    user=None,
):
    montant_billet = int(montant_billet)
    frais_evex_fixes = PlatformConfiguration.load().service_fee
    montant_total = montant_billet + frais_evex_fixes
    frais_qos = _calculer_frais_qos(montant_total)
    revenu_net_evex = frais_evex_fixes - frais_qos

    for _ in range(5):
        reference_evex = _generer_reference_evex()
        try:
            with transaction.atomic():
                voyage = ScheduledTrip.objects.select_for_update().get(pk=voyage_id)
                if is_booking_suspended_for_safety(voyage):
                    raise SafetyBookingSuspended
                reservation = Reservation.objects.create(
                    user=user if getattr(user, 'is_authenticated', False) else None,
                    voyage=voyage,
                    siege_id=siege_id,
                    client_nom=client_nom,
                    client_telephone=client_telephone,
                    montant_billet=montant_billet,
                    frais_evex=frais_evex_fixes,
                    montant_total=montant_total,
                    frais_qos=frais_qos,
                    revenu_net_evex=revenu_net_evex,
                    montant_reverse_compagnie=montant_billet,
                    operateur=operateur,
                    reference_evex=reference_evex,
                    statut_paiement=Reservation.STATUT_EN_ATTENTE,
                    expires_at=timezone.now() + timedelta(minutes=settings.SIEGE_EXPIRY_MINUTES),
                )
                _recalculate_availability(voyage)
            logger.info("Reservation created reference=%s", reservation.reference_evex)
            return reservation
        except SafetyBookingSuspended:
            raise
        except Exception:
            logger.exception("Reservation creation attempt failed reference=%s", reference_evex)

    raise RuntimeError("Impossible de generer une reference EVEX unique.")


def confirmer_paiement(reference_evex, transaction_id_qos):
    logger.info("Payment confirmation started reference=%s transaction=%s", reference_evex, transaction_id_qos)
    def confirm():
        reservation = (
            Reservation.objects
            .select_for_update()
            .select_related('siege', 'voyage__trip__company')
            .get(reference_evex=reference_evex)
        )

        if reservation.statut_paiement == Reservation.STATUT_PAYE:
            logger.info("Payment confirmation skipped already paid reference=%s", reference_evex)
            return reservation, False

        siege = Siege.objects.select_for_update().get(pk=reservation.siege_id)
        if reservation.statut_paiement in [
            Reservation.STATUT_ECHOUE,
            Reservation.STATUT_EXPIRE,
        ]:
            legacy_seat_taken = booking_seat_is_occupied(
                reservation.voyage,
                siege.numero,
            )
            if siege.statut != Siege.STATUT_LIBRE or legacy_seat_taken:
                reservation.statut_paiement = Reservation.STATUT_A_RAPPROCHER
                reservation.transaction_id_qos = transaction_id_qos or reservation.reference_evex
                reservation.paid_at = timezone.now()
                reservation.save(update_fields=['statut_paiement', 'transaction_id_qos', 'paid_at'])
                return reservation, True
        elif reservation.statut_paiement != Reservation.STATUT_EN_ATTENTE:
            raise PaymentStateConflict(
                f"La réservation {reference_evex} est déjà {reservation.statut_paiement}."
            )

        reservation.statut_paiement = Reservation.STATUT_PAYE
        reservation.transaction_id_qos = transaction_id_qos or reservation.transaction_id_qos
        reservation.paid_at = timezone.now()
        reservation.save(update_fields=['statut_paiement', 'transaction_id_qos', 'paid_at'])

        siege.statut = Siege.STATUT_OCCUPE
        siege.save(update_fields=['statut'])

        _recalculate_availability(reservation.voyage)

        declencher_reversement(reservation)
        logger.info("Payment confirmation finished reference=%s", reference_evex)
        return reservation, False

    reservation, needs_review = run_in_transaction(confirm)
    if needs_review:
        raise PaymentReconciliationRequired(reservation)
    return reservation


def declencher_reversement(reservation):
    # Aucun appel financier externe n'est exécuté dans la transaction de
    # confirmation. On écrit d'abord un ledger idempotent et on crédite la
    # cagnotte; un worker de reversement pourra ensuite traiter cette ligne
    # avec la référence stable REV-<reference_evex>.
    with transaction.atomic():
        reservation = (
            Reservation.objects
            .select_for_update()
            .select_related('voyage__trip__company')
            .get(pk=reservation.pk)
        )
        if reservation.reversement_effectue:
            logger.info("Payout skipped already done reference=%s", reservation.reference_evex)
            return True
        if HistoriqueReversement.objects.filter(reservation=reservation).exists():
            logger.info("Payout already queued reference=%s", reservation.reference_evex)
            return False

        compagnie = reservation.voyage.trip.company
        cagnotte, _ = CompteCagnotte.objects.select_for_update().get_or_create(compagnie=compagnie)
        cagnotte.solde_a_reverser = F('solde_a_reverser') + reservation.montant_reverse_compagnie
        cagnotte.save(update_fields=['solde_a_reverser', 'updated_at'])
        HistoriqueReversement.objects.create(
            compagnie=compagnie,
            reservation=reservation,
            montant=reservation.montant_reverse_compagnie,
            reference_qos_reversement=f"REV-{reservation.reference_evex}",
            statut=HistoriqueReversement.STATUT_EN_ATTENTE,
        )

    logger.info("Payout queued reference=%s", reservation.reference_evex)
    return False


def terminer_paiement(reference_evex, nouveau_statut):
    """Marque atomiquement un paiement terminal et libère son siège si sûr."""
    if nouveau_statut not in [Reservation.STATUT_ECHOUE, Reservation.STATUT_EXPIRE]:
        raise ValueError('Statut terminal invalide.')

    def finish():
        reservation = Reservation.objects.select_for_update().get(reference_evex=reference_evex)
        if reservation.statut_paiement != Reservation.STATUT_EN_ATTENTE:
            return reservation

        siege = Siege.objects.select_for_update().get(pk=reservation.siege_id)
        reservation.statut_paiement = nouveau_statut
        reservation.save(update_fields=['statut_paiement'])

        another_pending = Reservation.objects.filter(
            siege_id=siege.id,
            statut_paiement=Reservation.STATUT_EN_ATTENTE,
        ).exclude(pk=reservation.pk).exists()
        if siege.statut == Siege.STATUT_RESERVE_TEMP and not another_pending:
            siege.statut = Siege.STATUT_LIBRE
            siege.reserve_at = None
            siege.save(update_fields=['statut', 'reserve_at'])
        _recalculate_availability(reservation.voyage)
        return reservation

    return run_in_transaction(finish)


def liberer_siege(siege_id):
    logger.info("Seat release requested siege=%s", siege_id)
    def release():
        siege = Siege.objects.select_for_update().filter(pk=siege_id).first()
        if not siege or siege.statut != Siege.STATUT_RESERVE_TEMP:
            return False
        if Reservation.objects.filter(
            siege_id=siege.id,
            statut_paiement=Reservation.STATUT_PAYE,
        ).exists():
            return False
        siege.statut = Siege.STATUT_LIBRE
        siege.reserve_at = None
        siege.save(update_fields=['statut', 'reserve_at'])
        _recalculate_availability(siege.voyage)
        return True

    return run_in_transaction(release)


def liberer_sieges_expires():
    references = list(Reservation.objects.filter(
        statut_paiement=Reservation.STATUT_EN_ATTENTE,
        expires_at__lte=timezone.now(),
    ).values_list('reference_evex', flat=True))
    count = 0
    for reference in references:
        reservation = terminer_paiement(reference, Reservation.STATUT_EXPIRE)
        if reservation.statut_paiement == Reservation.STATUT_EXPIRE:
            count += 1
    logger.info("Expired seats released count=%s", count)
    return count
