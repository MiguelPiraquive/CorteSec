from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from core.models import Configuracion, LogSistema, Notificacion


class ConfiguracionModelTest(TestCase):
    def test_configuracion_creation(self):
        """Test de creación de configuración"""
        config = Configuracion.objects.create(
            clave='test_config',
            valor='test_value',
            descripcion='Configuración de prueba',
            tipo='string',
            activo=True
        )
        self.assertEqual(config.clave, 'test_config')
        self.assertEqual(config.valor, 'test_value')

    def test_configuracion_str_method(self):
        """Test del método __str__ de configuración"""
        config = Configuracion.objects.create(
            clave='test_config',
            valor='test_value',
            descripcion='Configuración de prueba',
            tipo='string',
            activo=True
        )
        self.assertEqual(str(config), 'test_config')


class LogSistemaModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_log_creation(self):
        """Test de creación de log del sistema"""
        log = LogSistema.objects.create(
            usuario=self.user,
            accion='login',
            descripcion='Usuario ingresó al sistema',
            ip_address='127.0.0.1',
            user_agent='Test Browser'
        )
        self.assertEqual(log.usuario, self.user)
        self.assertEqual(log.accion, 'login')

    def test_log_str_method(self):
        """Test del método __str__ del log"""
        log = LogSistema.objects.create(
            usuario=self.user,
            accion='login',
            descripcion='Usuario ingresó al sistema',
            ip_address='127.0.0.1',
            user_agent='Test Browser'
        )
        expected_str = f"{log.fecha} - {self.user.username} - login"
        self.assertEqual(str(log), expected_str)


class NotificacionModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_notificacion_creation(self):
        """Test de creación de notificación"""
        notif = Notificacion.objects.create(
            usuario=self.user,
            titulo='Notificación de prueba',
            mensaje='Mensaje de prueba',
            tipo='info',
            leida=False
        )
        self.assertEqual(notif.usuario, self.user)
        self.assertEqual(notif.titulo, 'Notificación de prueba')
        self.assertFalse(notif.leida)

    def test_notificacion_str_method(self):
        """Test del método __str__ de notificación"""
        notif = Notificacion.objects.create(
            usuario=self.user,
            titulo='Notificación de prueba',
            mensaje='Mensaje de prueba',
            tipo='info',
            leida=False
        )
        self.assertEqual(str(notif), 'Notificación de prueba')


class CoreViewsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_home_view(self):
        """Test de la vista principal"""
        response = self.client.get(reverse('core:home'))
        self.assertEqual(response.status_code, 200)

    def test_dashboard_requires_login(self):
        """Test que el dashboard requiere login"""
        response = self.client.get(reverse('core:dashboard'))
        self.assertEqual(response.status_code, 302)  # Redirect to login

    def test_dashboard_with_login(self):
        """Test del dashboard con usuario logueado"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('core:dashboard'))
        self.assertEqual(response.status_code, 200)

    def test_notificaciones_view(self):
        """Test de la vista de notificaciones"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('core:notificaciones'))
        self.assertEqual(response.status_code, 200)
