from django.urls import path
from .views import (
    AppointmentListCreateView, AppointmentDetailView,
    AppointmentConfirmView, AppointmentCancelView, AppointmentCompleteView,
)

urlpatterns = [
    path('',                    AppointmentListCreateView.as_view(), name='appointment-list'),
    path('<int:pk>/',            AppointmentDetailView.as_view(),     name='appointment-detail'),
    path('<int:pk>/confirm/',    AppointmentConfirmView.as_view(),    name='appointment-confirm'),
    path('<int:pk>/cancel/',     AppointmentCancelView.as_view(),     name='appointment-cancel'),
    path('<int:pk>/complete/',   AppointmentCompleteView.as_view(),   name='appointment-complete'),
]
