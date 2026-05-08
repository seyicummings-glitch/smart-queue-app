from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'super_admin')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLES = [
        ('super_admin', 'Super Admin'),
        ('admin',       'Admin'),
        ('staff',       'Staff'),
        ('customer',    'Customer'),
    ]

    email      = models.EmailField(unique=True)
    full_name  = models.CharField(max_length=150)
    role       = models.CharField(max_length=20, choices=ROLES, default='customer')
    business   = models.ForeignKey(
        'businesses.Business',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='employees',
    )
    phone          = models.CharField(max_length=20, blank=True)
    date_of_birth  = models.DateField(null=True, blank=True)
    is_active      = models.BooleanField(default=True)
    is_staff       = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    created_at     = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    def __str__(self):
        return f'{self.full_name} <{self.email}>'


class EmailOTP(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    otp        = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used    = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        return (
            not self.is_used
            and (timezone.now() - self.created_at).total_seconds() < 600  # 10-min window
        )

    def __str__(self):
        return f'OTP for {self.user.email}'
