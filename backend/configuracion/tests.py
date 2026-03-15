from django.test import TestCase
from django.core.exceptions import ValidationError
from .models import ConfiguracionGeneral, ConfiguracionSeguridad, ConfiguracionModulo


class ConfiguracionGeneralModelTest(TestCase):
    """Tests para el modelo ConfiguracionGeneral"""
    
    def setUp(self):
        """Configuración inicial para los tests"""
        self.config = ConfiguracionGeneral.objects.create(
            nombre_empresa="Test Company",
            nit="123456789-0",
            direccion="Calle 123 #45-67",
            telefono="123-456-7890",
            email="test@company.com",
            moneda="COP",
            simbolo_moneda="$"
        )
    
    def test_singleton_pattern(self):
        """Test que solo puede existir una configuración"""
        # Intentar crear otra configuración
        config2 = ConfiguracionGeneral(
            nombre_empresa="Test Company 2",
            nit="987654321-0",
            direccion="Carrera 123 #45-67",
            telefono="987-654-3210",
            email="test2@company.com"
        )
        
        # El modelo evita duplicados
        with self.assertRaises(ValidationError):
            config2.save()
    
    def test_str_representation(self):
        """Test de la representación string"""
        self.assertEqual(str(self.config), "Configuración - Test Company")
    
    def test_get_config(self):
        """Test de obtención de configuración"""
        config = ConfiguracionGeneral.get_config()
        self.assertEqual(config.nombre_empresa, "Test Company")


class ConfiguracionModuloModelTest(TestCase):
    """Tests para el modelo ConfiguracionModulo"""

    def setUp(self):
        self.config_modulo = ConfiguracionModulo.objects.create(
            modulo='nomina',
            configuracion_json={'limite': 10}
        )

    def test_get_set_config_valor(self):
        """Test de get/set de configuración"""
        self.assertEqual(self.config_modulo.get_config_valor('limite'), 10)
        self.config_modulo.set_config_valor('limite', 20)
        self.config_modulo.refresh_from_db()
        self.assertEqual(self.config_modulo.get_config_valor('limite'), 20)


class ConfiguracionSeguridadModelTest(TestCase):
    """Tests para el modelo ConfiguracionSeguridad"""
    
    def setUp(self):
        """Configuración inicial para los tests"""
        self.config_seguridad = ConfiguracionSeguridad.objects.create(
            longitud_minima_password=8,
            requiere_mayusculas=True,
            requiere_minusculas=True,
            requiere_numeros=True,
            max_intentos_login=3,
            tiempo_bloqueo=15
        )
    
    def test_str_representation(self):
        """Test de representación string"""
        self.assertIn("Configuración de Seguridad", str(self.config_seguridad))
