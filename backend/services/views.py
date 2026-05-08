from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from .models import Service
from .serializers import ServiceSerializer
from accounts.permissions import IsAdminOrSuperAdmin


class ServiceListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceSerializer
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['name', 'industry', 'business__name']

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminOrSuperAdmin()]

    def get_queryset(self):
        qs = Service.objects.select_related('business', 'branch').filter(is_active=True)
        industry   = self.request.query_params.get('industry')
        business   = self.request.query_params.get('business')
        branch     = self.request.query_params.get('branch')
        if industry:
            qs = qs.filter(industry=industry)
        if business:
            qs = qs.filter(business_id=business)
        if branch:
            qs = qs.filter(branch_id=branch)
        return qs


class ServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = ServiceSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    queryset           = Service.objects.all()
