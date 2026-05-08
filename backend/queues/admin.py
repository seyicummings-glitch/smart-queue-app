from django.contrib import admin
from .models import QueueTicket, QueueRule


@admin.register(QueueTicket)
class QueueTicketAdmin(admin.ModelAdmin):
    list_display  = ('ticket_number', 'customer', 'service', 'branch', 'status', 'position', 'issued_at')
    list_filter   = ('status', 'branch', 'service')
    search_fields = ('ticket_number', 'customer__full_name')
    ordering      = ('-issued_at',)


@admin.register(QueueRule)
class QueueRuleAdmin(admin.ModelAdmin):
    list_display = ('branch', 'max_capacity', 'avg_service_time', 'is_active')
