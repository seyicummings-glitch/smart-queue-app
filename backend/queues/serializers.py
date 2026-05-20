from rest_framework import serializers
from .models import QueueTicket, QueueRule


class QueueTicketSerializer(serializers.ModelSerializer):
    customer_name  = serializers.CharField(source='customer.full_name', read_only=True)
    service_name   = serializers.CharField(source='service.name', read_only=True)
    branch_name    = serializers.CharField(source='branch.name', read_only=True)
    estimated_wait = serializers.SerializerMethodField()
    ahead_tickets  = serializers.SerializerMethodField()

    class Meta:
        model  = QueueTicket
        fields = (
            'id', 'ticket_number', 'customer', 'customer_name',
            'service', 'service_name', 'branch', 'branch_name',
            'status', 'position', 'notes',
            'estimated_wait', 'ahead_tickets',
            'issued_at', 'called_at', 'completed_at',
        )
        read_only_fields = ('id', 'ticket_number', 'position', 'issued_at', 'called_at', 'completed_at')

    def get_estimated_wait(self, obj):
        if obj.status != 'waiting':
            return 0
        ahead = QueueTicket.objects.filter(
            branch=obj.branch,
            service=obj.service,
            status='waiting',
            issued_at__lt=obj.issued_at,
        ).count()
        return ahead * obj.service.estimated_time

    def get_ahead_tickets(self, obj):
        if obj.status not in ('waiting', 'serving'):
            return []
        return list(
            QueueTicket.objects.filter(
                branch=obj.branch,
                service=obj.service,
                status__in=['waiting', 'serving'],
                issued_at__lt=obj.issued_at,
            ).values_list('ticket_number', flat=True).order_by('issued_at')
        )


class QueueRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = QueueRule
        fields = ('id', 'branch', 'max_capacity', 'avg_service_time', 'priority_rules', 'is_active', 'updated_at')
        read_only_fields = ('id', 'updated_at')
