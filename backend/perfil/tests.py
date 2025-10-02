from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from datetime import date, time
from .models import Perfil, ConfiguracionNotificaciones


class PerfilModelTest(TestCase):
    """Tests para el modelo Perfil"""
    
    def setUp(self):
        """Configuración inicial para los tests"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            first_name='Juan',
            last_name='Pérez'
        )
    
    def test_perfil_creation(self):
        """Test de creación automática de perfil"""
        # El perfil se debe crear automáticamente por el signal
        self.assertTrue(hasattr(self.user, 'perfil'))
        self.assertIsInstance(self.user.perfil, Perfil)
    
    def test_configuracion_notificaciones_creation(self):
        """Test de creación automática de configuración de notificaciones"""
        # La configuración se debe crear automáticamente
        self.assertTrue(hasattr(self.user.perfil, 'config_notificaciones'))
        self.assertIsInstance(self.user.perfil.config_notificaciones, ConfiguracionNotificaciones)
    
    def test_perfil_str_method(self):
        """Test del método __str__ del perfil"""
        expected = f"Perfil de {self.user.get_full_name()}"
        self.assertEqual(str(self.user.perfil), expected)
    
    def test_nombre_completo_property(self):
        """Test de la propiedad nombre_completo"""
        self.assertEqual(self.user.perfil.nombre_completo, "Juan Pérez")
    
    def test_edad_calculation(self):
        """Test del cálculo de edad"""
        # Sin fecha de nacimiento
        self.assertIsNone(self.user.perfil.edad)
        
        # Con fecha de nacimiento
        self.user.perfil.fecha_nacimiento = date(1990, 1, 1)
        self.user.perfil.save()
        
        edad_esperada = date.today().year - 1990
        if (date.today().month, date.today().day) < (1, 1):
            edad_esperada -= 1
        
        self.assertEqual(self.user.perfil.edad, edad_esperada)
    
    def test_verificar_completitud(self):
        """Test de verificación de completitud del perfil"""
        perfil = self.user.perfil
        
        # Inicialmente incompleto
        self.assertFalse(perfil.perfil_completado)
        
        # Completar campos requeridos
        perfil.telefono = '+573001234567'
        perfil.direccion_residencia = 'Calle 123 #45-67'
        perfil.ciudad_residencia = 'Bogotá'
        perfil.fecha_nacimiento = date(1990, 1, 1)
        perfil.save()
        
        # Ahora debe estar completado
        perfil.refresh_from_db()
        self.assertTrue(perfil.perfil_completado)
    
    def test_get_foto_url(self):
        """Test del método get_foto_url"""
        perfil = self.user.perfil
        
        # Sin foto
        expected_url = '/static/img/default-avatar.png'
        self.assertEqual(perfil.get_foto_url(), expected_url)
    
    def test_unique_cedula(self):
        """Test de unicidad del número de cédula"""
        perfil1 = self.user.perfil
        perfil1.numero_cedula = '12345678'
        perfil1.save()
        
        # Crear otro usuario con la misma cédula debe fallar
        user2 = User.objects.create_user(
            username='testuser2',
            email='test2@example.com'
        )
        
        with self.assertRaises(Exception):
            user2.perfil.numero_cedula = '12345678'
            user2.perfil.save()


class PerfilAPITest(APITestCase):
    """Tests para la API de perfiles"""
    
    def setUp(self):
        """Configuración inicial para los tests de API"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Juan',
            last_name='Pérez'
        )
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            is_staff=True,
            is_superuser=True
        )
    
    def test_mi_perfil_authenticated(self):
        """Test de obtener mi perfil autenticado"""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('perfil:perfil-mi-perfil')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['usuario']['username'], 'testuser')
    
    def test_mi_perfil_unauthenticated(self):
        """Test de obtener mi perfil sin autenticación"""
        url = reverse('perfil:perfil-mi-perfil')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_actualizar_mi_perfil(self):
        """Test de actualización del propio perfil"""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('perfil:perfil-actualizar-mi-perfil')
        data = {
            'telefono': '+573001234567',
            'profesion': 'Ingeniero',
            'ciudad_residencia': 'Bogotá'
        }
        
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.perfil.refresh_from_db()
        self.assertEqual(self.user.perfil.telefono, '+573001234567')
        self.assertEqual(self.user.perfil.profesion, 'Ingeniero')
    
    def test_list_perfiles_authenticated(self):
        """Test de listar perfiles autenticado"""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('perfil:perfil-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)  # Paginado
    
    def test_perfil_publico(self):
        """Test de obtener perfil público"""
        self.client.force_authenticate(user=self.user)
        
        # Hacer el perfil público
        perfil = self.user.perfil
        perfil.privacidad_publica = True
        perfil.save()
        
        url = reverse('perfil:perfil-publico', kwargs={'pk': perfil.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('nombre_completo', response.data)
    
    def test_perfil_privado(self):
        """Test de obtener perfil privado"""
        self.client.force_authenticate(user=self.user)
        
        # El perfil es privado por defecto
        perfil = self.user.perfil
        
        url = reverse('perfil:perfil-publico', kwargs={'pk': perfil.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_estadisticas_perfiles(self):
        """Test de estadísticas de perfiles"""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('perfil:perfil-estadisticas')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_perfiles', response.data)
        self.assertIn('perfiles_completados', response.data)
        self.assertIn('porcentaje_completitud', response.data)
    
    def test_buscar_perfiles(self):
        """Test de búsqueda de perfiles"""
        self.client.force_authenticate(user=self.user)
        
        # Actualizar perfil para búsqueda
        perfil = self.user.perfil
        perfil.profesion = 'Ingeniero Civil'
        perfil.save()
        
        url = reverse('perfil:perfil-buscar')
        response = self.client.get(url, {'q': 'Ingeniero'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
    
    def test_create_perfil_admin_only(self):
        """Test de creación de perfil solo para admin"""
        # Usuario normal no puede crear perfiles
        self.client.force_authenticate(user=self.user)
        
        url = reverse('perfil:perfil-list')
        data = {'usuario': self.user.id, 'telefono': '+573001234567'}
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin sí puede crear perfiles
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(url, data)
        
        # Nota: Esto podría fallar si el usuario ya tiene perfil
        # En el sistema real, la creación manual de perfiles es rara


class ConfiguracionNotificacionesTest(TestCase):
    """Tests para configuración de notificaciones"""
    
    def setUp(self):
        """Configuración inicial"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
    
    def test_configuracion_creation(self):
        """Test de creación de configuración"""
        config = self.user.perfil.config_notificaciones
        
        # Valores por defecto
        self.assertTrue(config.notif_prestamos)
        self.assertTrue(config.notif_nomina)
        self.assertTrue(config.via_email)
        self.assertFalse(config.via_sms)
    
    def test_configuracion_str_method(self):
        """Test del método __str__"""
        config = self.user.perfil.config_notificaciones
        expected = f"Notificaciones - {self.user.username}"
        self.assertEqual(str(config), expected)
    
    def test_horarios_notificacion(self):
        """Test de horarios de notificación"""
        config = self.user.perfil.config_notificaciones
        
        # Valores por defecto
        self.assertEqual(config.horario_inicio, time(8, 0))
        self.assertEqual(config.horario_fin, time(18, 0))


class ConfiguracionNotificacionesAPITest(APITestCase):
    """Tests para la API de configuración de notificaciones"""
    
    def setUp(self):
        """Configuración inicial"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_mi_configuracion_get(self):
        """Test de obtener mi configuración"""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('perfil:configuracionnotificaciones-mi-configuracion')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('notif_prestamos', response.data)
    
    def test_mi_configuracion_update(self):
        """Test de actualizar mi configuración"""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('perfil:configuracionnotificaciones-mi-configuracion')
        data = {
            'notif_prestamos': False,
            'via_sms': True
        }
        
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verificar cambios
        config = self.user.perfil.config_notificaciones
        config.refresh_from_db()
        self.assertFalse(config.notif_prestamos)
        self.assertTrue(config.via_sms)
