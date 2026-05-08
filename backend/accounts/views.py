import random
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status, generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
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


def _send_otp_email(user):
    otp = str(random.randint(100000, 999999))
    EmailOTP.objects.create(user=user, otp=otp)
    send_mail(
        subject='Your SQMS Email Verification Code',
        message=(
            f'Hi {user.full_name},\n\n'
            f'Your SQMS email verification code is:\n\n'
            f'  {otp}\n\n'
            f'Enter this code in the app within 10 minutes.\n\n'
            f'If you did not create an SQMS account, please ignore this email.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
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
