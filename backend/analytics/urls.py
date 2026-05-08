from django.urls import path
from .views import AnalyticsSummaryView

urlpatterns = [
    path('', AnalyticsSummaryView.as_view(), name='analytics-summary'),
]
