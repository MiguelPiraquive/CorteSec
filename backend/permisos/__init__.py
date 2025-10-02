"""
App de Permisos - Sistema CorteSec
================================

Sistema avanzado de gestión de permisos granulares con cache inteligente,
contexto dinámico, jerarquía de roles y auditoría completa.

Características principales:
- Permisos granulares con contexto dinámico
- Sistema de cache inteligente para optimización
- Jerarquía de permisos (padre-hijo)
- Asignación directa de permisos a usuarios
- Auditoría completa de cambios
- Validación avanzada con condiciones
- Tipos de permiso flexibles
- API REST completa
- Decoradores para vistas
- Middleware de autorización

Autor: Sistema CorteSec
Versión: 2.0.0
"""

default_app_config = 'permisos.apps.PermisosConfig'

__version__ = '2.0.0'
__author__ = 'Sistema CorteSec'
