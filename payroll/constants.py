"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                   CONSTANTES LEGALES Y PARAMÉTRICAS                           ║
║                        Sistema de Nómina CorteSec                             ║
║                            Legislación Colombia                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

Constantes actualizadas según normatividad vigente 2026.

Referencias Legales:
- Decreto 2616/2013: Salario Mínimo
- Ley 100/1993: Sistema General de Seguridad Social
- Ley 1122/2007: Parafiscales
- Decreto 1625/2016: Retención en la Fuente
- Resolución 2388/2016: PILA

AUTOR: Sistema CorteSec
FECHA: Enero 2026
"""

from decimal import Decimal
from datetime import date


# ══════════════════════════════════════════════════════════════════════════════
# VALORES LEGALES 2026
# ══════════════════════════════════════════════════════════════════════════════

# Salario Mínimo Legal Mensual Vigente (SMMLV)
# Decreto 2616 de 2025
SMMLV_2026 = Decimal('1423500.00')

# Auxilio de Transporte (Para salarios <= 2 SMMLV)
# Decreto 2616 de 2025
AUXILIO_TRANSPORTE_2026 = Decimal('200000.00')

# Unidad de Valor Tributario (UVT)
# Resolución DIAN 000159 de Noviembre 2025
UVT_2026 = Decimal('47065.00')

# Tope máximo IBC (Ingreso Base de Cotización)
# 25 Salarios Mínimos (Art. 5 Ley 100/1993)
TOPE_IBC_SMMLV = 25
TOPE_IBC_2026 = SMMLV_2026 * TOPE_IBC_SMMLV  # $35,587,500


# ══════════════════════════════════════════════════════════════════════════════
# TASAS DE SEGURIDAD SOCIAL (Ley 100/1993)
# ══════════════════════════════════════════════════════════════════════════════

# --- SALUD (12.5% Total) ---
TASA_SALUD_EMPLEADO = Decimal('0.04')      # 4% empleado
TASA_SALUD_EMPLEADOR = Decimal('0.085')    # 8.5% empleador

# --- PENSIÓN (16% Total) ---
TASA_PENSION_EMPLEADO = Decimal('0.04')    # 4% empleado
TASA_PENSION_EMPLEADOR = Decimal('0.12')   # 12% empleador

# Fondo de Solidaridad Pensional (FSP)
# Aplica sobre IBC superior a 4 SMMLV
TASA_FSP = Decimal('0.01')  # 1% adicional empleado
UMBRAL_FSP_SMMLV = 4
UMBRAL_FSP_2026 = SMMLV_2026 * UMBRAL_FSP_SMMLV

# Aporte Adicional FSP (Sobre salarios altos)
# 16-17 SMMLV: +0.2%, 17-18 SMMLV: +0.4%... hasta 20+ SMMLV: +1%
TASA_FSP_ADICIONAL_TRAMOS = {
    16: Decimal('0.002'),  # +0.2%
    17: Decimal('0.004'),  # +0.4%
    18: Decimal('0.006'),  # +0.6%
    19: Decimal('0.008'),  # +0.8%
    20: Decimal('0.010'),  # +1.0%
}

# --- ARL (Riesgos Laborales) ---
# Pagado 100% por el empleador según nivel de riesgo
TASAS_ARL = {
    1: Decimal('0.00522'),   # Clase I: Riesgo Mínimo (0.522%)
    2: Decimal('0.01044'),   # Clase II: Riesgo Bajo (1.044%)
    3: Decimal('0.02436'),   # Clase III: Riesgo Medio (2.436%)
    4: Decimal('0.04350'),   # Clase IV: Riesgo Alto (4.350%)
    5: Decimal('0.06960'),   # Clase V: Riesgo Máximo (6.960%) - CONSTRUCCIÓN
}


# ══════════════════════════════════════════════════════════════════════════════
# APORTES PARAFISCALES (Ley 1122/2007, Ley 1607/2012)
# ══════════════════════════════════════════════════════════════════════════════

# Exención para empresas con nómina < 10 SMMLV (Art. 114-1 ET)
UMBRAL_EXENCION_PARAFISCALES_SMMLV = 10
UMBRAL_EXENCION_PARAFISCALES_2026 = SMMLV_2026 * UMBRAL_EXENCION_PARAFISCALES_SMMLV

# Tasas parafiscales (sobre IBC)
TASA_SENA = Decimal('0.02')                    # 2% empleador
TASA_ICBF = Decimal('0.03')                    # 3% empleador
TASA_CAJA_COMPENSACION = Decimal('0.04')       # 4% empleador


# ══════════════════════════════════════════════════════════════════════════════
# PROVISIONES PRESTACIONALES (Código Sustantivo del Trabajo)
# ══════════════════════════════════════════════════════════════════════════════

# Cesantías (Art. 249 CST)
# 1 salario mensual por cada año de servicio
TASA_CESANTIAS_MENSUAL = Decimal('0.0833')  # 1/12 = 8.33% mensual

# Intereses sobre Cesantías (Art. 99 Ley 50/1990)
# 12% anual sobre saldo de cesantías
TASA_INTERESES_CESANTIAS_ANUAL = Decimal('0.12')
TASA_INTERESES_CESANTIAS_MENSUAL = Decimal('0.01')  # 1% mensual

# Prima de Servicios (Art. 306 CST)
# 1 salario mensual por año (2 pagos: Jun/Dic)
TASA_PRIMA_MENSUAL = Decimal('0.0833')  # 1/12 = 8.33% mensual

# Vacaciones (Art. 186 CST)
# 15 días hábiles por año
TASA_VACACIONES_MENSUAL = Decimal('0.0417')  # 15/360 = 4.17% mensual


# ══════════════════════════════════════════════════════════════════════════════
# RETENCIÓN EN LA FUENTE - PROCEDIMIENTO 1 (Decreto 1625/2016)
# ══════════════════════════════════════════════════════════════════════════════

# Umbral mínimo para aplicar retención (95 UVT mensuales)
UMBRAL_RETENCION_UVT = 95
UMBRAL_RETENCION_2026 = UVT_2026 * UMBRAL_RETENCION_UVT  # $4,471,175

# Renta exenta máxima (25% ingresos laborales, tope 240 UVT mensuales)
PORCENTAJE_RENTA_EXENTA = Decimal('0.25')
TOPE_RENTA_EXENTA_UVT_MENSUAL = 240
TOPE_RENTA_EXENTA_2026 = UVT_2026 * TOPE_RENTA_EXENTA_UVT_MENSUAL  # $11,295,600

# Deducción por dependientes (10% ingresos, tope 32 UVT por dependiente)
PORCENTAJE_DEDUCCION_DEPENDIENTES = Decimal('0.10')
TOPE_DEDUCCION_DEPENDIENTE_UVT = 32
TOPE_DEDUCCION_DEPENDIENTE_2026 = UVT_2026 * TOPE_DEDUCCION_DEPENDIENTE_UVT  # $1,506,080

# Tabla de Retención 2026 (Rangos en UVT y Tarifas Marginales)
# Art. 383 ET modificado por Ley 2010/2019
TABLA_RETENCION_2026 = [
    # (desde_uvt, hasta_uvt, tarifa_marginal, uvt_a_restar)
    (0, 95, Decimal('0.00'), Decimal('0')),           # Exento
    (95, 150, Decimal('0.19'), Decimal('18.05')),     # 19%
    (150, 360, Decimal('0.28'), Decimal('31.55')),    # 28%
    (360, 640, Decimal('0.33'), Decimal('49.55')),    # 33%
    (640, 945, Decimal('0.35'), Decimal('62.35')),    # 35%
    (945, 2300, Decimal('0.37'), Decimal('81.25')),   # 37%
    (2300, float('inf'), Decimal('0.39'), Decimal('127.25')),  # 39%
]


# ══════════════════════════════════════════════════════════════════════════════
# HORAS EXTRAS Y RECARGOS (Código Sustantivo del Trabajo)
# ══════════════════════════════════════════════════════════════════════════════

# Hora Extra Diurna (HED) - 6am a 10pm
RECARGO_HED = Decimal('0.25')  # 25% adicional

# Hora Extra Nocturna (HEN) - 10pm a 6am
RECARGO_HEN = Decimal('0.75')  # 75% adicional

# Hora Ordinaria Nocturna (HON)
RECARGO_HON = Decimal('0.35')  # 35% adicional

# Hora Extra Dominical/Festiva Diurna (HEDF)
RECARGO_HEDF = Decimal('1.00')  # 100% adicional (doble)

# Hora Extra Dominical/Festiva Nocturna (HEFN)
RECARGO_HEFN = Decimal('1.50')  # 150% adicional

# Recargo Dominical/Festivo Ordinario
RECARGO_DOMINICAL = Decimal('0.75')  # 75% adicional


# ══════════════════════════════════════════════════════════════════════════════
# EMBARGOS JUDICIALES (Código Sustantivo del Trabajo Art. 154-156)
# ══════════════════════════════════════════════════════════════════════════════

# Embargo Alimentario (Cuota alimentaria)
# Puede embargar hasta el 50% del salario (incluso del mínimo)
PORCENTAJE_MAXIMO_EMBARGO_ALIMENTOS = Decimal('0.50')

# Embargo Ejecutivo/Comercial
# Solo sobre el excedente del salario mínimo (quinta parte)
FRACCION_EMBARGABLE_EJECUTIVO = Decimal('0.20')  # 1/5


# ══════════════════════════════════════════════════════════════════════════════
# FIC - FONDO DE INDUSTRIA DE LA CONSTRUCCIÓN (Ley 21/1982)
# ══════════════════════════════════════════════════════════════════════════════

# Aporte equivalente a 1 SMMLV por obra activa
APORTE_FIC_POR_OBRA = SMMLV_2026

# Descuento por aprendiz SENA contratado
DESCUENTO_FIC_POR_APRENDIZ = SMMLV_2026


# ══════════════════════════════════════════════════════════════════════════════
# DOTACIÓN (Art. 230 CST)
# ══════════════════════════════════════════════════════════════════════════════

# Fechas legales de entrega (3 veces al año)
FECHAS_ENTREGA_DOTACION = [
    (4, 30),   # 30 de Abril
    (8, 31),   # 31 de Agosto
    (12, 20),  # 20 de Diciembre
]

# Umbral salarial para obligatoriedad de dotación
UMBRAL_DOTACION_SMMLV = 2
UMBRAL_DOTACION_2026 = SMMLV_2026 * UMBRAL_DOTACION_SMMLV


# ══════════════════════════════════════════════════════════════════════════════
# DÍAS Y CALENDARIOS
# ══════════════════════════════════════════════════════════════════════════════

# Días año laboral (360 días comerciales - base cálculos prestacionales)
DIAS_ANO_LABORAL = 360

# Días mes laboral estándar
DIAS_MES_LABORAL = 30

# Días de vacaciones por año (Art. 186 CST)
DIAS_VACACIONES_POR_ANO = 15


# ══════════════════════════════════════════════════════════════════════════════
# MARCAS PILA (Resolución 2388/2016)
# ══════════════════════════════════════════════════════════════════════════════

MARCAS_NOVEDAD_PILA = {
    'X': 'Normal (sin novedad)',
    'ING': 'Ingreso (nuevo empleado)',
    'RET': 'Retiro (termina contrato)',
    'TDE': 'Traslado desde otra EPS',
    'TAE': 'Traslado a otra EPS',
    'TDP': 'Traslado desde otro Fondo Pensión',
    'TAP': 'Traslado a otro Fondo Pensión',
    'VSP': 'Variación permanente de salario',
    'VST': 'Variación transitoria de salario',
    'SLN': 'Suspensión temporal (Licencia No Remunerada)',
    'IGE': 'Incapacidad General',
    'LMA': 'Licencia de Maternidad',
    'VAC': 'Vacaciones',
    'AVP': 'Aporte Voluntario Pensión',
    'VCT': 'Variación Centros de Trabajo (ARL)',
}


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS Y FUNCIONES AUXILIARES
# ══════════════════════════════════════════════════════════════════════════════

def calcular_fsp_adicional(ibc: Decimal) -> Decimal:
    """
    Calcula el aporte adicional al Fondo de Solidaridad Pensional
    según los tramos de salario (Art. 7 Ley 797/2003).
    
    Args:
        ibc: Ingreso Base de Cotización
        
    Returns:
        Tasa adicional de FSP a aplicar
    """
    smmlv_ratio = ibc / SMMLV_2026
    
    for tramo, tasa in sorted(TASA_FSP_ADICIONAL_TRAMOS.items(), reverse=True):
        if smmlv_ratio >= tramo:
            return tasa
    
    return Decimal('0.00')


def calcular_retencion_fuente_procedimiento1(
    ingreso_bruto: Decimal,
    deducciones_ley: Decimal,
    dependientes: int = 0,
    medicina_prepagada: Decimal = Decimal('0.00'),
    interes_vivienda: Decimal = Decimal('0.00')
) -> Decimal:
    """
    Calcula la retención en la fuente según Procedimiento 1 (Decreto 1625/2016).
    
    Args:
        ingreso_bruto: Ingreso laboral bruto mensual
        deducciones_ley: Aportes obligatorios (salud + pensión + FSP)
        dependientes: Número de dependientes
        medicina_prepagada: Pago medicina prepagada (deducible)
        interes_vivienda: Intereses vivienda (deducible)
        
    Returns:
        Valor de retención en la fuente
    """
    # 1. Calcular renta exenta (25% máximo)
    renta_exenta = min(
        ingreso_bruto * PORCENTAJE_RENTA_EXENTA,
        TOPE_RENTA_EXENTA_2026
    )
    
    # 2. Calcular deducción por dependientes (10% máximo por dependiente)
    deduccion_dependientes = min(
        ingreso_bruto * PORCENTAJE_DEDUCCION_DEPENDIENTES * dependientes,
        TOPE_DEDUCCION_DEPENDIENTE_2026 * dependientes
    )
    
    # 3. Depurar base gravable
    base_gravable = (
        ingreso_bruto 
        - deducciones_ley 
        - renta_exenta 
        - deduccion_dependientes
        - medicina_prepagada
        - interes_vivienda
    )
    
    if base_gravable <= 0:
        return Decimal('0.00')
    
    # 4. Convertir a UVT
    base_uvt = base_gravable / UVT_2026
    
    # 5. Aplicar tabla de retención
    for desde, hasta, tarifa, uvt_restar in TABLA_RETENCION_2026:
        if desde <= base_uvt < hasta:
            retencion_uvt = (base_uvt * tarifa) - uvt_restar
            retencion_pesos = retencion_uvt * UVT_2026
            return max(retencion_pesos, Decimal('0.00')).quantize(Decimal('0.01'))
    
    return Decimal('0.00')


def es_fecha_entrega_dotacion(fecha: date) -> bool:
    """
    Verifica si una fecha está dentro del rango de entrega legal de dotación.
    
    Args:
        fecha: Fecha a verificar
        
    Returns:
        True si está en período de entrega de dotación
    """
    for mes, dia in FECHAS_ENTREGA_DOTACION:
        # Ventana de +/- 15 días
        if fecha.month == mes and abs(fecha.day - dia) <= 15:
            return True
    return False


# ══════════════════════════════════════════════════════════════════════════════
# METADATA
# ══════════════════════════════════════════════════════════════════════════════

__version__ = '1.0.0'
__author__ = 'Sistema CorteSec'
__date__ = '2026-01-07'
__legal_references__ = [
    'Ley 100/1993 - Sistema General de Seguridad Social',
    'Ley 1122/2007 - Reforma Salud y Parafiscales',
    'Ley 1607/2012 - Reforma Tributaria (Exención Parafiscales)',
    'Decreto 1625/2016 - Retención en la Fuente',
    'Decreto 2616/2013 - Salario Mínimo',
    'Resolución 2388/2016 - PILA',
    'Código Sustantivo del Trabajo (CST)',
]
