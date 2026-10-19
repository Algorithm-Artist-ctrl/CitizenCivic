from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class AuthTestCase(TestCase):
    """Tests for user registration, login, and profile access."""

    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('accounts:register')
        self.login_url = reverse('accounts:login')
        self.profile_url = reverse('accounts:profile')
        self.user_data = {
            'email': 'citizen@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'display_name': 'Test Citizen',
            'preferred_language': 'en',
        }

    def _create_user(self, role='CITIZEN', email='user@example.com'):
        return User.objects.create_user(
            username=email,
            email=email,
            password='StrongPass123!',
            display_name='Test User',
            role=role,
        )

    def _get_token(self, email='user@example.com', password='StrongPass123!'):
        response = self.client.post(self.login_url, {'username': email, 'password': password})
        return response.data.get('access')

    # ---- Registration ----

    def test_register_success(self):
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='citizen@example.com').exists())

    def test_register_without_password_confirm_succeeds(self):
        data = {
            'email': 'noconfirm@example.com',
            'password': 'StrongPass123!',
            'display_name': 'No Confirm User',
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='noconfirm@example.com').exists())

    def test_register_email_case_insensitivity(self):
        data = {
            'email': 'UPPERCASE@EXAMPLE.COM',
            'password': 'StrongPass123!',
            'display_name': 'Upper User',
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='uppercase@example.com').exists())

        # Attempt duplicate with mixed case
        data['email'] = 'UpperCase@example.com'
        response2 = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        self._create_user(email='citizen@example.com')
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch(self):
        data = self.user_data.copy()
        data['password_confirm'] = 'DifferentPass456!'
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ---- Login ----

    def test_login_success(self):
        self._create_user()
        response = self.client.post(self.login_url, {'username': 'user@example.com', 'password': 'StrongPass123!'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_wrong_password(self):
        self._create_user()
        response = self.client.post(self.login_url, {'username': 'user@example.com', 'password': 'WrongPass!'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- Profile ----

    def test_profile_unauthenticated(self):
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_get(self):
        user = self._create_user()
        token = self._get_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], user.email)

    def test_profile_update(self):
        self._create_user()
        token = self._get_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(self.profile_url, {'display_name': 'New Name'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ---- Role-Based Access ----

    def test_user_role_default_citizen(self):
        self.client.post(self.register_url, self.user_data, format='json')
        user = User.objects.get(email='citizen@example.com')
        self.assertEqual(user.role, User.Role.CITIZEN)

    def test_admin_role_assignment(self):
        user = self._create_user(role='ADMIN', email='admin@example.com')
        self.assertEqual(user.role, 'ADMIN')
