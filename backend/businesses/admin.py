from django.contrib import admin
from .models import Business, BusinessRequest


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display  = ('name', 'industry', 'plan', 'status', 'created_at')
    list_filter   = ('industry', 'plan', 'status')
    search_fields = ('name', 'email')


@admin.register(BusinessRequest)
class BusinessRequestAdmin(admin.ModelAdmin):
    list_display  = ('business_name', 'industry', 'contact_name', 'status', 'created_at')
    list_filter   = ('status', 'industry')
    search_fields = ('business_name', 'contact_name', 'email')
