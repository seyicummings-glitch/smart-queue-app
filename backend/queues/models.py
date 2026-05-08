from django.db import models
from django.utils import timezone


def generate_ticket_number(service):
    prefix = (service.name[0] if service else 'Q').upper()
    today_count = QueueTicket.objects.filter(
        issued_at__date=timezone.now().date(),
        service=service,
    ).count()
    return f'{prefix}-{str(today_count + 1).zfill(3)}'


class QueueTicket(models.Model):
    STATUS = [
        ('waiting',   'Waiting'),
        ('serving',   'Serving'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    ticket_number = models.CharField(max_length=20)
    customer      = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='tickets',
    )
    service       = models.ForeignKey(
        'services.Service',
        on_delete=models.CASCADE,
        related_name='tickets',
    )
    branch        = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        related_name='tickets',
    )
    status        = models.CharField(max_length=20, choices=STATUS, default='waiting')
    position      = models.PositiveIntegerField(default=0)
    notes         = models.TextField(blank=True)
    issued_at     = models.DateTimeField(auto_now_add=True)
    called_at     = models.DateTimeField(null=True, blank=True)
    completed_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['issued_at']

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            self.ticket_number = generate_ticket_number(self.service)
        if not self.position:
            self.position = QueueTicket.objects.filter(
                branch=self.branch,
                service=self.service,
                status='waiting',
            ).count() + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.ticket_number} — {self.customer.full_name}'


class QueueRule(models.Model):
    branch           = models.OneToOneField(
        'branches.Branch',
        on_delete=models.CASCADE,
        related_name='queue_rule',
    )
    max_capacity     = models.PositiveIntegerField(default=50)
    avg_service_time = models.PositiveIntegerField(default=15, help_text='Minutes per customer')
    priority_rules   = models.JSONField(default=dict, blank=True)
    is_active        = models.BooleanField(default=True)
    updated_at       = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Rules for {self.branch}'
