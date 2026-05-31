import hashlib
import hmac
import json
import logging
from urllib import error, request

from django.conf import settings

logger = logging.getLogger(__name__)


def _post_json(path, payload):
    url = f"{settings.QOS_BASE_URL}{path}"
    data = json.dumps(payload).encode('utf-8')
    req = request.Request(
        url,
        data=data,
        method='POST',
        headers={
            'Authorization': f"Bearer {settings.QOS_API_KEY}",
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    )
    with request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode('utf-8') or '{}')


def _get_json(path):
    url = f"{settings.QOS_BASE_URL}{path}"
    req = request.Request(
        url,
        method='GET',
        headers={
            'Authorization': f"Bearer {settings.QOS_API_KEY}",
            'Accept': 'application/json',
        },
    )
    with request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode('utf-8') or '{}')


def _extract_error(exc):
    if isinstance(exc, error.HTTPError):
        try:
            return exc.read().decode('utf-8')
        except Exception:
            return str(exc)
    return str(exc)


def initier_paiement(telephone, montant_total, reference, operateur, description):
    logger.info("QOS payment init started for reference=%s amount=%s", reference, montant_total)
    payload = {
        'msisdn': telephone,
        'amount': int(montant_total),
        'reference': reference,
        'operator': operateur,
        'description': description,
        'callback': settings.QOS_CALLBACK_URL,
        'currency': 'XOF',
    }

    try:
        data = _post_json('/v1/payment/init', payload)
        transaction_id = data.get('transaction_id') or data.get('transactionId') or data.get('id')
        reference_qos = data.get('reference_qos') or data.get('referenceQos') or data.get('reference')
        logger.info("QOS payment init succeeded for reference=%s transaction=%s", reference, transaction_id)
        return {
            'succes': True,
            'transaction_id': transaction_id,
            'reference_qos': reference_qos,
            'erreur': None,
        }
    except Exception as exc:
        erreur = _extract_error(exc)
        logger.exception("QOS payment init failed for reference=%s error=%s", reference, erreur)
        return {'succes': False, 'transaction_id': None, 'reference_qos': None, 'erreur': erreur}


def verifier_paiement(transaction_id):
    logger.info("QOS payment status check started for transaction=%s", transaction_id)
    status_map = {
        'SUCCESS': 'paye',
        'FAILED': 'echoue',
        'CANCELLED': 'echoue',
        'EXPIRED': 'expire',
        'PENDING': 'en_attente',
    }

    try:
        data = _get_json(f'/v1/payment/status/{transaction_id}')
        qos_status = str(data.get('status') or data.get('paymentStatus') or 'PENDING').upper()
        statut = status_map.get(qos_status, 'en_attente')
        logger.info("QOS payment status transaction=%s status=%s mapped=%s", transaction_id, qos_status, statut)
        return {'succes': True, 'statut': statut, 'erreur': None, 'raw': data}
    except Exception as exc:
        erreur = _extract_error(exc)
        logger.exception("QOS payment status failed transaction=%s error=%s", transaction_id, erreur)
        return {'succes': False, 'statut': 'en_attente', 'erreur': erreur, 'raw': None}


def reverser_compagnie(telephone_compagnie, montant, reference_reversement):
    logger.info("QOS payout init started reference=%s amount=%s", reference_reversement, montant)
    payload = {
        'msisdn': telephone_compagnie,
        'amount': int(montant),
        'reference': reference_reversement,
        'currency': 'XOF',
    }

    try:
        data = _post_json('/v1/payout/init', payload)
        transaction_id = data.get('transaction_id') or data.get('transactionId') or data.get('id')
        logger.info("QOS payout init succeeded reference=%s transaction=%s", reference_reversement, transaction_id)
        return {'succes': True, 'transaction_id': transaction_id, 'erreur': None}
    except Exception as exc:
        erreur = _extract_error(exc)
        logger.exception("QOS payout init failed reference=%s error=%s", reference_reversement, erreur)
        return {'succes': False, 'transaction_id': None, 'erreur': erreur}


def valider_signature_webhook(payload_bytes, signature_header):
    if not signature_header or not settings.QOS_SECRET_KEY:
        return False

    expected = hmac.new(
        settings.QOS_SECRET_KEY.encode('utf-8'),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    provided = signature_header.strip()
    if provided.startswith('sha256='):
        provided = provided.split('=', 1)[1]
    return hmac.compare_digest(expected, provided)
