from rest_framework import serializers
from .models import Business, BusinessRequest, IndustryControl, Industry, IndustryBranch


class IndustryBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model  = IndustryBranch
        fields = ('id', 'industry', 'name', 'address', 'phone', 'created_at')
        read_only_fields = ('id', 'created_at')


class IndustrySerializer(serializers.ModelSerializer):
    branches = IndustryBranchSerializer(many=True, read_only=True)

    class Meta:
        model  = Industry
        fields = ('id', 'key', 'label', 'icon', 'color', 'is_visible', 'is_builtin', 'branches', 'created_at')
        read_only_fields = ('id', 'is_builtin', 'created_at')


class BusinessSerializer(serializers.ModelSerializer):
    industry_ids    = serializers.PrimaryKeyRelatedField(
        source='industries',
        queryset=Industry.objects.all(),
        many=True,
        required=False,
    )
    industries_data = IndustrySerializer(source='industries', many=True, read_only=True)

    class Meta:
        model  = Business
        fields = (
            'id', 'name', 'industry', 'industry_ids', 'industries_data',
            'plan', 'status', 'owner', 'address', 'phone', 'email', 'created_at',
        )
        read_only_fields = ('id', 'created_at')


class BusinessRequestSerializer(serializers.ModelSerializer):
    business_id = serializers.SerializerMethodField()

    def get_business_id(self, obj):
        if obj.status == 'approved':
            biz = Business.objects.filter(name=obj.business_name).first()
            return biz.id if biz else None
        return None

    class Meta:
        model  = BusinessRequest
        fields = (
            'id', 'business_name', 'industry', 'contact_name',
            'email', 'phone', 'message', 'status', 'reviewed_by',
            'created_at', 'business_id',
        )
        read_only_fields = ('id', 'status', 'reviewed_by', 'created_at', 'business_id')


class IndustryControlSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    def get_label(self, obj):
        return dict(obj._meta.get_field('industry').choices).get(obj.industry, obj.industry.title())

    class Meta:
        model  = IndustryControl
        fields = ('id', 'industry', 'label', 'is_visible', 'updated_at')
        read_only_fields = ('id', 'industry', 'label', 'updated_at')
