from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for new user registration."""

    password = serializers.CharField(
        write_only=True, validators=[validate_password], style={'input_type': 'password'},
    )
    password_confirm = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
        style={'input_type': 'password'},
    )

    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'display_name', 'preferred_language']

    def validate_email(self, value):
        val = value.strip().lower()
        if User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return val

    def validate(self, attrs):
        pass_confirm = attrs.pop('password_confirm', None)
        if pass_confirm and attrs.get('password') != pass_confirm:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        email = validated_data['email'].strip().lower()
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password'],
            display_name=validated_data.get('display_name', ''),
            preferred_language=validated_data.get('preferred_language', 'en'),
            role=User.Role.CITIZEN,
        )
        return user


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Allows authenticating using email address or username."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'] = serializers.CharField(required=False)
        self.fields['username'] = serializers.CharField(required=False)

    def validate(self, attrs):
        identifier = attrs.get('email') or attrs.get('username')
        if identifier:
            user = User.objects.filter(email__iexact=identifier).first() or User.objects.filter(username__iexact=identifier).first()
            if user:
                attrs['username'] = user.username
            else:
                attrs['username'] = identifier
        return super().validate(attrs)


class LoginSerializer(serializers.Serializer):
    """Serializer for JWT login (used alongside SimpleJWT)."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    """Read-only serializer for user profile data."""

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'display_name', 'role',
            'preferred_language', 'is_verified', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""

    class Meta:
        model = User
        fields = ['display_name', 'preferred_language']
