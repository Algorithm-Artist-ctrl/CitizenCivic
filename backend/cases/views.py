from django.utils import timezone
from rest_framework import viewsets, permissions, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from core.permissions import IsOwnerOrStaff
from .filters import CaseFilter
from .models import Case, Feedback, CaseStatus
from .serializers import (
    CaseListSerializer,
    CaseDetailSerializer,
    CaseCreateSerializer,
    CaseTransitionRequestSerializer,
    CaseEvidenceSerializer,
    CaseObservationSerializer,
    FeedbackSerializer,
)


class CaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for civic cases with role-based filtering and state-machine transitions.
    """

    permission_classes = [permissions.IsAuthenticated, IsOwnerOrStaff]
    filterset_class = CaseFilter
    search_fields = ['case_number', 'description', 'landmark']
    ordering_fields = ['created_at', 'updated_at', 'status']

    def get_serializer_class(self):
        if self.action == 'list':
            return CaseListSerializer
        if self.action == 'create':
            return CaseCreateSerializer
        return CaseDetailSerializer

    def get_queryset(self):
        """RBAC-filtered queryset."""
        user = self.request.user
        qs = Case.objects.select_related(
            'primary_reporter', 'category', 'service_area', 'assigned_operator',
        )

        if user.role == 'CITIZEN':
            return qs.filter(primary_reporter=user)
        elif user.role == 'OPERATOR':
            return qs.filter(assigned_operator=user)
        # MODERATOR, SUPERVISOR, ADMIN see all
        return qs.all()

    def perform_create(self, serializer):
        serializer.save()

    # ── Custom actions ─────────────────────────────────

    @action(detail=True, methods=['post'], url_path='transition')
    def transition(self, request, pk=None):
        """POST /cases/{id}/transition/ — perform a state transition."""
        case = self.get_object()
        ser = CaseTransitionRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            case.transition_to(
                new_status=ser.validated_data['new_status'],
                actor=request.user,
                reason=ser.validated_data.get('reason', ''),
                evidence_refs=ser.validated_data.get('evidence_refs'),
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(CaseDetailSerializer(case, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='evidence',
            parser_classes=[MultiPartParser, FormParser])
    def add_evidence(self, request, pk=None):
        """POST /cases/{id}/evidence/ — upload evidence file."""
        case = self.get_object()
        ser = CaseEvidenceSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        ser.save(
            case=case,
            uploaded_by=request.user,
            content_type=uploaded_file.content_type,
            file_size=uploaded_file.size,
        )
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='observations')
    def add_observation(self, request, pk=None):
        """POST /cases/{id}/observations/ — add a follow-up observation."""
        case = self.get_object()
        ser = CaseObservationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save(case=case, reporter=request.user)
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='feedback')
    def add_feedback(self, request, pk=None):
        """POST /cases/{id}/feedback/ — submit feedback or dispute."""
        case = self.get_object()
        ser = FeedbackSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save(case=case, user=request.user)
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='nearby',
            permission_classes=[permissions.AllowAny])
    def nearby(self, request):
        """GET /cases/nearby/ — privacy-safe list of nearby public civic issues."""
        try:
            lat = float(request.query_params.get('lat', 12.9716))
            lng = float(request.query_params.get('lng', 77.6412))
            radius_deg = float(request.query_params.get('radius_km', 5.0)) / 111.0  # Approx degree conversion
        except ValueError:
            return Response({'detail': 'Invalid latitude/longitude parameters.'}, status=status.HTTP_400_BAD_REQUEST)

        # Public privacy-safe list excludes DRAFT and private reporter contact
        qs = Case.objects.exclude(status=CaseStatus.DRAFT).filter(
            latitude__gte=lat - radius_deg,
            latitude__lte=lat + radius_deg,
            longitude__gte=lng - radius_deg,
            longitude__lte=lng + radius_deg,
        ).select_related('category')[:50]

        data = [
            {
                'id': c.id,
                'case_number': c.case_number,
                'status': c.status,
                'category_name': c.category.name_en,
                'landmark': c.landmark,
                'latitude': c.latitude,
                'longitude': c.longitude,
                'is_hotspot': c.is_hotspot,
                'created_at': c.created_at,
            }
            for c in qs
        ]
        return Response(data)

    @action(detail=False, methods=['get'], url_path='analytics',
            permission_classes=[permissions.IsAuthenticated])
    def analytics(self, request):
        """GET /cases/analytics/ — operations metrics for supervisors and operators."""
        from django.db.models import Avg, F, ExpressionWrapper, DurationField
        total_cases = Case.objects.count()
        by_status = {}
        for s in CaseStatus.values:
            by_status[s] = Case.objects.filter(status=s).count()

        # Acknowledgement and resolution times
        cases_with_ack = Case.objects.filter(acknowledged_at__isnull=False)
        cases_with_res = Case.objects.filter(resolved_at__isnull=False)

        ack_times = [
            (c.acknowledged_at - c.created_at).total_seconds() / 3600.0
            for c in cases_with_ack
        ]
        res_times = [
            (c.resolved_at - c.acknowledged_at).total_seconds() / 3600.0
            for c in cases_with_res if c.acknowledged_at
        ]

        avg_ack_hours = round(sum(ack_times) / len(ack_times), 1) if ack_times else 0.0
        avg_res_hours = round(sum(res_times) / len(res_times), 1) if res_times else 0.0

        resolved_count = by_status.get(CaseStatus.VERIFIED_RESOLVED, 0)
        closed_attempts = (
            resolved_count +
            by_status.get(CaseStatus.UNABLE_TO_RESOLVE, 0) +
            by_status.get(CaseStatus.REJECTED, 0) +
            by_status.get(CaseStatus.IN_PROGRESS, 0)
        )
        verified_resolution_rate = round((resolved_count / closed_attempts * 100), 1) if closed_attempts else 0.0

        hotspots_count = Case.objects.filter(is_hotspot=True).count()
        disputed_count = by_status.get(CaseStatus.DISPUTED_CLOSURE, 0)

        return Response({
            'total_cases': total_cases,
            'by_status': by_status,
            'avg_ack_hours': avg_ack_hours,
            'avg_res_hours': avg_res_hours,
            'verified_resolution_rate': verified_resolution_rate,
            'hotspots_count': hotspots_count,
            'disputed_count': disputed_count,
        })


class FeedbackViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Read-only viewset for feedback."""

    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'CITIZEN':
            return Feedback.objects.filter(user=user)
        return Feedback.objects.all()
