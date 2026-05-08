from django.urls import path
from .views import (
    SupportTicketListCreateView, SupportTicketDetailView,
    TicketReplyView, TicketResolveView,
)

urlpatterns = [
    path('',                    SupportTicketListCreateView.as_view(), name='support-list'),
    path('<int:pk>/',            SupportTicketDetailView.as_view(),     name='support-detail'),
    path('<int:pk>/reply/',      TicketReplyView.as_view(),             name='support-reply'),
    path('<int:pk>/resolve/',    TicketResolveView.as_view(),           name='support-resolve'),
]
