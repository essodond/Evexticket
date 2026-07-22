import logging
import time
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
from transport.services import qos_service

logger = logging.getLogger(__name__)

TAUX_FRAIS_QOS = Decimal('0.017')


def reserver_siege_temporaire(voyage_id, numero_siege):
    logger.info("Temporary seat reservation requested voyage=%s siege=%s", voyage_id, numero_siege)
    with transaction.atomic():
        siege = (
            Siege.objects
            .select_for_update()
            .filter(voyage_id=voyage_id, numero=numero_siege)
            .first()
        )
        if not siege:
            ScheduledTrip.objects.select_for_update().get(pk=voyage_id)
            siege = Siege.objects.create(voyage_id=voyage_id, numero=numero_siege)

        if siege.statut != Siege.STATUT_LIBRE:
            logger.info("Temporary seat reservation refused siege=%s statut=%s", siege.id, siege.statut)
            return None

        siege.statut = Siege.STATUT_RESERVE_TEMP
        siege.reserve_at = timezone.now()
        siege.save(update_fields=['statut', 'reserve_at'])
        logger.info("Temporary seat reservation succeeded siege=%s", siege.id)
        return siege.id


def _generer_reference_evex():
    return f"EVEX-{timezone.localdate().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


def _calculer_frais_qos(montant_total):
    return int((Decimal(montant_total) * TAUX_FRAIS_QOS).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def creer_reservation(voyage_id, siege_id, client_nom, client_telephone, montant_billet, operateur):
    montant_billet = int(montant_billet)
    frais_evex_fixes = PlatformConfiguration.load().service_fee
    montant_total = montant_billet + frais_evex_fixes
    frais_qos = _calculer_frais_qos(montant_total)
    revenu_net_evex = frais_evex_fixes - frais_qos

    for _ in range(5):
        reference_evex = _generer_reference_evex()
        try:
            reservation = Reservation.objects.create(
                voyage_id=voyage_id,
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
            logger.info("Reservation created reference=%s", reservation.reference_evex)
            return reservation
        except Exception:
            logger.exception("Reservation creation attempt failed reference=%s", reference_evex)

    raise RuntimeError("Impossible de generer une reference EVEX unique.")


def confirmer_paiement(reference_evex, transaction_id_qos):
    logger.info("Payment confirmation started reference=%s transaction=%s", reference_evex, transaction_id_qos)
    with transaction.atomic():
        reservation = (
            Reservation.objects
            .select_for_update()
            .select_related('siege', 'voyage__trip__company')
            .get(reference_evex=reference_evex)
        )

        if reservation.statut_paiement == Reservation.STATUT_PAYE:
            logger.info("Payment confirmation skipped already paid reference=%s", reference_evex)
            return reservation

        reservation.statut_paiement = Reservation.STATUT_PAYE
        reservation.transaction_id_qos = transaction_id_qos or reservation.transaction_id_qos
        reservation.paid_at = timezone.now()
        reservation.save(update_fields=['statut_paiement', 'transaction_id_qos', 'paid_at'])

        siege = Siege.objects.select_for_update().get(pk=reservation.siege_id)
        siege.statut = Siege.STATUT_OCCUPE
        siege.save(update_fields=['statut'])

        declencher_reversement(reservation)
        logger.info("Payment confirmation finished reference=%s", reference_evex)
        return reservation


def declencher_reversement(reservation):
    reservation = (
        Reservation.objects
        .select_related('voyage__trip__company')
        .get(pk=reservation.pk)
    )
    if reservation.reversement_effectue:
        logger.info("Payout skipped already done reference=%s", reservation.reference_evex)
        return True

    compagnie = reservation.voyage.trip.company
    reference_reversement = f"REV-{reservation.reference_evex}"
    last_result = None

    for tentative in range(1, 4):
        logger.info(
            "Payout attempt %s/3 reference=%s company=%s",
            tentative,
            reservation.reference_evex,
            compagnie.id,
        )
        last_result = qos_service.reverser_compagnie(
            compagnie.phone,
            reservation.montant_reverse_compagnie,
            reference_reversement,
        )
        if last_result.get('succes'):
            with transaction.atomic():
                cagnotte, _ = CompteCagnotte.objects.select_for_update().get_or_create(compagnie=compagnie)
                cagnotte.solde_a_reverser = max(
                    0,
                    cagnotte.solde_a_reverser - reservation.montant_reverse_compagnie,
                )
                cagnotte.total_reverse = F('total_reverse') + reservation.montant_reverse_compagnie
                cagnotte.save(update_fields=['solde_a_reverser', 'total_reverse', 'updated_at'])

                HistoriqueReversement.objects.create(
                    compagnie=compagnie,
                    reservation=reservation,
                    montant=reservation.montant_reverse_compagnie,
                    reference_qos_reversement=last_result.get('transaction_id'),
                    statut=HistoriqueReversement.STATUT_EFFECTUE,
                )

                reservation.reversement_effectue = True
                reservation.reversement_at = timezone.now()
                reservation.save(update_fields=['reversement_effectue', 'reversement_at'])

            logger.info("Payout succeeded reference=%s", reservation.reference_evex)
            return True

        logger.error(
            "Payout attempt failed reference=%s attempt=%s error=%s",
            reservation.reference_evex,
            tentative,
            last_result.get('erreur'),
        )
        if tentative < 3:
            time.sleep(30)

    with transaction.atomic():
        cagnotte, _ = CompteCagnotte.objects.select_for_update().get_or_create(compagnie=compagnie)
        cagnotte.solde_a_reverser = F('solde_a_reverser') + reservation.montant_reverse_compagnie
        cagnotte.save(update_fields=['solde_a_reverser', 'updated_at'])
        HistoriqueReversement.objects.create(
            compagnie=compagnie,
            reservation=reservation,
            montant=reservation.montant_reverse_compagnie,
            reference_qos_reversement=None,
            statut=HistoriqueReversement.STATUT_ECHOUE,
        )

    logger.error("Payout failed after 3 attempts reference=%s result=%s", reservation.reference_evex, last_result)
    return False


def liberer_siege(siege_id):
    logger.info("Seat release requested siege=%s", siege_id)
    Siege.objects.filter(pk=siege_id).update(statut=Siege.STATUT_LIBRE, reserve_at=None)


def liberer_sieges_expires():
    cutoff = timezone.now() - timedelta(minutes=settings.SIEGE_EXPIRY_MINUTES)
    sieges = list(
        Siege.objects
        .filter(statut=Siege.STATUT_RESERVE_TEMP, reserve_at__lt=cutoff)
        .values_list('id', flat=True)
    )
    if not sieges:
        return 0

    Reservation.objects.filter(
        siege_id__in=sieges,
        statut_paiement=Reservation.STATUT_EN_ATTENTE,
    ).update(statut_paiement=Reservation.STATUT_EXPIRE)

    count = Siege.objects.filter(id__in=sieges).update(statut=Siege.STATUT_LIBRE, reserve_at=None)
    logger.info("Expired seats released count=%s", count)
    return count
