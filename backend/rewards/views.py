from django.db.models import Sum
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from core.permissions import IsAdmin
from .models import RewardConfig, RewardLedger
from .serializers import (
    LeaderboardEntrySerializer,
    RewardConfigSerializer,
    RewardLedgerSerializer,
    UserPointsSummarySerializer,
)


class RewardConfigViewSet(viewsets.ModelViewSet):
    queryset = RewardConfig.objects.all()
    serializer_class = RewardConfigSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdmin()]


class MyRewardsView(APIView):
    """Returns authenticated user's total points and recent ledger entries."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ledger_entries = RewardLedger.objects.filter(user=request.user)
        total = ledger_entries.aggregate(total=Sum('points'))['total'] or 0
        recent = ledger_entries[:20]

        data = {
            'total_points': total,
            'recent_entries': RewardLedgerSerializer(recent, many=True).data,
        }
        return Response(data)


class LeaderboardView(APIView):
    """Public/Authenticated community points leaderboard."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        top_users = (
            RewardLedger.objects.values('user__id', 'user__display_name')
            .annotate(total_points=Sum('points'))
            .order_by('-total_points')[:25]
        )
        results = [
            {
                'user_id': u['user__id'],
                'display_name': u['user__display_name'] or 'Anonymous Citizen',
                'total_points': u['total_points'],
            }
            for u in top_users
        ]
        return Response(results)
