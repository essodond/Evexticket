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
from .services import check_transaction_status, pay_moov_togo, pay_togocel


class PaymentView(APIView):
    """Endpoint appele par React Native pour initier un paiement."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = PaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data['method'] == Transaction.METHOD_TOGOCEL:
            transaction, qos_response = pay_togocel(
                data['phone'],
                data['amount'],
                data['firstname'],
                data['lastname'],
            )
        else:
            transaction, qos_response = pay_moov_togo(
                data['phone'],
                data['amount'],
                data['firstname'],
                data['lastname'],
            )

        return Response({
            'transaction': TransactionSerializer(transaction).data,
            'qospay_response': qos_response,
        }, status=status.HTTP_201_CREATED)


class TransactionStatusView(APIView):
    """Endpoint appele par React Native pour verifier le statut."""

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
            return Response({'detail': 'transref manquant.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            transaction = Transaction.objects.get(transref=transref)
        except Transaction.DoesNotExist:
            return Response({'detail': 'Transaction introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        response_code = str(
            payload.get('responsecode')
            or payload.get('responseCode')
            or payload.get('code')
            or payload.get('status')
            or ''
        )
        status_map = {
            '00': Transaction.STATUS_SUCCESS,
            '01': Transaction.STATUS_PENDING,
            '02': Transaction.STATUS_FAILED,
            '529': Transaction.STATUS_INSUFFICIENT_FUNDS,
            '96': Transaction.STATUS_SYSTEM_ERROR,
        }
        transaction.status = status_map.get(response_code, Transaction.STATUS_UNKNOWN)
        transaction.qos_response_code = response_code
        transaction.qos_response_message = str(
            payload.get('responsemsg')
            or payload.get('responseMessage')
            or payload.get('message')
            or ''
        )
        transaction.qos_raw_response = payload if isinstance(payload, dict) else {'raw': payload}
        transaction.save(update_fields=[
            'status',
            'qos_response_code',
            'qos_response_message',
            'qos_raw_response',
            'updated_at',
        ])

        return Response({'received': True, 'status': transaction.status})
