"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                     MOTOR DE CÁLCULO DE NÓMINA                                ║
║                    Sistema de Nómina CorteSec - FASE 2                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

Motor orquestador que coordina el cálculo completo de nómina.

RESPONSABILIDADES:
------------------
1. Orquestar llamadas a calculations.py
2. Evaluar fórmulas dinámicas con formula_evaluator.py
3. Coordinar flujo: devengados → IBC → deducciones → provisiones
4. Aplicar reglas de negocio complejas
5. Generar estructura de datos para persistir

PATRÓN:
-------
- Strategy Pattern: Diferentes estrategias de cálculo según tipo concepto
- Command Pattern: Cada paso es un comando ejecutable
- Builder Pattern: Construye el objeto nómina paso a paso

AUTOR: Sistema CorteSec
FECHA: Enero 2026 - FASE 2
"""

from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from datetime import date
from django.core.exceptions import ValidationError

from payroll.models import (
    Empleado,
    ConceptoLaboral,
    NominaSimple,
    NovedadCalendario,
)
from payroll.constants import SMMLV_2026
from payroll.services import calculations
from payroll.services.formula_evaluator import evaluar_formula


# ══════════════════════════════════════════════════════════════════════════════
# MOTOR PRINCIPAL
# ══════════════════════════════════════════════════════════════════════════════

class PayrollEngine:
    """
    Motor de cálculo dinámico de nómina.
    
    Reemplaza la lógica hardcoded de NominaBase.procesar_completo()
    por un sistema configurable basado en ConceptoLaboral.
    """
    
    def __init__(self, nomina: NominaSimple):
        """
        Args:
            nomina: Instancia de NominaSimple a procesar
        """
        self.nomina = nomina
        self.empleado = nomina.empleado
        self.organization = nomina.organization
        
        # Contexto de ejecución (variables disponibles para fórmulas)
        self.context: Dict[str, Decimal] = {}
        
        # Resultados parciales
        self.devengados: Dict[str, Decimal] = {}
        self.deducciones: Dict[str, Decimal] = {}
        self.provisiones: Dict[str, Decimal] = {}
        self.aportes_empleador: Dict[str, Decimal] = {}
        
        # IBC calculado
        self.ibc: Decimal = Decimal('0.00')
    
    # ──────────────────────────────────────────────────────────────────────────
    # API PÚBLICA
    # ──────────────────────────────────────────────────────────────────────────
    
    def procesar_nomina_completa(self) -> Dict[str, any]:
        """
        Procesa la nómina completa siguiendo el flujo estándar.
        
        Flujo:
        1. Inicializar contexto con datos del empleado
        2. Calcular devengados (salario, HE, bonos)
        3. Calcular IBC
        4. Calcular deducciones (salud, pensión, FSP)
        5. Calcular aportes empleador
        6. Calcular parafiscales
        7. Calcular provisiones
        8. Calcular totales
        
        Returns:
            Dict con todos los valores calculados
        """
        # Paso 1: Inicializar contexto
        self._inicializar_contexto()
        
        # Paso 2: Calcular devengados
        self._calcular_devengados()
        
        # Paso 3: Calcular IBC
        self._calcular_ibc()
        
        # Paso 4: Calcular deducciones empleado
        self._calcular_deducciones_empleado()
        
        # Paso 5: Calcular aportes empleador
        self._calcular_aportes_empleador()
        
        # Paso 6: Calcular parafiscales
        self._calcular_parafiscales()
        
        # Paso 7: Calcular provisiones
        self._calcular_provisiones()
        
        # Paso 8: Calcular totales
        resultados = self._calcular_totales()
        
        return resultados
    
    # ──────────────────────────────────────────────────────────────────────────
    # PASO 1: INICIALIZAR CONTEXTO
    # ──────────────────────────────────────────────────────────────────────────
    
    def _inicializar_contexto(self):
        """
        Inicializa el contexto con datos base del empleado y período.
        
        Variables disponibles para fórmulas:
        - salario_base, dias_trabajados, dias_mes
        - horas_hed, horas_hen, horas_hon
        - SMMLV, AUXILIO_TRANSPORTE, etc. (desde constants)
        """
        # Calcular días trabajados descontando novedades
        dias_trabajados = NovedadCalendario.calcular_dias_trabajados_periodo(
            self.empleado,
            self.nomina.fecha_inicio,
            self.nomina.fecha_fin
        )
        
        self.context = {
            # Datos básicos
            'salario_base': self.empleado.salario,
            'dias_trabajados': Decimal(str(dias_trabajados)),
            'dias_mes': Decimal('30'),  # Mes comercial
            
            # Horas extras (desde nómina o 0)
            'horas_hed': self.nomina.horas_extras_diurnas or Decimal('0'),
            'horas_hen': self.nomina.horas_extras_nocturnas or Decimal('0'),
            'horas_hon': self.nomina.horas_ordinarias_nocturnas or Decimal('0'),
            'horas_dominicales': self.nomina.horas_dominicales or Decimal('0'),
            
            # Valores iniciales (se actualizan en cada paso)
            'total_devengados': Decimal('0.00'),
            'total_deducciones': Decimal('0.00'),
            'ibc': Decimal('0.00'),
            
            # Constantes (también están en FORMULA_CONSTANTS del evaluator)
            'SMMLV': SMMLV_2026,
        }
    
    # ──────────────────────────────────────────────────────────────────────────
    # PASO 2: CALCULAR DEVENGADOS
    # ──────────────────────────────────────────────────────────────────────────
    
    def _calcular_devengados(self):
        """
        Calcula todos los conceptos devengados.
        
        Orden:
        1. Salario básico
        2. Auxilio de transporte
        3. Horas extras
        4. Bonificaciones/comisiones (fórmulas o fijas)
        """
        # Salario básico proporcional
        salario_basico = calculations.calcular_salario_basico(
            self.context['salario_base'],
            int(self.context['dias_trabajados']),
            30
        )
        self.devengados['SALARIO'] = salario_basico
        self.context['salario_calculado'] = salario_basico
        
        # Auxilio de transporte
        auxilio = calculations.calcular_auxilio_transporte(
            self.context['salario_base'],
            int(self.context['dias_trabajados']),
            30
        )
        if auxilio > 0:
            self.devengados['AUX_TRANSPORTE'] = auxilio
            self.context['auxilio_transporte'] = auxilio
        
        # Horas extras diurnas (HED)
        if self.context['horas_hed'] > 0:
            hed = calculations.calcular_hora_extra_diurna(
                self.context['salario_base'],
                self.context['horas_hed']
            )
            self.devengados['HED'] = hed
        
        # Horas extras nocturnas (HEN)
        if self.context['horas_hen'] > 0:
            hen = calculations.calcular_hora_extra_nocturna(
                self.context['salario_base'],
                self.context['horas_hen']
            )
            self.devengados['HEN'] = hen
        
        # Horas ordinarias nocturnas (HON)
        if self.context['horas_hon'] > 0:
            hon = calculations.calcular_hora_ordinaria_nocturna(
                self.context['salario_base'],
                self.context['horas_hon']
            )
            self.devengados['HON'] = hon
        
        # Recargo dominical
        if self.context['horas_dominicales'] > 0:
            dom = calculations.calcular_recargo_dominical(
                self.context['salario_base'],
                self.context['horas_dominicales']
            )
            self.devengados['DOMINICAL'] = dom
        
        # Conceptos adicionales con fórmulas
        self._procesar_conceptos_con_formula('DEVENGADO')
        
        # Actualizar contexto con total devengados
        self.context['total_devengados'] = sum(self.devengados.values(), Decimal('0'))
    
    # ──────────────────────────────────────────────────────────────────────────
    # PASO 3: CALCULAR IBC
    # ──────────────────────────────────────────────────────────────────────────
    
    def _calcular_ibc(self):
        """
        Calcula el Ingreso Base de Cotización (IBC).
        
        IBC = Salario + HE + Bonos habituales
        (NO incluye auxilio transporte)
        """
        salario_basico = self.devengados.get('SALARIO', Decimal('0'))
        auxilio = self.devengados.get('AUX_TRANSPORTE', Decimal('0'))
        horas_extras = (
            self.devengados.get('HED', Decimal('0')) +
            self.devengados.get('HEN', Decimal('0')) +
            self.devengados.get('HON', Decimal('0'))
        )
        
        # Sumar bonificaciones que afectan IBC
        bonificaciones = Decimal('0')
        # TODO FASE 3: Filtrar conceptos con flag afecta_ibc=True
        
        comisiones = Decimal('0')
        
        self.ibc = calculations.calcular_ibc(
            salario_basico,
            auxilio,
            horas_extras,
            bonificaciones,
            comisiones
        )
        self.context['ibc'] = self.ibc
    
    # ──────────────────────────────────────────────────────────────────────────
    # PASO 4: CALCULAR DEDUCCIONES EMPLEADO
    # ──────────────────────────────────────────────────────────────────────────
    
    def _calcular_deducciones_empleado(self):
        """
        Calcula deducciones del empleado (salud, pensión, FSP).
        """
        # Salud 4%
        salud = calculations.calcular_salud_empleado(self.ibc)
        self.deducciones['SALUD_EMPLEADO'] = salud
        self.context['salud_empleado'] = salud
        
        # Pensión 4%
        pension = calculations.calcular_pension_empleado(self.ibc)
        self.deducciones['PENSION_EMPLEADO'] = pension
        self.context['pension_empleado'] = pension
        
        # FSP (si aplica)
        fsp = calculations.calcular_fsp_empleado(self.ibc)
        if fsp > 0:
            self.deducciones['FSP'] = fsp
            self.context['fsp'] = fsp
        
        # Deducciones adicionales con fórmulas
        self._procesar_conceptos_con_formula('DEDUCCION')
        
        # Actualizar contexto
        self.context['total_deducciones'] = sum(self.deducciones.values(), Decimal('0'))
    
    # ──────────────────────────────────────────────────────────────────────────
    # PASO 5: CALCULAR APORTES EMPLEADOR
    # ──────────────────────────────────────────────────────────────────────────
    
    def _calcular_aportes_empleador(self):
        """
        Calcula aportes del empleador (salud 8.5%, pensión 12%, ARL).
        """
        # Salud 8.5%
        salud = calculations.calcular_salud_empleador(self.ibc)
        self.aportes_empleador['SALUD_EMPLEADOR'] = salud
        
        # Pensión 12%
        pension = calculations.calcular_pension_empleador(self.ibc)
        self.aportes_empleador['PENSION_EMPLEADOR'] = pension
        
        # ARL (Clase 5 construcción)
        arl = calculations.calcular_arl(self.ibc, clase_riesgo=5)
        self.aportes_empleador['ARL'] = arl
    
    # ──────────────────────────────────────────────────────────────────────────
    # PASO 6: CALCULAR PARAFISCALES
    # ──────────────────────────────────────────────────────────────────────────
    
    def _calcular_parafiscales(self):
        """
        Calcula parafiscales (SENA, ICBF, Caja).
        """
        # TODO: Determinar si empresa está exenta (nómina < 10 SMMLV)
        exento = False
        
        sena, icbf, caja = calculations.calcular_parafiscales(
            self.ibc,
            Decimal('0'),  # total_nomina_mes (calcular en contexto empresa)
            exento
        )
        
        if sena > 0:
            self.aportes_empleador['SENA'] = sena
        if icbf > 0:
            self.aportes_empleador['ICBF'] = icbf
        self.aportes_empleador['CAJA'] = caja
    
    # ──────────────────────────────────────────────────────────────────────────
    # PASO 7: CALCULAR PROVISIONES
    # ──────────────────────────────────────────────────────────────────────────
    
    def _calcular_provisiones(self):
        """
        Calcula provisiones prestacionales (cesantías, prima, vacaciones).
        """
        # Salario integral = Salario + Auxilio + Promedio HE
        salario_integral = (
            self.devengados.get('SALARIO', Decimal('0')) +
            self.devengados.get('AUX_TRANSPORTE', Decimal('0')) +
            (self.devengados.get('HED', Decimal('0')) +
             self.devengados.get('HEN', Decimal('0')) +
             self.devengados.get('HON', Decimal('0')))
        )
        
        # Cesantías
        cesantias = calculations.calcular_cesantias(salario_integral)
        self.provisiones['CESANTIAS'] = cesantias
        
        # Intereses cesantías (sobre saldo acumulado)
        # TODO: Consultar saldo_cesantias del empleado
        saldo_cesantias = Decimal('0')  # Por ahora 0
        intereses = calculations.calcular_intereses_cesantias(saldo_cesantias)
        if intereses > 0:
            self.provisiones['INTERESES_CESANTIAS'] = intereses
        
        # Prima
        prima = calculations.calcular_prima(salario_integral)
        self.provisiones['PRIMA'] = prima
        
        # Vacaciones (solo sobre salario básico)
        vacaciones = calculations.calcular_vacaciones(
            self.devengados.get('SALARIO', Decimal('0'))
        )
        self.provisiones['VACACIONES'] = vacaciones
    
    # ──────────────────────────────────────────────────────────────────────────
    # PASO 8: CALCULAR TOTALES
    # ──────────────────────────────────────────────────────────────────────────
    
    def _calcular_totales(self) -> Dict[str, any]:
        """
        Calcula totales finales y devuelve estructura completa.
        """
        total_devengado = calculations.calcular_total_devengado(self.devengados)
        total_deducido = calculations.calcular_total_deducido(self.deducciones)
        neto_pagar = calculations.calcular_neto_pagar(total_devengado, total_deducido)
        
        # Costo total empleador
        costo_total = calculations.calcular_costo_total_empleador(
            total_devengado,
            self.aportes_empleador.get('SALUD_EMPLEADOR', Decimal('0')),
            self.aportes_empleador.get('PENSION_EMPLEADOR', Decimal('0')),
            self.aportes_empleador.get('ARL', Decimal('0')),
            self.aportes_empleador.get('SENA', Decimal('0')),
            self.aportes_empleador.get('ICBF', Decimal('0')),
            self.aportes_empleador.get('CAJA', Decimal('0')),
            self.provisiones.get('CESANTIAS', Decimal('0')),
            self.provisiones.get('INTERESES_CESANTIAS', Decimal('0')),
            self.provisiones.get('PRIMA', Decimal('0')),
            self.provisiones.get('VACACIONES', Decimal('0'))
        )
        
        return {
            'devengados': self.devengados,
            'deducciones': self.deducciones,
            'aportes_empleador': self.aportes_empleador,
            'provisiones': self.provisiones,
            'totales': {
                'ibc': self.ibc,
                'total_devengado': total_devengado,
                'total_deducido': total_deducido,
                'neto_pagar': neto_pagar,
                'costo_total_empleador': costo_total,
            }
        }
    
    # ──────────────────────────────────────────────────────────────────────────
    # PROCESAMIENTO DE CONCEPTOS CON FÓRMULA
    # ──────────────────────────────────────────────────────────────────────────
    
    def _procesar_conceptos_con_formula(self, tipo: str):
        """
        Procesa conceptos laborales con fórmulas dinámicas.
        
        Args:
            tipo: 'DEVENGADO' o 'DEDUCCION'
        """
        # TODO FASE 2: Consultar conceptos activos con fórmulas
        # conceptos = ConceptoLaboral.objects.filter(
        #     organization=self.organization,
        #     tipo=tipo,
        #     activo=True,
        #     tipo_formula='FORMULA'
        # )
        # 
        # for concepto in conceptos:
        #     valor = evaluar_formula(concepto.formula, self.context)
        #     
        #     if tipo == 'DEVENGADO':
        #         self.devengados[concepto.codigo] = valor
        #     else:
        #         self.deducciones[concepto.codigo] = valor
        #     
        #     # Actualizar contexto para fórmulas siguientes
        #     self.context[concepto.codigo.lower()] = valor
        pass


# ══════════════════════════════════════════════════════════════════════════════
# API SIMPLIFICADA
# ══════════════════════════════════════════════════════════════════════════════

def procesar_nomina(nomina: NominaSimple) -> Dict[str, any]:
    """
    API simplificada para procesar una nómina.
    
    Args:
        nomina: Instancia de NominaSimple
        
    Returns:
        Dict con todos los valores calculados
        
    Example:
        >>> resultados = procesar_nomina(mi_nomina)
        >>> print(resultados['totales']['neto_pagar'])
    """
    engine = PayrollEngine(nomina)
    return engine.procesar_nomina_completa()
