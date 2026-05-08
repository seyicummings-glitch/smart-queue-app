from django.urls import path
from .views import (
    BusinessListCreateView, BusinessDetailView,
    BusinessRequestListCreateView,
    BusinessRequestApproveView, BusinessRequestRejectView,
)

urlpatterns = [
    path('',                         BusinessListCreateView.as_view(),    name='business-list'),
    path('<int:pk>/',                 BusinessDetailView.as_view(),        name='business-detail'),
    path('requests/',                 BusinessRequestListCreateView.as_view(), name='business-request-list'),
    path('requests/<int:pk>/approve/', BusinessRequestApproveView.as_view(),   name='business-request-approve'),
    path('requests/<int:pk>/reject/',  BusinessRequestRejectView.as_view(),    name='business-request-reject'),
]
