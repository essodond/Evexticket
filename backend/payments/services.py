import base64
import logging
import uuid

import requests
from django.conf import settings

from .models import Transaction

logger = logging.getLogger(__name__)


CODE_STATUS_MAP = {
    '00': Transaction.STATUS_SUCCESS,
    '01': Transaction.STATUS_PENDING,
    '02': Transaction.STATUS_FAILED,
    '529': Transaction.STATUS_INSUFFICIENT_FUNDS,
    '96': Transaction.STATUS_SYSTEM_ERROR,
}

# ─── Endpoints QOS par opérateur ─────────────────────────────────
ENDPOINTS = {
    Transaction.METHOD_TOGOCEL: {
        'requestpayment':      '/QosicBridge/tm/v1/requestpayment',
        'gettransactionstate': '/QosicBridge/tm/v1/gettransactionstate',
        'deposit':             '/QosicBridge/tm/v1/deposit',
    },
    Transaction.METHOD_MOOV: {
        'requestpayment':      '/QosicBridge/tg/v1/requestpayment',
        'gettransactionstate': '/QosicBridge/tg/v1/gettransactionstate',
        'deposit':             '/QosicBridge/tg/v1/deposit',
    },
}


def _build_basic_auth_header():
    """Construit l'en-tete Basic Auth attendu par QosPay."""
    credentials = f'{settings.QOSPAY_USERNAME}:{settings.QOSPAY_PASSWORD}'
    encoded = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')
    return f'Basic {encoded}'


def _generate_transref():
    """Genere une reference unique pour suivre la transaction chez EvexTicket."""
    return f'EVEX-{uuid.uuid4().hex[:20].upper()}'


def _normalize_phone(phone):
    """
    Retourne un msisdn au format 228XXXXXXXXX attendu par QosPay.
    Ex: "71608097"     → "22871608097"
        "22871608097"  → "22871608097"  (déjà correct)
        "+22871608097" → "22871608097"
    """
    phone_str = str(phone).strip().replace(' ', '')
    if phone_str.startswith('+'):
        phone_str = phone_str[1:]
    if phone_str.startswith('228'):
        return phone_str
    if phone_str.startswith('0'):
        return f'228{phone_str[1:]}'
    return f'228{phone_str}'


def _status_from_qospay_code(code):
    """Convertit les codes QosPay en statuts internes lisibles."""
    return CODE_STATUS_MAP.get(str(code), Transaction.STATUS_UNKNOWN)


def _extract_response_code(data):
    """Recupere le code de reponse quelle que soit la casse renvoyee par QosPay."""
    if not isinstance(data, dict):
        return ''
    return str(
        data.get('responsecode')
        or data.get('responseCode')
        or data.get('code')
        or data.get('status')
        or ''
    )


def _extract_message(data):
    """Recupere un message humain depuis la reponse QosPay."""
    if not isinstance(data, dict):
        return ''
    return str(
        data.get('responsemsg')
        or data.get('responseMessage')
        or data.get('message')
        or data.get('description')
        or ''
    )


def _post_to_qospay(path, payload):
    """
    Envoie une requete POST JSON vers QosPay avec Basic Auth.
    verify=False car le certificat est auto-signé sur staging et production.
    """
    url = f"{settings.QOSPAY_BASE_URL.rstrip('/')}{path}"
    headers = {
        'Authorization': _build_basic_auth_header(),
        'Content-Type':  'application/json',
        'Accept':        'application/json',
    }

    logger.info("QosPay request → %s | payload: %s", url, payload)

    response = requests.post(
        url,
        json=payload,
        headers=headers,
        timeout=30,
        verify=False,
    )

    logger.info(
        "QosPay response ← status: %s | body: %s",
        response.status_code,
        response.text,
    )

    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        logger.error(
            "QosPay HTTP error %s %s response=%s",
            response.status_code,
            url,
            response.text,
        )
        raise

    if not response.content:
        return {}

    try:
        return response.json()
    except ValueError:
        return {'raw_text': response.text}


def _request_payment(method, phone, amount, firstname, lastname):
    """Cree une transaction locale puis demande le paiement a QosPay."""
    transref = _generate_transref()
    transaction = Transaction.objects.create(
        transref=transref,
        method=method,
        phone=phone,
        amount=int(amount),
        firstname=firstname,
        lastname=lastname,
        status=Transaction.STATUS_PENDING,
    )

    # Endpoint correct selon l'opérateur
    path = ENDPOINTS[method]['requestpayment']

    payload = {
        'clientid':    settings.QOSPAY_CLIENT_ID,
        'transref':    transref,
        'msisdn':      _normalize_phone(phone),
        'amount':      str(int(amount)),
        'firstname':   str(firstname),
        'lastname':    str(lastname),
        'callbackurl': settings.QOSPAY_CALLBACK_URL,
    }

    try:
        data = _post_to_qospay(path, payload)
        response_code = _extract_response_code(data)
        transaction.status = _status_from_qospay_code(response_code)
        transaction.qos_response_code = response_code
        transaction.qos_response_message = _extract_message(data)
        transaction.qos_raw_response = data if isinstance(data, dict) else {'raw': data}
        transaction.save(update_fields=[
            'status', 'qos_response_code',
            'qos_response_message', 'qos_raw_response', 'updated_at',
        ])
        return transaction, data
    except requests.RequestException as exc:
        logger.exception("Erreur HTTP QosPay transref=%s", transref)
        transaction.status = Transaction.STATUS_SYSTEM_ERROR
        transaction.qos_response_code = '96'
        transaction.qos_response_message = str(exc)
        transaction.qos_raw_response = {'error': str(exc)}
        transaction.save(update_fields=[
            'status', 'qos_response_code',
            'qos_response_message', 'qos_raw_response', 'updated_at',
        ])
        return transaction, {'error': str(exc), 'responsecode': '96'}
    except Exception as exc:
        logger.exception("Erreur interne paiement QosPay transref=%s", transref)
        transaction.status = Transaction.STATUS_SYSTEM_ERROR
        transaction.qos_response_code = '96'
        transaction.qos_response_message = str(exc)
        transaction.qos_raw_response = {'error': str(exc)}
        transaction.save(update_fields=[
            'status', 'qos_response_code',
            'qos_response_message', 'qos_raw_response', 'updated_at',
        ])
        return transaction, {'error': str(exc), 'responsecode': '96'}


def pay_togocel(phone, amount, firstname, lastname):
    """Declenche un paiement Togocel (T-Money) via QosPay."""
    return _request_payment(
        Transaction.METHOD_TOGOCEL,
        phone, amount, firstname, lastname,
    )


def pay_moov_togo(phone, amount, firstname, lastname):
    """Declenche un paiement Moov Togo (Flooz) via QosPay."""
    return _request_payment(
        Transaction.METHOD_MOOV,
        phone, amount, firstname, lastname,
    )


def check_transaction_status(transref):
    """
    Interroge QosPay et met a jour le statut local de la transaction.
    Utilise le bon endpoint selon l'opérateur de la transaction :
      Togocel → /QosicBridge/tm/v1/gettransactionstate
      Moov    → /QosicBridge/tg/v1/gettransactionstate
    """
    transaction = Transaction.objects.get(transref=transref)

    # Choisir l'endpoint selon l'opérateur de la transaction
    path = ENDPOINTS.get(
        transaction.method,
        ENDPOINTS[Transaction.METHOD_MOOV]  # fallback Moov
    )['gettransactionstate']

    payload = {
        'clientid': settings.QOSPAY_CLIENT_ID,
        'transref': transref,
    }

    try:
        data = _post_to_qospay(path, payload)
        response_code = _extract_response_code(data)
        transaction.status = _status_from_qospay_code(response_code)
        transaction.qos_response_code = response_code
        transaction.qos_response_message = _extract_message(data)
        transaction.qos_raw_response = data if isinstance(data, dict) else {'raw': data}
        transaction.save(update_fields=[
            'status', 'qos_response_code',
            'qos_response_message', 'qos_raw_response', 'updated_at',
        ])
        return transaction, data
    except requests.RequestException as exc:
        logger.exception("Erreur verification QosPay transref=%s", transref)
        return transaction, {'error': str(exc), 'responsecode': '96'}


# ─── CALCUL DES FRAIS EVEX ────────────────────────────────────────
def calculer_montant_total(montant_billet: int) -> dict:
    """
    Décomposition complète des montants EVEX.

    Règle :
      - Frais EVEX fixes  = 300 FCFA (sur tous les billets)
      - Client paie       = montant_billet + 300
      - Frais QOS (1.7%)  = calculés sur le montant total
      - Revenu net EVEX   = 300 - frais_qos
      - Compagnie reçoit  = 100% du montant_billet

    Exemple billet 5 000 FCFA :
      montant_total       = 5 300
      frais_qos           =    90  (1.7% × 5 300)
      revenu_net_evex     =   210  (300 - 90)
      montant_reverse_cie = 5 000
    """
    frais_evex          = 300
    montant_total       = montant_billet + frais_evex
    frais_qos           = round(montant_total * 0.017)
    revenu_net_evex     = frais_evex - frais_qos
    montant_reverse_cie = montant_billet

    return {
        'montant_billet':      montant_billet,
        'frais_evex':          frais_evex,
        'montant_total':       montant_total,
        'frais_qos':           frais_qos,
        'revenu_net_evex':     revenu_net_evex,
        'montant_reverse_cie': montant_reverse_cie,
    }