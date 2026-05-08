from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ('id', 'email', 'full_name', 'role', 'phone', 'date_of_birth', 'business', 'email_verified', 'created_at')
        read_only_fields = ('id', 'email_verified', 'created_at')


class RegisterSerializer(serializers.ModelSerializer):
    password      = serializers.CharField(write_only=True, min_length=8)
    password2     = serializers.CharField(write_only=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model  = User
        fields = ('email', 'full_name', 'password', 'password2', 'phone', 'date_of_birth')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        data['user'] = user
        return data


class EmployeeSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model  = User
        fields = ('id', 'email', 'full_name', 'role', 'phone', 'business', 'password', 'created_at')
        read_only_fields = ('id', 'created_at')

    def create(self, validated_data):
        password = validated_data.pop('password', 'changeme123')
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
