from django.test import TestCase
from core.models import Organizacion
from .models import Item

class ItemModelTest(TestCase):

    def setUp(self):
        self.organization = Organizacion.objects.create(
            nombre="Org Test",
            codigo="ORGTEST"
        )
        Item.objects.create(
            organization=self.organization,
            nombre="Test Item",
            descripcion="This is a test item.",
            precio_unitario=10.00,
            tipo_cantidad='m2'
        )

    def test_item_creation(self):
        item = Item.objects.get(nombre="Test Item")
        self.assertEqual(item.descripcion, "This is a test item.")
        self.assertEqual(item.precio_unitario, 10.00)