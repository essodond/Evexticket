from django.contrib import admin

from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['transref', 'method', 'phone', 'amount', 'status', 'created_at']
    list_filter = ['method', 'status', 'created_at']
    search_fields = ['transref', 'phone', 'firstname', 'lastname']
    readonly_fields = ['created_at', 'updated_at']
