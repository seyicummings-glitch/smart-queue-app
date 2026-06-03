from django.db.models import Q
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import Business, BusinessRequest, IndustryControl, Industry, IndustryBranch, INDUSTRY_KEYS
from .serializers import (
    BusinessSerializer, BusinessRequestSerializer,
    IndustryControlSerializer, IndustrySerializer, IndustryBranchSerializer,
)
from accounts.permissions import IsAdminOrSuperAdmin, IsSuperAdmin
from notifications.utils import create_notification


# ─── Businesses ───────────────────────────────────────────────────────────────

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


# ─── Business Industries (multi-industry assignment) ──────────────────────────

class BusinessIndustriesView(APIView):
    """Super admin: get or replace the full set of industries for a business."""
    permission_classes = [IsSuperAdmin]

    def get(self, request, pk):
        try:
            biz = Business.objects.get(pk=pk)
        except Business.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(IndustrySerializer(biz.industries.all(), many=True).data)

    def put(self, request, pk):
        return self.post(request, pk)

    def post(self, request, pk):
        try:
            biz = Business.objects.get(pk=pk)
        except Business.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        ids = request.data.get('industry_ids', [])
        if not isinstance(ids, list):
            return Response({'detail': 'industry_ids must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

        industries = Industry.objects.filter(pk__in=ids)
        biz.industries.set(industries)
        return Response(IndustrySerializer(biz.industries.all(), many=True).data)


# ─── Email helpers ────────────────────────────────────────────────────────────

def _send_request_email(req, approved: bool):
    if not req.email:
        return
    app_name = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Smart Queue Management System')
    if approved:
        subject = f'Business Registration Approved — {req.business_name}'
        body = (
            f'Dear {req.contact_name},\n\n'
            f'Great news! Your business registration for "{req.business_name}" has been approved.\n\n'
            f'Your business is now active on the Smart Queue Management System. '
            f'Customers can now find and use your services through the app.\n\n'
            f'If you have any questions, please reach out to our support team.\n\n'
            f'Best regards,\nSmart Queue Management System'
        )
    else:
        subject = f'Business Registration Update — {req.business_name}'
        body = (
            f'Dear {req.contact_name},\n\n'
            f'Thank you for your interest in the Smart Queue Management System.\n\n'
            f'Unfortunately, we are unable to approve the registration for "{req.business_name}" at this time.\n\n'
            f'If you believe this is an error or would like to provide more information, '
            f'please contact our support team.\n\n'
            f'Best regards,\nSmart Queue Management System'
        )
    try:
        send_mail(subject, body, None, [req.email], fail_silently=True)
    except Exception:
        pass


# ─── Business Requests ────────────────────────────────────────────────────────

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

        biz, _ = Business.objects.get_or_create(
            name=req.business_name,
            defaults={
                'industry': req.industry if req.industry in INDUSTRY_KEYS else '',
                'email':    req.email,
                'phone':    req.phone,
                'status':   'active',
            },
        )

        # Try to link the requested industry to the business via the M2M too
        try:
            ind = Industry.objects.get(key=req.industry)
            biz.industries.add(ind)
        except Industry.DoesNotExist:
            pass

        _send_request_email(req, approved=True)

        # In-app notification for the customer if they have an account
        try:
            from accounts.models import User
            customer = User.objects.filter(email=req.email).first()
            if customer:
                create_notification(
                    customer,
                    'success',
                    'Business Registration Approved!',
                    f'Great news! Your business "{req.business_name}" has been approved and is now '
                    f'active on the Smart Queue Management System.',
                )
        except Exception:
            pass

        data = BusinessRequestSerializer(req).data
        data['business_id'] = biz.id
        return Response(data)


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
        _send_request_email(req, approved=False)

        # In-app notification for the customer if they have an account
        try:
            from accounts.models import User
            customer = User.objects.filter(email=req.email).first()
            if customer:
                create_notification(
                    customer,
                    'alert',
                    'Business Registration Update',
                    f'Your registration request for "{req.business_name}" could not be approved at this time. '
                    f'Please contact support for more information.',
                )
        except Exception:
            pass

        return Response(BusinessRequestSerializer(req).data)


# ─── Industry CRUD ────────────────────────────────────────────────────────────

class IndustryListCreateView(APIView):
    """Super admin: list all dynamic industries; POST to add a new one."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        industries = Industry.objects.all()
        return Response(IndustrySerializer(industries, many=True).data)

    def post(self, request):
        ser = IndustrySerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        industry = ser.save()
        return Response(IndustrySerializer(industry).data, status=status.HTTP_201_CREATED)


class IndustryDetailView(APIView):
    """Super admin: update or delete a single industry."""
    permission_classes = [IsSuperAdmin]

    def _get(self, pk):
        try:
            return Industry.objects.get(pk=pk)
        except Industry.DoesNotExist:
            return None

    def patch(self, request, pk):
        industry = self._get(pk)
        if not industry:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        ser = IndustrySerializer(industry, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        industry = ser.save()
        return Response(IndustrySerializer(industry).data)

    def delete(self, request, pk):
        industry = self._get(pk)
        if not industry:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if industry.is_builtin:
            return Response({'detail': 'Built-in industries cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        industry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Industry Branches ────────────────────────────────────────────────────────

class IndustryBranchListCreateView(APIView):
    """Super admin: list branches for an industry; POST to add one."""
    permission_classes = [IsSuperAdmin]

    def _industry(self, pk):
        try:
            return Industry.objects.get(pk=pk)
        except Industry.DoesNotExist:
            return None

    def get(self, request, pk):
        industry = self._industry(pk)
        if not industry:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(IndustryBranchSerializer(industry.branches.all(), many=True).data)

    def post(self, request, pk):
        industry = self._industry(pk)
        if not industry:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        data = {**request.data, 'industry': industry.pk}
        ser  = IndustryBranchSerializer(data=data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        branch = ser.save(industry=industry)
        return Response(IndustryBranchSerializer(branch).data, status=status.HTTP_201_CREATED)


class IndustryBranchDetailView(APIView):
    """Super admin: delete a branch from an industry."""
    permission_classes = [IsSuperAdmin]

    def delete(self, request, pk, branch_pk):
        try:
            branch = IndustryBranch.objects.get(pk=branch_pk, industry_id=pk)
        except IndustryBranch.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        branch.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Legacy Industry Controls (kept for backward compat) ──────────────────────

class IndustryControlListView(APIView):
    """Super admin: list all industries with their visibility status."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        for key in INDUSTRY_KEYS:
            IndustryControl.objects.get_or_create(industry=key, defaults={'is_visible': True})
        controls = IndustryControl.objects.all()
        return Response(IndustryControlSerializer(controls, many=True).data)


class IndustryControlToggleView(APIView):
    """Super admin: toggle a single legacy industry's visibility on/off."""
    permission_classes = [IsSuperAdmin]

    def patch(self, request, industry):
        if industry not in INDUSTRY_KEYS:
            return Response({'detail': 'Unknown industry.'}, status=status.HTTP_400_BAD_REQUEST)
        ctrl, _ = IndustryControl.objects.get_or_create(
            industry=industry,
            defaults={'is_visible': True},
        )
        new_val = request.data.get('is_visible')
        ctrl.is_visible = new_val if isinstance(new_val, bool) else (not ctrl.is_visible)
        ctrl.save()

        # Mirror toggle to the Industry model as well
        try:
            ind = Industry.objects.get(key=industry)
            ind.is_visible = ctrl.is_visible
            ind.save(update_fields=['is_visible'])
        except Industry.DoesNotExist:
            pass

        return Response(IndustryControlSerializer(ctrl).data)


# ─── Customer-facing ──────────────────────────────────────────────────────────

class VisibleIndustriesView(APIView):
    """Customer-facing: returns only industries the super admin has enabled. No login required."""
    permission_classes = [AllowAny]

    def get(self, request):
        industries = Industry.objects.filter(is_visible=True).order_by('label')
        return Response([
            {
                'id':    ind.key,
                'key':   ind.key,
                'label': ind.label,
                'icon':  ind.icon,
                'color': ind.color,
            }
            for ind in industries
        ])


class DirectoryView(APIView):
    """Customer-facing directory: active businesses with branches, services, and live queue counts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from branches.models import Branch
        from services.models import Service
        from queues.models import QueueTicket
        from django.db.models import Count, Q as DQ

        industry = request.query_params.get('industry', '').strip()

        # Fetch everything in as few queries as possible
        businesses = (
            Business.objects
            .filter(status='active')
            .prefetch_related(
                'branch_set',
            )
            .order_by('name')
        )
        if industry:
            businesses = businesses.filter(
                Q(industry=industry) | Q(industries__key=industry)
            ).distinct()

        # Pre-fetch all active branches for these businesses in one query
        biz_ids = list(businesses.values_list('id', flat=True))

        branches_qs = (
            Branch.objects
            .filter(business_id__in=biz_ids, is_active=True)
            .prefetch_related('service_set')
            .order_by('name')
        )

        # Queue counts in one aggregation query
        queue_counts = {
            row['branch_id']: row['cnt']
            for row in QueueTicket.objects
            .filter(branch_id__in=branches_qs.values('id'), status__in=['waiting', 'serving'])
            .values('branch_id')
            .annotate(cnt=Count('id'))
        }

        # Services in one query keyed by business_id
        services_qs = (
            Service.objects
            .filter(business_id__in=biz_ids, is_active=True)
            .order_by('name')
        )
        # Group: (business_id, branch_id|None) → list of services
        from collections import defaultdict
        svc_map = defaultdict(list)
        for svc in services_qs:
            svc_map[(svc.business_id, svc.branch_id)].append(svc)
            if svc.branch_id is not None:
                svc_map[(svc.business_id, None)].append(svc)

        branch_map = defaultdict(list)
        for branch in branches_qs:
            branch_map[branch.business_id].append(branch)

        result = []
        for biz in businesses:
            branches_data = []
            for branch in branch_map[biz.id]:
                branch_svcs = svc_map.get((biz.id, branch.id), [])
                branches_data.append({
                    'id':          branch.id,
                    'name':        branch.name,
                    'address':     branch.address or '',
                    'phone':       branch.phone or '',
                    'queue_count': queue_counts.get(branch.id, 0),
                    'services': [
                        {'id': s.id, 'name': s.name, 'estimated_time': s.estimated_time}
                        for s in branch_svcs
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
