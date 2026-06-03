from rest_framework import serializers
from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    service_name  = serializers.SerializerMethodField()
    branch_name   = serializers.SerializerMethodField()

    class Meta:
        model  = Appointment
        fields = (
            'id', 'ticket_number',
            'customer', 'customer_name',
            'service', 'service_name',
            'branch', 'branch_name',
            'service_name_text', 'branch_name_text',
            'appointment_date', 'appointment_time',
            'status', 'notes', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'ticket_number', 'customer', 'created_at', 'updated_at')

    def get_service_name(self, obj):
        return obj.display_service

    def get_branch_name(self, obj):
        return obj.display_branch

    def create(self, validated_data):
        validated_data['customer'] = self.context['request'].user
        return super().create(validated_data)
