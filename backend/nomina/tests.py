"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    TESTS DE NÓMINA - CORTESEC                                 ║
║                Sistema de Nómina para Construcción                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Tests para el módulo de nómina.

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: Enero 2026
"""

from django.test import TestCase
from decimal import Decimal
from datetime import date

from core.models import Organization
from .models import (
    Empleado,
    TipoContrato,
    Contrato,
    ParametroLegal,
    ConceptoLaboral,
    NominaSimple,
)
from .services import CalculadorNomina


class EmpleadoModelTest(TestCase):
    """Tests para el modelo Empleado."""
    
    def setUp(self):
        self.organization = Organization.objects.create(
            name='Test Org',
            subdomain='testorg',
            is_active=True
        )
    
    def test_crear_empleado(self):
        """Test de creación básica de empleado."""
        empleado = Empleado.objects.create(
            organization=self.organization,
            tipo_documento='CC',
            numero_documento='123456789',
            primer_nombre='Juan',
            primer_apellido='Pérez',
            fecha_nacimiento=date(1990, 1, 15),
            fecha_ingreso=date(2024, 1, 1),
            estado='activo'
        )
        
        self.assertEqual(empleado.numero_documento, '123456789')
        self.assertEqual(empleado.nombre_completo, 'Juan Pérez')
        self.assertEqual(str(empleado), '123456789 - Juan Pérez')
    
    def test_nombre_completo_con_segundo_nombre(self):
        """Test nombre completo con todos los campos."""
        empleado = Empleado.objects.create(
            organization=self.organization,
            tipo_documento='CC',
            numero_documento='987654321',
            primer_nombre='María',
            segundo_nombre='José',
            primer_apellido='González',
            segundo_apellido='López',
            fecha_nacimiento=date(1985, 5, 20),
            fecha_ingreso=date(2023, 6, 1),
        )
        
        self.assertEqual(empleado.nombre_completo, 'María José González López')


class TipoContratoModelTest(TestCase):
    """Tests para el modelo TipoContrato."""
    
    def setUp(self):
        self.organization = Organization.objects.create(
            name='Test Org',
            subdomain='testorg2',
            is_active=True
        )
    
    def test_tipo_contrato_laboral(self):
        """Test contrato laboral con todas las deducciones."""
        tipo = TipoContrato.objects.create(
            organization=self.organization,
            nombre='Término Indefinido',
            codigo='INDEFINIDO',
            aplica_salud=True,
            aplica_pension=True,
            aplica_arl=True,
            aplica_parafiscales=True,
            ibc_porcentaje=Decimal('100.00')
        )
        
        self.assertTrue(tipo.aplica_salud)
        self.assertTrue(tipo.aplica_pension)
        self.assertEqual(tipo.ibc_porcentaje, Decimal('100.00'))
    
    def test_tipo_contrato_servicios(self):
        """Test contrato de servicios con IBC 40%."""
        tipo = TipoContrato.objects.create(
            organization=self.organization,
            nombre='Prestación de Servicios',
            codigo='SERVICIOS',
            aplica_salud=True,
            aplica_pension=True,
            aplica_arl=False,
            aplica_parafiscales=False,
            ibc_porcentaje=Decimal('40.00')
        )
        
        self.assertFalse(tipo.aplica_arl)
        self.assertFalse(tipo.aplica_parafiscales)
        self.assertEqual(tipo.ibc_porcentaje, Decimal('40.00'))


class ParametroLegalModelTest(TestCase):
    """Tests para el modelo ParametroLegal."""
    
    def setUp(self):
        self.organization = Organization.objects.create(
            name='Test Org',
            subdomain='testorg3',
            is_active=True
        )
    
    def test_parametro_salud(self):
        """Test parámetro de salud."""
        param = ParametroLegal.objects.create(
            organization=self.organization,
            concepto='SALUD',
            porcentaje_total=Decimal('12.50'),
            porcentaje_empleado=Decimal('4.00'),
            porcentaje_empleador=Decimal('8.50'),
            vigente_desde=date(2026, 1, 1)
        )
        
        self.assertEqual(param.porcentaje_total, Decimal('12.50'))
        self.assertEqual(
            param.porcentaje_empleado + param.porcentaje_empleador,
            param.porcentaje_total
        )
    
    def test_parametro_smmlv(self):
        """Test valor del SMMLV."""
        param = ParametroLegal.objects.create(
            organization=self.organization,
            concepto='SMMLV',
            valor_fijo=Decimal('1300000.00'),
            vigente_desde=date(2026, 1, 1)
        )
        
        self.assertEqual(param.valor_fijo, Decimal('1300000.00'))


class ContratoModelTest(TestCase):
    """Tests para el modelo Contrato."""
    
    def setUp(self):
        self.organization = Organization.objects.create(
            name='Test Org',
            subdomain='testorg4',
            is_active=True
        )
        
        self.empleado = Empleado.objects.create(
            organization=self.organization,
            tipo_documento='CC',
            numero_documento='111222333',
            primer_nombre='Carlos',
            primer_apellido='Rodríguez',
            fecha_nacimiento=date(1988, 3, 10),
            fecha_ingreso=date(2024, 1, 1),
        )
        
        self.tipo_contrato = TipoContrato.objects.create(
            organization=self.organization,
            nombre='Término Fijo',
            codigo='FIJO',
            aplica_salud=True,
            aplica_pension=True,
            aplica_arl=True,
            aplica_parafiscales=True,
            ibc_porcentaje=Decimal('100.00')
        )
    
    def test_crear_contrato(self):
        """Test creación de contrato."""
        contrato = Contrato.objects.create(
            organization=self.organization,
            empleado=self.empleado,
            tipo_contrato=self.tipo_contrato,
            salario=Decimal('2500000.00'),
            nivel_arl='I',
            cargo='Operario',
            fecha_inicio=date(2024, 1, 1),
            activo=True
        )
        
        self.assertEqual(contrato.salario, Decimal('2500000.00'))
        self.assertEqual(contrato.nivel_arl, 'I')
        self.assertTrue(contrato.activo)


class CalculadorNominaTest(TestCase):
    """Tests para el servicio CalculadorNomina."""
    
    def setUp(self):
        self.organization = Organization.objects.create(
            name='Test Org',
            subdomain='testorg5',
            is_active=True
        )
        
        # Crear parámetros legales
        ParametroLegal.objects.create(
            organization=self.organization,
            concepto='SMMLV',
            valor_fijo=Decimal('1300000.00'),
            vigente_desde=date(2026, 1, 1)
        )
        
        ParametroLegal.objects.create(
            organization=self.organization,
            concepto='AUX_TRANSPORTE',
            valor_fijo=Decimal('162000.00'),
            vigente_desde=date(2026, 1, 1)
        )
        
        ParametroLegal.objects.create(
            organization=self.organization,
            concepto='SALUD',
            porcentaje_total=Decimal('12.50'),
            porcentaje_empleado=Decimal('4.00'),
            porcentaje_empleador=Decimal('8.50'),
            vigente_desde=date(2026, 1, 1)
        )
        
        ParametroLegal.objects.create(
            organization=self.organization,
            concepto='PENSION',
            porcentaje_total=Decimal('16.00'),
            porcentaje_empleado=Decimal('4.00'),
            porcentaje_empleador=Decimal('12.00'),
            vigente_desde=date(2026, 1, 1)
        )
        
        # Crear empleado
        self.empleado = Empleado.objects.create(
            organization=self.organization,
            tipo_documento='CC',
            numero_documento='444555666',
            primer_nombre='Ana',
            primer_apellido='Martínez',
            fecha_nacimiento=date(1992, 7, 25),
            fecha_ingreso=date(2024, 1, 1),
        )
        
        # Crear tipo de contrato
        self.tipo_contrato = TipoContrato.objects.create(
            organization=self.organization,
            nombre='Término Indefinido',
            codigo='INDEFINIDO',
            aplica_salud=True,
            aplica_pension=True,
            aplica_arl=True,
            aplica_parafiscales=True,
            ibc_porcentaje=Decimal('100.00')
        )
        
        # Crear contrato
        self.contrato = Contrato.objects.create(
            organization=self.organization,
            empleado=self.empleado,
            tipo_contrato=self.tipo_contrato,
            salario=Decimal('2000000.00'),
            nivel_arl='I',
            cargo='Auxiliar',
            fecha_inicio=date(2024, 1, 1),
            activo=True
        )
        
        # Crear nómina
        self.nomina = NominaSimple.objects.create(
            organization=self.organization,
            contrato=self.contrato,
            periodo_inicio=date(2026, 1, 1),
            periodo_fin=date(2026, 1, 31)
        )
    
    def test_calculo_basico_nomina(self):
        """Test cálculo básico de nómina."""
        calculador = CalculadorNomina(self.nomina)
        resultado = calculador.calcular()
        
        # Verificar que se calcularon los valores
        self.assertIsNotNone(resultado)
        self.assertIn('resumen', resultado)
        
        resumen = resultado['resumen']
        
        # El salario debería aplicarse como devengado
        self.assertGreater(resumen['total_devengado'], 0)
        
        # Las deducciones de salud y pensión deberían calcularse
        self.assertGreater(resumen['total_deducciones'], 0)
