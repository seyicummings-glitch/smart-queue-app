from django.urls import path
from .views import BranchListCreateView, BranchDetailView, BranchSeedView

urlpatterns = [
    path('',          BranchListCreateView.as_view(), name='branch-list'),
    path('seed/',     BranchSeedView.as_view(),        name='branch-seed'),
    path('<int:pk>/', BranchDetailView.as_view(),     name='branch-detail'),
]
