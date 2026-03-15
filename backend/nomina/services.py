"""
╔══════════════════════════════════════════════════════════════════════════════╗
║               SERVICIO DE CÁLCULO DE NÓMINA - CORTESEC                        ║
║                Sistema de Nómina para Construcción                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Servicio completo para cálculo automático de nómina:
- Cálculo de IBC según tipo de contrato
- Aportes de seguridad social (salud, pensión, ARL)
- Parafiscales (caja, SENA, ICBF)
- Conceptos laborales configurables (creados por el usuario)
- Descuentos de préstamos
- Items de trabajo (producción)

SIN VALORES QUEMADOS: Todo se obtiene de ParametroLegal.
SIN AUTO-CREACIÓN: Los conceptos laborales deben existir antes del cálculo.
  El usuario los configura desde la interfaz de Conceptos Laborales.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: Febrero 2026
"""

import logging
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

logger = logging.getLogger(__name__)


class NominaValidationError(Exception):
    """Error de validación de nómina con mensajes claros para el usuario."""
    pass


class CalculadorNomina:
    """
    Servicio para calcular la nómina de un empleado.
    
    PRINCIPIOS:
    - No auto-crea conceptos laborales (el usuario los configura)
    - No avanza fechas de préstamo (eso ocurre al PAGAR, no al calcular)
    - Cuenta solo cuotas de nóminas PAGADAS como descontadas
    - Compara ingreso real contra 2 SMMLV para auxilio de transporte
    
    Uso:
        calculador = CalculadorNomina(nomina)
        resultado = calculador.calcular()
    """
    
    def __init__(self, nomina: NominaSimple):
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
        
        # Errores de validación (advertencias no fatales)
        self.advertencias = []
    
    def _obtener_parametro(self, concepto: str) -> ParametroLegal:
        """Obtiene un parámetro legal de la caché o BD."""
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
    
    def _validar_prerequisitos(self):
        """
        Valida que existan los datos necesarios antes de calcular.
        Lanza NominaValidationError con mensajes claros si falta algo.
        """
        errores = []
        
        if not self.contrato:
            errores.append('La nómina no tiene contrato asignado.')
        
        if not self.tipo_contrato:
            errores.append('El contrato no tiene tipo de contrato asignado.')
        
        # Validar que existan parámetros legales básicos
        param_smmlv = self._obtener_parametro('SMMLV')
        if not param_smmlv:
            errores.append(
                'No se encontró el parámetro legal SMMLV (Salario Mínimo). '
                'Configure los Parámetros Legales en el módulo de Nómina.'
            )
        
        # Validar conceptos legales necesarios según tipo de contrato
        if self.tipo_contrato:
            if self.tipo_contrato.aplica_salud:
                concepto = ConceptoLaboral.objects.filter(
                    organization=self.organization,
                    codigo='SALUD_EMPLEADO',
                    activo=True
                ).first()
                if not concepto:
                    errores.append(
                        'No existe el concepto laboral "SALUD_EMPLEADO". '
                        'Créelo en Conceptos Laborales (tipo: Deducción, es legal: Sí).'
                    )
                param = self._obtener_parametro('SALUD')
                if not param:
                    errores.append(
                        'No se encontró el parámetro legal SALUD. '
                        'Configure los Parámetros Legales.'
                    )
            
            if self.tipo_contrato.aplica_pension:
                concepto = ConceptoLaboral.objects.filter(
                    organization=self.organization,
                    codigo='PENSION_EMPLEADO',
                    activo=True
                ).first()
                if not concepto:
                    errores.append(
                        'No existe el concepto laboral "PENSION_EMPLEADO". '
                        'Créelo en Conceptos Laborales (tipo: Deducción, es legal: Sí).'
                    )
                param = self._obtener_parametro('PENSION')
                if not param:
                    errores.append(
                        'No se encontró el parámetro legal PENSION. '
                        'Configure los Parámetros Legales.'
                    )
            
            if self.tipo_contrato.aplica_arl:
                nivel = self.contrato.nivel_arl
                param = self._obtener_parametro(f'ARL_NIVEL_{nivel}')
                if not param:
                    errores.append(
                        f'No se encontró el parámetro legal ARL_NIVEL_{nivel}. '
                        'Configure los Parámetros Legales con el nivel ARL del contrato.'
                    )
            
            if self.tipo_contrato.aplica_parafiscales:
                for codigo, nombre in [('CAJA_COMPENSACION', 'Caja de Compensación'), ('SENA', 'SENA'), ('ICBF', 'ICBF')]:
                    param = self._obtener_parametro(codigo)
                    if not param:
                        errores.append(
                            f'No se encontró el parámetro legal {codigo} ({nombre}). '
                            'Configure los Parámetros Legales.'
                        )
        
        if errores:
            raise NominaValidationError(
                'No se puede calcular la nómina. Faltan configuraciones:\n• ' +
                '\n• '.join(errores)
            )
    
    @transaction.atomic
    def calcular(self) -> dict:
        """
        Ejecuta el cálculo completo de la nómina.
        
        Returns:
            dict: Resumen del cálculo
            
        Raises:
            NominaValidationError: Si faltan configuraciones necesarias
        """
        # 0. Validar prerequisitos
        self._validar_prerequisitos()
        
        # 1. Establecer valores base
        salario = self.contrato.salario
        ibc = self.contrato.ibc
        
        self.nomina.salario_base = salario
        self.nomina.ibc = ibc
        
        # 2. Calcular items de trabajo (producción)
        self._calcular_items()
        
        # 3. Calcular devengado inicial (items por defecto)
        incluir_salario = getattr(self.nomina, 'incluir_salario_base', False)
        if self.total_items == 0:
            self.total_devengado = salario
        elif incluir_salario:
            self.total_devengado = salario + self.total_items
        else:
            self.total_devengado = self.total_items
        
        # 4. Calcular auxilio de transporte (si aplica)
        self._calcular_auxilio_transporte()
        
        # 5. Calcular conceptos laborales DEVENGADOS
        self._calcular_conceptos_devengados()
        
        # 6. Calcular aportes seguridad social (deducciones empleado)
        self._calcular_seguridad_social()
        
        # 7. Calcular conceptos laborales DEDUCCIONES
        self._calcular_conceptos_deducciones()

        # 7.1 Calcular deducción de restaurante (si aplica)
        self._calcular_restaurante()
        
        # 8. Calcular descuentos de préstamos (sin avanzar fechas)
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
        
        Según ley colombiana, el auxilio aplica si el INGRESO del empleado
        no supera 2 SMMLV. El ingreso real es el devengado base
        (salario o producción), no solo el salario base del contrato.
        
        NOTA: El concepto AUX_TRANSPORTE debe existir previamente.
        Si no existe, se ignora con advertencia.
        """
        param_smmlv = self._obtener_parametro('SMMLV')
        param_aux = self._obtener_parametro('AUXILIO_TRANSPORTE')
        
        if not param_smmlv or not param_aux:
            self.advertencias.append(
                'No se encontraron parámetros SMMLV o AUX_TRANSPORTE. '
                'El auxilio de transporte no fue calculado.'
            )
            return
        
        smmlv = param_smmlv.valor_fijo
        aux_transporte = param_aux.valor_fijo
        
        # Usar el ingreso real (devengado base antes de conceptos adicionales)
        # para determinar si aplica auxilio de transporte
        ingreso_real = self.total_devengado
        
        # Buscar concepto existente (NO crear automáticamente)
        concepto_aux = ConceptoLaboral.objects.filter(
            organization=self.organization,
            codigo__in=['AUX_TRANSPORTE', 'AUXILIO_TRANSPORTE'],
            activo=True
        ).first()
        
        if ingreso_real <= (smmlv * 2):
            if not concepto_aux:
                self.advertencias.append(
                    'El empleado califica para auxilio de transporte pero no existe '
                    'el concepto laboral AUX_TRANSPORTE. Créelo en Conceptos Laborales.'
                )
                return

            NominaConcepto.objects.update_or_create(
                organization=self.organization,
                nomina=self.nomina,
                concepto=concepto_aux,
                defaults={
                    'base': ingreso_real,
                    'porcentaje_aplicado': Decimal('0'),
                    'valor': aux_transporte,
                    'tipo': 'DEVENGADO',
                }
            )
            self.total_devengado += aux_transporte
        else:
            # Si no aplica, limpiar concepto de auxilio si existía
            if concepto_aux:
                self.nomina.conceptos.filter(concepto=concepto_aux).delete()
    
    def _calcular_conceptos_devengados(self):
        """Calcula conceptos laborales de tipo DEVENGADO seleccionados por el usuario"""
        # Limpiar conceptos devengados anteriores (no legales)
        self.nomina.conceptos.filter(
            tipo='DEVENGADO',
            concepto__es_legal=False
        ).delete()

        seleccionados = getattr(self.nomina, 'conceptos_seleccionados', None) or []
        if not seleccionados:
            return

        conceptos = ConceptoLaboral.objects.filter(
            organization=self.organization,
            tipo='DEVENGADO',
            activo=True,
            id__in=seleccionados,
        ).order_by('orden')
        
        for concepto in conceptos:
            if concepto.base_calculo == 'SALARIO':
                base = self.nomina.salario_base
            elif concepto.base_calculo == 'IBC':
                base = self.nomina.ibc
            else:  # DEVENGADO
                base = self.total_devengado
            
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
        
        REQUIERE que los conceptos legales existan previamente:
        - SALUD_EMPLEADO, PENSION_EMPLEADO, FSP, SUBSISTENCIA
        """
        ibc = self.nomina.ibc

        # SALUD (empleado)
        if self.tipo_contrato.aplica_salud:
            param = self._obtener_parametro('SALUD')
            if param and param.porcentaje_empleado > 0:
                valor = self._calcular_sobre_ibc(param.porcentaje_empleado, ibc)
                self._aplicar_concepto_legal(
                    'SALUD_EMPLEADO', 'DEDUCCION', ibc,
                    param.porcentaje_empleado, valor
                )
                self.total_deducciones += valor

        # PENSIÓN (empleado)
        if self.tipo_contrato.aplica_pension:
            param = self._obtener_parametro('PENSION')
            if param and param.porcentaje_empleado > 0:
                valor = self._calcular_sobre_ibc(param.porcentaje_empleado, ibc)
                self._aplicar_concepto_legal(
                    'PENSION_EMPLEADO', 'DEDUCCION', ibc,
                    param.porcentaje_empleado, valor
                )
                self.total_deducciones += valor

            # FONDO DE SOLIDARIDAD PENSIONAL (si IBC > 4 SMMLV)
            param_tope_fsp = self._obtener_parametro('TOPE_FSP')
            param_fsp = self._obtener_parametro('FSP')
            if param_tope_fsp and param_fsp and ibc > param_tope_fsp.valor_fijo:
                concepto_fsp = ConceptoLaboral.objects.filter(
                    organization=self.organization,
                    codigo='FSP',
                    activo=True
                ).first()
                if concepto_fsp:
                    valor_fsp = self._calcular_sobre_ibc(param_fsp.porcentaje_empleado, ibc)
                    self._aplicar_concepto_legal(
                        'FSP', 'DEDUCCION', ibc,
                        param_fsp.porcentaje_empleado, valor_fsp
                    )
                    self.total_deducciones += valor_fsp
                else:
                    self.advertencias.append(
                        'El IBC supera 4 SMMLV pero no existe el concepto FSP. '
                        'Créelo en Conceptos Laborales para aplicar Fondo de Solidaridad.'
                    )

            # APORTE SUBSISTENCIA (si IBC > 16 SMMLV)
            param_tope_sub = self._obtener_parametro('TOPE_SUBSISTENCIA')
            param_sub = self._obtener_parametro('SUBSISTENCIA')
            if param_tope_sub and param_sub and ibc > param_tope_sub.valor_fijo:
                concepto_sub = ConceptoLaboral.objects.filter(
                    organization=self.organization,
                    codigo='SUBSISTENCIA',
                    activo=True
                ).first()
                if concepto_sub:
                    valor_sub = self._calcular_sobre_ibc(param_sub.porcentaje_empleado, ibc)
                    self._aplicar_concepto_legal(
                        'SUBSISTENCIA', 'DEDUCCION', ibc,
                        param_sub.porcentaje_empleado, valor_sub
                    )
                    self.total_deducciones += valor_sub
                else:
                    self.advertencias.append(
                        'El IBC supera 16 SMMLV pero no existe el concepto SUBSISTENCIA. '
                        'Créelo en Conceptos Laborales.'
                    )
    
    def _calcular_conceptos_deducciones(self):
        """Calcula conceptos laborales de tipo DEDUCCION seleccionados por el usuario"""
        # Limpiar conceptos deducciones anteriores (no legales), excepto restaurante
        self.nomina.conceptos.filter(
            tipo='DEDUCCION',
            concepto__es_legal=False
        ).exclude(concepto__codigo='RESTAURANTE').delete()

        seleccionados = getattr(self.nomina, 'conceptos_seleccionados', None) or []
        if not seleccionados:
            return

        conceptos = ConceptoLaboral.objects.filter(
            organization=self.organization,
            tipo='DEDUCCION',
            activo=True,
            es_legal=False,
            id__in=seleccionados,
        ).order_by('orden')
        
        for concepto in conceptos:
            if concepto.codigo == 'RESTAURANTE':
                continue
            
            if concepto.base_calculo == 'SALARIO':
                base = self.nomina.salario_base
            elif concepto.base_calculo == 'IBC':
                base = self.nomina.ibc
            else:  # DEVENGADO
                base = self.total_devengado
            
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

    def _calcular_restaurante(self):
        """
        Aplica deducción de restaurante configurada en la nómina.
        REQUIERE que el concepto RESTAURANTE exista previamente.
        """
        valor_restaurante = getattr(self.nomina, 'valor_restaurante', Decimal('0.00')) or Decimal('0.00')
        tiene_descuento = getattr(self.nomina, 'tiene_deduccion_restaurante', False)

        concepto = ConceptoLaboral.objects.filter(
            organization=self.organization,
            codigo='RESTAURANTE'
        ).first()

        if not tiene_descuento or valor_restaurante <= 0:
            if concepto:
                self.nomina.conceptos.filter(concepto=concepto).delete()
            return

        if not concepto:
            self.advertencias.append(
                'Se configuró deducción de restaurante pero no existe el concepto '
                'laboral RESTAURANTE. Créelo en Conceptos Laborales (tipo: Deducción).'
            )
            return

        NominaConcepto.objects.update_or_create(
            organization=self.organization,
            nomina=self.nomina,
            concepto=concepto,
            defaults={
                'base': self.nomina.salario_base,
                'porcentaje_aplicado': Decimal('0'),
                'valor': valor_restaurante,
                'tipo': 'DEDUCCION',
            }
        )

        self.total_deducciones += valor_restaurante
    
    def _calcular_prestamos(self):
        """
        Calcula descuentos por préstamos activos del empleado.
        
        IMPORTANTE: NO avanza la fecha_primer_pago del préstamo.
        Eso se hace al PAGAR la nómina (en views.py), no al calcularla.
        Así se puede recalcular sin desplazar fechas.
        
        Cuenta solo cuotas de nóminas PAGADAS como realmente descontadas.
        """
        from prestamos.models import Prestamo
        
        # Obtener préstamos vigentes del empleado
        prestamos = Prestamo.objects.filter(
            organization=self.organization,
            empleado=self.empleado,
            estado__in=['aprobado', 'desembolsado', 'activo', 'en_mora']
        )

        seleccionados = getattr(self.nomina, 'prestamos_seleccionados', None)
        if seleccionados is not None:
            if len(seleccionados) == 0:
                prestamos = Prestamo.objects.none()
            else:
                prestamos = prestamos.filter(id__in=seleccionados)
        
        # Limpiar préstamos anteriores de esta nómina
        self.nomina.prestamos.all().delete()
        
        periodo_inicio = self.nomina.periodo_inicio
        periodo_fin = self.nomina.periodo_fin

        for prestamo in prestamos:
            try:
                fecha_pago = prestamo.fecha_primer_pago
                if not fecha_pago:
                    continue
                
                # Si no fue seleccionado manualmente, verificar que esté en el período
                if seleccionados is None:
                    if not (periodo_inicio <= fecha_pago <= periodo_fin):
                        continue

                # Contar cuotas REALMENTE pagadas (solo nóminas pagadas + pagos directos)
                try:
                    total_cuotas = int(prestamo.plazo_meses or 0)
                    
                    # Pagos directos registrados
                    cuotas_pagadas = prestamo.pagos.count()
                    
                    # Cuotas descontadas en nóminas que ya fueron PAGADAS
                    # (excluir la nómina actual para no doble-contar al recalcular)
                    cuotas_en_nominas_pagadas = NominaPrestamo.objects.filter(
                        prestamo=prestamo,
                        nomina__estado='pagada'
                    ).exclude(
                        nomina=self.nomina
                    ).count()
                    
                    cuotas_pagadas = max(cuotas_pagadas, cuotas_en_nominas_pagadas)
                    cuotas_pendientes = max(total_cuotas - cuotas_pagadas, 0)
                except Exception:
                    cuotas_pendientes = 1
                
                try:
                    valor_cuota = prestamo.cuota_mensual or prestamo.calcular_cuota_mensual()
                except Exception:
                    continue
                
                if cuotas_pendientes > 0 and valor_cuota > 0:
                    # Cuántas cuotas descontar (configurado por el usuario)
                    cuotas_a_descontar_dict = self.nomina.cuotas_a_descontar or {}
                    prestamo_id_str = str(prestamo.id)
                    cuotas_a_descontar = int(cuotas_a_descontar_dict.get(prestamo_id_str, 1))
                    cuotas_a_descontar = min(cuotas_a_descontar, cuotas_pendientes)
                    
                    # Procesar cada cuota
                    for i in range(cuotas_a_descontar):
                        NominaPrestamo.objects.create(
                            organization=self.organization,
                            nomina=self.nomina,
                            prestamo=prestamo,
                            valor_cuota=valor_cuota,
                            numero_cuota=cuotas_pagadas + i + 1,
                        )
                        self.total_prestamos += valor_cuota

            except Exception as e:
                logger.error(f"Error procesando préstamo {prestamo.id}: {str(e)}")
                continue
        
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
            param = self._obtener_parametro(f'ARL_NIVEL_{nivel}')
            if param:
                self.nomina.aporte_arl = self._calcular_sobre_ibc(
                    param.porcentaje_total, ibc
                )
        
        # PARAFISCALES
        if self.tipo_contrato.aplica_parafiscales:
            param = self._obtener_parametro('CAJA_COMPENSACION')
            if param:
                self.nomina.aporte_caja = self._calcular_sobre_ibc(
                    param.porcentaje_total, ibc
                )
            
            param = self._obtener_parametro('SENA')
            if param:
                self.nomina.aporte_sena = self._calcular_sobre_ibc(
                    param.porcentaje_total, ibc
                )
            
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

        neto = self._redondear(
            self.total_devengado - self.total_deducciones - self.total_prestamos
        )

        # Validar que el salario neto no sea negativo
        if neto < Decimal('0.00'):
            logger.warning(
                f"Nómina {self.nomina.numero}: neto negativo detectado "
                f"(devengado={self.total_devengado}, deducciones={self.total_deducciones}, "
                f"préstamos={self.total_prestamos}). Ajustando a 0."
            )
            neto = Decimal('0.00')

        self.nomina.total_pagar = neto
    
    def _aplicar_concepto_legal(self, codigo: str, tipo: str,
                                 base: Decimal, porcentaje: Decimal, valor: Decimal):
        """
        Aplica un concepto legal existente a la nómina.
        El concepto DEBE existir previamente (creado por el usuario o setup).
        """
        concepto = ConceptoLaboral.objects.filter(
            organization=self.organization,
            codigo=codigo,
            activo=True
        ).first()
        
        if not concepto:
            self.advertencias.append(
                f'No se encontró el concepto laboral "{codigo}". '
                f'Créelo en Conceptos Laborales para que se aplique correctamente.'
            )
            return
        
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
        conceptos = self.nomina.conceptos.all()
        devengados = conceptos.filter(tipo='DEVENGADO')
        deducciones = conceptos.filter(tipo='DEDUCCION')
        
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
        
        resumen = {
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
        
        if self.advertencias:
            resumen['advertencias'] = self.advertencias
        
        return resumen


def calcular_nomina(nomina: NominaSimple) -> dict:
    """
    Función utilitaria para calcular una nómina.
    
    Args:
        nomina: Instancia de NominaSimple
    
    Returns:
        dict: Resumen del cálculo
    
    Raises:
        ValueError: Si la nómina no puede calcularse
        NominaValidationError: Si faltan configuraciones necesarias
    """
    if nomina.estado not in ['borrador', 'calculada']:
        raise ValueError(f'No se puede calcular una nómina en estado {nomina.estado}')
    
    calculador = CalculadorNomina(nomina)
    return calculador.calcular()
