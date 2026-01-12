"""
Integrador Contable para Nómina

Este servicio genera asientos contables automáticos desde el procesamiento de nómina,
integrándose con el módulo de contabilidad.

Funcionalidades:
- Generación automática de asientos contables por nómina
- Mapeo de conceptos laborales a cuentas PUC
- Distribución por centros de costo
- Validación de cuadre (débito = crédito)
- Contabilización masiva de períodos

Normatividad:
- Decreto 2420/2015: Plan Único de Cuentas PUC
- Estándar Internacional de Contabilidad NIC 19: Beneficios a Empleados
"""

from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import date
from typing import List, Dict, Optional
import logging

from payroll.models import (
    NominaBase, DetalleConceptoBase, AsientoNomina, DetalleAsientoNomina,
    ConceptoLaboral, CentroCosto
)

logger = logging.getLogger(__name__)


# ============================================================================
# MAPEO CONCEPTOS → CUENTAS PUC
# ============================================================================

class MapeoConceptosCuentas:
    """
    Mapeo de conceptos laborales a cuentas contables PUC.
    
    Estructura PUC para nómina:
    - 51: Gastos operacionales de administración
      * 5105: Gastos de personal
        - 510506: Sueldos y salarios
        - 510527: Auxilio de transporte
        - 510530: Cesantías
        - 510533: Intereses sobre cesantías
        - 510536: Primas
        - 510539: Vacaciones
    
    - 23: Cuentas por pagar
      * 2365: Retención en la fuente
      * 2370: Retenciones y aportes de nómina
        - 237005: Aportes a EPS
        - 237006: Aportes a pensión
        - 237010: Aportes ARL
        - 237025: Embargos judiciales
    
    - 25: Obligaciones laborales
      * 2505: Salarios por pagar
      * 2510: Cesantías consolidadas
      * 2515: Intereses sobre cesantías
      * 2520: Prima de servicios
      * 2525: Vacaciones consolidadas
    """
    
    # Mapeo por defecto (puede personalizarse por organización)
    MAPEO_DEFAULT = {
        # === DEVENGADOS ===
        'SALARIO_BASICO': {
            'cuenta_debito': '510506',  # Sueldos y salarios
            'cuenta_credito': '250501',  # Salarios por pagar
            'nombre': 'Salario Básico'
        },
        'AUXILIO_TRANSPORTE': {
            'cuenta_debito': '510527',
            'cuenta_credito': '250501',
            'nombre': 'Auxilio de Transporte'
        },
        'HORAS_EXTRAS': {
            'cuenta_debito': '510506',
            'cuenta_credito': '250501',
            'nombre': 'Horas Extras'
        },
        'RECARGOS_NOCTURNOS': {
            'cuenta_debito': '510506',
            'cuenta_credito': '250501',
            'nombre': 'Recargos Nocturnos'
        },
        'DOMINICALES_FESTIVOS': {
            'cuenta_debito': '510506',
            'cuenta_credito': '250501',
            'nombre': 'Dominicales y Festivos'
        },
        'COMISIONES': {
            'cuenta_debito': '510506',
            'cuenta_credito': '250501',
            'nombre': 'Comisiones'
        },
        'BONIFICACIONES': {
            'cuenta_debito': '510506',
            'cuenta_credito': '250501',
            'nombre': 'Bonificaciones'
        },
        
        # === PROVISIONES ===
        'CESANTIAS': {
            'cuenta_debito': '510530',
            'cuenta_credito': '251005',  # Cesantías consolidadas
            'nombre': 'Cesantías'
        },
        'INTERESES_CESANTIAS': {
            'cuenta_debito': '510533',
            'cuenta_credito': '251505',  # Intereses cesantías
            'nombre': 'Intereses sobre Cesantías'
        },
        'PRIMA_SERVICIOS': {
            'cuenta_debito': '510536',
            'cuenta_credito': '252005',  # Prima de servicios
            'nombre': 'Prima de Servicios'
        },
        'VACACIONES': {
            'cuenta_debito': '510539',
            'cuenta_credito': '252505',  # Vacaciones consolidadas
            'nombre': 'Vacaciones'
        },
        
        # === SEGURIDAD SOCIAL (Empleador) ===
        'APORTE_SALUD_EMPLEADOR': {
            'cuenta_debito': '510568',  # Aportes EPS
            'cuenta_credito': '237005',  # EPS por pagar
            'nombre': 'Aporte Salud Empleador'
        },
        'APORTE_PENSION_EMPLEADOR': {
            'cuenta_debito': '510569',  # Aportes pensión
            'cuenta_credito': '237006',  # Pensión por pagar
            'nombre': 'Aporte Pensión Empleador'
        },
        'APORTE_ARL': {
            'cuenta_debito': '510572',  # ARL
            'cuenta_credito': '237010',  # ARL por pagar
            'nombre': 'Aporte ARL'
        },
        'APORTE_CAJA': {
            'cuenta_debito': '510568',  # Caja compensación
            'cuenta_credito': '237015',  # Caja por pagar
            'nombre': 'Aporte Caja Compensación'
        },
        'APORTE_SENA': {
            'cuenta_debito': '510568',
            'cuenta_credito': '237020',  # SENA por pagar
            'nombre': 'Aporte SENA'
        },
        'APORTE_ICBF': {
            'cuenta_debito': '510568',
            'cuenta_credito': '237022',  # ICBF por pagar
            'nombre': 'Aporte ICBF'
        },
        
        # === DEDUCCIONES ===
        'APORTE_SALUD_EMPLEADO': {
            'cuenta_debito': '250501',  # Salarios por pagar
            'cuenta_credito': '237005',  # EPS por pagar
            'nombre': 'Aporte Salud Empleado'
        },
        'APORTE_PENSION_EMPLEADO': {
            'cuenta_debito': '250501',
            'cuenta_credito': '237006',
            'nombre': 'Aporte Pensión Empleado'
        },
        'RETENCION_FUENTE': {
            'cuenta_debito': '250501',
            'cuenta_credito': '236505',  # Retención fuente por pagar
            'nombre': 'Retención en la Fuente'
        },
        'EMBARGO_JUDICIAL': {
            'cuenta_debito': '250501',
            'cuenta_credito': '237025',  # Embargos por pagar
            'nombre': 'Embargo Judicial'
        },
        'PRESTAMO': {
            'cuenta_debito': '250501',
            'cuenta_credito': '233595',  # Otras cuentas por pagar
            'nombre': 'Descuento Préstamo'
        },
    }
    
    @classmethod
    def obtener_cuentas(cls, concepto: ConceptoLaboral) -> Dict:
        """
        Obtiene las cuentas contables para un concepto.
        
        Args:
            concepto (ConceptoLaboral): Concepto laboral
        
        Returns:
            dict: {
                'cuenta_debito': str,
                'cuenta_credito': str,
                'nombre': str
            }
        """
        # Buscar por código del concepto
        codigo_concepto = concepto.codigo.upper()
        
        if codigo_concepto in cls.MAPEO_DEFAULT:
            return cls.MAPEO_DEFAULT[codigo_concepto]
        
        # Si no hay mapeo específico, usar cuentas genéricas según naturaleza
        if concepto.naturaleza == 'DEVENGADO':
            return {
                'cuenta_debito': '510506',  # Sueldos y salarios
                'cuenta_credito': '250501',  # Salarios por pagar
                'nombre': concepto.nombre
            }
        elif concepto.naturaleza == 'DEDUCCION':
            return {
                'cuenta_debito': '250501',  # Salarios por pagar
                'cuenta_credito': '233595',  # Otras cuentas por pagar
                'nombre': concepto.nombre
            }
        else:
            logger.warning(f"Concepto sin mapeo contable: {concepto.codigo}")
            return {
                'cuenta_debito': '510506',
                'cuenta_credito': '250501',
                'nombre': concepto.nombre
            }


# ============================================================================
# INTEGRADOR CONTABLE
# ============================================================================

class AccountingIntegrator:
    """
    Integrador de nómina con contabilidad.
    
    Responsabilidades:
    - Generar asientos contables desde nóminas procesadas
    - Distribuir por centros de costo
    - Validar cuadre contable
    - Contabilizar masivamente
    """
    
    def __init__(self, organization):
        """
        Inicializa el integrador.
        
        Args:
            organization: Organización
        """
        self.organization = organization
        self.errores = []
    
    @transaction.atomic
    def contabilizar_nomina(self, nomina: NominaBase, centro_costo: Optional[CentroCosto] = None) -> AsientoNomina:
        """
        Genera asiento contable para una nómina.
        
        Args:
            nomina (NominaBase): Nómina a contabilizar
            centro_costo (CentroCosto, optional): Centro de costo específico
        
        Returns:
            AsientoNomina: Asiento contable generado
        
        Raises:
            ValueError: Si el asiento no cuadra
        """
        # Validar que la nómina esté aprobada
        if nomina.estado != 'aprobado':
            raise ValueError(f"La nómina {nomina.id} no está aprobada")
        
        # Verificar si ya tiene asiento
        if hasattr(nomina, 'asiento_contable') and nomina.asiento_contable:
            logger.warning(f"La nómina {nomina.id} ya tiene asiento contable")
            return nomina.asiento_contable
        
        # Obtener centro de costo
        if not centro_costo:
            centro_costo = nomina.empleado.centro_costo
        
        # Crear asiento
        asiento = AsientoNomina.objects.create(
            organization=self.organization,
            nomina_base=nomina,
            numero_comprobante=self._generar_numero_comprobante(),
            fecha_comprobante=nomina.fecha_procesamiento or timezone.now().date(),
            centro_costo=centro_costo,
            estado='borrador',
            observaciones=f"Asiento automático nómina empleado {nomina.empleado.numero_documento}"
        )
        
        # Generar detalles del asiento
        self._generar_detalles_asiento(asiento, nomina)
        
        # Validar cuadre
        if not self._validar_cuadre(asiento):
            asiento.delete()
            raise ValueError(
                f"El asiento de nómina {nomina.id} no cuadra: "
                f"Débito={asiento.total_debito}, Crédito={asiento.total_credito}"
            )
        
        # Marcar como aprobado
        asiento.estado = 'aprobado'
        asiento.fecha_aprobacion = timezone.now()
        asiento.save()
        
        logger.info(
            f"Asiento contable generado: {asiento.numero_comprobante} - "
            f"Nómina {nomina.id}"
        )
        
        return asiento
    
    def _generar_detalles_asiento(self, asiento: AsientoNomina, nomina: NominaBase):
        """
        Genera los detalles del asiento contable.
        
        Args:
            asiento (AsientoNomina): Asiento a poblar
            nomina (NominaBase): Nómina origen
        """
        # Obtener detalles de conceptos de la nómina
        detalles_conceptos = DetalleConceptoBase.objects.filter(
            nomina=nomina
        ).select_related('concepto')
        
        for detalle in detalles_conceptos:
            concepto = detalle.concepto
            valor = detalle.valor
            
            if valor == 0:
                continue
            
            # Obtener cuentas del mapeo
            mapeo = MapeoConceptosCuentas.obtener_cuentas(concepto)
            
            # Crear detalle débito
            DetalleAsientoNomina.objects.create(
                asiento_nomina=asiento,
                cuenta_codigo=mapeo['cuenta_debito'],
                cuenta_nombre=mapeo['nombre'],
                naturaleza='DEBITO',
                valor=abs(valor),
                concepto_laboral=concepto,
                empleado=nomina.empleado,
                observaciones=f"{concepto.nombre} - {nomina.empleado.numero_documento}"
            )
            
            # Crear detalle crédito
            DetalleAsientoNomina.objects.create(
                asiento_nomina=asiento,
                cuenta_codigo=mapeo['cuenta_credito'],
                cuenta_nombre=mapeo['nombre'],
                naturaleza='CREDITO',
                valor=abs(valor),
                concepto_laboral=concepto,
                empleado=nomina.empleado,
                observaciones=f"{concepto.nombre} - {nomina.empleado.numero_documento}"
            )
        
        # Actualizar totales del asiento
        asiento.actualizar_totales()
    
    def _validar_cuadre(self, asiento: AsientoNomina) -> bool:
        """
        Valida que el asiento cuadre (débito = crédito).
        
        Args:
            asiento (AsientoNomina): Asiento a validar
        
        Returns:
            bool: True si cuadra
        """
        diferencia = abs(asiento.total_debito - asiento.total_credito)
        tolerancia = Decimal('0.01')  # 1 centavo de tolerancia
        
        return diferencia <= tolerancia
    
    def _generar_numero_comprobante(self) -> str:
        """
        Genera número consecutivo de comprobante.
        
        Returns:
            str: Número de comprobante (ej: "ASI-2026-00001")
        """
        anio_actual = timezone.now().year
        
        # Obtener último comprobante del año
        ultimo = AsientoNomina.objects.filter(
            organization=self.organization,
            fecha_comprobante__year=anio_actual
        ).order_by('-numero_comprobante').first()
        
        if ultimo and ultimo.numero_comprobante:
            # Extraer número del formato "ASI-2026-00001"
            try:
                partes = ultimo.numero_comprobante.split('-')
                ultimo_numero = int(partes[-1])
                nuevo_numero = ultimo_numero + 1
            except:
                nuevo_numero = 1
        else:
            nuevo_numero = 1
        
        return f"ASI-{anio_actual}-{nuevo_numero:05d}"
    
    @transaction.atomic
    def contabilizar_lote(self, nominas: List[NominaBase]) -> Dict:
        """
        Contabiliza un lote de nóminas.
        
        Args:
            nominas (List[NominaBase]): Lista de nóminas
        
        Returns:
            dict: Resultado de la contabilización
        """
        resultado = {
            'total_nominas': len(nominas),
            'exitosas': 0,
            'fallidas': 0,
            'asientos_generados': [],
            'errores': []
        }
        
        for nomina in nominas:
            try:
                asiento = self.contabilizar_nomina(nomina)
                resultado['exitosas'] += 1
                resultado['asientos_generados'].append({
                    'nomina_id': nomina.id,
                    'asiento_id': asiento.id,
                    'numero_comprobante': asiento.numero_comprobante,
                    'total': asiento.total_debito
                })
            except Exception as e:
                resultado['fallidas'] += 1
                resultado['errores'].append({
                    'nomina_id': nomina.id,
                    'empleado': nomina.empleado.numero_documento,
                    'error': str(e)
                })
                logger.error(
                    f"Error contabilizando nómina {nomina.id}: {str(e)}",
                    exc_info=True
                )
        
        logger.info(
            f"Contabilización lote: {resultado['exitosas']} exitosas, "
            f"{resultado['fallidas']} fallidas"
        )
        
        return resultado
    
    @staticmethod
    def obtener_resumen_contable(organization, fecha_desde: date, fecha_hasta: date) -> Dict:
        """
        Genera resumen contable de nómina por período.
        
        Args:
            organization: Organización
            fecha_desde (date): Fecha inicio
            fecha_hasta (date): Fecha fin
        
        Returns:
            dict: Resumen con totales por cuenta
        """
        from django.db.models import Sum, Count
        
        # Obtener asientos del período
        asientos = AsientoNomina.objects.filter(
            organization=organization,
            fecha_comprobante__gte=fecha_desde,
            fecha_comprobante__lte=fecha_hasta,
            estado='aprobado'
        )
        
        # Totales generales
        totales = asientos.aggregate(
            total_debito=Sum('total_debito'),
            total_credito=Sum('total_credito'),
            cantidad_asientos=Count('id')
        )
        
        # Totales por cuenta (débito)
        detalles_debito = DetalleAsientoNomina.objects.filter(
            asiento_nomina__in=asientos,
            naturaleza='DEBITO'
        ).values('cuenta_codigo', 'cuenta_nombre').annotate(
            total=Sum('valor'),
            cantidad=Count('id')
        ).order_by('-total')
        
        # Totales por cuenta (crédito)
        detalles_credito = DetalleAsientoNomina.objects.filter(
            asiento_nomina__in=asientos,
            naturaleza='CREDITO'
        ).values('cuenta_codigo', 'cuenta_nombre').annotate(
            total=Sum('valor'),
            cantidad=Count('id')
        ).order_by('-total')
        
        return {
            'periodo': {
                'desde': fecha_desde.isoformat(),
                'hasta': fecha_hasta.isoformat()
            },
            'totales': totales,
            'cuentas_debito': list(detalles_debito),
            'cuentas_credito': list(detalles_credito)
        }
