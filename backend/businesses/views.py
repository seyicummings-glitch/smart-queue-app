from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import Business, BusinessRequest
from .serializers import BusinessSerializer, BusinessRequestSerializer
from accounts.permissions import IsAdminOrSuperAdmin, IsSuperAdmin


class BusinessListCreateView(generics.ListCreateAPIView):
    serializer_class   = BusinessSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['name', 'industry']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return Business.objects.all()
        return Business.objects.filter(owner=user)


class BusinessDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = BusinessSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return Business.objects.all()
        return Business.objects.filter(owner=user)


class BusinessRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = BusinessRequestSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsSuperAdmin()]

    def get_queryset(self):
        status_filter = self.request.query_params.get('status')
        qs = BusinessRequest.objects.all()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class BusinessRequestApproveView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        try:
            req = BusinessRequest.objects.get(pk=pk)
        except BusinessRequest.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        req.status      = 'approved'
        req.reviewed_by = request.user
        req.save()
        return Response(BusinessRequestSerializer(req).data)


class BusinessRequestRejectView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        try:
            req = BusinessRequest.objects.get(pk=pk)
        except BusinessRequest.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        req.status      = 'rejected'
        req.reviewed_by = request.user
        req.save()
        return Response(BusinessRequestSerializer(req).data)
