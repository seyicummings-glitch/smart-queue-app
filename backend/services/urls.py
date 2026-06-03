from django.urls import path
from .views import ServiceListCreateView, ServiceDetailView, SeedServicesView

urlpatterns = [
    path('',          ServiceListCreateView.as_view(), name='service-list'),
    path('seed/',     SeedServicesView.as_view(),      name='service-seed'),
    path('<int:pk>/', ServiceDetailView.as_view(),     name='service-detail'),
]
