"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    SIGNALS DE NÓMINA - CORTESEC                               ║
║                Sistema de Nómina para Construcción                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Señales Django para automatizar procesos de nómina.

- Generación automática de número de nómina (pre_save)
- Cálculo de valor total de item (pre_save)
- Auto-creación de conceptos legales al crear organización (post_save)

NOTA: Los signals de recalculación de totales (items, conceptos, préstamos)
fueron eliminados porque interferían con el servicio CalculadorNomina que
maneja todo el cálculo de forma atómica. Lo mismo para la desactivación
de contratos, que ya se maneja en Contrato.save().

Autor: Sistema CorteSec
Versión: 2.1.0
Fecha: Febrero 2026
"""

import logging
from decimal import Decimal

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import (
    NominaSimple,
    NominaItem,
    ConceptoLaboral,
)

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# SEÑALES PARA NÓMINA
# ══════════════════════════════════════════════════════════════════════════════

@receiver(pre_save, sender=NominaSimple)
def generar_numero_nomina(sender, instance, **kwargs):
    """
    Genera automáticamente el número de nómina si no existe.
    Formato: NOM-YYYY-NNNNNN
    
    Usa Max() para encontrar el último número secuencial,
    evitando colisiones cuando se borran nóminas intermedias.
    """
    if not instance.numero:
        from datetime import datetime
        from django.db.models import Max
        
        year = datetime.now().year
        prefix = f"NOM-{year}-"
        
        # Buscar el último número para este año y organización
        ultimo = NominaSimple.objects.filter(
            organization=instance.organization,
            numero__startswith=prefix
        ).aggregate(
            max_numero=Max('numero')
        )['max_numero']
        
        if ultimo:
            try:
                ultimo_secuencia = int(ultimo.replace(prefix, ''))
                nueva_secuencia = ultimo_secuencia + 1
            except ValueError:
                nueva_secuencia = 1
        else:
            nueva_secuencia = 1
        
        instance.numero = f"{prefix}{nueva_secuencia:06d}"


# ══════════════════════════════════════════════════════════════════════════════
# SEÑALES PARA ITEMS DE NÓMINA
# ══════════════════════════════════════════════════════════════════════════════

@receiver(pre_save, sender=NominaItem)
def calcular_valor_total_item(sender, instance, **kwargs):
    """
    Calcula automáticamente el valor total del item antes de guardar.
    valor_total = cantidad * valor_unitario
    """
    instance.valor_total = instance.cantidad * instance.valor_unitario


# ══════════════════════════════════════════════════════════════════════════════
# SEÑALES PARA AUTO-CREAR CONCEPTOS LEGALES
# ══════════════════════════════════════════════════════════════════════════════

# Conceptos legales que el CalculadorNomina NECESITA para funcionar.
# Se crean automáticamente cuando se crea una nueva organización.
CONCEPTOS_LEGALES_REQUERIDOS = [
    # Deducciones legales obligatorias
    {
        'codigo': 'SALUD_EMPLEADO',
        'nombre': 'Aporte Salud Empleado',
        'tipo': 'DEDUCCION',
        'descripcion': 'Descuento salud empleado (4%) - Ley 100/1993',
        'aplica_porcentaje': True,
        'porcentaje': Decimal('4.00'),
        'base_calculo': 'IBC',
        'es_legal': True,
        'orden': 1,
    },
    {
        'codigo': 'PENSION_EMPLEADO',
        'nombre': 'Aporte Pensión Empleado',
        'tipo': 'DEDUCCION',
        'descripcion': 'Descuento pensión empleado (4%) - Ley 100/1993',
        'aplica_porcentaje': True,
        'porcentaje': Decimal('4.00'),
        'base_calculo': 'IBC',
        'es_legal': True,
        'orden': 2,
    },
    {
        'codigo': 'FSP',
        'nombre': 'Fondo de Solidaridad Pensional',
        'tipo': 'DEDUCCION',
        'descripcion': 'Fondo solidaridad pensional (1% si IBC > 4 SMMLV)',
        'aplica_porcentaje': True,
        'porcentaje': Decimal('1.00'),
        'base_calculo': 'IBC',
        'es_legal': True,
        'orden': 3,
    },
    {
        'codigo': 'SUBSISTENCIA',
        'nombre': 'Aporte Subsistencia',
        'tipo': 'DEDUCCION',
        'descripcion': 'Aporte adicional subsistencia (1% si IBC > 16 SMMLV)',
        'aplica_porcentaje': True,
        'porcentaje': Decimal('1.00'),
        'base_calculo': 'IBC',
        'es_legal': True,
        'orden': 4,
    },
    {
        'codigo': 'RESTAURANTE',
        'nombre': 'Deducción Restaurante',
        'tipo': 'DEDUCCION',
        'descripcion': 'Descuento por servicio de alimentación/restaurante',
        'aplica_porcentaje': False,
        'porcentaje': Decimal('0.00'),
        'base_calculo': 'SALARIO',
        'es_legal': False,
        'orden': 10,
    },
]


def crear_conceptos_legales_para_organizacion(organization):
    """
    Crea los conceptos laborales legales requeridos por el calculador.
    Usa update_or_create para ser idempotente (se puede ejecutar múltiples veces).
    """
    creados = 0
    for concepto_data in CONCEPTOS_LEGALES_REQUERIDOS:
        _, created = ConceptoLaboral.objects.update_or_create(
            organization=organization,
            codigo=concepto_data['codigo'],
            defaults={
                'nombre': concepto_data['nombre'],
                'tipo': concepto_data['tipo'],
                'descripcion': concepto_data['descripcion'],
                'aplica_porcentaje': concepto_data['aplica_porcentaje'],
                'porcentaje': concepto_data['porcentaje'],
                'base_calculo': concepto_data['base_calculo'],
                'es_legal': concepto_data['es_legal'],
                'orden': concepto_data['orden'],
                'activo': True,
            }
        )
        if created:
            creados += 1
    return creados


try:
    from core.models import Organizacion

    @receiver(post_save, sender=Organizacion)
    def auto_crear_conceptos_legales(sender, instance, created, **kwargs):
        """
        Cuando se crea una nueva organización, crea automáticamente
        los conceptos laborales legales que el sistema necesita.
        """
        if created:
            try:
                creados = crear_conceptos_legales_para_organizacion(instance)
                logger.info(
                    f'Auto-creados {creados} conceptos legales para '
                    f'organización "{instance.nombre}"'
                )
            except Exception as e:
                logger.error(
                    f'Error al crear conceptos legales para '
                    f'"{instance.nombre}": {e}'
                )
except ImportError:
    # Si core no está disponible, no registrar el signal
    pass
