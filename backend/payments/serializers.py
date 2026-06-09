from rest_framework import serializers

from .models import Transaction


class PaymentRequestSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=[Transaction.METHOD_TOGOCEL, Transaction.METHOD_MOOV])
    phone = serializers.CharField(max_length=30)
    amount = serializers.IntegerField(min_value=1)
    firstname = serializers.CharField(max_length=100)
    lastname = serializers.CharField(max_length=100)


class TransactionStatusRequestSerializer(serializers.Serializer):
    transref = serializers.CharField(max_length=64)


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            'transref',
            'method',
            'phone',
            'amount',
            'firstname',
            'lastname',
            'status',
            'qos_response_code',
            'qos_response_message',
            'created_at',
            'updated_at',
        ]
