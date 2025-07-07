from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User

from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

class DashboardTests(TestCase):

    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client = Client()

    def test_dashboard_view_requires_login(self):
        """Test that dashboard requires authentication"""
        response = self.client.get(reverse('dashboard:principal'))
        # Should redirect to login if not authenticated
        self.assertEqual(response.status_code, 302)

    def test_dashboard_view_with_login(self):
        """Test dashboard view when logged in"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('dashboard:principal'))
        self.assertEqual(response.status_code, 200)

    def test_api_metricas_requires_login(self):
        """Test that API metrics endpoint requires authentication"""
        response = self.client.get(reverse('dashboard:api_metricas'))
        # Should redirect to login or return 403/401
        self.assertIn(response.status_code, [302, 401, 403])

    def tearDown(self):
        # Clean up after tests if necessary
        pass
        pass