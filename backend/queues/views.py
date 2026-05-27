from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import QueueTicket, QueueRule
from .serializers import QueueTicketSerializer, QueueRuleSerializer
from accounts.permissions import IsStaffOrAbove, IsAdminOrSuperAdmin
from notifications.utils import create_notification, notify_staff
from services.models import Service
from branches.models import Branch
from businesses.models import Business


class QueueListView(generics.ListAPIView):
    serializer_class   = QueueTicketSerializer
    permission_classes = [IsStaffOrAbove]
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['ticket_number', 'customer__full_name']

    def get_queryset(self):
        user = self.request.user
        qs   = QueueTicket.objects.select_related('customer', 'service', 'branch')

        status_filter = self.request.query_params.get('status')
        branch        = self.request.query_params.get('branch')
        service       = self.request.query_params.get('service')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if branch:
            qs = qs.filter(branch_id=branch)
        if service:
            qs = qs.filter(service_id=service)

        # Staff only see tickets for their assigned branch AND assigned services
        if user.role == 'staff':
            if user.assigned_branch_id:
                qs = qs.filter(branch_id=user.assigned_branch_id)
            assigned_ids = user.assigned_services.values_list('id', flat=True)
            if assigned_ids:
                qs = qs.filter(service_id__in=assigned_ids)

        return qs


class JoinQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        service_id     = request.data.get('service')
        branch_id      = request.data.get('branch')
        service_name   = (request.data.get('service_name')  or '').strip()
        branch_name    = (request.data.get('branch_name')   or '').strip()
        industry       = (request.data.get('industry')      or 'corporate').strip()
        estimated_time = int(request.data.get('estimated_time') or 15)
        notes          = request.data.get('notes', '')

        # Resolve or auto-create branch/service so the app works without manual admin setup
        if not branch_id and branch_name:
            br = Branch.objects.filter(name__iexact=branch_name).first()
            if not br:
                business, _ = Business.objects.get_or_create(
                    name=branch_name,
                    defaults={'industry': industry, 'status': 'active'},
                )
                br = Branch.objects.create(name=branch_name, business=business)
            branch_id = br.pk

        if not service_id and service_name and branch_id:
            svc = Service.objects.filter(name__iexact=service_name, branch_id=branch_id).first()
            if not svc:
                # Fall back to any matching service name across branches
                svc = Service.objects.filter(name__iexact=service_name).first()
            if not svc:
                business = Branch.objects.get(pk=branch_id).business
                svc = Service.objects.create(
                    name=service_name,
                    business=business,
                    branch_id=branch_id,
                    industry=industry,
                    estimated_time=estimated_time,
                )
            service_id = svc.pk

        if not service_id or not branch_id:
            return Response(
                {'detail': 'Could not resolve service or branch.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Idempotent: only prevent duplicate if a WAITING ticket already exists.
        # Called/serving tickets no longer block — the customer is at the counter.
        same_existing = QueueTicket.objects.filter(
            customer=request.user,
            service_id=service_id,
            branch_id=branch_id,
            status='waiting',
        ).first()
        if same_existing:
            return Response(QueueTicketSerializer(same_existing).data, status=status.HTTP_200_OK)

        ticket = QueueTicket.objects.create(
            customer=request.user,
            service_id=service_id,
            branch_id=branch_id,
            notes=notes,
        )
        notify_staff('queue', 'New Customer in Queue',
                     f'{request.user.full_name} joined the queue for {ticket.service.name}',
                     service_id=ticket.service_id)
        return Response(QueueTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)


class MyTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Active ticket first
        ticket = QueueTicket.objects.filter(
            customer=request.user,
            status__in=['waiting', 'called', 'serving'],
        ).order_by('-issued_at').first()

        if not ticket:
            # Fall back: show a recently completed ticket for up to 10 minutes
            # so the home screen can display the "Completed" status to the customer.
            cutoff = timezone.now() - timedelta(minutes=10)
            ticket = QueueTicket.objects.filter(
                customer=request.user,
                status='completed',
                completed_at__gte=cutoff,
            ).order_by('-completed_at').first()

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

        # Auto-expire any previously 'called' tickets at this branch that timed out (>5 min)
        expired_cutoff = timezone.now() - timedelta(minutes=5)
        timed_out = QueueTicket.objects.filter(
            branch=ticket.branch,
            status='called',
            called_at__lt=expired_cutoff,
        ).select_related('service', 'customer')
        for t in timed_out:
            t.status = 'missed'
            t.save()
            create_notification(
                t.customer, 'warning', 'You Missed Your Turn',
                f'Your ticket {t.ticket_number} expired — you did not respond within 5 minutes.'
            )

        ticket.status    = 'called'
        ticket.called_at = timezone.now()
        ticket.served_by = request.user
        ticket.save()
        create_notification(
            ticket.customer, 'queue', "It's Your Turn!",
            f'Ticket {ticket.ticket_number} — please proceed to the counter for {ticket.service.name} now.'
        )
        return Response(QueueTicketSerializer(ticket).data)


class CompleteTicketView(APIView):
    permission_classes = [IsStaffOrAbove]

    def post(self, request, pk):
        try:
            ticket = QueueTicket.objects.get(pk=pk, status__in=['called', 'serving'])
        except QueueTicket.DoesNotExist:
            return Response({'detail': 'Ticket not found or not active.'}, status=status.HTTP_404_NOT_FOUND)
        ticket.status       = 'completed'
        ticket.completed_at = timezone.now()
        ticket.save()
        create_notification(ticket.customer, 'success', 'Service Completed',
                            f'Your service for {ticket.service.name} has been completed. Thank you!')
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
        today  = timezone.now().date()
        branch = request.query_params.get('branch')
        qs     = QueueTicket.objects.all()

        if branch:
            qs = qs.filter(branch_id=branch)

        # Staff only see stats for their own assigned branch + services
        if request.user.role == 'staff':
            if request.user.assigned_branch_id:
                qs = qs.filter(branch_id=request.user.assigned_branch_id)
            assigned_ids = list(request.user.assigned_services.values_list('id', flat=True))
            if assigned_ids:
                qs = qs.filter(service_id__in=assigned_ids)

        waiting = qs.filter(status='waiting').count()

        if request.user.role == 'staff':
            # For staff: count only what this person personally called/completed
            serving   = qs.filter(status__in=['called', 'serving'], served_by=request.user).count()
            completed = qs.filter(
                status='completed',
                served_by=request.user,
                completed_at__date=today,
            ).count()
        else:
            # For admin/superadmin: global counts across all staff
            serving   = qs.filter(status__in=['called', 'serving']).count()
            completed = qs.filter(status='completed', completed_at__date=today).count()

        # Avg wait: based on waiting tickets for this staff's service(s) only
        waiting_tickets = qs.filter(status='waiting').select_related('service')
        avg_wait = 0
        if waiting_tickets.exists():
            total_wait = sum(
                t.service.estimated_time * t.position
                for t in waiting_tickets
            )
            avg_wait = total_wait // waiting_tickets.count()

        return Response({
            'waiting':   waiting,
            'serving':   serving,
            'completed': completed,
            'avg_wait':  avg_wait,
        })


class CheckTicketView(APIView):
    """Customer: check if they already have an active ticket for a specific service+branch."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        service_name = request.query_params.get('service_name', '').strip()
        branch_name  = request.query_params.get('branch_name', '').strip()
        if not service_name or not branch_name:
            return Response(
                {'detail': 'service_name and branch_name are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Only block re-joining while the ticket is still waiting (not yet called).
        # Once called, the customer is at the counter and can queue again.
        ticket = QueueTicket.objects.filter(
            customer=request.user,
            service__name__iexact=service_name,
            branch__name__iexact=branch_name,
            status='waiting',
        ).select_related('service', 'branch').first()
        if not ticket:
            return Response({'detail': 'No active ticket.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(QueueTicketSerializer(ticket).data)


class TicketDetailView(APIView):
    """Fetch a specific ticket by ID (customer sees only their own)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            ticket = QueueTicket.objects.select_related('service', 'branch', 'customer').get(pk=pk)
        except QueueTicket.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if ticket.customer != request.user and request.user.role not in ('staff', 'admin', 'super_admin'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(QueueTicketSerializer(ticket).data)


class MyTicketsView(APIView):
    """Return all active tickets for the current user (multiple services allowed)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tickets = QueueTicket.objects.filter(
            customer=request.user,
            status__in=['waiting', 'called', 'serving'],
        ).select_related('service', 'branch').order_by('-issued_at')
        return Response(QueueTicketSerializer(tickets, many=True).data)


class MyTicketHistoryView(APIView):
    """Return all non-waiting tickets for the customer (history)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tickets = QueueTicket.objects.filter(
            customer=request.user,
            status__in=['called', 'serving', 'completed', 'cancelled', 'missed'],
        ).select_related('service', 'branch').order_by('-issued_at')[:50]
        return Response(QueueTicketSerializer(tickets, many=True).data)


class BranchQueueCountsView(APIView):
    """Return real waiting ticket counts per branch, optionally filtered by service name."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        service_name = request.query_params.get('service_name', '').strip()
        qs = QueueTicket.objects.filter(
            status__in=['waiting', 'serving'],
        ).select_related('branch', 'service')
        if service_name:
            qs = qs.filter(service__name__iexact=service_name)
        counts = {}
        for ticket in qs:
            if ticket.branch:
                name = ticket.branch.name
                counts[name] = counts.get(name, 0) + 1
        return Response([{'branch_name': k, 'queue_count': v} for k, v in counts.items()])


class QueueRuleListCreateView(generics.ListCreateAPIView):
    serializer_class   = QueueRuleSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    queryset           = QueueRule.objects.select_related('branch')


class QueueRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = QueueRuleSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    queryset           = QueueRule.objects.all()
