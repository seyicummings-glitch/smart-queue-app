from rest_framework import generics, filters
from .models import Branch
from .serializers import BranchSerializer
from accounts.permissions import IsAdminOrSuperAdmin, IsStaffOrAbove


class BranchListCreateView(generics.ListCreateAPIView):
    serializer_class   = BranchSerializer
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['name', 'business__name']

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsStaffOrAbove()]
        return [IsAdminOrSuperAdmin()]

    def get_queryset(self):
        user = self.request.user
        qs   = Branch.objects.select_related('business')
        business_id = self.request.query_params.get('business')
        if business_id:
            qs = qs.filter(business_id=business_id)
        elif user.role == 'admin' and user.business:
            qs = qs.filter(business=user.business)
        return qs


class BranchDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = BranchSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    queryset           = Branch.objects.all()
