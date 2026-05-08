from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Appointment
from .serializers import AppointmentSerializer
from accounts.permissions import IsStaffOrAbove


class AppointmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AppointmentSerializer
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['ticket_number', 'customer__full_name']

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        user    = self.request.user
        is_staff = user.role in ('staff', 'admin', 'super_admin')
        qs = Appointment.objects.select_related('customer', 'service', 'branch')

        if not is_staff:
            qs = qs.filter(customer=user)

        status_filter = self.request.query_params.get('status')
        service       = self.request.query_params.get('service')
        branch        = self.request.query_params.get('branch')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if service:
            qs = qs.filter(service_id=service)
        if branch:
            qs = qs.filter(branch_id=branch)
        return qs

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)


class AppointmentDetailView(generics.RetrieveUpdateAPIView):
    serializer_class   = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user     = self.request.user
        is_staff = user.role in ('staff', 'admin', 'super_admin')
        qs = Appointment.objects.select_related('customer', 'service', 'branch')
        if not is_staff:
            qs = qs.filter(customer=user)
        return qs


class AppointmentConfirmView(APIView):
    permission_classes = [IsStaffOrAbove]

    def post(self, request, pk):
        try:
            appt = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        appt.status = 'confirmed'
        appt.save()
        return Response(AppointmentSerializer(appt).data)


class AppointmentCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            appt = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_owner = appt.customer == request.user
        is_staff  = request.user.role in ('staff', 'admin', 'super_admin')
        if not (is_owner or is_staff):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        appt.status = 'cancelled'
        appt.save()
        return Response(AppointmentSerializer(appt).data)


class AppointmentCompleteView(APIView):
    permission_classes = [IsStaffOrAbove]

    def post(self, request, pk):
        try:
            appt = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        appt.status = 'completed'
        appt.save()
        return Response(AppointmentSerializer(appt).data)
