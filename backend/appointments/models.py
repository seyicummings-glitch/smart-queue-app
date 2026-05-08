from django.db import models


class Appointment(models.Model):
    STATUS = [
        ('scheduled', 'Scheduled'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    ticket_number    = models.CharField(max_length=20, blank=True)
    customer         = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='appointments',
    )
    service          = models.ForeignKey(
        'services.Service',
        on_delete=models.CASCADE,
        related_name='appointments',
    )
    branch           = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        related_name='appointments',
    )
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    status           = models.CharField(max_length=20, choices=STATUS, default='scheduled')
    notes            = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-appointment_date', '-appointment_time']

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            count = Appointment.objects.count() + 1
            svc   = (self.service.name[:3] if self.service_id else 'APT').upper()
            self.ticket_number = f'{svc}-{str(count).zfill(3)}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.ticket_number} — {self.customer.full_name} on {self.appointment_date}'
