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
    # FK fields kept for future use but nullable so bookings work without pre-seeded data
    service          = models.ForeignKey(
        'services.Service',
        on_delete=models.SET_NULL,
        related_name='appointments',
        null=True, blank=True,
    )
    branch           = models.ForeignKey(
        'branches.Branch',
        on_delete=models.SET_NULL,
        related_name='appointments',
        null=True, blank=True,
    )
    # Text fallbacks used when FK records don't exist
    service_name_text = models.CharField(max_length=200, blank=True)
    branch_name_text  = models.CharField(max_length=200, blank=True)

    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    status           = models.CharField(max_length=20, choices=STATUS, default='scheduled')
    notes            = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-appointment_date', '-appointment_time']

    @property
    def display_service(self):
        if self.service_id and self.service:
            return self.service.name
        return self.service_name_text or ''

    @property
    def display_branch(self):
        if self.branch_id and self.branch:
            return self.branch.name
        return self.branch_name_text or ''

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            count = Appointment.objects.count() + 1
            svc   = (self.display_service[:3] if self.display_service else 'APT').upper()
            self.ticket_number = f'{svc}-{str(count).zfill(3)}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.ticket_number} — {self.customer.full_name} on {self.appointment_date}'
