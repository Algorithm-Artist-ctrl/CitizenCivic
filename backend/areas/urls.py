from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'areas'

router = DefaultRouter()
router.register('service-areas', views.ServiceAreaViewSet, basename='servicearea')
router.register('categories', views.CategoryViewSet, basename='category')

urlpatterns = [
    path('', include(router.urls)),
]
