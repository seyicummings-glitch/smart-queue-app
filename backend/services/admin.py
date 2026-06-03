from django.contrib import admin
from .models import Service


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display  = ('name', 'industry', 'business', 'estimated_time', 'is_active')
    list_filter   = ('industry', 'is_active')
    search_fields = ('name', 'business__name')
