from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from prestamos.models import TipoPrestamo, Prestamo, CuotaPrestamo
from decimal import Decimal


class TipoPrestamoModelTest(TestCase):
    def test_tipo_prestamo_creation(self):
        """Test de creación de tipo de préstamo"""
        tipo = TipoPrestamo.objects.create(
            nombre='Préstamo Personal',
            descripcion='Préstamo para empleados',
            tasa_interes=Decimal('2.5'),
            plazo_maximo_meses=12,
            monto_maximo=Decimal('1000000.00'),
            activo=True
        )
        self.assertEqual(tipo.nombre, 'Préstamo Personal')
        self.assertEqual(tipo.tasa_interes, Decimal('2.5'))

    def test_tipo_prestamo_str_method(self):
        """Test del método __str__ del tipo de préstamo"""
        tipo = TipoPrestamo.objects.create(
            nombre='Préstamo Personal',
            descripcion='Préstamo para empleados',
            tasa_interes=Decimal('2.5'),
            plazo_maximo_meses=12,
            monto_maximo=Decimal('1000000.00'),
            activo=True
        )
        self.assertEqual(str(tipo), 'Préstamo Personal')


class PrestamoModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.tipo_prestamo = TipoPrestamo.objects.create(
            nombre='Préstamo Personal',
            descripcion='Préstamo para empleados',
            tasa_interes=Decimal('2.5'),
            plazo_maximo_meses=12,
            monto_maximo=Decimal('1000000.00'),
            activo=True
        )

    def test_prestamo_creation(self):
        """Test de creación de préstamo"""
        prestamo = Prestamo.objects.create(
            empleado=self.user,
            tipo_prestamo=self.tipo_prestamo,
            monto_solicitado=Decimal('500000.00'),
            plazo_meses=6,
            tasa_interes=Decimal('2.5'),
            estado='pendiente'
        )
        self.assertEqual(prestamo.empleado, self.user)
        self.assertEqual(prestamo.monto_solicitado, Decimal('500000.00'))
        self.assertEqual(prestamo.estado, 'pendiente')

    def test_prestamo_str_method(self):
        """Test del método __str__ del préstamo"""
        prestamo = Prestamo.objects.create(
            empleado=self.user,
            tipo_prestamo=self.tipo_prestamo,
            monto_solicitado=Decimal('500000.00'),
            plazo_meses=6,
            tasa_interes=Decimal('2.5'),
            estado='pendiente'
        )
        expected_str = f"Préstamo {prestamo.numero_prestamo} - {self.user.username}"
        self.assertEqual(str(prestamo), expected_str)


class CuotaPrestamoModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.tipo_prestamo = TipoPrestamo.objects.create(
            nombre='Préstamo Personal',
            descripcion='Préstamo para empleados',
            tasa_interes=Decimal('2.5'),
            plazo_maximo_meses=12,
            monto_maximo=Decimal('1000000.00'),
            activo=True
        )
        self.prestamo = Prestamo.objects.create(
            empleado=self.user,
            tipo_prestamo=self.tipo_prestamo,
            monto_solicitado=Decimal('500000.00'),
            plazo_meses=6,
            tasa_interes=Decimal('2.5'),
            estado='aprobado'
        )

    def test_cuota_creation(self):
        """Test de creación de cuota"""
        cuota = CuotaPrestamo.objects.create(
            prestamo=self.prestamo,
            numero_cuota=1,
            valor_cuota=Decimal('90000.00'),
            valor_capital=Decimal('85000.00'),
            valor_interes=Decimal('5000.00'),
            saldo_pendiente=Decimal('415000.00'),
            estado='pendiente'
        )
        self.assertEqual(cuota.prestamo, self.prestamo)
        self.assertEqual(cuota.numero_cuota, 1)
        self.assertEqual(cuota.valor_cuota, Decimal('90000.00'))

    def test_cuota_str_method(self):
        """Test del método __str__ de la cuota"""
        cuota = CuotaPrestamo.objects.create(
            prestamo=self.prestamo,
            numero_cuota=1,
            valor_cuota=Decimal('90000.00'),
            valor_capital=Decimal('85000.00'),
            valor_interes=Decimal('5000.00'),
            saldo_pendiente=Decimal('415000.00'),
            estado='pendiente'
        )
        expected_str = f"Cuota {cuota.numero_cuota} - {self.prestamo.numero_prestamo}"
        self.assertEqual(str(cuota), expected_str)


class PrestamoViewsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.tipo_prestamo = TipoPrestamo.objects.create(
            nombre='Préstamo Personal',
            descripcion='Préstamo para empleados',
            tasa_interes=Decimal('2.5'),
            plazo_maximo_meses=12,
            monto_maximo=Decimal('1000000.00'),
            activo=True
        )

    def test_prestamo_list_view_requires_login(self):
        """Test que la vista de lista requiere login"""
        response = self.client.get(reverse('prestamos:lista_prestamos'))
        self.assertEqual(response.status_code, 302)  # Redirect to login

    def test_prestamo_list_view_with_login(self):
        """Test de la vista de lista con usuario logueado"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('prestamos:lista_prestamos'))
        self.assertEqual(response.status_code, 200)

    def test_solicitar_prestamo_view(self):
        """Test de la vista de solicitar préstamo"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('prestamos:solicitar_prestamo'))
        self.assertEqual(response.status_code, 200)
