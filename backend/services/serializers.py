from rest_framework import serializers
from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.name', read_only=True)
    branch_name   = serializers.CharField(source='branch.name', read_only=True, default=None)

    class Meta:
        model  = Service
        fields = (
            'id', 'name', 'description', 'estimated_time',
            'industry', 'business', 'business_name',
            'branch', 'branch_name', 'is_active', 'created_at',
        )
        read_only_fields = ('id', 'created_at')
