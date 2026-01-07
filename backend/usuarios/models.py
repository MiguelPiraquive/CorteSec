"""
Modelos del Módulo de Usuarios - CorteSec
=========================================

Modelos extendidos para gestión de usuarios con Multi-Tenancy.

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: 2026-01-01
"""

from django.db import models
from django.contrib.auth import get_user_model
from core.mixins import TenantAwareModel

User = get_user_model()


class HistorialUsuario(TenantAwareModel):
    """Historial de actividades de usuarios con soporte multi-tenant"""
    
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='historial_actividad',
        verbose_name="Usuario"
    )
    accion = models.CharField(max_length=200, verbose_name="Acción")
    descripcion = models.TextField(blank=True, verbose_name="Descripción")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="Dirección IP")
    user_agent = models.TextField(blank=True, verbose_name="Navegador/Dispositivo")
    fecha = models.DateTimeField(auto_now_add=True, verbose_name="Fecha")
    
    class Meta:
        verbose_name = "Historial de Usuario"
        verbose_name_plural = "Historiales de Usuarios"
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['usuario', '-fecha']),
            models.Index(fields=['-fecha']),
        ]
    
    def __str__(self):
        return f"{self.usuario.username} - {self.accion} ({self.fecha})"

