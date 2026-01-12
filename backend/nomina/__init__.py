"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                         MÓDULO NÓMINA - CORTESEC                              ║
║                    Sistema de Nómina para Construcción                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

Sistema completo de gestión de nómina para empresas de construcción.

CARACTERÍSTICAS:
- Gestión de empleados y contratos
- Tipos de contrato configurables (aplica salud, pensión, ARL, parafiscales)
- Parámetros legales sin valores quemados
- Conceptos laborales (devengados y deducciones)
- Integración con préstamos (app prestamos)
- Integración con items de trabajo (app items)
- Cálculo automático de nómina

MODELOS:
- Empleado: Datos básicos del trabajador
- TipoContrato: Configuración de reglas por tipo de contrato
- Contrato: Relación empleado-empresa con salario y configuración
- ParametroLegal: Porcentajes legales configurables con vigencia
- ConceptoLaboral: Devengados y deducciones configurables
- NominaSimple: Nómina principal con totales calculados
- NominaItem: Items de trabajo en la nómina (usa items.Item)
- NominaConcepto: Conceptos aplicados a la nómina

INTEGRACIONES:
- prestamos.Prestamo: Descuentos automáticos de préstamos
- items.Item: Items de trabajo/producción

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: Enero 2026
"""

default_app_config = 'nomina.apps.NominaConfig'
