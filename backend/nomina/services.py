"""
╔══════════════════════════════════════════════════════════════════════════════╗
║               SERVICIO DE CÁLCULO DE NÓMINA - CORTESEC                        ║
║                Sistema de Nómina para Construcción                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Servicio completo para cálculo automático de nómina:
- Cálculo de IBC según tipo de contrato
- Aportes de seguridad social (salud, pensión, ARL)
- Parafiscales (caja, SENA, ICBF)
- Conceptos laborales configurables
- Descuentos de préstamos
- Items de trabajo (producción)

SIN VALORES QUEMADOS: Todo se obtiene de ParametroLegal.

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: Enero 2026
"""

from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from django.db import transaction

from .models import (
    NominaSimple,
    NominaConcepto,
    NominaPrestamo,
    ParametroLegal,
    ConceptoLaboral,
)


class CalculadorNomina:
    """
    Servicio para calcular la nómina de un empleado.
    
    Uso:
        calculador = CalculadorNomina(nomina)
        resultado = calculador.calcular()
    """
    
    def __init__(self, nomina: NominaSimple):
        """
        Inicializa el calculador.
        
        Args:
            nomina: Instancia de NominaSimple a calcular
        """
        self.nomina = nomina
        self.contrato = nomina.contrato
        self.empleado = nomina.contrato.empleado
        self.tipo_contrato = nomina.contrato.tipo_contrato
        self.organization = nomina.organization
        self.fecha_calculo = nomina.periodo_fin or timezone.now().date()
        
        # Caché de parámetros legales
        self._parametros_cache = {}
        
        # Acumuladores
        self.total_devengado = Decimal('0.00')
        self.total_deducciones = Decimal('0.00')
        self.total_items = Decimal('0.00')
        self.total_prestamos = Decimal('0.00')
    
    def _obtener_parametro(self, concepto: str) -> ParametroLegal:
        """
        Obtiene un parámetro legal de la caché o BD.
        
        Args:
            concepto: Código del concepto (SALUD, PENSION, etc.)
        
        Returns:
            ParametroLegal o None
        """
        if concepto not in self._parametros_cache:
            self._parametros_cache[concepto] = ParametroLegal.obtener_vigente(
                self.organization,
                concepto,
                self.fecha_calculo
            )
        return self._parametros_cache[concepto]
    
    def _redondear(self, valor: Decimal) -> Decimal:
        """Redondea a 2 decimales"""
        return valor.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def _calcular_sobre_ibc(self, porcentaje: Decimal, ibc: Decimal) -> Decimal:
        """Calcula un valor sobre el IBC"""
        return self._redondear(ibc * porcentaje / Decimal('100'))
    
    @transaction.atomic
    def calcular(self) -> dict:
        """
        Ejecuta el cálculo completo de la nómina.
        
        Returns:
            dict: Resumen del cálculo
        """
        # 1. Establecer valores base
        salario = self.contrato.salario
        ibc = self.contrato.ibc  # Ya calcula según ibc_porcentaje del tipo de contrato
        
        self.nomina.salario_base = salario
        self.nomina.ibc = ibc
        
        # 2. Calcular items de trabajo (producción)
        self._calcular_items()
        
        # 3. Calcular devengado inicial (salario + items)
        self.total_devengado = salario + self.total_items
        
        # 4. Calcular auxilio de transporte (si aplica)
        self._calcular_auxilio_transporte()
        
        # 5. Calcular conceptos laborales DEVENGADOS
        self._calcular_conceptos_devengados()
        
        # 6. Calcular aportes seguridad social (deducciones empleado)
        self._calcular_seguridad_social()
        
        # 7. Calcular conceptos laborales DEDUCCIONES
        self._calcular_conceptos_deducciones()
        
        # 8. Calcular descuentos de préstamos
        self._calcular_prestamos()
        
        # 9. Calcular aportes empleador (informativos)
        self._calcular_aportes_empleador()
        
        # 10. Calcular totales finales
        self._calcular_totales()
        
        # 11. Actualizar estado
        self.nomina.estado = 'calculada'
        self.nomina.calculada_at = timezone.now()
        self.nomina.save()
        
        return self._generar_resumen()
    
    def _calcular_items(self):
        """Calcula el total de items de trabajo"""
        items = self.nomina.items.all()
        self.total_items = sum(item.valor_total for item in items)
        self.nomina.total_items = self.total_items
    
    def _calcular_auxilio_transporte(self):
        """
        Calcula auxilio de transporte si aplica.
        
        El auxilio aplica si el salario es menor o igual a 2 SMMLV.
        """
        param_smmlv = self._obtener_parametro('SMMLV')
        param_aux = self._obtener_parametro('AUX_TRANSPORTE')
        
        if not param_smmlv or not param_aux:
            return
        
        smmlv = param_smmlv.valor_fijo
        aux_transporte = param_aux.valor_fijo
        
        # Aplica si salario <= 2 SMMLV
        if self.nomina.salario_base <= (smmlv * 2):
            # Crear concepto de auxilio de transporte
            concepto_aux = ConceptoLaboral.objects.filter(
                organization=self.organization,
                codigo='AUX_TRANSPORTE',
                activo=True
            ).first()
            
            if concepto_aux:
                NominaConcepto.objects.update_or_create(
                    organization=self.organization,
                    nomina=self.nomina,
                    concepto=concepto_aux,
                    defaults={
                        'base': self.nomina.salario_base,
                        'porcentaje_aplicado': Decimal('0'),
                        'valor': aux_transporte,
                        'tipo': 'DEVENGADO',
                    }
                )
                self.total_devengado += aux_transporte
    
    def _calcular_conceptos_devengados(self):
        """Calcula conceptos laborales de tipo DEVENGADO"""
        conceptos = ConceptoLaboral.objects.filter(
            organization=self.organization,
            tipo='DEVENGADO',
            activo=True,
            es_legal=False,  # Los legales se manejan aparte
        ).order_by('orden')
        
        for concepto in conceptos:
            # Determinar base de cálculo
            if concepto.base_calculo == 'SALARIO':
                base = self.nomina.salario_base
            elif concepto.base_calculo == 'IBC':
                base = self.nomina.ibc
            else:  # DEVENGADO
                base = self.total_devengado
            
            # Calcular valor
            valor = concepto.calcular_valor(base)
            
            if valor > 0:
                NominaConcepto.objects.update_or_create(
                    organization=self.organization,
                    nomina=self.nomina,
                    concepto=concepto,
                    defaults={
                        'base': base,
                        'porcentaje_aplicado': concepto.porcentaje if concepto.aplica_porcentaje else Decimal('0'),
                        'valor': valor,
                        'tipo': 'DEVENGADO',
                    }
                )
                self.total_devengado += valor
    
    def _calcular_seguridad_social(self):
        """
        Calcula aportes de seguridad social (deducciones del empleado).
        
        Solo aplica según configuración del tipo de contrato.
        """
        ibc = self.nomina.ibc
        
        # SALUD (empleado)
        if self.tipo_contrato.aplica_salud:
            param = self._obtener_parametro('SALUD')
            if param and param.porcentaje_empleado > 0:
                valor = self._calcular_sobre_ibc(param.porcentaje_empleado, ibc)
                self._crear_concepto_legal('SALUD_EMPLEADO', 'Salud', 'DEDUCCION', ibc, param.porcentaje_empleado, valor)
                self.total_deducciones += valor
        
        # PENSIÓN (empleado)
        if self.tipo_contrato.aplica_pension:
            param = self._obtener_parametro('PENSION')
            if param and param.porcentaje_empleado > 0:
                valor = self._calcular_sobre_ibc(param.porcentaje_empleado, ibc)
                self._crear_concepto_legal('PENSION_EMPLEADO', 'Pensión', 'DEDUCCION', ibc, param.porcentaje_empleado, valor)
                self.total_deducciones += valor
    
    def _calcular_conceptos_deducciones(self):
        """Calcula conceptos laborales de tipo DEDUCCION"""
        conceptos = ConceptoLaboral.objects.filter(
            organization=self.organization,
            tipo='DEDUCCION',
            activo=True,
            es_legal=False,  # Los legales se manejan aparte
        ).order_by('orden')
        
        for concepto in conceptos:
            # Determinar base de cálculo
            if concepto.base_calculo == 'SALARIO':
                base = self.nomina.salario_base
            elif concepto.base_calculo == 'IBC':
                base = self.nomina.ibc
            else:  # DEVENGADO
                base = self.total_devengado
            
            # Calcular valor
            valor = concepto.calcular_valor(base)
            
            if valor > 0:
                NominaConcepto.objects.update_or_create(
                    organization=self.organization,
                    nomina=self.nomina,
                    concepto=concepto,
                    defaults={
                        'base': base,
                        'porcentaje_aplicado': concepto.porcentaje if concepto.aplica_porcentaje else Decimal('0'),
                        'valor': valor,
                        'tipo': 'DEDUCCION',
                    }
                )
                self.total_deducciones += valor
    
    def _calcular_prestamos(self):
        """Calcula descuentos por préstamos activos del empleado"""
        from prestamos.models import Prestamo
        
        # Obtener préstamos activos del empleado
        prestamos = Prestamo.objects.filter(
            organization=self.organization,
            empleado=self.empleado,
            estado='activo'
        )
        
        # Limpiar préstamos anteriores de esta nómina
        self.nomina.prestamos.all().delete()
        
        for prestamo in prestamos:
            # Obtener cuotas pendientes
            cuotas_pendientes = prestamo.cuotas_pendientes if hasattr(prestamo, 'cuotas_pendientes') else 0
            
            if cuotas_pendientes > 0 or hasattr(prestamo, 'valor_cuota'):
                valor_cuota = getattr(prestamo, 'valor_cuota', Decimal('0'))
                
                if valor_cuota > 0:
                    # Determinar número de cuota
                    cuotas_pagadas = NominaPrestamo.objects.filter(
                        organization=self.organization,
                        prestamo=prestamo
                    ).count()
                    
                    NominaPrestamo.objects.create(
                        organization=self.organization,
                        nomina=self.nomina,
                        prestamo=prestamo,
                        valor_cuota=valor_cuota,
                        numero_cuota=cuotas_pagadas + 1,
                    )
                    
                    self.total_prestamos += valor_cuota
        
        self.nomina.total_prestamos = self.total_prestamos
    
    def _calcular_aportes_empleador(self):
        """
        Calcula aportes del empleador (informativos).
        
        Estos no se descuentan al empleado pero son costo para la empresa.
        """
        ibc = self.nomina.ibc
        
        # SALUD (empleador)
        if self.tipo_contrato.aplica_salud:
            param = self._obtener_parametro('SALUD')
            if param:
                self.nomina.aporte_salud_empleador = self._calcular_sobre_ibc(
                    param.porcentaje_empleador, ibc
                )
        
        # PENSIÓN (empleador)
        if self.tipo_contrato.aplica_pension:
            param = self._obtener_parametro('PENSION')
            if param:
                self.nomina.aporte_pension_empleador = self._calcular_sobre_ibc(
                    param.porcentaje_empleador, ibc
                )
        
        # ARL (100% empleador)
        if self.tipo_contrato.aplica_arl:
            nivel = self.contrato.nivel_arl
            param = self._obtener_parametro(f'ARL_{nivel}')
            if param:
                self.nomina.aporte_arl = self._calcular_sobre_ibc(
                    param.porcentaje_total, ibc
                )
        
        # PARAFISCALES
        if self.tipo_contrato.aplica_parafiscales:
            # Caja de Compensación
            param = self._obtener_parametro('CAJA')
            if param:
                self.nomina.aporte_caja = self._calcular_sobre_ibc(
                    param.porcentaje_total, ibc
                )
            
            # SENA
            param = self._obtener_parametro('SENA')
            if param:
                self.nomina.aporte_sena = self._calcular_sobre_ibc(
                    param.porcentaje_total, ibc
                )
            
            # ICBF
            param = self._obtener_parametro('ICBF')
            if param:
                self.nomina.aporte_icbf = self._calcular_sobre_ibc(
                    param.porcentaje_total, ibc
                )
    
    def _calcular_totales(self):
        """Calcula los totales finales de la nómina"""
        self.nomina.total_devengado = self._redondear(self.total_devengado)
        self.nomina.total_deducciones = self._redondear(self.total_deducciones)
        self.nomina.total_prestamos = self._redondear(self.total_prestamos)
        
        self.nomina.total_pagar = self._redondear(
            self.total_devengado - self.total_deducciones - self.total_prestamos
        )
    
    def _crear_concepto_legal(self, codigo: str, nombre: str, tipo: str, 
                               base: Decimal, porcentaje: Decimal, valor: Decimal):
        """Crea o actualiza un concepto legal en la nómina"""
        # Buscar o crear concepto laboral
        concepto, _ = ConceptoLaboral.objects.get_or_create(
            organization=self.organization,
            codigo=codigo,
            defaults={
                'nombre': nombre,
                'tipo': tipo,
                'aplica_porcentaje': True,
                'porcentaje': porcentaje,
                'es_legal': True,
                'activo': True,
            }
        )
        
        NominaConcepto.objects.update_or_create(
            organization=self.organization,
            nomina=self.nomina,
            concepto=concepto,
            defaults={
                'base': base,
                'porcentaje_aplicado': porcentaje,
                'valor': valor,
                'tipo': tipo,
            }
        )
    
    def _generar_resumen(self) -> dict:
        """Genera el resumen del cálculo"""
        # Obtener conceptos desglosados
        conceptos = self.nomina.conceptos.all()
        devengados = conceptos.filter(tipo='DEVENGADO')
        deducciones = conceptos.filter(tipo='DEDUCCION')
        
        # Calcular subtotales
        salud_empleado = sum(
            c.valor for c in deducciones 
            if 'SALUD' in c.concepto.codigo
        )
        pension_empleado = sum(
            c.valor for c in deducciones 
            if 'PENSION' in c.concepto.codigo
        )
        otras_deducciones = self.nomina.total_deducciones - salud_empleado - pension_empleado
        
        otros_devengados = sum(c.valor for c in devengados)
        
        return {
            'numero': self.nomina.numero,
            'empleado': self.empleado.nombre_completo,
            'periodo': f"{self.nomina.periodo_inicio} - {self.nomina.periodo_fin}",
            'salario_base': self.nomina.salario_base,
            'ibc': self.nomina.ibc,
            'total_items': self.nomina.total_items,
            'total_otros_devengados': otros_devengados,
            'total_devengado': self.nomina.total_devengado,
            'salud_empleado': salud_empleado,
            'pension_empleado': pension_empleado,
            'otras_deducciones': otras_deducciones,
            'total_deducciones': self.nomina.total_deducciones,
            'total_prestamos': self.nomina.total_prestamos,
            'total_pagar': self.nomina.total_pagar,
            'aportes_empleador': {
                'salud': self.nomina.aporte_salud_empleador,
                'pension': self.nomina.aporte_pension_empleador,
                'arl': self.nomina.aporte_arl,
                'caja': self.nomina.aporte_caja,
                'sena': self.nomina.aporte_sena,
                'icbf': self.nomina.aporte_icbf,
                'total': self.nomina.costo_total_empleador - self.nomina.total_devengado,
            },
            'costo_total_empleador': self.nomina.costo_total_empleador,
        }


def calcular_nomina(nomina: NominaSimple) -> dict:
    """
    Función utilitaria para calcular una nómina.
    
    Args:
        nomina: Instancia de NominaSimple
    
    Returns:
        dict: Resumen del cálculo
    
    Raises:
        ValueError: Si la nómina no puede calcularse
    """
    if nomina.estado not in ['borrador', 'calculada']:
        raise ValueError(f'No se puede calcular una nómina en estado {nomina.estado}')
    
    calculador = CalculadorNomina(nomina)
    return calculador.calcular()
