from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/',     include('accounts.urls')),
    path('api/businesses/',   include('businesses.urls')),
    path('api/branches/',     include('branches.urls')),
    path('api/services/',     include('services.urls')),
    path('api/queues/',       include('queues.urls')),
    path('api/appointments/', include('appointments.urls')),
    path('api/analytics/',    include('analytics.urls')),
    path('api/support/',      include('support.urls')),
]
