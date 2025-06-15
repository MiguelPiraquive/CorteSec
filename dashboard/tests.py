from django.test import TestCase
from .models import YourModel  # Replace with your actual model

class DashboardTests(TestCase):

    def setUp(self):
        # Set up any initial data for your tests here
        pass

    def test_dashboard_view(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'dashboard/index.html')

    def test_model_creation(self):
        # Example test for model creation
        instance = YourModel.objects.create(field_name='value')  # Replace with actual fields
        self.assertEqual(instance.field_name, 'value')  # Replace with actual fields

    def tearDown(self):
        # Clean up after tests if necessary
        pass