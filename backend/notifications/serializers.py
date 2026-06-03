from rest_framework import serializers
from .models import Notification, StaffMessage, StaffMessageReply


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = ('id', 'type', 'title', 'body', 'is_read', 'created_at')
        read_only_fields = ('id', 'type', 'title', 'body', 'created_at')


class StaffMessageReplySerializer(serializers.ModelSerializer):
    class Meta:
        model  = StaffMessageReply
        fields = ('id', 'sender_name', 'sender_role', 'body', 'created_at')
        read_only_fields = ('id', 'sender_name', 'sender_role', 'created_at')


class StaffMessageSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()
    replies = StaffMessageReplySerializer(many=True, read_only=True)

    class Meta:
        model  = StaffMessage
        fields = ('id', 'sender_name', 'sender_role', 'recipient_role', 'subject', 'body', 'created_at', 'is_read', 'replies')
        read_only_fields = ('id', 'sender_name', 'sender_role', 'created_at', 'is_read', 'replies')

    def get_is_read(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return obj.read_by.filter(id=request.user.id).exists()
