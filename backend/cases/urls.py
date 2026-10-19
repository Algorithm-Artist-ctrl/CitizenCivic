from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'cases'

router = DefaultRouter()
router.register('', views.CaseViewSet, basename='case')
router.register('feedback', views.FeedbackViewSet, basename='feedback')

urlpatterns = [
    path('', include(router.urls)),
]
