"""
App de Roles - Sistema CorteSec
==============================

Sistema avanzado de gestión de roles con jerarquía, herencia,
asignaciones temporales, auditoría completa y configuración dinámica.

Características principales:
- Jerarquía de roles con herencia de permisos
- Asignaciones con control temporal
- Estados de asignación (pendiente, aprobada, rechazada, etc.)
- Auditoría completa de cambios
- Meta-roles y roles condicionales
- Configuración dinámica por rol
- Cache inteligente para optimización
- Validaciones avanzadas
- Historial de cambios
- Plantillas de roles

Autor: Sistema CorteSec
Versión: 2.0.0
"""

default_app_config = 'roles.apps.RolesConfig'

__version__ = '2.0.0'
__author__ = 'Sistema CorteSec'
