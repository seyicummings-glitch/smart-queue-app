from django.db.models import Q
from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import Business, BusinessRequest, IndustryControl, INDUSTRY_KEYS
from .serializers import BusinessSerializer, BusinessRequestSerializer, IndustryControlSerializer
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

        # Create the Business record so it appears in All Businesses immediately.
        # get_or_create prevents duplicates if approved more than once.
        Business.objects.get_or_create(
            name=req.business_name,
            defaults={
                'industry': req.industry,
                'email':    req.email,
                'phone':    req.phone,
                'status':   'active',
            },
        )

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


class IndustryControlListView(APIView):
    """Super admin: list all industries with their visibility status."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        # Ensure all 6 industries have a control row
        for key in INDUSTRY_KEYS:
            IndustryControl.objects.get_or_create(industry=key, defaults={'is_visible': True})
        controls = IndustryControl.objects.all()
        return Response(IndustryControlSerializer(controls, many=True).data)


class IndustryControlToggleView(APIView):
    """Super admin: toggle a single industry's visibility on/off."""
    permission_classes = [IsSuperAdmin]

    def patch(self, request, industry):
        if industry not in INDUSTRY_KEYS:
            return Response({'detail': 'Unknown industry.'}, status=status.HTTP_400_BAD_REQUEST)
        ctrl, _ = IndustryControl.objects.get_or_create(
            industry=industry,
            defaults={'is_visible': True},
        )
        # Accept explicit value or just flip
        new_val = request.data.get('is_visible')
        ctrl.is_visible = new_val if isinstance(new_val, bool) else (not ctrl.is_visible)
        ctrl.save()
        return Response(IndustryControlSerializer(ctrl).data)


class VisibleIndustriesView(APIView):
    """Customer-facing: returns only industries the super admin has enabled."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Ensure rows exist
        for key in INDUSTRY_KEYS:
            IndustryControl.objects.get_or_create(industry=key, defaults={'is_visible': True})

        LABELS = {
            'banking':    'Banking',
            'healthcare': 'Healthcare',
            'retail':     'Retail',
            'government': 'Government',
            'education':  'Education',
            'corporate':  'Corporate',
        }
        visible = IndustryControl.objects.filter(is_visible=True).values_list('industry', flat=True)
        return Response([
            {'id': k, 'label': LABELS[k]}
            for k in INDUSTRY_KEYS if k in visible
        ])


class DirectoryView(APIView):
    """Customer-facing directory: active businesses with branches, services, and live queue counts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from branches.models import Branch
        from services.models import Service
        from queues.models import QueueTicket

        industry = request.query_params.get('industry', '').strip()
        businesses = Business.objects.filter(status='active')
        if industry:
            businesses = businesses.filter(industry=industry)

        result = []
        for biz in businesses.order_by('name'):
            branches = Branch.objects.filter(business=biz, is_active=True).order_by('name')
            branches_data = []
            for branch in branches:
                services = Service.objects.filter(
                    business=biz,
                    is_active=True,
                ).filter(
                    Q(branch=branch) | Q(branch__isnull=True)
                ).order_by('name')

                queue_count = QueueTicket.objects.filter(
                    branch=branch,
                    status__in=['waiting', 'serving'],
                ).count()

                branches_data.append({
                    'id':          branch.id,
                    'name':        branch.name,
                    'address':     branch.address or '',
                    'phone':       branch.phone or '',
                    'queue_count': queue_count,
                    'services': [
                        {
                            'id':             svc.id,
                            'name':           svc.name,
                            'estimated_time': svc.estimated_time,
                        }
                        for svc in services
                    ],
                })

            result.append({
                'id':           biz.id,
                'name':         biz.name,
                'industry':     biz.industry,
                'address':      biz.address or '',
                'phone':        biz.phone or '',
                'branch_count': len(branches_data),
                'branches':     branches_data,
            })

        return Response(result)
