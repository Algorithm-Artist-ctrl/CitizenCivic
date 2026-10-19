from rest_framework import viewsets, permissions

from core.permissions import IsAdmin
from .models import ServiceArea, Category
from .serializers import ServiceAreaSerializer, CategorySerializer


class ServiceAreaViewSet(viewsets.ModelViewSet):
    """
    Service areas: read-only for authenticated users, full CRUD for admins.
    """

    queryset = ServiceArea.objects.filter(is_active=True)
    serializer_class = ServiceAreaSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsAdmin()]


class CategoryViewSet(viewsets.ModelViewSet):
    """
    Categories: public read-only, full CRUD for admins.
    """

    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsAdmin()]
