from django.db import models


class StaffMessage(models.Model):
    sender         = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='sent_staff_messages')
    sender_name    = models.CharField(max_length=150)
    sender_role    = models.CharField(max_length=20)
    recipient_role = models.CharField(max_length=20)
    subject        = models.CharField(max_length=200)
    body           = models.TextField()
    created_at     = models.DateTimeField(auto_now_add=True)
    read_by        = models.ManyToManyField('accounts.User', blank=True, related_name='read_staff_messages')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.sender_role} → {self.recipient_role}: {self.subject}'


class StaffMessageReply(models.Model):
    message     = models.ForeignKey(StaffMessage, on_delete=models.CASCADE, related_name='replies')
    sender      = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='staff_message_replies')
    sender_name = models.CharField(max_length=150)
    sender_role = models.CharField(max_length=20)
    body        = models.TextField()
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class Notification(models.Model):
    TYPE_CHOICES = [
        ('appointment', 'Appointment'),
        ('queue',       'Queue'),
        ('system',      'System'),
        ('success',     'Success'),
        ('alert',       'Alert'),
    ]
    user       = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='notifications')
    type       = models.CharField(max_length=20, choices=TYPE_CHOICES, default='system')
    title      = models.CharField(max_length=200)
    body       = models.TextField()
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    # Which service this notification is about (set for queue events; null for system/admin messages)
    service    = models.ForeignKey(
        'services.Service',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='notifications',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} → {self.user.email}'
