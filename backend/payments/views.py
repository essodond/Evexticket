import requests
from django.core.exceptions import ImproperlyConfigured
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Transaction
from .serializers import (
    TransactionSerializer,
    TransactionStatusRequestSerializer,
)
from .services import (
    check_transaction_status,
)


class QosWebhookRateThrottle(AnonRateThrottle):
    rate = '120/min'


class PaymentView(APIView):
    """Ancien endpoint désactivé : il ne pouvait pas émettre de billet."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response(
            {
                'detail': (
                    'Cette version de l’application utilise un ancien paiement qui ne peut pas créer de billet. '
                    'Mettez l’application à jour puis recommencez.'
                ),
                'code': 'MISE_A_JOUR_APPLICATION_REQUISE',
            },
            status=status.HTTP_410_GONE,
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
    throttle_classes = [QosWebhookRateThrottle]

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

        # Le callback configuré sur les anciens déploiements pointe encore vers
        # /api/payments/webhook/. Les nouvelles réservations utilisent leur
        # référence EVEX comme transref : les traiter ici évite qu'un billet
        # confirmé reste invisible lorsque l'application est fermée.
        from transport.models import Reservation
        from transport.services import qos_service, reservation_service

        reservation = Reservation.objects.filter(reference_evex=transref).first()
        if reservation:
            if reservation.statut_paiement == Reservation.STATUT_PAYE:
                return Response({'received': True, 'confirmation': 'already_paid'})
            if reservation.statut_paiement == Reservation.STATUT_A_RAPPROCHER:
                return Response({'received': True, 'confirmation': 'manual_review'})
            if reservation.statut_paiement == Reservation.STATUT_REMBOURSE:
                return Response({'received': True, 'confirmation': 'already_refunded'})
            verification = qos_service.verifier_paiement(
                reservation.transaction_id_qos or reservation.reference_evex,
                reservation.operateur,
            )
            verified_status = verification.get('statut')
            if verified_status == Reservation.STATUT_PAYE:
                try:
                    reservation_service.confirmer_paiement(
                        reservation.reference_evex,
                        reservation.transaction_id_qos or reservation.reference_evex,
                    )
                except reservation_service.PaymentReconciliationRequired:
                    return Response({'received': True, 'confirmation': 'manual_review'})
                except reservation_service.PaymentStateConflict:
                    return Response(
                        {'received': True, 'confirmation': 'manual_review'},
                    )
            elif verified_status in [Reservation.STATUT_ECHOUE, Reservation.STATUT_EXPIRE]:
                reservation_service.terminer_paiement(
                    reservation.reference_evex,
                    verified_status,
                )
            else:
                return Response(
                    {'received': True, 'confirmation': 'pending_verification'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response({'received': True, 'status': verified_status})

        try:
            transaction, _ = check_transaction_status(transref)
        except Transaction.DoesNotExist:
            return Response(
                {'detail': 'Transaction introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        except (requests.RequestException, ImproperlyConfigured):
            return Response(
                {'received': True, 'confirmation': 'pending_verification'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({'received': True, 'status': transaction.status})
