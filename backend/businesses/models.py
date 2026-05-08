from django.db import models


INDUSTRY_CHOICES = [
    ('banking',    'Banking'),
    ('healthcare', 'Healthcare'),
    ('retail',     'Retail'),
    ('government', 'Government'),
    ('education',  'Education'),
    ('corporate',  'Corporate'),
]


class Business(models.Model):
    PLANS = [
        ('basic',      'Basic'),
        ('pro',        'Pro'),
        ('enterprise', 'Enterprise'),
    ]
    STATUS = [
        ('active',    'Active'),
        ('inactive',  'Inactive'),
        ('suspended', 'Suspended'),
    ]

    name       = models.CharField(max_length=200)
    industry   = models.CharField(max_length=50, choices=INDUSTRY_CHOICES)
    plan       = models.CharField(max_length=20, choices=PLANS, default='basic')
    status     = models.CharField(max_length=20, choices=STATUS, default='active')
    owner      = models.ForeignKey(
        'accounts.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='owned_businesses',
    )
    address    = models.TextField(blank=True)
    phone      = models.CharField(max_length=20, blank=True)
    email      = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'businesses'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class BusinessRequest(models.Model):
    STATUS = [
        ('pending',  'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    business_name = models.CharField(max_length=200)
    industry      = models.CharField(max_length=50, choices=INDUSTRY_CHOICES)
    contact_name  = models.CharField(max_length=150)
    email         = models.EmailField()
    phone         = models.CharField(max_length=20, blank=True)
    message       = models.TextField(blank=True)
    status        = models.CharField(max_length=20, choices=STATUS, default='pending')
    reviewed_by   = models.ForeignKey(
        'accounts.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_requests',
    )
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.business_name} ({self.status})'
