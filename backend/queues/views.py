from django.utils import timezone
from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import QueueTicket, QueueRule
from .serializers import QueueTicketSerializer, QueueRuleSerializer
from accounts.permissions import IsStaffOrAbove, IsAdminOrSuperAdmin


class QueueListView(generics.ListAPIView):
    serializer_class   = QueueTicketSerializer
    permission_classes = [IsStaffOrAbove]
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['ticket_number', 'customer__full_name']

    def get_queryset(self):
        qs = QueueTicket.objects.select_related('customer', 'service', 'branch')
        status_filter = self.request.query_params.get('status')
        branch        = self.request.query_params.get('branch')
        service       = self.request.query_params.get('service')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if branch:
            qs = qs.filter(branch_id=branch)
        if service:
            qs = qs.filter(service_id=service)
        return qs


class JoinQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        service_id = request.data.get('service')
        branch_id  = request.data.get('branch')
        notes      = request.data.get('notes', '')

        if not service_id or not branch_id:
            return Response({'detail': 'service and branch are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent duplicate active tickets
        existing = QueueTicket.objects.filter(
            customer=request.user,
            status__in=['waiting', 'serving'],
        ).first()
        if existing:
            return Response(
                {'detail': 'You already have an active ticket.', 'ticket': QueueTicketSerializer(existing).data},
                status=status.HTTP_409_CONFLICT,
            )

        ticket = QueueTicket.objects.create(
            customer=request.user,
            service_id=service_id,
            branch_id=branch_id,
            notes=notes,
        )
        return Response(QueueTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)


class MyTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ticket = QueueTicket.objects.filter(
            customer=request.user,
            status__in=['waiting', 'serving'],
        ).order_by('-issued_at').first()
        if not ticket:
            return Response({'detail': 'No active ticket.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(QueueTicketSerializer(ticket).data)


class CallNextView(APIView):
    permission_classes = [IsStaffOrAbove]

    def post(self, request, pk):
        try:
            ticket = QueueTicket.objects.get(pk=pk, status='waiting')
        except QueueTicket.DoesNotExist:
            return Response({'detail': 'Ticket not found or not waiting.'}, status=status.HTTP_404_NOT_FOUND)
        ticket.status    = 'serving'
        ticket.called_at = timezone.now()
        ticket.save()
        return Response(QueueTicketSerializer(ticket).data)


class CompleteTicketView(APIView):
    permission_classes = [IsStaffOrAbove]

    def post(self, request, pk):
        try:
            ticket = QueueTicket.objects.get(pk=pk, status='serving')
        except QueueTicket.DoesNotExist:
            return Response({'detail': 'Ticket not found or not serving.'}, status=status.HTTP_404_NOT_FOUND)
        ticket.status       = 'completed'
        ticket.completed_at = timezone.now()
        ticket.save()
        return Response(QueueTicketSerializer(ticket).data)


class CancelTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            ticket = QueueTicket.objects.get(pk=pk)
        except QueueTicket.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_owner = ticket.customer == request.user
        is_staff = request.user.role in ('staff', 'admin', 'super_admin')
        if not (is_owner or is_staff):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if ticket.status in ('completed', 'cancelled'):
            return Response({'detail': 'Ticket already closed.'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = 'cancelled'
        ticket.save()
        return Response(QueueTicketSerializer(ticket).data)


class QueueStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch = request.query_params.get('branch')
        qs     = QueueTicket.objects.all()
        if branch:
            qs = qs.filter(branch_id=branch)

        waiting   = qs.filter(status='waiting').count()
        serving   = qs.filter(status='serving').count()
        completed = qs.filter(status='completed').count()

        # Avg wait: average position × avg service time of all waiting tickets
        waiting_tickets = qs.filter(status='waiting')
        avg_wait = 0
        if waiting_tickets.exists():
            total_wait = sum(
                t.service.estimated_time * t.position
                for t in waiting_tickets.select_related('service')
            )
            avg_wait = total_wait // waiting_tickets.count()

        return Response({
            'waiting':   waiting,
            'serving':   serving,
            'completed': completed,
            'avg_wait':  avg_wait,
        })


class QueueRuleListCreateView(generics.ListCreateAPIView):
    serializer_class   = QueueRuleSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    queryset           = QueueRule.objects.select_related('branch')


class QueueRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = QueueRuleSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    queryset           = QueueRule.objects.all()
