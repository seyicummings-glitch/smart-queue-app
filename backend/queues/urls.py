from django.urls import path
from .views import (
    QueueListView, JoinQueueView, MyTicketView,
    CallNextView, CompleteTicketView, CancelTicketView,
    QueueStatusView, QueueRuleListCreateView, QueueRuleDetailView,
)

urlpatterns = [
    path('',                   QueueListView.as_view(),         name='queue-list'),
    path('join/',              JoinQueueView.as_view(),          name='queue-join'),
    path('my-ticket/',         MyTicketView.as_view(),           name='queue-my-ticket'),
    path('status/',            QueueStatusView.as_view(),        name='queue-status'),
    path('<int:pk>/call/',     CallNextView.as_view(),           name='queue-call'),
    path('<int:pk>/complete/', CompleteTicketView.as_view(),     name='queue-complete'),
    path('<int:pk>/cancel/',   CancelTicketView.as_view(),       name='queue-cancel'),
    path('rules/',             QueueRuleListCreateView.as_view(), name='queue-rule-list'),
    path('rules/<int:pk>/',    QueueRuleDetailView.as_view(),    name='queue-rule-detail'),
]
