"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                     FUNCIONES DE CÁLCULO PURAS                                ║
║                    Sistema de Nómina CorteSec - FASE 2                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

Funciones puras para cálculos de nómina (sin efectos secundarios).

PRINCIPIOS:
-----------
- Funciones puras (mismos inputs → mismo output)
- Sin acceso a BD (reciben datos, no los consultan)
- Fácilmente testeables
- Reutilizables en diferentes contextos

CATEGORÍAS:
-----------
1. Devengados (salarios, horas extras, bonificaciones)
2. Deducciones (salud, pensión, libranzas, embargos)
3. Seguridad Social Empleador (salud, pensión, ARL)
4. Parafiscales (SENA, ICBF, Caja)
5. Provisiones (cesantías, primas, vacaciones)

AUTOR: Sistema CorteSec
FECHA: Enero 2026 - FASE 2
"""

from decimal import Decimal
from typing import Dict, List, Tuple
from datetime import date

from payroll.constants import (
    SMMLV_2026,
    AUXILIO_TRANSPORTE_2026,
    TOPE_IBC_2026,
    TASA_SALUD_EMPLEADO,
    TASA_SALUD_EMPLEADOR,
    TASA_PENSION_EMPLEADO,
    TASA_PENSION_EMPLEADOR,
    TASA_FSP,
    UMBRAL_FSP_2026,
    TASAS_ARL,
    TASA_SENA,
    TASA_ICBF,
    TASA_CAJA_COMPENSACION,
    TASA_CESANTIAS_MENSUAL,
    TASA_INTERESES_CESANTIAS_MENSUAL,
    TASA_PRIMA_MENSUAL,
    TASA_VACACIONES_MENSUAL,
    RECARGO_HED,
    RECARGO_HEN,
    RECARGO_HON,
    RECARGO_HEDF,
    RECARGO_HEFN,
    RECARGO_DOMINICAL,
    calcular_fsp_adicional,
)


# ══════════════════════════════════════════════════════════════════════════════
# 1. DEVENGADOS
# ══════════════════════════════════════════════════════════════════════════════

def calcular_salario_basico(
    salario_mensual: Decimal,
    dias_trabajados: int,
    dias_mes: int = 30
) -> Decimal:
    """
    Calcula el salario básico según días trabajados.
    
    Args:
        salario_mensual: Salario mensual completo
        dias_trabajados: Días efectivamente trabajados
        dias_mes: Días del mes (default 30 comercial)
        
    Returns:
        Salario proporcional a días trabajados
    """
    if dias_trabajados >= dias_mes:
        return salario_mensual
    
    salario_diario = salario_mensual / dias_mes
    return (salario_diario * dias_trabajados).quantize(Decimal('0.01'))


def calcular_auxilio_transporte(
    salario_mensual: Decimal,
    dias_trabajados: int,
    dias_mes: int = 30
) -> Decimal:
    """
    Calcula auxilio de transporte si aplica (<= 2 SMMLV).
    
    Args:
        salario_mensual: Salario mensual
        dias_trabajados: Días trabajados
        dias_mes: Días del mes
        
    Returns:
        Auxilio de transporte proporcional
    """
    # Solo aplica si gana <= 2 SMMLV
    if salario_mensual > (SMMLV_2026 * 2):
        return Decimal('0.00')
    
    if dias_trabajados >= dias_mes:
        return AUXILIO_TRANSPORTE_2026
    
    auxilio_diario = AUXILIO_TRANSPORTE_2026 / dias_mes
    return (auxilio_diario * dias_trabajados).quantize(Decimal('0.01'))


def calcular_hora_extra_diurna(
    salario_mensual: Decimal,
    horas: Decimal
) -> Decimal:
    """
    Calcula valor de horas extras diurnas (HED) - 25% recargo.
    
    Args:
        salario_mensual: Salario mensual
        horas: Cantidad de horas extras diurnas
        
    Returns:
        Valor total HED
    """
    valor_hora = salario_mensual / Decimal('240')  # 30 días * 8 horas
    valor_hed = valor_hora * (Decimal('1') + RECARGO_HED)
    return (valor_hed * horas).quantize(Decimal('0.01'))


def calcular_hora_extra_nocturna(
    salario_mensual: Decimal,
    horas: Decimal
) -> Decimal:
    """
    Calcula valor de horas extras nocturnas (HEN) - 75% recargo.
    """
    valor_hora = salario_mensual / Decimal('240')
    valor_hen = valor_hora * (Decimal('1') + RECARGO_HEN)
    return (valor_hen * horas).quantize(Decimal('0.01'))


def calcular_hora_ordinaria_nocturna(
    salario_mensual: Decimal,
    horas: Decimal
) -> Decimal:
    """
    Calcula valor de horas ordinarias nocturnas (HON) - 35% recargo.
    """
    valor_hora = salario_mensual / Decimal('240')
    valor_hon = valor_hora * (Decimal('1') + RECARGO_HON)
    return (valor_hon * horas).quantize(Decimal('0.01'))


def calcular_recargo_dominical(
    salario_mensual: Decimal,
    horas: Decimal
) -> Decimal:
    """
    Calcula recargo dominical/festivo ordinario - 75% recargo.
    """
    valor_hora = salario_mensual / Decimal('240')
    valor_dominical = valor_hora * (Decimal('1') + RECARGO_DOMINICAL)
    return (valor_dominical * horas).quantize(Decimal('0.01'))


# ══════════════════════════════════════════════════════════════════════════════
# 2. INGRESO BASE DE COTIZACIÓN (IBC)
# ══════════════════════════════════════════════════════════════════════════════

def calcular_ibc(
    salario_basico: Decimal,
    auxilio_transporte: Decimal,
    horas_extras: Decimal,
    bonificaciones: Decimal,
    comisiones: Decimal
) -> Decimal:
    """
    Calcula el Ingreso Base de Cotización (IBC) para seguridad social.
    
    IBC = Salario + HE + Bonificaciones + Comisiones
    NO incluye: Auxilio de transporte, viáticos ocasionales
    Tope máximo: 25 SMMLV
    
    Args:
        salario_basico: Salario básico del período
        auxilio_transporte: Auxilio de transporte (NO se incluye)
        horas_extras: Total horas extras
        bonificaciones: Bonificaciones habituales
        comisiones: Comisiones
        
    Returns:
        IBC con tope de 25 SMMLV
    """
    ibc = salario_basico + horas_extras + bonificaciones + comisiones
    
    # Aplicar tope máximo
    if ibc > TOPE_IBC_2026:
        ibc = TOPE_IBC_2026
    
    return ibc.quantize(Decimal('0.01'))


# ══════════════════════════════════════════════════════════════════════════════
# 3. DEDUCCIONES EMPLEADO
# ══════════════════════════════════════════════════════════════════════════════

def calcular_salud_empleado(ibc: Decimal) -> Decimal:
    """
    Calcula aporte de salud del empleado (4% del IBC).
    """
    return (ibc * TASA_SALUD_EMPLEADO).quantize(Decimal('0.01'))


def calcular_pension_empleado(ibc: Decimal) -> Decimal:
    """
    Calcula aporte de pensión del empleado (4% del IBC).
    """
    return (ibc * TASA_PENSION_EMPLEADO).quantize(Decimal('0.01'))


def calcular_fsp_empleado(ibc: Decimal) -> Decimal:
    """
    Calcula aporte al Fondo de Solidaridad Pensional.
    
    - 1% si IBC > 4 SMMLV
    - +0.2% a +1% adicional según tramos (16-20+ SMMLV)
    """
    if ibc <= UMBRAL_FSP_2026:
        return Decimal('0.00')
    
    # FSP base 1%
    fsp = ibc * TASA_FSP
    
    # FSP adicional por tramos
    fsp_adicional = calcular_fsp_adicional(ibc)
    fsp += ibc * fsp_adicional
    
    return fsp.quantize(Decimal('0.01'))


# ══════════════════════════════════════════════════════════════════════════════
# 4. APORTES EMPLEADOR (SEGURIDAD SOCIAL)
# ══════════════════════════════════════════════════════════════════════════════

def calcular_salud_empleador(ibc: Decimal) -> Decimal:
    """
    Calcula aporte de salud del empleador (8.5% del IBC).
    """
    return (ibc * TASA_SALUD_EMPLEADOR).quantize(Decimal('0.01'))


def calcular_pension_empleador(ibc: Decimal) -> Decimal:
    """
    Calcula aporte de pensión del empleador (12% del IBC).
    """
    return (ibc * TASA_PENSION_EMPLEADOR).quantize(Decimal('0.01'))


def calcular_arl(ibc: Decimal, clase_riesgo: int = 5) -> Decimal:
    """
    Calcula aporte ARL según clase de riesgo.
    
    Args:
        ibc: Ingreso Base de Cotización
        clase_riesgo: Clase de riesgo (1-5), default 5 (construcción)
        
    Returns:
        Aporte ARL (100% empleador)
    """
    if clase_riesgo not in TASAS_ARL:
        clase_riesgo = 5  # Default construcción
    
    tasa = TASAS_ARL[clase_riesgo]
    return (ibc * tasa).quantize(Decimal('0.01'))


# ══════════════════════════════════════════════════════════════════════════════
# 5. PARAFISCALES
# ══════════════════════════════════════════════════════════════════════════════

def calcular_parafiscales(
    ibc: Decimal,
    total_nomina_mes: Decimal,
    exento: bool = False
) -> Tuple[Decimal, Decimal, Decimal]:
    """
    Calcula aportes parafiscales (SENA, ICBF, Caja).
    
    Exención: Empresas con nómina < 10 SMMLV (Art. 114-1 ET)
    
    Args:
        ibc: Ingreso Base de Cotización del empleado
        total_nomina_mes: Nómina total de la empresa en el mes
        exento: Si la empresa está exenta (nómina < 10 SMMLV)
        
    Returns:
        Tuple (sena, icbf, caja_compensacion)
    """
    if exento:
        # Caja Compensación siempre se paga (no aplica exención)
        caja = (ibc * TASA_CAJA_COMPENSACION).quantize(Decimal('0.01'))
        return Decimal('0.00'), Decimal('0.00'), caja
    
    sena = (ibc * TASA_SENA).quantize(Decimal('0.01'))
    icbf = (ibc * TASA_ICBF).quantize(Decimal('0.01'))
    caja = (ibc * TASA_CAJA_COMPENSACION).quantize(Decimal('0.01'))
    
    return sena, icbf, caja


# ══════════════════════════════════════════════════════════════════════════════
# 6. PROVISIONES PRESTACIONALES
# ══════════════════════════════════════════════════════════════════════════════

def calcular_cesantias(salario_integral_mes: Decimal) -> Decimal:
    """
    Calcula provisión de cesantías (8.33% mensual).
    
    Salario integral = Salario + Auxilio Transporte + Promedio Horas Extras
    """
    return (salario_integral_mes * TASA_CESANTIAS_MENSUAL).quantize(Decimal('0.01'))


def calcular_intereses_cesantias(saldo_cesantias: Decimal) -> Decimal:
    """
    Calcula intereses sobre cesantías (1% mensual = 12% anual).
    """
    return (saldo_cesantias * TASA_INTERESES_CESANTIAS_MENSUAL).quantize(Decimal('0.01'))


def calcular_prima(salario_integral_mes: Decimal) -> Decimal:
    """
    Calcula provisión de prima de servicios (8.33% mensual).
    """
    return (salario_integral_mes * TASA_PRIMA_MENSUAL).quantize(Decimal('0.01'))


def calcular_vacaciones(salario_basico: Decimal) -> Decimal:
    """
    Calcula provisión de vacaciones (4.17% mensual).
    
    NOTA: Solo sobre salario básico (no incluye auxilio transporte).
    """
    return (salario_basico * TASA_VACACIONES_MENSUAL).quantize(Decimal('0.01'))


# ══════════════════════════════════════════════════════════════════════════════
# 7. TOTALES Y NETO A PAGAR
# ══════════════════════════════════════════════════════════════════════════════

def calcular_total_devengado(conceptos_devengados: Dict[str, Decimal]) -> Decimal:
    """
    Suma todos los conceptos devengados.
    
    Args:
        conceptos_devengados: Dict con {codigo: valor} de devengados
        
    Returns:
        Total devengado
    """
    total = sum(conceptos_devengados.values(), Decimal('0.00'))
    return total.quantize(Decimal('0.01'))


def calcular_total_deducido(conceptos_deducciones: Dict[str, Decimal]) -> Decimal:
    """
    Suma todos los conceptos de deducciones.
    """
    total = sum(conceptos_deducciones.values(), Decimal('0.00'))
    return total.quantize(Decimal('0.01'))


def calcular_neto_pagar(total_devengado: Decimal, total_deducido: Decimal) -> Decimal:
    """
    Calcula el neto a pagar al empleado.
    
    Neto = Total Devengado - Total Deducido
    """
    neto = total_devengado - total_deducido
    return neto.quantize(Decimal('0.01'))


def calcular_costo_total_empleador(
    total_devengado: Decimal,
    salud_empleador: Decimal,
    pension_empleador: Decimal,
    arl: Decimal,
    sena: Decimal,
    icbf: Decimal,
    caja: Decimal,
    cesantias: Decimal,
    intereses_cesantias: Decimal,
    prima: Decimal,
    vacaciones: Decimal
) -> Decimal:
    """
    Calcula el costo total para el empleador (para distribución a centros de costo).
    
    Costo Total = Devengados + SS Empleador + Parafiscales + Provisiones
    """
    costo_total = (
        total_devengado +
        salud_empleador +
        pension_empleador +
        arl +
        sena +
        icbf +
        caja +
        cesantias +
        intereses_cesantias +
        prima +
        vacaciones
    )
    return costo_total.quantize(Decimal('0.01'))


# ══════════════════════════════════════════════════════════════════════════════
# 8. HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def aplicar_minimo_legal(valor: Decimal, minimo: Decimal) -> Decimal:
    """
    Aplica un mínimo legal (ej: cotización mínima 1 SMMLV).
    """
    return max(valor, minimo).quantize(Decimal('0.01'))


def aplicar_tope_maximo(valor: Decimal, tope: Decimal) -> Decimal:
    """
    Aplica un tope máximo (ej: IBC máximo 25 SMMLV).
    """
    return min(valor, tope).quantize(Decimal('0.01'))


def redondear_pesos(valor: Decimal) -> Decimal:
    """
    Redondea a pesos colombianos (sin centavos).
    """
    return valor.quantize(Decimal('1'))


# ══════════════════════════════════════════════════════════════════════════════
# METADATA
# ══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Devengados
    'calcular_salario_basico',
    'calcular_auxilio_transporte',
    'calcular_hora_extra_diurna',
    'calcular_hora_extra_nocturna',
    'calcular_hora_ordinaria_nocturna',
    'calcular_recargo_dominical',
    
    # IBC
    'calcular_ibc',
    
    # Deducciones Empleado
    'calcular_salud_empleado',
    'calcular_pension_empleado',
    'calcular_fsp_empleado',
    
    # Aportes Empleador
    'calcular_salud_empleador',
    'calcular_pension_empleador',
    'calcular_arl',
    
    # Parafiscales
    'calcular_parafiscales',
    
    # Provisiones
    'calcular_cesantias',
    'calcular_intereses_cesantias',
    'calcular_prima',
    'calcular_vacaciones',
    
    # Totales
    'calcular_total_devengado',
    'calcular_total_deducido',
    'calcular_neto_pagar',
    'calcular_costo_total_empleador',
    
    # Helpers
    'aplicar_minimo_legal',
    'aplicar_tope_maximo',
    'redondear_pesos',
]
