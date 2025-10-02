from django.test import TestCase
from decimal import Decimal
from .models import ConfiguracionGeneral, ConfiguracionNomina, ConfiguracionSeguridad


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
        
        # El modelo debería prevenir múltiples instancias
        with self.assertRaises(Exception):
            config2.save()
    
    def test_str_representation(self):
        """Test de la representación string"""
        self.assertEqual(str(self.config), "Test Company")
    
    def test_configuracion_completa(self):
        """Test de configuración completa"""
        self.assertTrue(self.config.configuracion_completa)
    
    def test_formato_moneda(self):
        """Test de formato de moneda"""
        formatted = self.config.formato_moneda(1234.56)
        self.assertIn("$", formatted)
        self.assertIn("1,234.56", formatted)


class ConfiguracionNominaModelTest(TestCase):
    """Tests para el modelo ConfiguracionNomina"""
    
    def setUp(self):
        """Configuración inicial para los tests"""
        self.config_nomina = ConfiguracionNomina.objects.create(
            salario_minimo_legal=Decimal('1000000'),
            auxilio_transporte=Decimal('100000'),
            porcentaje_salud=Decimal('4.0'),
            porcentaje_pension=Decimal('4.0')
        )
    
    def test_calculo_deducciones(self):
        """Test de cálculo de deducciones"""
        salario = Decimal('2000000')
        deducciones = self.config_nomina.calcular_deducciones_empleado(salario)
        
        self.assertEqual(deducciones['salud'], Decimal('80000'))  # 4% de 2,000,000
        self.assertEqual(deducciones['pension'], Decimal('80000'))  # 4% de 2,000,000
    
    def test_salario_minimo_validation(self):
        """Test de validación de salario mínimo"""
        self.assertTrue(
            self.config_nomina.salario_cumple_minimo(Decimal('1500000'))
        )
        self.assertFalse(
            self.config_nomina.salario_cumple_minimo(Decimal('800000'))
        )


class ConfiguracionSeguridadModelTest(TestCase):
    """Tests para el modelo ConfiguracionSeguridad"""
    
    def setUp(self):
        """Configuración inicial para los tests"""
        self.config_seguridad = ConfiguracionSeguridad.objects.create(
            longitud_minima_password=8,
            requerir_mayusculas=True,
            requerir_minusculas=True,
            requerir_numeros=True,
            intentos_login_max=3,
            tiempo_bloqueo_minutos=15
        )
    
    def test_validacion_password(self):
        """Test de validación de contraseña"""
        # Contraseña válida
        self.assertTrue(
            self.config_seguridad.validar_password("Password123")
        )
        
        # Contraseña muy corta
        self.assertFalse(
            self.config_seguridad.validar_password("Pass1")
        )
        
        # Sin mayúsculas
        self.assertFalse(
            self.config_seguridad.validar_password("password123")
        )
        
        # Sin números
        self.assertFalse(
            self.config_seguridad.validar_password("Password")
        )
    
    def test_str_representation(self):
        """Test de representación string"""
        expected = f"Seguridad - Min: {self.config_seguridad.longitud_minima_password} chars"
        self.assertEqual(str(self.config_seguridad), expected)
