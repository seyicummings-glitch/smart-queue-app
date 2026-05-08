from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView, MeView,
    VerifyEmailView, ResendOTPView,
    EmployeeListCreateView, EmployeeDetailView,
)

urlpatterns = [
    # Auth
    path('register/',     RegisterView.as_view(),    name='auth-register'),
    path('login/',        LoginView.as_view(),        name='auth-login'),
    path('logout/',       LogoutView.as_view(),       name='auth-logout'),
    path('refresh/',      TokenRefreshView.as_view(), name='token-refresh'),
    path('me/',           MeView.as_view(),           name='auth-me'),
    # Email verification
    path('verify-email/', VerifyEmailView.as_view(),  name='verify-email'),
    path('resend-otp/',   ResendOTPView.as_view(),    name='resend-otp'),
    # Employee management
    path('employees/',           EmployeeListCreateView.as_view(), name='employee-list'),
    path('employees/<int:pk>/',  EmployeeDetailView.as_view(),     name='employee-detail'),
]
