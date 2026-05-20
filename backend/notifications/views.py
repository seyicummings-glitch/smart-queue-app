from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification, StaffMessage, StaffMessageReply
from .serializers import NotificationSerializer, StaffMessageSerializer, StaffMessageReplySerializer

class NotificationListView(generics.ListAPIView):
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})

class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'All marked as read.'})

class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        notif.is_read = True
        notif.save()
        return Response(NotificationSerializer(notif).data)

class DismissView(APIView):
    permission_classes = [IsAuthenticated]
    def delete(self, request, pk):
        Notification.objects.filter(pk=pk, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Staff/Admin internal messaging ────────────────────────────────────────────

class StaffMessageInboxView(generics.ListAPIView):
    serializer_class   = StaffMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StaffMessage.objects.filter(
            recipient_role=self.request.user.role,
        ).prefetch_related('replies', 'read_by')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class StaffMessageSentView(generics.ListAPIView):
    serializer_class   = StaffMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StaffMessage.objects.filter(
            sender=self.request.user,
        ).prefetch_related('replies', 'read_by')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class StaffMessageCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        recipient_role = request.data.get('recipient_role', '').strip()
        subject        = request.data.get('subject', '').strip()
        body           = request.data.get('body', '').strip()

        if not recipient_role or not subject or not body:
            return Response({'detail': 'recipient_role, subject, and body are required.'}, status=status.HTTP_400_BAD_REQUEST)

        msg = StaffMessage.objects.create(
            sender         = request.user,
            sender_name    = request.user.full_name or request.user.email,
            sender_role    = request.user.role,
            recipient_role = recipient_role,
            subject        = subject,
            body           = body,
        )
        return Response(StaffMessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)


class StaffMessageMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            msg = StaffMessage.objects.get(pk=pk)
        except StaffMessage.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        msg.read_by.add(request.user)
        return Response({'detail': 'marked read'})


class StaffMessageConversationsView(generics.ListAPIView):
    """All threads the current user is part of (sent or received)."""
    serializer_class   = StaffMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        return (
            StaffMessage.objects
            .filter(Q(recipient_role=user.role) | Q(sender=user))
            .prefetch_related('replies', 'read_by')
            .distinct()
            .order_by('-created_at')
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class StaffMessageReplyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            msg = StaffMessage.objects.get(pk=pk)
        except StaffMessage.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        body = request.data.get('body', '').strip()
        if not body:
            return Response({'detail': 'body is required.'}, status=status.HTTP_400_BAD_REQUEST)
        reply = StaffMessageReply.objects.create(
            message     = msg,
            sender      = request.user,
            sender_name = request.user.full_name or request.user.email,
            sender_role = request.user.role,
            body        = body,
        )
        msg.read_by.add(request.user)
        return Response(StaffMessageReplySerializer(reply).data, status=status.HTTP_201_CREATED)


class StaffMessageUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = StaffMessage.objects.filter(
            recipient_role=request.user.role,
        ).exclude(read_by=request.user).count()
        return Response({'count': count})
