from rest_framework import serializers
from .models import Business, BusinessRequest, IndustryControl


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


class IndustryControlSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    def get_label(self, obj):
        return dict(obj._meta.get_field('industry').choices).get(obj.industry, obj.industry.title())

    class Meta:
        model  = IndustryControl
        fields = ('id', 'industry', 'label', 'is_visible', 'updated_at')
        read_only_fields = ('id', 'industry', 'label', 'updated_at')
