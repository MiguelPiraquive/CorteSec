import unittest
from django.test import TestCase
from django.db import IntegrityError
from django.core.exceptions import ValidationError
from core.models import Organizacion
from .models import Departamento, Municipio


class DepartamentoModelTest(TestCase):
    """Tests para el modelo Departamento"""
    
    def setUp(self):
        """Configuración inicial"""
        self.organizacion = Organizacion.objects.create(
            nombre="Test Org",
            codigo="ORGTEST"
        )
    
    def test_crear_departamento(self):
        """Test crear departamento básico"""
        departamento = Departamento.objects.create(
            organization=self.organizacion,
            nombre="Cundinamarca",
            codigo="25"
        )
        
        self.assertEqual(departamento.nombre, "Cundinamarca")
        self.assertEqual(departamento.codigo, "25")
        self.assertEqual(str(departamento), "25 - Cundinamarca")
    
    def test_departamento_sin_codigo(self):
        """Test crear departamento sin código"""
        departamento = Departamento.objects.create(
            organization=self.organizacion,
            nombre="Amazonas"
        )
        
        self.assertEqual(str(departamento), "Amazonas")
    
    def test_municipios_count(self):
        """Test contar municipios"""
        departamento = Departamento.objects.create(
            organization=self.organizacion,
            nombre="Cundinamarca",
            codigo="25"
        )
        
        # Crear municipios
        Municipio.objects.create(
            organization=self.organizacion,
            departamento=departamento,
            nombre="Bogotá",
            codigo="25001"
        )
        Municipio.objects.create(
            organization=self.organizacion,
            departamento=departamento,
            nombre="Soacha",
            codigo="25754"
        )
        
        self.assertEqual(departamento.municipios_count, 2)


class MunicipioModelTest(TestCase):
    """Tests para el modelo Municipio"""
    
    def setUp(self):
        """Configuración inicial"""
        self.organizacion = Organizacion.objects.create(
            nombre="Test Org",
            codigo="ORGTEST"
        )
        self.departamento = Departamento.objects.create(
            organization=self.organizacion,
            nombre="Cundinamarca",
            codigo="25"
        )
    
    def test_crear_municipio(self):
        """Test crear municipio básico"""
        municipio = Municipio.objects.create(
            organization=self.organizacion,
            departamento=self.departamento,
            nombre="Bogotá",
            codigo="25001"
        )
        
        self.assertEqual(municipio.nombre, "Bogotá")
        self.assertEqual(municipio.codigo, "25001")
        self.assertEqual(municipio.departamento, self.departamento)
        self.assertEqual(str(municipio), "Bogotá (Cundinamarca)")
    
    def test_nombre_completo(self):
        """Test propiedad nombre_completo"""
        municipio = Municipio.objects.create(
            organization=self.organizacion,
            departamento=self.departamento,
            nombre="Soacha"
        )
        
        self.assertEqual(municipio.nombre_completo, "Soacha, Cundinamarca")
    
    def test_unique_together(self):
        """Test restricción unique_together"""
        # Crear primer municipio
        Municipio.objects.create(
            organization=self.organizacion,
            departamento=self.departamento,
            nombre="Bogotá",
            codigo="25001"
        )
        
        # Intentar crear otro con el mismo nombre en el mismo departamento
        with self.assertRaises((IntegrityError, ValidationError)):
            Municipio.objects.create(
                organization=self.organizacion,
                departamento=self.departamento,
                nombre="Bogotá",
                codigo="25002"
            )


class UbicacionesIntegrationTest(TestCase):
    """Tests de integración para ubicaciones"""
    
    def setUp(self):
        """Configuración inicial"""
        self.organizacion = Organizacion.objects.create(
            nombre="Test Org",
            codigo="ORGTEST"
        )
    
    def test_jerarquia_completa(self):
        """Test crear jerarquía completa de ubicaciones"""
        # Crear departamento
        cundinamarca = Departamento.objects.create(
            organization=self.organizacion,
            nombre="Cundinamarca",
            codigo="25",
            capital="Bogotá",
            region="Andina"
        )
        
        # Crear municipios
        bogota = Municipio.objects.create(
            organization=self.organizacion,
            departamento=cundinamarca,
            nombre="Bogotá",
            codigo="25001"
        )
        
        soacha = Municipio.objects.create(
            organization=self.organizacion,
            departamento=cundinamarca,
            nombre="Soacha",
            codigo="25754"
        )
        
        # Verificar relaciones
        self.assertEqual(cundinamarca.municipios.count(), 2)
        self.assertIn(bogota, cundinamarca.municipios.all())
        self.assertIn(soacha, cundinamarca.municipios.all())
        
        # Verificar propiedades
        self.assertEqual(cundinamarca.municipios_count, 2)
        self.assertEqual(bogota.nombre_completo, "Bogotá, Cundinamarca")
        self.assertEqual(soacha.nombre_completo, "Soacha, Cundinamarca")


if __name__ == '__main__':
    unittest.main()
