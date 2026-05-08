from django.db import models
from businesses.models import INDUSTRY_CHOICES


class Service(models.Model):
    name           = models.CharField(max_length=200)
    description    = models.TextField(blank=True)
    estimated_time = models.PositiveIntegerField(help_text='Duration in minutes', default=15)
    industry       = models.CharField(max_length=50, choices=INDUSTRY_CHOICES)
    business       = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        related_name='services',
    )
    branch         = models.ForeignKey(
        'branches.Branch',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='services',
    )
    is_active      = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.industry})'
