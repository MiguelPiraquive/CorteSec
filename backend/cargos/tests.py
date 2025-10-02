from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from .models import Cargo, HistorialCargo

User = get_user_model()


class CargoModelTest(TestCase):
    """Tests para el modelo Cargo"""
    
    def setUp(self):
        """Configuración inicial para los tests"""
        self.cargo_superior = Cargo.objects.create(
            nombre="Director General",
            codigo="DIR001",
            descripcion="Director general de la empresa",
            salario_base_minimo=Decimal('5000000'),
            salario_base_maximo=Decimal('8000000'),
            puede_aprobar=True,
            limite_aprobacion=Decimal('10000000')
        )
        
        self.cargo_subordinado = Cargo.objects.create(
            nombre="Gerente de Recursos Humanos",
            codigo="GER001",
            descripcion="Gerente del área de recursos humanos",
            cargo_superior=self.cargo_superior,
            salario_base_minimo=Decimal('3000000'),
            salario_base_maximo=Decimal('5000000'),
            puede_aprobar=True,
            limite_aprobacion=Decimal('5000000')
        )
    
    def test_jerarquia_cargo(self):
        """Test de la jerarquía de cargos"""
        self.assertEqual(self.cargo_superior.nivel_jerarquico, 1)
        self.assertEqual(self.cargo_subordinado.nivel_jerarquico, 2)
        self.assertEqual(self.cargo_subordinado.cargo_superior, self.cargo_superior)
    
    def test_str_representation(self):
        """Test de la representación string del cargo"""
        expected = f"{self.cargo_superior.codigo} - {self.cargo_superior.nombre}"
        self.assertEqual(str(self.cargo_superior), expected)
    
    def test_jerarquia_completa(self):
        """Test de la propiedad jerarquia_completa"""
        expected = f"{self.cargo_superior.nombre} > {self.cargo_subordinado.nombre}"
        self.assertEqual(self.cargo_subordinado.jerarquia_completa, expected)
    
    def test_subordinados_directos(self):
        """Test de obtener subordinados directos"""
        subordinados = self.cargo_superior.get_subordinados_directos()
        self.assertIn(self.cargo_subordinado, subordinados)
        self.assertEqual(subordinados.count(), 1)
    
    def test_puede_gestionar_cargo(self):
        """Test de verificación de gestión de cargos"""
        self.assertTrue(self.cargo_superior.puede_gestionar_cargo(self.cargo_subordinado))
        self.assertFalse(self.cargo_subordinado.puede_gestionar_cargo(self.cargo_superior))
    
    def test_rango_salarial(self):
        """Test de validación de rango salarial"""
        self.assertTrue(self.cargo_superior.esta_en_rango_salarial(Decimal('6000000')))
        self.assertFalse(self.cargo_superior.esta_en_rango_salarial(Decimal('3000000')))
        self.assertFalse(self.cargo_superior.esta_en_rango_salarial(Decimal('10000000')))


class HistorialCargoModelTest(TestCase):
    """Tests para el modelo HistorialCargo"""
    
    def setUp(self):
        """Configuración inicial para los tests"""
        from datetime import date
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.cargo = Cargo.objects.create(
            nombre="Analista de Sistemas",
            codigo="ANA001",
            salario_base_minimo=Decimal('2000000'),
            salario_base_maximo=Decimal('3000000')
        )
    
    def test_historial_creation(self):
        """Test de creación de historial"""
        from datetime import date
        
        # Necesitamos crear un empleado mock o usar un modelo simplificado
        # Por ahora este test quedará como placeholder
        pass
    
    def test_duracion_en_cargo(self):
        """Test de cálculo de duración en cargo"""
        # Este test requiere el modelo de empleado
        pass


class CargoValidationTest(TestCase):
    """Tests de validación del modelo Cargo"""
    
    def test_validacion_cargo_superior_propio(self):
        """Test que un cargo no puede ser superior de sí mismo"""
        cargo = Cargo.objects.create(
            nombre="Test Cargo",
            codigo="TEST001",
            salario_base_minimo=Decimal('1000000')
        )
        
        cargo.cargo_superior = cargo
        
        with self.assertRaises(ValidationError):
            cargo.clean()
    
    def test_validacion_salario_minimo_mayor_maximo(self):
        """Test que salario mínimo no puede ser mayor que máximo"""
        cargo = Cargo(
            nombre="Test Cargo",
            codigo="TEST002",
            salario_base_minimo=Decimal('5000000'),
            salario_base_maximo=Decimal('3000000')
        )
        
        with self.assertRaises(ValidationError):
            cargo.clean()
    
    def test_validacion_puede_aprobar_sin_limite(self):
        """Test que si puede aprobar debe tener límite"""
        cargo = Cargo(
            nombre="Test Cargo",
            codigo="TEST003",
            salario_base_minimo=Decimal('1000000'),
            puede_aprobar=True,
            limite_aprobacion=None
        )
        
        with self.assertRaises(ValidationError):
            cargo.clean()
