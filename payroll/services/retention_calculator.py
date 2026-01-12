"""
╔══════════════════════════════════════════════════════════════════════════════╗
║              CALCULADORA DE RETENCIÓN EN LA FUENTE - FASE 3                   ║
║                    Sistema de Nómina CorteSec v3.0                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Cálculo de retención en la fuente para empleados (Procedimiento 1).

NORMATIVIDAD:
-------------
- Estatuto Tributario Art. 383 y siguientes
- Decreto 1625/2016: Tabla progresiva UVT
- Art. 241 ET (Reforma Tributaria 2023): 7 tramos

TABLA 2024+ (Base UVT):
-----------------------
1. 0 - 95 UVT: 0%
2. >95 - 150 UVT: 19%
3. >150 - 360 UVT: 28%
4. >360 - 640 UVT: 33%
5. >640 - 945 UVT: 35%
6. >945 - 2300 UVT: 37%
7. >2300 UVT: 39%

RENTAS EXENTAS:
---------------
- 25% del ingreso laboral (tope 240 UVT mensuales = 2,880 UVT anuales)
- Art. 206 ET

DEDUCCIONES PERMITIDAS:
-----------------------
- Aportes obligatorios a salud (4%)
- Aportes obligatorios a pensión (4%)
- Aportes voluntarios a pensión (tope 30% ingreso laboral)
- Dependientes económicos
- Intereses vivienda
- Medicina prepagada (1 UVT mensual)

AUTOR: Sistema CorteSec
FECHA: Enero 2026 - FASE 3
"""

from decimal import Decimal
from datetime import date
from typing import Dict, Optional, List
from django.db.models import Q

from payroll.models import TablaRetencionFuente, Empleado
from payroll.constants import UVT_2026, SMMLV_2026


# ══════════════════════════════════════════════════════════════════════════════
# CLASE PRINCIPAL
# ══════════════════════════════════════════════════════════════════════════════

class RetentionCalculator:
    """
    Calculadora de retención en la fuente Procedimiento 1.
    
    Uso:
        calculator = RetentionCalculator(uvt_valor=UVT_2026)
        resultado = calculator.calcular_retencion_mensual(
            ingreso_laboral=3500000,
            deducciones_salud=140000,
            deducciones_pension=140000
        )
    """
    
    def __init__(self, uvt_valor: Decimal = UVT_2026, fecha_calculo: date = None):
        """
        Args:
            uvt_valor: Valor UVT vigente (default: 2026)
            fecha_calculo: Fecha del cálculo (default: hoy)
        """
        self.uvt_valor = uvt_valor
        self.fecha_calculo = fecha_calculo or date.today()
        
        # Cargar tabla vigente
        self.tabla = TablaRetencionFuente.obtener_tabla_vigente(self.fecha_calculo)
        
        if not self.tabla:
            raise ValueError(
                f"No existe tabla de retención vigente para {self.fecha_calculo}. "
                f"Debe crear los tramos en TablaRetencionFuente."
            )
    
    # ──────────────────────────────────────────────────────────────────────────
    # API PÚBLICA
    # ──────────────────────────────────────────────────────────────────────────
    
    def calcular_retencion_mensual(
        self,
        ingreso_laboral: Decimal,
        ingreso_no_laboral: Decimal = Decimal('0'),
        deducciones_salud: Decimal = Decimal('0'),
        deducciones_pension: Decimal = Decimal('0'),
        aportes_voluntarios_pension: Decimal = Decimal('0'),
        intereses_vivienda: Decimal = Decimal('0'),
        medicina_prepagada: Decimal = Decimal('0'),
        dependientes: int = 0,
        otras_deducciones: Decimal = Decimal('0'),
    ) -> Dict:
        """
        Calcula retención mensual según Procedimiento 1.
        
        Args:
            ingreso_laboral: Ingresos laborales del mes
            ingreso_no_laboral: Ingresos no laborales (honorarios, etc.)
            deducciones_salud: Aporte obligatorio salud 4%
            deducciones_pension: Aporte obligatorio pensión 4%
            aportes_voluntarios_pension: Aportes voluntarios pensión (tope 30% ingreso)
            intereses_vivienda: Intereses préstamo vivienda
            medicina_prepagada: Medicina prepagada (tope 1 UVT/mes)
            dependientes: Número de dependientes económicos
            otras_deducciones: Otras deducciones permitidas
            
        Returns:
            Dict con cálculo detallado
        """
        # 1. RENTAS EXENTAS
        renta_exenta = self._calcular_renta_exenta(ingreso_laboral)
        
        # 2. DEDUCCIONES TOTALES
        deducciones_totales = self._calcular_deducciones_totales(
            ingreso_laboral=ingreso_laboral,
            deducciones_salud=deducciones_salud,
            deducciones_pension=deducciones_pension,
            aportes_voluntarios_pension=aportes_voluntarios_pension,
            intereses_vivienda=intereses_vivienda,
            medicina_prepagada=medicina_prepagada,
            dependientes=dependientes,
            otras_deducciones=otras_deducciones,
        )
        
        # 3. BASE GRAVABLE
        ingreso_total = ingreso_laboral + ingreso_no_laboral
        base_gravable_pesos = (
            ingreso_total -
            renta_exenta -
            deducciones_totales
        )
        
        # No hay retención si base gravable <= 0
        if base_gravable_pesos <= 0:
            return self._resultado_cero(
                ingreso_laboral=ingreso_laboral,
                ingreso_no_laboral=ingreso_no_laboral,
                renta_exenta=renta_exenta,
                deducciones_totales=deducciones_totales,
            )
        
        # 4. CONVERTIR A UVT
        base_gravable_uvt = (base_gravable_pesos / self.uvt_valor).quantize(Decimal('0.01'))
        
        # 5. APLICAR TABLA PROGRESIVA
        resultado_tabla = self._aplicar_tabla_progresiva(base_gravable_uvt)
        
        # 6. CONVERTIR RETENCIÓN A PESOS
        retencion_mensual = (resultado_tabla['retencion_uvt'] * self.uvt_valor).quantize(Decimal('0.01'))
        
        # 7. TARIFA PROMEDIO
        tarifa_promedio = Decimal('0.00')
        if base_gravable_pesos > 0:
            tarifa_promedio = (retencion_mensual / base_gravable_pesos * 100).quantize(Decimal('2'))
        
        return {
            # Ingresos
            'ingreso_laboral': ingreso_laboral.quantize(Decimal('0.01')),
            'ingreso_no_laboral': ingreso_no_laboral.quantize(Decimal('0.01')),
            'ingreso_total': ingreso_total.quantize(Decimal('0.01')),
            
            # Depuraciones
            'renta_exenta': renta_exenta,
            'deducciones_totales': deducciones_totales,
            'detalles_deducciones': {
                'salud': deducciones_salud.quantize(Decimal('0.01')),
                'pension': deducciones_pension.quantize(Decimal('0.01')),
                'aportes_voluntarios': aportes_voluntarios_pension.quantize(Decimal('0.01')),
                'intereses_vivienda': intereses_vivienda.quantize(Decimal('0.01')),
                'medicina_prepagada': medicina_prepagada.quantize(Decimal('0.01')),
                'dependientes_valor': (self.uvt_valor * 32 * dependientes).quantize(Decimal('0.01')),
                'otras': otras_deducciones.quantize(Decimal('0.01')),
            },
            
            # Base gravable
            'base_gravable_pesos': base_gravable_pesos.quantize(Decimal('0.01')),
            'base_gravable_uvt': base_gravable_uvt,
            
            # Retención
            'retencion_uvt': resultado_tabla['retencion_uvt'],
            'retencion_mensual': retencion_mensual,
            'tarifa_promedio': tarifa_promedio,
            
            # Detalle tabla
            'tramo_aplicado': resultado_tabla['tramo_aplicado'],
            'tarifa_marginal_maxima': resultado_tabla['tarifa_marginal_maxima'],
            'detalle_tramos': resultado_tabla['detalle_tramos'],
        }
    
    # ──────────────────────────────────────────────────────────────────────────
    # CÁLCULOS INTERNOS
    # ──────────────────────────────────────────────────────────────────────────
    
    def _calcular_renta_exenta(self, ingreso_laboral: Decimal) -> Decimal:
        """
        Calcula renta exenta (25% ingreso laboral, tope 240 UVT mensuales).
        
        Art. 206 ET: 25% del ingreso laboral
        Tope: 2,880 UVT anuales = 240 UVT mensuales
        """
        renta_exenta_25pct = ingreso_laboral * Decimal('0.25')
        tope_mensual = self.uvt_valor * 240  # 240 UVT/mes
        
        return min(renta_exenta_25pct, tope_mensual).quantize(Decimal('0.01'))
    
    def _calcular_deducciones_totales(
        self,
        ingreso_laboral: Decimal,
        deducciones_salud: Decimal,
        deducciones_pension: Decimal,
        aportes_voluntarios_pension: Decimal,
        intereses_vivienda: Decimal,
        medicina_prepagada: Decimal,
        dependientes: int,
        otras_deducciones: Decimal,
    ) -> Decimal:
        """
        Calcula total de deducciones permitidas.
        
        Deducciones:
        1. Salud obligatoria (4%)
        2. Pensión obligatoria (4%)
        3. Aportes voluntarios pensión (tope 30% ingreso laboral)
        4. Intereses vivienda (sin tope)
        5. Medicina prepagada (tope 1 UVT/mes = 16 UVT/año)
        6. Dependientes (32 UVT/mes por dependiente = 384 UVT/año)
        """
        # 1. Obligatorias
        total = deducciones_salud + deducciones_pension
        
        # 2. Aportes voluntarios (tope 30% ingreso laboral)
        tope_voluntarios = ingreso_laboral * Decimal('0.30')
        aportes_validos = min(aportes_voluntarios_pension, tope_voluntarios)
        total += aportes_validos
        
        # 3. Intereses vivienda (sin tope)
        total += intereses_vivienda
        
        # 4. Medicina prepagada (tope 1 UVT/mes = 16 UVT/año)
        tope_medicina = self.uvt_valor * 1  # 1 UVT mensual
        medicina_valida = min(medicina_prepagada, tope_medicina)
        total += medicina_valida
        
        # 5. Dependientes (32 UVT/mes por dependiente)
        valor_dependientes = self.uvt_valor * 32 * dependientes
        total += valor_dependientes
        
        # 6. Otras deducciones
        total += otras_deducciones
        
        return total.quantize(Decimal('0.01'))
    
    def _aplicar_tabla_progresiva(self, base_uvt: Decimal) -> Dict:
        """
        Aplica tabla progresiva de retención.
        
        Método: Tarifa marginal por tramos
        
        Ejemplo: Base = 200 UVT
        Tramo 1 (0-95): 0% sobre 95 UVT = 0
        Tramo 2 (95-150): 19% sobre 55 UVT = 10.45
        Tramo 3 (150-200): 28% sobre 50 UVT = 14.00
        Total: 24.45 UVT
        """
        retencion_uvt = Decimal('0.00')
        tarifa_marginal_maxima = Decimal('0.00')
        tramo_aplicado = 1
        detalle_tramos = []
        
        for tramo in self.tabla:
            if base_uvt > tramo.uvt_desde:
                # Calcular exceso sobre límite inferior del tramo
                if tramo.uvt_hasta:
                    # Tramo con límite superior
                    exceso = min(
                        base_uvt - tramo.uvt_desde,
                        tramo.uvt_hasta - tramo.uvt_desde
                    )
                else:
                    # Último tramo (sin límite superior)
                    exceso = base_uvt - tramo.uvt_desde
                
                # Calcular impuesto del tramo
                impuesto_tramo = (exceso * tramo.tarifa_marginal / 100).quantize(Decimal('0.01'))
                retencion_uvt += impuesto_tramo
                
                # Guardar detalle
                detalle_tramos.append({
                    'tramo': tramo.numero_tramo,
                    'uvt_desde': tramo.uvt_desde,
                    'uvt_hasta': tramo.uvt_hasta if tramo.uvt_hasta else 'Sin límite',
                    'tarifa_marginal': tramo.tarifa_marginal,
                    'exceso_uvt': exceso.quantize(Decimal('0.01')),
                    'impuesto_tramo_uvt': impuesto_tramo,
                })
                
                # Actualizar tramo aplicado y tarifa marginal máxima
                tramo_aplicado = tramo.numero_tramo
                tarifa_marginal_maxima = tramo.tarifa_marginal
                
                # Si no excede el tramo, terminar
                if tramo.uvt_hasta and base_uvt <= tramo.uvt_hasta:
                    break
        
        return {
            'retencion_uvt': retencion_uvt,
            'tramo_aplicado': tramo_aplicado,
            'tarifa_marginal_maxima': tarifa_marginal_maxima,
            'detalle_tramos': detalle_tramos,
        }
    
    def _resultado_cero(
        self,
        ingreso_laboral: Decimal,
        ingreso_no_laboral: Decimal,
        renta_exenta: Decimal,
        deducciones_totales: Decimal,
    ) -> Dict:
        """Retorna resultado cuando no hay retención"""
        return {
            'ingreso_laboral': ingreso_laboral.quantize(Decimal('0.01')),
            'ingreso_no_laboral': ingreso_no_laboral.quantize(Decimal('0.01')),
            'ingreso_total': (ingreso_laboral + ingreso_no_laboral).quantize(Decimal('0.01')),
            'renta_exenta': renta_exenta,
            'deducciones_totales': deducciones_totales,
            'base_gravable_pesos': Decimal('0.00'),
            'base_gravable_uvt': Decimal('0.00'),
            'retencion_uvt': Decimal('0.00'),
            'retencion_mensual': Decimal('0.00'),
            'tarifa_promedio': Decimal('0.00'),
            'tramo_aplicado': 1,
            'tarifa_marginal_maxima': Decimal('0.00'),
            'detalle_tramos': [],
        }


# ══════════════════════════════════════════════════════════════════════════════
# API SIMPLIFICADA
# ══════════════════════════════════════════════════════════════════════════════

def calcular_retencion_empleado(
    empleado: Empleado,
    ingreso_laboral: Decimal,
    ingreso_no_laboral: Decimal = Decimal('0'),
    **kwargs
) -> Dict:
    """
    Calcula retención para un empleado específico.
    
    Args:
        empleado: Instancia de Empleado
        ingreso_laboral: Ingresos laborales del mes
        ingreso_no_laboral: Ingresos no laborales
        **kwargs: Argumentos opcionales para RetentionCalculator.calcular_retencion_mensual()
        
    Returns:
        Dict con cálculo detallado
        
    Example:
        >>> from payroll.services.retention_calculator import calcular_retencion_empleado
        >>> resultado = calcular_retencion_empleado(
        ...     empleado=mi_empleado,
        ...     ingreso_laboral=Decimal('3500000'),
        ...     deducciones_salud=Decimal('140000'),
        ...     deducciones_pension=Decimal('140000'),
        ... )
        >>> print(resultado['retencion_mensual'])
    """
    calculator = RetentionCalculator(uvt_valor=UVT_2026)
    return calculator.calcular_retencion_mensual(
        ingreso_laboral=ingreso_laboral,
        ingreso_no_laboral=ingreso_no_laboral,
        **kwargs
    )


def calcular_retencion_batch(empleados_data: List[Dict]) -> List[Dict]:
    """
    Calcula retención para múltiples empleados en batch.
    
    Args:
        empleados_data: Lista de dicts con datos de empleados
        Formato: [
            {
                'empleado': Empleado,
                'ingreso_laboral': Decimal,
                'deducciones_salud': Decimal,
                ...
            },
            ...
        ]
        
    Returns:
        Lista de resultados
    """
    calculator = RetentionCalculator(uvt_valor=UVT_2026)
    resultados = []
    
    for data in empleados_data:
        empleado = data.pop('empleado')
        resultado = calculator.calcular_retencion_mensual(**data)
        resultado['empleado'] = empleado
        resultados.append(resultado)
    
    return resultados
