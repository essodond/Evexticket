import json
import logging
import time
import random
import requests
import urllib3

from django.conf import settings

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


def get_auth():
    return (settings.QOSPAY_USERNAME, settings.QOSPAY_PASSWORD)


def generate_transref():
    return f"EVEX-{int(time.time())}-{random.randint(1000, 9999)}"


def _normaliser_phone(phone: str) -> str:
    """
    Normalise le numéro de téléphone pour QOS staging.
    QOS attend le numéro LOCAL sans préfixe pays (228).
    Ex: "22871608097" → "71608097"
        "+22890123456" → "90123456"
        "90123456"     → "90123456"
    """
    phone = str(phone).strip().replace(" ", "").replace("+", "")
    if phone.startswith("228"):
        phone = phone[3:]
    return phone


def _post_to_qospay(path, payload):
    """
    Appel HTTP POST vers QosicBridge.
    Authentification Basic (username/password).
    verify=False car le staging utilise un certificat auto-signé.
    """
    url = f"{settings.QOSPAY_BASE_URL}{path}"

    logger.info("QosPay request → %s | payload: %s", url, payload)

    response = requests.post(
        url,
        json=payload,
        auth=get_auth(),
        verify=False,   # staging: certificat auto-signé
        timeout=30,
    )

    logger.info(
        "QosPay response ← status: %s | body: %s",
        response.status_code,
        response.text,
    )

    if response.status_code == 400:
        logger.error(
            "QosPay HTTP 400 Bad Request → %s | response: %s",
            url, response.text,
        )

    response.raise_for_status()

    # Certains endpoints retournent du texte vide sur erreur
    try:
        return response.json()
    except Exception:
        return {"responsecode": "96", "responsemsg": response.text}


# ─── TOGOCEL (T-Money) ────────────────────────────────────────────
def pay_togocel(phone, amount, firstname, lastname):
    """
    Initie un paiement T-Money (Togocel) via QosicBridge.
    Endpoint: /QosicBridge/tg/v1/requestpayment  (même que Moov)
    """
    transref = generate_transref()
    payload = {
        "msisdn":    _normaliser_phone(phone),   # numéro local sans 228
        "amount":    str(amount),                # string obligatoire
        "firstname": firstname,
        "lastname":  lastname,
        "transref":  transref,
        "clientid":  settings.QOSPAY_CLIENT_ID,
    }
    try:
        data = _post_to_qospay(
            '/QosicBridge/tg/v1/requestpayment',   # ✅ endpoint correct
            payload,
        )
        responsecode = data.get('responsecode', '96')
        succes = responsecode == '00'
        return {
            'succes':       succes,
            'transref':     transref,
            'responsecode': responsecode,
            'responsemsg':  data.get('responsemsg', ''),
            'raw':          data,
            'erreur':       None if succes else data.get('responsemsg', 'Erreur inconnue'),
        }
    except Exception as exc:
        logger.exception("Togocel payment failed transref=%s: %s", transref, exc)
        return {
            'succes':       False,
            'transref':     transref,
            'responsecode': '96',
            'responsemsg':  '',
            'raw':          {},
            'erreur':       str(exc),
        }


# ─── MOOV TOGO (Flooz) ────────────────────────────────────────────
def pay_moov_togo(phone, amount, firstname, lastname):
    """
    Initie un paiement Flooz (Moov Togo) via QosicBridge.
    Endpoint: /QosicBridge/tg/v1/requestpayment
    """
    transref = generate_transref()
    payload = {
        "msisdn":    _normaliser_phone(phone),
        "amount":    str(amount),
        "firstname": firstname,
        "lastname":  lastname,
        "transref":  transref,
        "clientid":  settings.QOSPAY_CLIENT_ID,
    }
    try:
        data = _post_to_qospay(
            '/QosicBridge/tg/v1/requestpayment',   # ✅ endpoint correct
            payload,
        )
        responsecode = data.get('responsecode', '96')
        succes = responsecode == '00'
        return {
            'succes':       succes,
            'transref':     transref,
            'responsecode': responsecode,
            'responsemsg':  data.get('responsemsg', ''),
            'raw':          data,
            'erreur':       None if succes else data.get('responsemsg', 'Erreur inconnue'),
        }
    except Exception as exc:
        logger.exception("Moov Togo payment failed transref=%s: %s", transref, exc)
        return {
            'succes':       False,
            'transref':     transref,
            'responsecode': '96',
            'responsemsg':  '',
            'raw':          {},
            'erreur':       str(exc),
        }


# ─── VÉRIFIER STATUT ──────────────────────────────────────────────
def check_transaction_status(transref):
    """
    Vérifie le statut d'une transaction QosicBridge.
    Endpoint: /QosicBridge/tg/v1/gettransactionstatus  ✅

    Codes de réponse QOS :
      00  → success (paiement confirmé)
      01  → pending (en attente)
      02  → failed  (échoué)
      529 → insufficient_funds (solde insuffisant)
      96  → system_error
    """
    payload = {
        "transref": transref,
        "clientid": settings.QOSPAY_CLIENT_ID,
    }
    try:
        data = _post_to_qospay(
            '/QosicBridge/tg/v1/gettransactionstatus',   # ✅ endpoint correct
            payload,
        )

        code = data.get('responsecode', '96')
        status_map = {
            '00':  'success',
            '01':  'pending',
            '02':  'failed',
            '529': 'insufficient_funds',
            '96':  'system_error',
        }
        statut = status_map.get(code, 'pending')

        return {
            'succes':       True,
            'statut':       statut,
            'responsecode': code,
            'responsemsg':  data.get('responsemsg', ''),
            'raw':          data,
            'erreur':       None,
        }
    except Exception as exc:
        logger.exception("Status check failed transref=%s: %s", transref, exc)
        return {
            'succes':       False,
            'statut':       'pending',
            'responsecode': '96',
            'responsemsg':  '',
            'raw':          {},
            'erreur':       str(exc),
        }


# ─── CALCUL DES FRAIS EVEX ────────────────────────────────────────
def calculer_frais_evex(montant_billet: int) -> int:
    """
    Frais fixes EVEX : 300 FCFA sur tous les billets.
    EVEX garde : 300 - frais_qos (1.7% du total)
    Compagnie reçoit : 100% du prix billet.
    """
    return 300


def calculer_montant_total(montant_billet: int) -> dict:
    """
    Retourne la décomposition complète des montants.

    Exemple pour un billet à 5 000 FCFA :
      - montant_billet        = 5 000
      - frais_evex            =   300
      - montant_total         = 5 300  (ce que paye le client)
      - frais_qos             =    90  (1.7% × 5 300)
      - revenu_net_evex       =   210  (300 - 90)
      - montant_reverse_cie   = 5 000  (reversé à la compagnie)
    """
    frais_evex          = 300
    montant_total       = montant_billet + frais_evex
    frais_qos           = round(montant_total * 0.017)
    revenu_net_evex     = frais_evex - frais_qos
    montant_reverse_cie = montant_billet

    return {
        'montant_billet':        montant_billet,
        'frais_evex':            frais_evex,
        'montant_total':         montant_total,
        'frais_qos':             frais_qos,
        'revenu_net_evex':       revenu_net_evex,
        'montant_reverse_cie':   montant_reverse_cie,
    }


# ─── WEBHOOK SIGNATURE ────────────────────────────────────────────
def valider_webhook(request_body, signature_header):
    """
    Validation de signature webhook QOS.
    QosPay staging n'envoie pas de signature — retourne True.
    À implémenter en production avec HMAC-SHA256.
    """
    return True