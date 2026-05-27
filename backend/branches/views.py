from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Branch
from .serializers import BranchSerializer
from accounts.permissions import IsAdminOrSuperAdmin, IsStaffOrAbove
from businesses.models import Business

SEED_BRANCHES = {
    'banking': {
        'business': 'Banking & Finance',
        'branches': [
            ('Manhattan Financial Center', '123 Wall St, New York'),
            ('Brooklyn Service Hub',        '456 Atlantic Ave, Brooklyn'),
            ('Queens Branch',               '789 Queens Blvd, Queens'),
        ],
    },
    'healthcare': {
        'business': 'Healthcare',
        'branches': [
            ('Main Hospital — Downtown',  '10 Medical Blvd, Downtown'),
            ('Northside Clinic',          '22 Health Ave, Northside'),
            ('Eastside Medical Center',   '88 Eastside Rd, East'),
        ],
    },
    'retail': {
        'business': 'Retail',
        'branches': [
            ('Flagship Store — Downtown', '1 Retail Plaza, Downtown'),
            ('Mall Branch',               'Level 2, Central Mall'),
            ('Westside Outlet',           '55 West Rd, Westside'),
        ],
    },
    'government': {
        'business': 'Government Services',
        'branches': [
            ('City Hall — Main Office',   '1 Civic Square, Downtown'),
            ('North District Office',     '44 North Ave, Northgate'),
            ('South Service Centre',      '77 South Rd, Southville'),
        ],
    },
    'education': {
        'business': 'Education',
        'branches': [
            ('Main Campus — Admin Block', 'Building A, Main Campus'),
            ('East Campus',               'East Wing, Campus B'),
            ('City Learning Centre',      '12 City Rd, Downtown'),
        ],
    },
    'corporate': {
        'business': 'Corporate Office',
        'branches': [
            ('HQ Tower A — Floor 12', '1 Corporate Blvd, CBD'),
            ('West Office Park',      '33 Business Park, West'),
            ('East Hub',              '88 East Business Park'),
        ],
    },
}


class BranchSeedView(APIView):
    permission_classes = [IsStaffOrAbove]

    def post(self, request):
        for industry, data in SEED_BRANCHES.items():
            biz, _ = Business.objects.get_or_create(
                name=data['business'],
                defaults={'industry': industry, 'status': 'active'},
            )
            for name, address in data['branches']:
                # Look up by name only — never create a duplicate regardless of business
                if not Branch.objects.filter(name__iexact=name).exists():
                    Branch.objects.create(name=name, business=biz, address=address)
        branches = Branch.objects.select_related('business').all()
        return Response(BranchSerializer(branches, many=True).data, status=status.HTTP_200_OK)


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
