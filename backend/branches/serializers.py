from rest_framework import serializers
from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    business_name     = serializers.CharField(source='business.name',     read_only=True)
    business_industry = serializers.CharField(source='business.industry', read_only=True)

    class Meta:
        model  = Branch
        fields = ('id', 'name', 'business', 'business_name', 'business_industry', 'address', 'phone', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')
