from django.contrib import admin
from .models import SupportTicket, TicketReply


class TicketReplyInline(admin.TabularInline):
    model  = TicketReply
    extra  = 0
    fields = ('author', 'message', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display  = ('customer_name', 'customer_email', 'priority', 'status', 'assigned_to', 'created_at')
    list_filter   = ('priority', 'status')
    search_fields = ('customer_name', 'customer_email', 'issue')
    inlines       = [TicketReplyInline]
