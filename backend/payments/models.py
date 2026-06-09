from django.db import models


class Transaction(models.Model):
    """Transaction QosPay initiee par EvexTicket."""

    METHOD_TOGOCEL = 'togocel'
    METHOD_MOOV = 'moov'
    METHOD_CARD = 'card'

    STATUS_PENDING = 'pending'
    STATUS_SUCCESS = 'success'
    STATUS_FAILED = 'failed'
    STATUS_INSUFFICIENT_FUNDS = 'insufficient_funds'
    STATUS_SYSTEM_ERROR = 'system_error'
    STATUS_UNKNOWN = 'unknown'

    METHOD_CHOICES = [
        (METHOD_TOGOCEL, 'Togocel'),
        (METHOD_MOOV, 'Moov Togo'),
        (METHOD_CARD, 'Carte'),
    ]

    STATUS_CHOICES = [
        (STATUS_PENDING, 'En attente'),
        (STATUS_SUCCESS, 'Succes'),
        (STATUS_FAILED, 'Echec'),
        (STATUS_INSUFFICIENT_FUNDS, 'Solde insuffisant'),
        (STATUS_SYSTEM_ERROR, 'Erreur systeme'),
        (STATUS_UNKNOWN, 'Inconnu'),
    ]

    transref = models.CharField(max_length=64, unique=True, db_index=True)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    phone = models.CharField(max_length=30)
    amount = models.PositiveIntegerField()
    firstname = models.CharField(max_length=100)
    lastname = models.CharField(max_length=100)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_PENDING)
    qos_response_code = models.CharField(max_length=10, blank=True)
    qos_response_message = models.TextField(blank=True)
    qos_raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.transref} - {self.method} - {self.status}'
