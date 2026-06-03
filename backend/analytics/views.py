from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Avg, Q
from rest_framework.views import APIView
from rest_framework.response import Response

from queues.models import QueueTicket
from appointments.models import Appointment
from accounts.permissions import IsStaffOrAbove


class AnalyticsSummaryView(APIView):
    permission_classes = [IsStaffOrAbove]

    def get(self, request):
        period  = request.query_params.get('period', 'today')
        now     = timezone.now()

        if period == 'today':
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'week':
            start = now - timedelta(days=7)
        elif period == 'month':
            start = now - timedelta(days=30)
        else:
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        tickets = QueueTicket.objects.filter(issued_at__gte=start)
        appts   = Appointment.objects.filter(created_at__gte=start)

        total_tickets    = tickets.count()
        completed_count  = tickets.filter(status='completed').count()
        cancelled_count  = tickets.filter(status='cancelled').count()

        # Avg wait: for completed tickets, estimate from position × service time
        completed_tickets = tickets.filter(status='completed').select_related('service')
        avg_wait = 0
        if completed_tickets.exists():
            total = sum(t.service.estimated_time for t in completed_tickets)
            avg_wait = total // completed_tickets.count()

        # Daily breakdown for bar chart (last 7 days)
        daily = []
        for i in range(6, -1, -1):
            day   = now - timedelta(days=i)
            day_s = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_e = day_s + timedelta(days=1)
            count = QueueTicket.objects.filter(issued_at__gte=day_s, issued_at__lt=day_e).count()
            daily.append({
                'label': day.strftime('%a'),
                'date':  day.strftime('%Y-%m-%d'),
                'count': count,
            })

        # Service breakdown
        service_breakdown = (
            QueueTicket.objects
            .filter(issued_at__gte=start)
            .values('service__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

        # Appointments summary
        total_appointments = appts.count()
        upcoming_appts     = appts.filter(status__in=['scheduled', 'confirmed']).count()

        return Response({
            'period':             period,
            'total_tickets':      total_tickets,
            'completed':          completed_count,
            'cancelled':          cancelled_count,
            'avg_wait_minutes':   avg_wait,
            'daily_breakdown':    daily,
            'service_breakdown':  list(service_breakdown),
            'total_appointments': total_appointments,
            'upcoming_appointments': upcoming_appts,
        })
