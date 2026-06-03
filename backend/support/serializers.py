from rest_framework import serializers
from .models import SupportTicket, TicketReply


class TicketReplySerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True)

    class Meta:
        model  = TicketReply
        fields = ('id', 'ticket', 'author', 'author_name', 'message', 'created_at')
        read_only_fields = ('id', 'author', 'created_at')


class SupportTicketSerializer(serializers.ModelSerializer):
    replies       = TicketReplySerializer(many=True, read_only=True)
    reply_count   = serializers.IntegerField(source='replies.count', read_only=True)
    assigned_name = serializers.CharField(source='assigned_to.full_name', read_only=True, default=None)

    class Meta:
        model  = SupportTicket
        fields = (
            'id', 'customer_name', 'customer_email', 'issue',
            'priority', 'status', 'assigned_to', 'assigned_name',
            'replies', 'reply_count', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'status', 'created_at', 'updated_at')
