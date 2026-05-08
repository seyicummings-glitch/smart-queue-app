from rest_framework import serializers
from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    service_name  = serializers.CharField(source='service.name', read_only=True)
    branch_name   = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model  = Appointment
        fields = (
            'id', 'ticket_number',
            'customer', 'customer_name',
            'service', 'service_name',
            'branch', 'branch_name',
            'appointment_date', 'appointment_time',
            'status', 'notes', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'ticket_number', 'created_at', 'updated_at')

    def create(self, validated_data):
        validated_data.setdefault('customer', self.context['request'].user)
        return super().create(validated_data)
