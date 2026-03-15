from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from core.models import Organizacion
from nomina.models import Empleado
from prestamos.models import TipoPrestamo, Prestamo
from decimal import Decimal

User = get_user_model()


class TipoPrestamoModelTest(TestCase):
    def test_tipo_prestamo_creation(self):
        """Test de creación de tipo de préstamo"""
        organization = Organizacion.objects.create(
            nombre='Org Test',
            codigo='ORGTEST'
        )
        tipo = TipoPrestamo.objects.create(
            organization=organization,
            nombre='Préstamo Personal',
            descripcion='Préstamo para empleados',
            codigo='PRESTAMO_PERSONAL',
            monto_minimo=Decimal('100000.00'),
            monto_maximo=Decimal('1000000.00'),
            tasa_interes_defecto=Decimal('2.5'),
            plazo_minimo_meses=1,
            plazo_maximo_meses=12,
            activo=True
        )
        self.assertEqual(tipo.nombre, 'Préstamo Personal')
        self.assertEqual(tipo.tasa_interes_defecto, Decimal('2.5'))

    def test_tipo_prestamo_str_method(self):
        """Test del método __str__ del tipo de préstamo"""
        organization = Organizacion.objects.create(
            nombre='Org Test',
            codigo='ORGTEST'
        )
        tipo = TipoPrestamo.objects.create(
            organization=organization,
            nombre='Préstamo Personal',
            descripcion='Préstamo para empleados',
            codigo='PRESTAMO_PERSONAL',
            monto_minimo=Decimal('100000.00'),
            monto_maximo=Decimal('1000000.00'),
            tasa_interes_defecto=Decimal('2.5'),
            plazo_minimo_meses=1,
            plazo_maximo_meses=12,
            activo=True
        )
        self.assertEqual(str(tipo), 'PRESTAMO_PERSONAL - Préstamo Personal')


class PrestamoModelTest(TestCase):
    def setUp(self):
        self.organization = Organizacion.objects.create(
            nombre='Org Test',
            codigo='ORGTEST'
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            organization=self.organization
        )
        self.empleado = Empleado.objects.create(
            organization=self.organization,
            tipo_documento='CC',
            numero_documento='123456789',
            primer_nombre='Test',
            primer_apellido='User'
        )
        self.tipo_prestamo = TipoPrestamo.objects.create(
            organization=self.organization,
            nombre='Préstamo Personal',
            descripcion='Préstamo para empleados',
            codigo='PRESTAMO_PERSONAL',
            monto_minimo=Decimal('100000.00'),
            monto_maximo=Decimal('1000000.00'),
            tasa_interes_defecto=Decimal('2.5'),
            plazo_minimo_meses=1,
            plazo_maximo_meses=12,
            activo=True
        )

    def test_prestamo_creation(self):
        """Test de creación de préstamo"""
        prestamo = Prestamo.objects.create(
            organization=self.organization,
            empleado=self.empleado,
            tipo_prestamo=self.tipo_prestamo,
            monto_solicitado=Decimal('500000.00'),
            plazo_meses=6,
            tasa_interes=Decimal('2.5'),
            estado='pendiente',
            solicitado_por=self.user
        )
        self.assertEqual(prestamo.empleado, self.empleado)
        self.assertEqual(prestamo.monto_solicitado, Decimal('500000.00'))
        self.assertEqual(prestamo.estado, 'pendiente')

    def test_prestamo_str_method(self):
        """Test del método __str__ del préstamo"""
        prestamo = Prestamo.objects.create(
            organization=self.organization,
            empleado=self.empleado,
            tipo_prestamo=self.tipo_prestamo,
            monto_solicitado=Decimal('500000.00'),
            plazo_meses=6,
            tasa_interes=Decimal('2.5'),
            estado='pendiente',
            solicitado_por=self.user
        )
        expected_str = f"{prestamo.numero_prestamo} - {prestamo.empleado}"
        self.assertEqual(str(prestamo), expected_str)


class PrestamoViewsTest(TestCase):
    def setUp(self):
        self.organization = Organizacion.objects.create(
            nombre='Org Test',
            codigo='ORGTEST'
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            organization=self.organization
        )
        self.tipo_prestamo = TipoPrestamo.objects.create(
            organization=self.organization,
            nombre='Préstamo Personal',
            descripcion='Préstamo para empleados',
            codigo='PRESTAMO_PERSONAL',
            monto_minimo=Decimal('100000.00'),
            monto_maximo=Decimal('1000000.00'),
            tasa_interes_defecto=Decimal('2.5'),
            plazo_minimo_meses=1,
            plazo_maximo_meses=12,
            activo=True
        )

    def test_prestamo_list_view_requires_login(self):
        """Test que la vista de lista requiere login"""
        response = self.client.get(reverse('prestamos:prestamos_list'))
        self.assertEqual(response.status_code, 302)  # Redirect to login

    def test_prestamo_list_view_with_login(self):
        """Test de la vista de lista con usuario logueado"""
        self.client.force_login(self.user)
        response = self.client.get(reverse('prestamos:prestamos_list'))
        self.assertEqual(response.status_code, 200)

    def test_solicitar_prestamo_view(self):
        """Test de la vista de solicitar préstamo"""
        self.client.force_login(self.user)
        response = self.client.get(reverse('prestamos:prestamo_create'))
        self.assertEqual(response.status_code, 200)
