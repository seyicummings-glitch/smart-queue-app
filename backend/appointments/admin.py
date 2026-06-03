from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display  = ('ticket_number', 'customer', 'service', 'branch', 'appointment_date', 'appointment_time', 'status')
    list_filter   = ('status', 'branch', 'service')
    search_fields = ('ticket_number', 'customer__full_name', 'customer__email')
    ordering      = ('-appointment_date', '-appointment_time')
