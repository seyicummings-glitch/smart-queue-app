from django.urls import path
from .views import (
    BusinessListCreateView, BusinessDetailView,
    BusinessRequestListCreateView,
    BusinessRequestApproveView, BusinessRequestRejectView,
    IndustryControlListView, IndustryControlToggleView,
    VisibleIndustriesView,
    DirectoryView,
)

urlpatterns = [
    path('',                                  BusinessListCreateView.as_view(),        name='business-list'),
    path('<int:pk>/',                          BusinessDetailView.as_view(),            name='business-detail'),
    path('directory/',                         DirectoryView.as_view(),                 name='business-directory'),
    path('requests/',                          BusinessRequestListCreateView.as_view(), name='business-request-list'),
    path('requests/<int:pk>/approve/',         BusinessRequestApproveView.as_view(),    name='business-request-approve'),
    path('requests/<int:pk>/reject/',          BusinessRequestRejectView.as_view(),     name='business-request-reject'),
    path('industry-controls/',                 IndustryControlListView.as_view(),       name='industry-control-list'),
    path('industry-controls/<str:industry>/',  IndustryControlToggleView.as_view(),     name='industry-control-toggle'),
    path('visible-industries/',                VisibleIndustriesView.as_view(),         name='visible-industries'),
]
