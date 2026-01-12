"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                GENERADOR ARCHIVO PILA - RESOLUCIÓN 2388/2016                  ║
║                    Sistema de Nómina CorteSec v3.0                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Genera archivo TXT para liquidación PILA (Planilla Integrada de Liquidación
de Aportes) según Resolución 2388 de 2016 UGPP.

FORMATO:
--------
- Tipo 2: Archivo de texto plano (.TXT)
- Longitud registro: 260 caracteres
- Codificación: ASCII
- Separador: Ninguno (campos de ancho fijo)

ESTRUCTURA ARCHIVO:
-------------------
Tipo 1 (Encabezado): 1 registro
Tipo 2 (Detalle cotizante): N registros (1 por empleado)

CAMPOS TIPO 1 (Encabezado):
---------------------------
1. Tipo registro: "1" (1)
2. Código formato: "02" (2)
3. NIT aportante: (16)
4. DV: (1)
5. Razón social: (200)
6. Tipo documento: "NI" (2)
7. Período cotización: "AAAA-MM-DD" (10)
8. Fecha generación: "AAAA-MM-DD" (10)
... (260 caracteres totales)

CAMPOS TIPO 2 (Cotizante):
--------------------------
1. Tipo registro: "2" (1)
2. Tipo documento cotizante: "CC/CE/PA" (2)
3. Número documento: (16)
4. Tipo cotizante: "01-59" (2)
5. Subtipo cotizante: "00-99" (2)
6. Extranjero: "X" o " " (1)
7. Colombiano exterior: "X" o " " (1)
8. Salario: (9)
9. IBC pensión: (9)
10. IBC salud: (9)
... (260 caracteres totales)

NORMATIVIDAD:
-------------
- Resolución 2388/2016 UGPP: Formato archivo PILA
- Circular 0065/2017: Precisiones formato
- Resolución 3034/2013: Sistema PILA

AUTOR: Sistema CorteSec
FECHA: Enero 2026 - FASE 3
"""

from decimal import Decimal
from datetime import date, datetime
from typing import List, Dict, Optional
import os
from io import StringIO

from django.db.models import Q
from payroll.models import (
    Empleado,
    NominaSimple,
    EmbargoJudicial,
    LiquidacionFIC,
)
from payroll.constants import SMMLV_2026


# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTES
# ══════════════════════════════════════════════════════════════════════════════

# Tipos de documento (Tabla PILA)
TIPOS_DOCUMENTO_PILA = {
    'CC': 'CC',  # Cédula de Ciudadanía
    'CE': 'CE',  # Cédula de Extranjería
    'TI': 'TI',  # Tarjeta de Identidad
    'PA': 'PA',  # Pasaporte
    'RC': 'RC',  # Registro Civil
    'NIT': 'NI', # NIT (para empresas aportantes)
}

# Tipos de cotizante (Circular 0065/2017)
TIPOS_COTIZANTE = {
    'DEPENDIENTE': '01',
    'INDEPENDIENTE': '02',
    'ESTUDIANTE': '03',
    'PENSIONADO': '04',
    'BENEFICIARIO': '05',
    'APRENDIZ': '18',
}

# Subtipos cotizante
SUBTIPOS_COTIZANTE = {
    'TIEMPO_COMPLETO': '00',
    'TIEMPO_PARCIAL': '01',
    'EXTERIOR': '02',
}

# Marcas
MARCA_SI = 'X'
MARCA_NO = ' '


# ══════════════════════════════════════════════════════════════════════════════
# CLASE PRINCIPAL
# ══════════════════════════════════════════════════════════════════════════════

class PILAGenerator:
    """
    Generador de archivo PILA según Resolución 2388/2016.
    
    Uso:
        generator = PILAGenerator(organization, anio=2026, mes=1)
        contenido = generator.generar_archivo()
        with open('pila_2026_01.txt', 'w') as f:
            f.write(contenido)
    """
    
    def __init__(
        self,
        organization,
        anio: int,
        mes: int,
        fecha_generacion: date = None
    ):
        """
        Args:
            organization: Organización del multitenant
            anio: Año del período a liquidar
            mes: Mes del período a liquidar
            fecha_generacion: Fecha generación archivo (default: hoy)
        """
        self.organization = organization
        self.anio = anio
        self.mes = mes
        self.fecha_generacion = fecha_generacion or date.today()
        
        # Período de cotización (primer día del mes)
        self.periodo_cotizacion = date(anio, mes, 1)
        
        # Validar datos de la organización
        self._validar_organizacion()
    
    # ──────────────────────────────────────────────────────────────────────────
    # API PÚBLICA
    # ──────────────────────────────────────────────────────────────────────────
    
    def generar_archivo(self) -> str:
        """
        Genera el contenido completo del archivo PILA.
        
        Returns:
            String con el contenido del archivo (260 caracteres por línea)
        """
        lineas = []
        
        # Tipo 1: Encabezado
        lineas.append(self._generar_tipo1())
        
        # Tipo 2: Detalle cotizantes
        nominas = self._obtener_nominas_periodo()
        for nomina in nominas:
            linea_tipo2 = self._generar_tipo2(nomina)
            lineas.append(linea_tipo2)
        
        return '\n'.join(lineas)
    
    def guardar_archivo(self, ruta: str) -> str:
        """
        Guarda el archivo PILA en el sistema de archivos.
        
        Args:
            ruta: Ruta donde guardar el archivo
            
        Returns:
            Ruta completa del archivo guardado
        """
        contenido = self.generar_archivo()
        
        # Construir nombre archivo: PILA_NIT_AAAAMM.txt
        nit = self.organization.nit.replace('-', '').replace(' ', '')
        nombre_archivo = f"PILA_{nit}_{self.anio}{self.mes:02d}.txt"
        ruta_completa = os.path.join(ruta, nombre_archivo)
        
        with open(ruta_completa, 'w', encoding='ascii') as f:
            f.write(contenido)
        
        return ruta_completa
    
    def validar_archivo(self) -> Dict:
        """
        Valida el archivo antes de generar.
        
        Returns:
            Dict con resultado validación:
            {
                'valido': bool,
                'errores': List[str],
                'advertencias': List[str],
                'total_registros': int,
            }
        """
        errores = []
        advertencias = []
        
        # Validar organización
        if not self.organization.nit:
            errores.append("La organización no tiene NIT configurado")
        
        if not self.organization.nombre:
            errores.append("La organización no tiene razón social")
        
        # Validar nóminas del período
        nominas = self._obtener_nominas_periodo()
        
        if not nominas:
            errores.append(f"No hay nóminas procesadas para {self.anio}-{self.mes:02d}")
        
        # Validar empleados sin documento
        for nomina in nominas:
            if not nomina.empleado.documento:
                errores.append(
                    f"Empleado {nomina.empleado.nombres} sin documento configurado"
                )
            
            if not nomina.ibc or nomina.ibc <= 0:
                advertencias.append(
                    f"Empleado {nomina.empleado.nombres} con IBC en cero"
                )
        
        return {
            'valido': len(errores) == 0,
            'errores': errores,
            'advertencias': advertencias,
            'total_registros': len(nominas) + 1,  # +1 encabezado
        }
    
    # ──────────────────────────────────────────────────────────────────────────
    # GENERACIÓN TIPO 1 (ENCABEZADO)
    # ──────────────────────────────────────────────────────────────────────────
    
    def _generar_tipo1(self) -> str:
        """
        Genera registro Tipo 1 (Encabezado).
        
        Estructura (260 caracteres):
        - Tipo registro: "1" (1)
        - Código formato: "02" (2)
        - NIT aportante: (16)
        - DV: (1)
        - Razón social: (200)
        - Tipo documento: "NI" (2)
        - Período cotización: "AAAA-MM-DD" (10)
        - Fecha generación: "AAAA-MM-DD" (10)
        - Total registros Tipo 2: (6)
        - Espacios: (12)
        """
        # Extraer NIT y DV
        nit = self.organization.nit.replace('-', '').replace(' ', '')
        
        # Si tiene DV (último carácter), separarlo
        if len(nit) > 9:
            dv = nit[-1]
            nit_sin_dv = nit[:-1]
        else:
            dv = '0'
            nit_sin_dv = nit
        
        # Calcular total registros Tipo 2
        total_tipo2 = self._obtener_nominas_periodo().count()
        
        # Construir línea
        linea = (
            '1' +  # Tipo registro
            '02' +  # Código formato
            nit_sin_dv.rjust(16, '0') +  # NIT (16)
            dv +  # DV (1)
            self.organization.nombre[:200].ljust(200, ' ') +  # Razón social (200)
            'NI' +  # Tipo documento (2)
            self.periodo_cotizacion.strftime('%Y-%m-%d') +  # Período (10)
            self.fecha_generacion.strftime('%Y-%m-%d') +  # Fecha generación (10)
            str(total_tipo2).rjust(6, '0') +  # Total registros (6)
            ' ' * 12  # Espacios (12)
        )
        
        # Validar longitud
        assert len(linea) == 260, f"Tipo 1 debe tener 260 caracteres, tiene {len(linea)}"
        
        return linea
    
    # ──────────────────────────────────────────────────────────────────────────
    # GENERACIÓN TIPO 2 (COTIZANTE)
    # ──────────────────────────────────────────────────────────────────────────
    
    def _generar_tipo2(self, nomina: NominaSimple) -> str:
        """
        Genera registro Tipo 2 (Cotizante).
        
        Estructura (260 caracteres):
        - Tipo registro: "2" (1)
        - Tipo documento: "CC/CE" (2)
        - Número documento: (16)
        - Tipo cotizante: "01" (2)
        - Subtipo: "00" (2)
        - Extranjero: "X" o " " (1)
        - Colombiano exterior: " " (1)
        - Salario básico: (9)
        - IBC pensión: (9)
        - IBC salud: (9)
        - ... (continúa hasta 260)
        """
        empleado = nomina.empleado
        
        # Tipo documento (convertir a código PILA)
        tipo_doc_code = empleado.tipo_documento.codigo if empleado.tipo_documento else 'CC'
        tipo_doc_pila = TIPOS_DOCUMENTO_PILA.get(tipo_doc_code, 'CC')
        
        # Documento (16 caracteres)
        documento = empleado.documento.rjust(16, '0')
        
        # Tipo cotizante (01 = Dependiente)
        tipo_cotizante = '01'
        
        # Subtipo (00 = Tiempo completo)
        subtipo_cotizante = '00'
        
        # Extranjero (X si CE o PA)
        extranjero = MARCA_SI if tipo_doc_code in ['CE', 'PA'] else MARCA_NO
        
        # Colombiano en el exterior
        colombiano_exterior = MARCA_NO
        
        # Salario básico (9 dígitos, sin puntos/comas)
        salario_basico = int(nomina.salario_base or 0)
        salario_str = str(salario_basico).rjust(9, '0')
        
        # IBC (9 dígitos)
        ibc = int(nomina.ibc or 0)
        ibc_str = str(ibc).rjust(9, '0')
        
        # Días cotizados (2 dígitos)
        dias_cotizados = int(nomina.dias_trabajados or 30)
        dias_str = str(dias_cotizados).rjust(2, '0')
        
        # Aportes salud empleado (9 dígitos)
        salud_empleado = int((nomina.ibc * Decimal('0.04')).quantize(Decimal('0.01')))
        salud_empleado_str = str(salud_empleado).rjust(9, '0')
        
        # Aportes salud empleador (9 dígitos)
        salud_empleador = int((nomina.ibc * Decimal('0.085')).quantize(Decimal('0.01')))
        salud_empleador_str = str(salud_empleador).rjust(9, '0')
        
        # Aportes pensión empleado (9 dígitos)
        pension_empleado = int((nomina.ibc * Decimal('0.04')).quantize(Decimal('0.01')))
        pension_empleado_str = str(pension_empleado).rjust(9, '0')
        
        # Aportes pensión empleador (9 dígitos)
        pension_empleador = int((nomina.ibc * Decimal('0.12')).quantize(Decimal('0.01')))
        pension_empleador_str = str(pension_empleador).rjust(9, '0')
        
        # FSP (9 dígitos) - Solo si aplica
        fsp = Decimal('0')
        if nomina.ibc > (SMMLV_2026 * 4):
            fsp = nomina.ibc * Decimal('0.01')
        fsp_str = str(int(fsp)).rjust(9, '0')
        
        # Construir línea (simplificada - faltan muchos campos según Res. 2388)
        # Aquí solo los 100 caracteres principales, resto se completa con espacios
        linea_parcial = (
            '2' +  # Tipo registro (1)
            tipo_doc_pila +  # Tipo documento (2)
            documento +  # Número documento (16)
            tipo_cotizante +  # Tipo cotizante (2)
            subtipo_cotizante +  # Subtipo (2)
            extranjero +  # Extranjero (1)
            colombiano_exterior +  # Colombiano exterior (1)
            salario_str +  # Salario básico (9)
            ibc_str +  # IBC pensión (9)
            ibc_str +  # IBC salud (9)
            dias_str +  # Días cotizados (2)
            salud_empleado_str +  # Salud empleado (9)
            salud_empleador_str +  # Salud empleador (9)
            pension_empleado_str +  # Pensión empleado (9)
            pension_empleador_str +  # Pensión empleador (9)
            fsp_str  # FSP (9)
        )
        
        # Completar hasta 260 caracteres (campos adicionales vacíos)
        caracteres_usados = len(linea_parcial)
        espacios_faltantes = 260 - caracteres_usados
        linea = linea_parcial + (' ' * espacios_faltantes)
        
        # Validar longitud
        assert len(linea) == 260, f"Tipo 2 debe tener 260 caracteres, tiene {len(linea)}"
        
        return linea
    
    # ──────────────────────────────────────────────────────────────────────────
    # HELPERS
    # ──────────────────────────────────────────────────────────────────────────
    
    def _obtener_nominas_periodo(self):
        """Obtiene nóminas procesadas del período"""
        return NominaSimple.objects.filter(
            organization=self.organization,
            fecha_inicio__year=self.anio,
            fecha_inicio__month=self.mes,
            estado='PROCESADA'
        ).select_related('empleado', 'empleado__tipo_documento')
    
    def _validar_organizacion(self):
        """Valida datos necesarios de la organización"""
        if not self.organization.nit:
            raise ValueError("La organización debe tener NIT configurado")
        
        if not self.organization.nombre:
            raise ValueError("La organización debe tener razón social")


# ══════════════════════════════════════════════════════════════════════════════
# API SIMPLIFICADA
# ══════════════════════════════════════════════════════════════════════════════

def generar_pila(
    organization,
    anio: int,
    mes: int,
    guardar_ruta: Optional[str] = None
) -> Dict:
    """
    API simplificada para generar archivo PILA.
    
    Args:
        organization: Organización del multitenant
        anio: Año del período
        mes: Mes del período
        guardar_ruta: Ruta donde guardar (None = solo retornar contenido)
        
    Returns:
        Dict con:
        - contenido: String del archivo
        - ruta: Ruta guardada (si guardar_ruta != None)
        - validacion: Resultado de validación
        
    Example:
        >>> from payroll.services.pila_generator import generar_pila
        >>> resultado = generar_pila(
        ...     organization=mi_org,
        ...     anio=2026,
        ...     mes=1,
        ...     guardar_ruta='/tmp/pila/'
        ... )
        >>> print(resultado['ruta'])
    """
    generator = PILAGenerator(organization, anio, mes)
    
    # Validar antes de generar
    validacion = generator.validar_archivo()
    
    if not validacion['valido']:
        return {
            'contenido': None,
            'ruta': None,
            'validacion': validacion,
        }
    
    # Generar contenido
    contenido = generator.generar_archivo()
    
    # Guardar si se especificó ruta
    ruta = None
    if guardar_ruta:
        ruta = generator.guardar_archivo(guardar_ruta)
    
    return {
        'contenido': contenido,
        'ruta': ruta,
        'validacion': validacion,
    }
