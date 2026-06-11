from rest_framework import serializers

from .models import Transaction


class PaymentRequestSerializer(serializers.Serializer):
    operator = serializers.ChoiceField(
        choices=[('TOGOCEL', 'Togocel'), ('MOOV', 'Moov')],
        required=False,
    )
    method = serializers.ChoiceField(
        choices=[('togocel', 'Togocel'), ('moov', 'Moov')],
        required=False,
        write_only=True,
    )
    phone_number = serializers.CharField(max_length=30, required=False)
    phone = serializers.CharField(max_length=30, required=False)
    amount = serializers.IntegerField(min_value=1)
    firstname = serializers.CharField(max_length=100, required=False, allow_blank=True)
    lastname = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, attrs):
        operator = attrs.get('operator')
        method = attrs.get('method')
        phone_number = attrs.get('phone_number') or attrs.get('phone')

        if not operator and method:
            operator = 'MOOV' if method == 'moov' else 'TOGOCEL'
        if not operator:
            raise serializers.ValidationError({
                'operator': 'Ce champ est requis. Valeurs attendues: MOOV ou TOGOCEL.',
            })
        if not phone_number:
            raise serializers.ValidationError({
                'phone_number': 'Ce champ est requis.',
            })

        attrs['operator'] = operator
        attrs['phone_number'] = phone_number
        attrs['firstname'] = attrs.get('firstname', '')
        attrs['lastname'] = attrs.get('lastname', '')
        return attrs


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
