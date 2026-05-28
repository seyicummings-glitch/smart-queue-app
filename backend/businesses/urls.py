from django.urls import path
from .views import (
    BusinessListCreateView, BusinessDetailView,
    BusinessIndustriesView,
    BusinessRequestListCreateView,
    BusinessRequestApproveView, BusinessRequestRejectView,
    IndustryListCreateView, IndustryDetailView,
    IndustryBranchListCreateView, IndustryBranchDetailView,
    IndustryControlListView, IndustryControlToggleView,
    VisibleIndustriesView,
    DirectoryView,
)

urlpatterns = [
    # Businesses
    path('',                                  BusinessListCreateView.as_view(),        name='business-list'),
    path('<int:pk>/',                          BusinessDetailView.as_view(),            name='business-detail'),
    path('<int:pk>/industries/',               BusinessIndustriesView.as_view(),        name='business-industries'),
    path('directory/',                         DirectoryView.as_view(),                 name='business-directory'),

    # Business requests
    path('requests/',                          BusinessRequestListCreateView.as_view(), name='business-request-list'),
    path('requests/<int:pk>/approve/',         BusinessRequestApproveView.as_view(),    name='business-request-approve'),
    path('requests/<int:pk>/reject/',          BusinessRequestRejectView.as_view(),     name='business-request-reject'),

    # Dynamic industry management (super admin)
    path('industries/',                        IndustryListCreateView.as_view(),        name='industry-list'),
    path('industries/<int:pk>/',               IndustryDetailView.as_view(),            name='industry-detail'),
    path('industries/<int:pk>/branches/',      IndustryBranchListCreateView.as_view(),  name='industry-branch-list'),
    path('industries/<int:pk>/branches/<int:branch_pk>/', IndustryBranchDetailView.as_view(), name='industry-branch-detail'),

    # Legacy visibility controls (kept for backward compat)
    path('industry-controls/',                 IndustryControlListView.as_view(),       name='industry-control-list'),
    path('industry-controls/<str:industry>/',  IndustryControlToggleView.as_view(),     name='industry-control-toggle'),

    # Customer-facing
    path('visible-industries/',                VisibleIndustriesView.as_view(),         name='visible-industries'),
]
