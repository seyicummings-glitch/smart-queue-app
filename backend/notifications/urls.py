from django.urls import path
from .views import (
    NotificationListView, UnreadCountView, MarkAllReadView, MarkReadView, DismissView,
    StaffMessageInboxView, StaffMessageSentView, StaffMessageCreateView,
    StaffMessageMarkReadView, StaffMessageUnreadCountView, StaffMessageReplyView,
    StaffMessageConversationsView,
)

urlpatterns = [
    path('',                NotificationListView.as_view(),      name='notification-list'),
    path('unread-count/',   UnreadCountView.as_view(),           name='notification-unread-count'),
    path('read-all/',       MarkAllReadView.as_view(),           name='notification-read-all'),
    path('<int:pk>/read/',  MarkReadView.as_view(),              name='notification-read'),
    path('<int:pk>/',       DismissView.as_view(),               name='notification-dismiss'),
    # Internal staff/admin messaging
    path('messages/conversations/',  StaffMessageConversationsView.as_view(), name='msg-conversations'),
    path('messages/inbox/',          StaffMessageInboxView.as_view(),      name='msg-inbox'),
    path('messages/sent/',           StaffMessageSentView.as_view(),       name='msg-sent'),
    path('messages/send/',           StaffMessageCreateView.as_view(),     name='msg-send'),
    path('messages/unread-count/',   StaffMessageUnreadCountView.as_view(),name='msg-unread'),
    path('messages/<int:pk>/read/',  StaffMessageMarkReadView.as_view(),   name='msg-read'),
    path('messages/<int:pk>/reply/', StaffMessageReplyView.as_view(),      name='msg-reply'),
]
