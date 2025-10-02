from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal
from datetime import date, timedelta

from .models import Empleado, Nomina, DetalleNomina
from locations.models import Departamento, Municipio
from items.models import Item
from cargos.models import Cargo


class EmpleadoModelTest(TestCase):
    def setUp(self):
        self.departamento = Departamento.objects.create(nombre="Test Departamento")
        self.municipio = Municipio.objects.create(
            nombre="Test Municipio", 
            departamento=self.departamento
        )
        self.cargo = Cargo.objects.create(
            nombre="Test Cargo",
            codigo="TEST01"
        )
        self.empleado = Empleado.objects.create(
            nombres="Juan",
            apellidos="Pérez",
            documento="12345678",
            correo="juan@test.com",
            cargo=self.cargo,
            departamento=self.departamento,
            municipio=self.municipio
        )
    
    def test_empleado_creation(self):
        self.assertEqual(self.empleado.nombres, "Juan")
        self.assertEqual(self.empleado.apellidos, "Pérez")
        self.assertEqual(self.empleado.documento, "12345678")
        self.assertTrue(self.empleado.activo)
    
    def test_empleado_str(self):
        self.assertEqual(str(self.empleado), "Juan Pérez")
    
    def test_nombre_completo_property(self):
        self.assertEqual(self.empleado.nombre_completo, "Juan Pérez")


class NominaModelTest(TestCase):
    def setUp(self):
        self.departamento = Departamento.objects.create(nombre="Test Departamento")
        self.municipio = Municipio.objects.create(
            nombre="Test Municipio", 
            departamento=self.departamento
        )
        self.cargo = Cargo.objects.create(
            nombre="Test Cargo",
            codigo="TEST01"
        )
        self.empleado = Empleado.objects.create(
            nombres="Juan",
            apellidos="Pérez",
            documento="12345678",
            cargo=self.cargo
        )
        self.item = Item.objects.create(
            nombre="Test Item",
            precio_unitario=Decimal('10.00'),
            tipo_cantidad='m2'
        )
        self.nomina = Nomina.objects.create(
            empleado=self.empleado,
            periodo_inicio=date.today(),
            periodo_fin=date.today() + timedelta(days=30),
            seguridad=Decimal('50.00'),
            prestamos=Decimal('100.00'),
            restaurante=Decimal('25.00')
        )
        self.detalle = DetalleNomina.objects.create(
            nomina=self.nomina,
            item=self.item,
            cantidad=Decimal('10.00')
        )
    
    def test_nomina_creation(self):
        self.assertEqual(self.nomina.empleado, self.empleado)
        self.assertEqual(self.nomina.seguridad, Decimal('50.00'))
    
    def test_detalle_total_property(self):
        expected_total = self.detalle.cantidad * self.item.precio_unitario
        self.assertEqual(self.detalle.total, expected_total)
    
    def test_nomina_produccion_property(self):
        expected_produccion = self.detalle.total
        self.assertEqual(self.nomina.produccion, expected_produccion)
    
    def test_nomina_total_property(self):
        expected_total = self.nomina.produccion - (
            self.nomina.seguridad + self.nomina.prestamos + self.nomina.restaurante
        )
        self.assertEqual(self.nomina.total, expected_total)


class PayrollAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.departamento = Departamento.objects.create(nombre="Test Departamento")
        self.municipio = Municipio.objects.create(
            nombre="Test Municipio", 
            departamento=self.departamento
        )
        self.cargo = Cargo.objects.create(
            nombre="Test Cargo",
            codigo="TEST01"
        )
        self.empleado = Empleado.objects.create(
            nombres="Juan",
            apellidos="Pérez",
            documento="12345678",
            cargo=self.cargo
        )
        self.client.force_authenticate(user=self.user)
    
    def test_empleado_list_api(self):
        url = reverse('payroll:empleado-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_empleado_create_api(self):
        url = reverse('payroll:empleado-list')
        data = {
            'nombres': 'María',
            'apellidos': 'González',
            'documento': '87654321',
            'cargo': self.cargo.id,
            'correo': 'maria@test.com'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Empleado.objects.count(), 2)
    
    def test_empleado_estadisticas_api(self):
        url = reverse('payroll:empleado-estadisticas')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_empleados', response.data)
        self.assertEqual(response.data['total_empleados'], 1)


class PayrollViewTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.departamento = Departamento.objects.create(nombre="Test Departamento")
        self.municipio = Municipio.objects.create(
            nombre="Test Municipio", 
            departamento=self.departamento
        )
        self.cargo = Cargo.objects.create(
            nombre="Test Cargo",
            codigo="TEST01"
        )
        self.empleado = Empleado.objects.create(
            nombres="Juan",
            apellidos="Pérez",
            documento="12345678",
            cargo=self.cargo
        )
        self.client.login(username='testuser', password='testpass123')
    
    def test_empleado_lista_view(self):
        url = reverse('payroll:empleado_lista')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Juan Pérez')
    
    def test_nomina_lista_view(self):
        url = reverse('payroll:nomina_lista')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)


class PayrollFormTest(TestCase):
    def setUp(self):
        self.departamento = Departamento.objects.create(nombre="Test Departamento")
        self.municipio = Municipio.objects.create(
            nombre="Test Municipio", 
            departamento=self.departamento
        )
        self.cargo = Cargo.objects.create(
            nombre="Test Cargo",
            codigo="TEST01"
        )
    
    def test_empleado_form_valid(self):
        from .forms import EmpleadoForm
        form_data = {
            'nombres': 'Juan',
            'apellidos': 'Pérez',
            'documento': '12345678',
            'correo': 'juan@test.com',
            'cargo': self.cargo.id,
            'genero': 'M'
        }
        form = EmpleadoForm(data=form_data)
        self.assertTrue(form.is_valid())
