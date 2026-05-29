import random
import os
import json
import urllib.request
import base64
from django.conf import settings
from rest_framework import status, generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, EmailOTP
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer, EmployeeSerializer
from .permissions import IsAdminOrSuperAdmin


def get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access':  str(refresh.access_token),
    }


def _mailjet_send(to_email, to_name, subject, body):
    api_key    = os.environ.get('MAILJET_API_KEY', '')
    secret_key = os.environ.get('MAILJET_SECRET_KEY', '')
    from_raw   = getattr(settings, 'DEFAULT_FROM_EMAIL', 'SQMS <noreply@sqms.com>')

    if not api_key or not secret_key:
        print(f"[EMAIL] To:{to_email} | {subject}\n{body}")
        return

    if '<' in from_raw:
        from_name = from_raw.split('<')[0].strip()
        from_addr = from_raw.split('<')[1].rstrip('>')
    else:
        from_name, from_addr = 'SQMS', from_raw

    payload = json.dumps({
        "Messages": [{
            "From": {"Email": from_addr, "Name": from_name},
            "To":   [{"Email": to_email,  "Name": to_name}],
            "Subject":  subject,
            "TextPart": body,
        }]
    }).encode()

    creds = base64.b64encode(f"{api_key}:{secret_key}".encode()).decode()
    req = urllib.request.Request(
        'https://api.mailjet.com/v3.1/send',
        data=payload,
        headers={'Content-Type': 'application/json', 'Authorization': f'Basic {creds}'},
        method='POST',
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        pass


def _send_otp_email(user):
    otp = str(random.randint(100000, 999999))
    EmailOTP.objects.create(user=user, otp=otp)
    _mailjet_send(
        to_email=user.email,
        to_name=user.full_name,
        subject='Your Smart Queue Management System Email Verification Code',
        body=(
            f'Hi {user.full_name},\n\n'
            f'Your verification code is:\n\n'
            f'  {otp}\n\n'
            f'Enter this code in the app within 10 minutes.\n\n'
            f'If you did not create an SQMS account, ignore this email.'
        ),
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user   = serializer.save()
            _send_otp_email(user)
            tokens = get_tokens(user)
            return Response({
                'user':   UserSerializer(user).data,
                'tokens': tokens,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user   = serializer.validated_data['user']
            tokens = get_tokens(user)
            return Response({
                'user':   UserSerializer(user).data,
                'tokens': tokens,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    def post(self, request):
        try:
            token = RefreshToken(request.data['refresh'])
            token.blacklist()
            return Response({'detail': 'Logged out.'})
        except Exception:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    def post(self, request):
        otp = request.data.get('otp', '').strip()
        if not otp:
            return Response({'detail': 'OTP is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            record = EmailOTP.objects.filter(
                user=request.user, otp=otp, is_used=False,
            ).latest('created_at')
        except EmailOTP.DoesNotExist:
            return Response({'detail': 'Invalid code. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

        if not record.is_valid():
            return Response({'detail': 'Code expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        record.user.email_verified = True
        record.user.save(update_fields=['email_verified'])
        record.is_used = True
        record.save(update_fields=['is_used'])
        return Response({'detail': 'Email verified successfully.'})


class ResendOTPView(APIView):
    def post(self, request):
        if request.user.email_verified:
            return Response({'detail': 'Email already verified.'})
        _send_otp_email(request.user)
        return Response({'detail': 'A new verification code has been sent to your email.'})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal whether the email exists
            return Response({'detail': 'If this email is registered, a reset code has been sent.'})

        otp = str(random.randint(100000, 999999))
        EmailOTP.objects.create(user=user, otp=otp)

        _mailjet_send(
            to_email=user.email,
            to_name=user.full_name,
            subject='Password Reset Code — Smart Queue Management System',
            body=(
                f'Hi {user.full_name},\n\n'
                f'Your password reset code is:\n\n'
                f'  {otp}\n\n'
                f'Enter this code in the app within 10 minutes.\n\n'
                f'If you did not request a reset, ignore this email.'
            ),
        )
        return Response({'detail': 'If this email is registered, a reset code has been sent.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email        = request.data.get('email', '').strip()
        otp          = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '').strip()

        if not email or not otp or not new_password:
            return Response({'detail': 'Email, code, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({'detail': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid code. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            record = EmailOTP.objects.filter(user=user, otp=otp, is_used=False).latest('created_at')
        except EmailOTP.DoesNotExist:
            return Response({'detail': 'Invalid code. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

        if not record.is_valid():
            return Response({'detail': 'Code expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        record.is_used = True
        record.save(update_fields=['is_used'])

        return Response({'detail': 'Password reset successfully. You can now sign in.'})


class MyCounterView(APIView):
    """Returns the calling staff member's counter number and assigned services."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        services = list(user.assigned_services.all().values('id', 'name'))
        return Response({
            'counter_number':       user.counter_number,
            'assigned_services':    services,
            'assigned_branch_id':   user.assigned_branch_id,
            'assigned_branch_name': user.assigned_branch.name if user.assigned_branch else None,
        })


class EmployeeListCreateView(generics.ListCreateAPIView):
    serializer_class   = EmployeeSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['full_name', 'email', 'role']

    def get_queryset(self):
        user = self.request.user
        qs   = User.objects.exclude(role='customer').order_by('-created_at')
        if user.role == 'admin':
            qs = qs.filter(business=user.business)
        return qs

    def post(self, request, *args, **kwargs):
        email = (request.data.get('email') or '').strip().lower()
        existing = User.objects.filter(email__iexact=email).first()
        if existing:
            # User exists — promote role/counter/services but NEVER touch their password
            data = {k: v for k, v in request.data.items() if k != 'password'}
            serializer = EmployeeSerializer(existing, data=data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return super().post(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'admin' and 'business' not in serializer.validated_data:
            serializer.save(business=user.business)
        else:
            serializer.save()


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = EmployeeSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def get_queryset(self):
        user = self.request.user
        qs   = User.objects.exclude(role='customer')
        if user.role == 'admin':
            qs = qs.filter(business=user.business)
        return qs

    def perform_destroy(self, instance):
        from businesses.models import BusinessRequest, Business
        from django.contrib.admin.models import LogEntry

        # Nullify FK references that should stay in the DB
        BusinessRequest.objects.filter(reviewed_by=instance).update(reviewed_by=None)
        Business.objects.filter(owner=instance).update(owner=None)

        # Delete JWT tokens
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
            OutstandingToken.objects.filter(user=instance).delete()
        except Exception:
            pass

        # Delete all personal records
        EmailOTP.objects.filter(user=instance).delete()
        instance.groups.clear()
        instance.user_permissions.clear()
        try:
            LogEntry.objects.filter(user=instance).delete()
        except Exception:
            pass

        instance.delete()


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = request.data.get('current_password', '').strip()
        new_pw  = request.data.get('new_password', '').strip()

        if not current or not new_pw:
            return Response(
                {'detail': 'Both current and new password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(current):
            return Response(
                {'detail': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_pw) < 6:
            return Response(
                {'detail': 'New password must be at least 6 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new_pw)
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password changed successfully.'})


# ── TEMPORARY: emergency direct password reset (no email needed) ──────────────
# Protected by a secret token stored in the EMERGENCY_TOKEN env variable.
# Remove this view once the account is recovered.
class EmergencyResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        secret   = os.environ.get('EMERGENCY_TOKEN', '')
        token    = request.data.get('token', '')
        email    = request.data.get('email', '').strip()
        password = request.data.get('password', '').strip()

        if not secret or token != secret:
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        if not email or not password:
            return Response({'detail': 'Email and password required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        user.set_password(password)
        user.email_verified = True
        user.save(update_fields=['password', 'email_verified'])
        return Response({'detail': 'Password updated. Log in now.'})
