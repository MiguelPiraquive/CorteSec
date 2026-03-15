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
        )
        
        self.cargo_subordinado = Cargo.objects.create(
            nombre="Gerente de Recursos Humanos",
            codigo="GER001",
            descripcion="Gerente del área de recursos humanos",
            cargo_superior=self.cargo_superior,
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


class CargoValidationTest(TestCase):
    """Tests de validación del modelo Cargo"""
    
    def test_validacion_cargo_superior_propio(self):
        """Test que un cargo no puede ser superior de sí mismo"""
        cargo = Cargo.objects.create(
            nombre="Test Cargo",
            codigo="TEST001",
        )
        
        cargo.cargo_superior = cargo
        
        with self.assertRaises(Exception):
            cargo.clean()
