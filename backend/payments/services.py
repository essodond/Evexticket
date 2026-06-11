import logging
import uuid
from typing import Any
from urllib.parse import urljoin

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from requests.auth import HTTPBasicAuth

from .models import Transaction

logger = logging.getLogger(__name__)


CODE_STATUS_MAP = {
    '00': Transaction.STATUS_SUCCESS,
    '01': Transaction.STATUS_PENDING,
    '02': Transaction.STATUS_FAILED,
    '529': Transaction.STATUS_INSUFFICIENT_FUNDS,
    '96': Transaction.STATUS_SYSTEM_ERROR,
}


class QosPayService:
    """Service d'integration QosPay pour TOGOCEL et MOOV MONEY."""

    OPERATOR_ALIASES = {
        'TOGOCEL': 'TOGOCEL',
        'TMONEY': 'TOGOCEL',
        'T-MONEY': 'TOGOCEL',
        Transaction.METHOD_TOGOCEL.upper(): 'TOGOCEL',
        'MOOV': 'MOOV',
        'MOOV MONEY': 'MOOV',
        'FLOOZ': 'MOOV',
        Transaction.METHOD_MOOV.upper(): 'MOOV',
    }

    OPERATOR_CONFIG = {
        'TOGOCEL': {
            'client_id_setting': 'QOSPAY_CLIENT_ID_TOGOCEL',
            'password_setting': 'QOSPAY_API_PASSWORD_TOGOCEL',
            'request_url_setting': 'QOSPAY_REQUEST_URL_TOGOCEL',
            'status_url_setting': 'QOSPAY_STATUS_URL_TOGOCEL',
            'method': Transaction.METHOD_TOGOCEL,
        },
        'MOOV': {
            'client_id_setting': 'QOSPAY_CLIENT_ID_MOOV',
            'password_setting': 'QOSPAY_API_PASSWORD_MOOV',
            'request_url_setting': 'QOSPAY_REQUEST_URL_MOOV',
            'status_url_setting': 'QOSPAY_STATUS_URL_MOOV',
            'method': Transaction.METHOD_MOOV,
        },
    }

    def __init__(self) -> None:
        self.username = settings.QOSPAY_API_USERNAME
        self.callback_url = settings.QOSPAY_CALLBACK_URL
        self.verify_ssl = settings.QOSPAY_VERIFY_SSL
        self.timeout = settings.QOSPAY_TIMEOUT

    def initiate_payment(
        self,
        amount: int,
        phone_number: str,
        operator: str,
    ) -> dict[str, Any]:
        """Initie un paiement QosPay et retourne la reponse JSON."""
        operator_config = self.get_operator_config(operator)
        transref = self.generate_transref()
        payload = {
            'clientid': operator_config['client_id'],
            'transref': transref,
            'msisdn': self.normalize_phone(phone_number),
            'amount': str(int(amount)),
        }

        if self.callback_url:
            payload['callbackurl'] = self.callback_url

        response_data = self._post(
            url=operator_config['request_url'],
            payload=payload,
            password=operator_config['password'],
        )
        response_data.setdefault('transref', transref)
        return response_data

    def get_transaction_status(
        self,
        transref: str,
        operator: str,
    ) -> dict[str, Any]:
        """Interroge QosPay pour connaitre le statut d'une transaction."""
        operator_config = self.get_operator_config(operator)
        payload = {
            'clientid': operator_config['client_id'],
            'transref': transref,
        }
        return self._post(
            url=operator_config['status_url'],
            payload=payload,
            password=operator_config['password'],
        )

    def get_operator_config(self, operator: str) -> dict[str, str]:
        """Charge les identifiants et URLs correspondant a l'operateur."""
        operator_key = self.normalize_operator(operator)
        config = self.OPERATOR_CONFIG[operator_key]

        client_id = self._required_setting(config['client_id_setting'])
        password = self._required_setting(config['password_setting'])
        request_url = self._required_setting(config['request_url_setting'])
        status_url = self._required_setting(config['status_url_setting'])

        return {
            'operator': operator_key,
            'method': config['method'],
            'client_id': client_id,
            'password': password,
            'request_url': self._absolute_url(request_url),
            'status_url': self._absolute_url(status_url),
        }

    def normalize_operator(self, operator: str) -> str:
        """Accepte MOOV/TOGOCEL et quelques alias utilises par le mobile."""
        operator_key = str(operator).strip().upper()
        normalized = self.OPERATOR_ALIASES.get(operator_key)
        if not normalized:
            raise ValueError(
                "Operateur non supporte. Valeurs attendues: MOOV ou TOGOCEL."
            )
        return normalized

    @staticmethod
    def normalize_phone(phone_number: str) -> str:
        """Retourne un MSISDN local, sans +228, attendu par QosPay."""
        phone = str(phone_number).strip().replace(' ', '').replace('-', '')
        phone = phone.replace('(', '').replace(')', '').replace('+', '')
        if phone.startswith('228'):
            return phone[3:]
        if phone.startswith('0'):
            return phone[1:]
        return phone

    @staticmethod
    def generate_transref() -> str:
        """Genere une reference unique pour tracer la transaction."""
        return f'EVEX-{uuid.uuid4().hex[:20].upper()}'

    def _post(
        self,
        url: str,
        payload: dict[str, Any],
        password: str,
    ) -> dict[str, Any]:
        logger.info('Appel QosPay vers %s, transref=%s', url, payload['transref'])
        response = requests.post(
            url,
            json=payload,
            auth=HTTPBasicAuth(self.username, password),
            headers={
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            timeout=self.timeout,
            verify=self.verify_ssl,
        )
        response.raise_for_status()

        if not response.content:
            return {}

        try:
            data = response.json()
        except ValueError:
            data = {'raw_response': response.text}

        if not isinstance(data, dict):
            return {'raw_response': data}
        return data

    @staticmethod
    def _required_setting(name: str) -> str:
        value = getattr(settings, name, '')
        if value in (None, ''):
            raise ImproperlyConfigured(f'Le parametre {name} est obligatoire.')
        return str(value)

    @staticmethod
    def _absolute_url(value: str) -> str:
        if value.startswith(('http://', 'https://')):
            return value
        return urljoin(f'{settings.QOSPAY_BASE_URL.rstrip("/")}/', value.lstrip('/'))


def status_from_qospay_code(code: str) -> str:
    """Convertit un code QosPay en statut interne."""
    return CODE_STATUS_MAP.get(str(code), Transaction.STATUS_UNKNOWN)


def extract_response_code(data: dict[str, Any]) -> str:
    """Recupere le code reponse, quelle que soit la casse retournee."""
    return str(
        data.get('responsecode')
        or data.get('responseCode')
        or data.get('code')
        or data.get('status')
        or ''
    )


def extract_message(data: dict[str, Any]) -> str:
    """Recupere un message lisible depuis la reponse QosPay."""
    return str(
        data.get('responsemsg')
        or data.get('responseMessage')
        or data.get('message')
        or data.get('description')
        or ''
    )


def check_transaction_status(transref: str) -> tuple[Transaction, dict[str, Any]]:
    """Verifie le statut chez QosPay et met a jour la transaction locale."""
    transaction = Transaction.objects.get(transref=transref)
    service = QosPayService()
    qos_response = service.get_transaction_status(
        transref=transref,
        operator=transaction.method,
    )

    response_code = extract_response_code(qos_response)
    transaction.status = status_from_qospay_code(response_code)
    transaction.qos_response_code = response_code
    transaction.qos_response_message = extract_message(qos_response)
    transaction.qos_raw_response = qos_response
    transaction.save(update_fields=[
        'status',
        'qos_response_code',
        'qos_response_message',
        'qos_raw_response',
        'updated_at',
    ])
    return transaction, qos_response


def _request_payment(
    method: str,
    phone: str,
    amount: int,
) -> tuple[Transaction, dict[str, Any]]:
    service = QosPayService()
    qos_response = service.initiate_payment(
        amount=amount,
        phone_number=phone,
        operator=method,
    )
    transref = qos_response['transref']
    response_code = extract_response_code(qos_response)
    transaction_status = (
        status_from_qospay_code(response_code)
        if response_code
        else Transaction.STATUS_PENDING
    )
    transaction = Transaction.objects.create(
        transref=transref,
        method=service.get_operator_config(method)['method'],
        phone=phone,
        amount=int(amount),
        firstname='',
        lastname='',
        status=transaction_status,
        qos_response_code=response_code,
        qos_response_message=extract_message(qos_response),
        qos_raw_response=qos_response,
    )
    return transaction, qos_response


def pay_togocel(phone, amount, firstname='', lastname=''):
    """Declenche un paiement Togocel via QosPay."""
    return _request_payment(Transaction.METHOD_TOGOCEL, phone, amount)


def pay_moov_togo(phone, amount, firstname='', lastname=''):
    """Declenche un paiement Moov Money via QosPay."""
    return _request_payment(Transaction.METHOD_MOOV, phone, amount)


def calculer_montant_total(montant_billet: int) -> dict[str, int]:
    """Retourne la decomposition des montants EVEX."""
    frais_evex = 300
    montant_total = montant_billet + frais_evex
    frais_qos = round(montant_total * 0.017)

    return {
        'montant_billet': montant_billet,
        'frais_evex': frais_evex,
        'montant_total': montant_total,
        'frais_qos': frais_qos,
        'revenu_net_evex': frais_evex - frais_qos,
        'montant_reverse_cie': montant_billet,
    }
