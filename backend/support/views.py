from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import SupportTicket, TicketReply
from .serializers import SupportTicketSerializer, TicketReplySerializer
from accounts.permissions import IsStaffOrAbove


class SupportTicketListCreateView(generics.ListCreateAPIView):
    serializer_class = SupportTicketSerializer
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['customer_name', 'customer_email', 'issue']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsStaffOrAbove()]

    def get_queryset(self):
        qs = SupportTicket.objects.prefetch_related('replies')
        status_filter   = self.request.query_params.get('status')
        priority_filter = self.request.query_params.get('priority')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if priority_filter:
            qs = qs.filter(priority=priority_filter)
        return qs


class SupportTicketDetailView(generics.RetrieveUpdateAPIView):
    serializer_class   = SupportTicketSerializer
    permission_classes = [IsStaffOrAbove]
    queryset           = SupportTicket.objects.prefetch_related('replies')


class TicketReplyView(APIView):
    permission_classes = [IsStaffOrAbove]

    def post(self, request, pk):
        try:
            ticket = SupportTicket.objects.get(pk=pk)
        except SupportTicket.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        reply = TicketReply.objects.create(
            ticket  = ticket,
            author  = request.user,
            message = request.data.get('message', ''),
        )
        if ticket.status == 'open':
            ticket.status = 'in_progress'
            ticket.save()

        return Response(TicketReplySerializer(reply).data, status=status.HTTP_201_CREATED)


class TicketResolveView(APIView):
    permission_classes = [IsStaffOrAbove]

    def post(self, request, pk):
        try:
            ticket = SupportTicket.objects.get(pk=pk)
        except SupportTicket.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        ticket.status = 'resolved'
        ticket.save()
        return Response(SupportTicketSerializer(ticket).data)
