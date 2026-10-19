from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView as SimpleJWTTokenRefreshView,
)

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
    EmailTokenObtainPairSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — register a new citizen account."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'detail': 'Registration successful.',
                'user': UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/ — obtain JWT token pair using email."""

    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class TokenRefreshView(SimpleJWTTokenRefreshView):
    """POST /api/v1/auth/token/refresh/ — refresh JWT access token."""

    permission_classes = [permissions.AllowAny]


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/v1/auth/profile/ — retrieve own profile.
    PATCH /api/v1/auth/profile/ — update display_name / preferred_language.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — blacklist the refresh token (best-effort)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                from rest_framework_simplejwt.tokens import RefreshToken
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass  # blacklist app may not be installed; silently ignore
        return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
