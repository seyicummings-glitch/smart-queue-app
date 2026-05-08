from rest_framework import serializers
from .models import Business, BusinessRequest


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Business
        fields = ('id', 'name', 'industry', 'plan', 'status', 'owner', 'address', 'phone', 'email', 'created_at')
        read_only_fields = ('id', 'created_at')


class BusinessRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BusinessRequest
        fields = ('id', 'business_name', 'industry', 'contact_name', 'email', 'phone', 'message', 'status', 'reviewed_by', 'created_at')
        read_only_fields = ('id', 'status', 'reviewed_by', 'created_at')
