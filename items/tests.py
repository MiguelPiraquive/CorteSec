from django.test import TestCase
from .models import Item

class ItemModelTest(TestCase):

    def setUp(self):
        Item.objects.create(name="Test Item", description="This is a test item.", price=10.00)

    def test_item_creation(self):
        item = Item.objects.get(name="Test Item")
        self.assertEqual(item.description, "This is a test item.")
        self.assertEqual(item.price, 10.00)