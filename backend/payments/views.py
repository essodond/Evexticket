import requests
from django.core.exceptions import ImproperlyConfigured
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Transaction
from .serializers import (
    PaymentRequestSerializer,
    TransactionSerializer,
    TransactionStatusRequestSerializer,
)
from .services import (
    QosPayService,
    check_transaction_status,
    extract_message,
    extract_response_code,
    status_from_qospay_code,
)


class PaymentView(APIView):
    """Endpoint mobile pour initier un paiement QosPay."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = PaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        service = QosPayService()
        operator = data['operator']
        phone_number = data['phone_number']
        amount = data['amount']

        try:
            qos_response = service.initiate_payment(
                amount=amount,
                phone_number=phone_number,
                operator=operator,
            )
            operator_config = service.get_operator_config(operator)
            response_code = extract_response_code(qos_response)
            transaction_status = (
                status_from_qospay_code(response_code)
                if response_code
                else Transaction.STATUS_PENDING
            )
            transaction = Transaction.objects.create(
                transref=qos_response['transref'],
                method=operator_config['method'],
                phone=phone_number,
                amount=amount,
                firstname=data['firstname'],
                lastname=data['lastname'],
                status=transaction_status,
                qos_response_code=response_code,
                qos_response_message=extract_message(qos_response),
                qos_raw_response=qos_response,
            )

            return Response(
                {
                    'transaction': TransactionSerializer(transaction).data,
                    'qospay_response': qos_response,
                },
                status=status.HTTP_201_CREATED,
            )
        except requests.RequestException as exc:
            return Response(
                {'detail': 'Impossible de contacter QosPay.', 'error': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except ImproperlyConfigured as exc:
            return Response(
                {'detail': 'Configuration QosPay incomplete.', 'error': str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except ValueError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class TransactionStatusView(APIView):
    """Endpoint mobile pour verifier le statut d'une transaction."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = TransactionStatusRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transref = serializer.validated_data['transref']

        try:
            transaction, qos_response = check_transaction_status(transref)
        except Transaction.DoesNotExist:
            return Response(
                {'detail': 'Transaction introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        except requests.RequestException as exc:
            return Response(
                {'detail': 'Impossible de contacter QosPay.', 'error': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except ImproperlyConfigured as exc:
            return Response(
                {'detail': 'Configuration QosPay incomplete.', 'error': str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({
            'transaction': TransactionSerializer(transaction).data,
            'qospay_response': qos_response,
        })


@method_decorator(csrf_exempt, name='dispatch')
class QosPayWebhookView(APIView):
    """Webhook public appele par QosPay apres un changement de statut."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.data
        transref = (
            payload.get('transref')
            or payload.get('transRef')
            or payload.get('reference')
            or payload.get('transaction_reference')
        )
        if not transref:
            return Response(
                {'detail': 'transref manquant.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            transaction = Transaction.objects.get(transref=transref)
        except Transaction.DoesNotExist:
            return Response(
                {'detail': 'Transaction introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        response_code = extract_response_code(payload)
        transaction.status = status_from_qospay_code(response_code)
        transaction.qos_response_code = response_code
        transaction.qos_response_message = extract_message(payload)
        transaction.qos_raw_response = payload if isinstance(payload, dict) else {
            'raw': payload,
        }
        transaction.save(update_fields=[
            'status',
            'qos_response_code',
            'qos_response_message',
            'qos_raw_response',
            'updated_at',
        ])

        return Response({'received': True, 'status': transaction.status})
