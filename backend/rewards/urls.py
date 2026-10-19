from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import LeaderboardView, MyRewardsView, RewardConfigViewSet

app_name = 'rewards'

router = DefaultRouter()
router.register(r'configs', RewardConfigViewSet, basename='reward-config')

urlpatterns = [
    path('my-points/', MyRewardsView.as_view(), name='my-rewards'),
    path('leaderboard/', LeaderboardView.as_view(), name='rewards-leaderboard'),
    path('', include(router.urls)),
]
