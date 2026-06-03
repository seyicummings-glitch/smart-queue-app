from django.db import models


class SupportTicket(models.Model):
    PRIORITY = [
        ('low',      'Low'),
        ('medium',   'Medium'),
        ('high',     'High'),
        ('critical', 'Critical'),
    ]
    STATUS = [
        ('open',        'Open'),
        ('in_progress', 'In Progress'),
        ('resolved',    'Resolved'),
    ]

    customer_name  = models.CharField(max_length=150)
    customer_email = models.EmailField()
    issue          = models.TextField()
    priority       = models.CharField(max_length=20, choices=PRIORITY, default='medium')
    status         = models.CharField(max_length=20, choices=STATUS, default='open')
    assigned_to    = models.ForeignKey(
        'accounts.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_tickets',
    )
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.priority.upper()}] {self.customer_name} — {self.issue[:60]}'


class TicketReply(models.Model):
    ticket     = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='replies')
    author     = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='ticket_replies')
    message    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Reply by {self.author.full_name} on ticket #{self.ticket_id}'
