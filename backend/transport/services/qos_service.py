import hashlib
import hmac
import logging
import uuid

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from payments.services import QosPayService, extract_message, extract_response_code


logger = logging.getLogger(__name__)


def generate_transref():
    return f'EVEX-{uuid.uuid4().hex[:20].upper()}'


def _payment_result(data, fallback_reference):
    response_code = extract_response_code(data)
    returned_reference = str(data.get('transref') or fallback_reference)
    if returned_reference != fallback_reference:
        logger.warning(
            'QOS returned an unexpected transref expected=%s received=%s',
            fallback_reference,
            returned_reference,
        )
    # EVEX impose sa référence idempotente; le statut ne sera jamais recherché
    # avec une valeur renvoyée par un tiers.
    transref = str(fallback_reference)
    # QOS peut répondre « en attente » juste après l'envoi du prompt USSD.
    # Cette réponse est une initiation acceptée, pas un échec de paiement.
    accepted = response_code in {'', '00', '01'} and bool(transref)
    message = extract_message(data)
    return {
        'succes': accepted,
        'transref': transref,
        'transaction_id': transref,
        'reference_qos': transref,
        'responsecode': response_code,
        'responsemsg': message,
        'raw': data,
        'erreur': None if accepted else (message or 'Paiement refusé par QOS.'),
    }


def initier_paiement(phone, amount, reference, operateur, description=''):
    """Initie QOS avec les identifiants propres à Flooz ou TMoney.

    La référence EVEX est aussi le ``transref`` QOS. Un retry du même appel ne
    crée donc pas une seconde référence de paiement.
    """
    del description
    try:
        data = QosPayService().initiate_payment(
            amount=int(amount),
            phone_number=phone,
            operator=operateur,
            transref=reference,
        )
    except requests.RequestException as exc:
        logger.exception('QOS payment initiation failed reference=%s', reference)
        return {
            'succes': False,
            'transaction_id': None,
            'reference_qos': None,
            'responsecode': '96',
            'indetermine': True,
            'erreur': str(exc),
        }
    except (ImproperlyConfigured, TypeError, ValueError) as exc:
        # Une erreur de configuration ou de validation survient avant l'envoi
        # au prestataire : aucun débit n'a pu être déclenché et le siège peut
        # donc être libéré immédiatement.
        logger.exception('QOS payment configuration failed reference=%s', reference)
        return {
            'succes': False,
            'transaction_id': None,
            'reference_qos': None,
            'responsecode': '96',
            'indetermine': False,
            'erreur': str(exc),
        }

    try:
        return _payment_result(data, reference)
    except (AttributeError, KeyError, TypeError, ValueError) as exc:
        # À ce stade QOS a déjà reçu la demande. Une réponse illisible ne
        # prouve donc jamais l'absence de débit : conserver la réservation et
        # laisser le webhook/la vérification résoudre le statut.
        logger.exception('QOS payment response is malformed reference=%s', reference)
        return {
            'succes': False,
            'transaction_id': None,
            'reference_qos': None,
            'responsecode': '96',
            'indetermine': True,
            'erreur': str(exc),
        }


def verifier_paiement(transaction_id, operateur):
    """Vérifie le statut avec la configuration de l'opérateur concerné."""
    if not transaction_id:
        return {
            'succes': False,
            'statut': 'en_attente',
            'responsecode': '',
            'erreur': 'Référence QOS absente.',
        }
    try:
        data = QosPayService().get_transaction_status(
            transref=transaction_id,
            operator=operateur,
        )
    except (requests.RequestException, ImproperlyConfigured, TypeError, ValueError) as exc:
        # Une indisponibilité du prestataire ne doit jamais transformer un
        # paiement de statut inconnu en échec ni libérer son siège.
        logger.exception('QOS status check failed transaction=%s', transaction_id)
        return {
            'succes': False,
            'statut': 'en_attente',
            'responsecode': '96',
            'erreur': str(exc),
        }

    response_code = extract_response_code(data)
    status_map = {
        '00': 'paye',
        '01': 'en_attente',
        '02': 'echoue',
        '529': 'echoue',
        '96': 'en_attente',
    }
    return {
        'succes': True,
        'statut': status_map.get(response_code, 'en_attente'),
        'responsecode': response_code,
        'responsemsg': extract_message(data),
        'raw': data,
        'erreur': None,
    }


def calculer_frais_evex(montant_billet):
    del montant_billet
    return 300


def calculer_montant_total(montant_billet):
    frais_evex = 300
    montant_total = int(montant_billet) + frais_evex
    frais_qos = round(montant_total * 0.017)
    return {
        'montant_billet': int(montant_billet),
        'frais_evex': frais_evex,
        'montant_total': montant_total,
        'frais_qos': frais_qos,
        'revenu_net_evex': frais_evex - frais_qos,
        'montant_reverse_cie': int(montant_billet),
    }


def valider_webhook(request_body, signature_header):
    """Valide HMAC si un secret est configuré; staging est revérifié via QOS."""
    secret = str(getattr(settings, 'QOSPAY_WEBHOOK_SECRET', '') or '')
    if not secret:
        return True
    supplied = str(signature_header or '')
    if supplied.lower().startswith('sha256='):
        supplied = supplied.split('=', 1)[1]
    expected = hmac.new(secret.encode(), request_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, supplied)


def valider_signature_webhook(request_body, signature_header):
    return valider_webhook(request_body, signature_header)
