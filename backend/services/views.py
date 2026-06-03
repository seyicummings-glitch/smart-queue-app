from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Service
from .serializers import ServiceSerializer
from accounts.permissions import IsAdminOrSuperAdmin


# Default services for every industry — mirrors what customers see in the app
_DEFAULT_SERVICES = {
    'banking': [
        ('Teller Services',    10),
        ('Loan Consultation',  45),
        ('Customer Service',   10),
        ('Account Opening',    30),
        ('Card Services',      20),
    ],
    'healthcare': [
        ('General Practitioner', 30),
        ('Pharmacy Pickup',       5),
        ('Blood Test / Lab',     20),
        ('Dental',               25),
        ('Specialist Consult',   40),
    ],
    'retail': [
        ('Returns & Exchanges', 12),
        ('Customer Service',     8),
        ('Tech Support',        25),
        ('Click & Collect',      5),
    ],
    'government': [
        ('Document Processing',   40),
        ('Permits & Licenses',    35),
        ('General Inquiries',     15),
        ('ID / Passport Renewal', 45),
    ],
    'education': [
        ('Admissions',       20),
        ('Registrar',        15),
        ('Financial Aid',    30),
        ('Library Services',  5),
    ],
    'corporate': [
        ('Reception',    5),
        ('HR Services', 20),
        ('IT Support',  15),
        ('Facilities',  10),
    ],
}


class ServiceListCreateView(generics.ListCreateAPIView):
    serializer_class   = ServiceSerializer
    pagination_class   = None
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['name', 'industry', 'business__name']

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminOrSuperAdmin()]

    def get_queryset(self):
        qs = Service.objects.select_related('business', 'branch').filter(is_active=True)
        industry = self.request.query_params.get('industry')
        business = self.request.query_params.get('business')
        branch   = self.request.query_params.get('branch')
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


class SeedServicesView(APIView):
    """Creates all standard services for every industry if they don't already exist.
    Safe to call multiple times — uses get_or_create so no duplicates are made."""
    permission_classes = [IsAdminOrSuperAdmin]

    def post(self, request):
        from businesses.models import Business

        user = request.user

        # Resolve or create a business for this admin
        business = None
        if user.business_id:
            try:
                business = user.business
            except Exception:
                pass

        if business is None:
            business, _ = Business.objects.get_or_create(
                name='Default Business',
                defaults={'industry': 'corporate', 'status': 'active'},
            )
            user.business = business
            user.save(update_fields=['business'])

        created_count = 0
        for industry, services in _DEFAULT_SERVICES.items():
            for (name, est_time) in services:
                _, was_created = Service.objects.get_or_create(
                    name=name,
                    industry=industry,
                    business=business,
                    defaults={'estimated_time': est_time, 'is_active': True},
                )
                if was_created:
                    created_count += 1

        all_services = Service.objects.filter(is_active=True).order_by('industry', 'name')
        return Response({
            'created': created_count,
            'services': ServiceSerializer(all_services, many=True).data,
        })
