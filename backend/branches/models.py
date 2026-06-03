from django.db import models


class Branch(models.Model):
    name       = models.CharField(max_length=200)
    business   = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        related_name='branches',
    )
    address    = models.TextField(blank=True)
    phone      = models.CharField(max_length=20, blank=True)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'branches'
        ordering = ['name']

    def __str__(self):
        return f'{self.business.name} — {self.name}'
