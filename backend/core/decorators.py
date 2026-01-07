"""
Decoradores para auditoría automática del sistema
=================================================

Decoradores que registran automáticamente acciones en LogAuditoria
para trazabilidad completa del sistema.

Autor: Sistema CorteSec
Versión: 1.0.0
"""

import functools
import json
from django.utils import timezone
from .models import LogAuditoria


def audit_action(accion, modelo=None, get_objeto_id=None):
    """
    Decorador para auditar automáticamente acciones en vistas/ViewSets.
    
    Args:
        accion (str): Acción realizada (crear, modificar, eliminar, etc.)
        modelo (str): Nombre del modelo afectado (opcional)
        get_objeto_id (callable): Función para extraer el ID del objeto (opcional)
    
    Uso:
        @audit_action('crear_prestamo', modelo='Prestamo')
        def create(self, request, *args, **kwargs):
            return super().create(request, *args, **kwargs)
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Ejecutar la función original
            result = func(*args, **kwargs)
            
            # Extraer request (puede estar en self.request o args[1])
            request = None
            if len(args) > 0 and hasattr(args[0], 'request'):
                request = args[0].request
            elif len(args) > 1:
                request = args[1]
            
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                # Obtener datos adicionales
                objeto_id = None
                if get_objeto_id and callable(get_objeto_id):
                    try:
                        objeto_id = get_objeto_id(result, *args, **kwargs)
                    except:
                        pass
                
                # Obtener datos antes/después si están disponibles
                datos_antes = None
                datos_despues = None
                if hasattr(result, 'data'):
                    datos_despues = result.data
                
                # Crear log de auditoría
                try:
                    LogAuditoria.objects.create(
                        usuario=request.user,
                        accion=accion,
                        modelo=modelo or '',
                        objeto_id=objeto_id,
                        ip_address=get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
                        datos_antes=datos_antes,
                        datos_despues=datos_despues,
                        metadata={'url': request.path, 'method': request.method}
                    )
                except Exception as e:
                    # No fallar si el log falla
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error al crear log de auditoría: {e}")
            
            return result
        return wrapper
    return decorator


def get_client_ip(request):
    """Obtiene la IP real del cliente considerando proxies"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip[:45]  # Máximo 45 caracteres para IPv6


def log_model_change(instance, action, user=None, request=None, datos_antes=None):
    """
    Función auxiliar para registrar cambios en modelos.
    Usar en signals o vistas.
    
    Args:
        instance: Instancia del modelo modificado
        action (str): Acción realizada (crear, modificar, eliminar)
        user: Usuario que realizó la acción
        request: Request HTTP (opcional)
        datos_antes: Datos antes del cambio (opcional)
    """
    try:
        # Obtener datos después del cambio
        datos_despues = None
        if hasattr(instance, '__dict__'):
            datos_despues = {
                k: str(v) for k, v in instance.__dict__.items() 
                if not k.startswith('_')
            }
        
        # Obtener IP y user agent
        ip_address = ''
        user_agent = ''
        if request:
            ip_address = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:255]
        
        # Crear log
        LogAuditoria.objects.create(
            usuario=user,
            accion=action,
            modelo=instance.__class__.__name__,
            objeto_id=instance.pk if hasattr(instance, 'pk') else None,
            ip_address=ip_address,
            user_agent=user_agent,
            datos_antes=datos_antes,
            datos_despues=datos_despues,
            metadata={
                'model_verbose_name': str(instance._meta.verbose_name) if hasattr(instance, '_meta') else '',
            }
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error al registrar cambio en modelo: {e}")


# Ejemplo de uso en signals
"""
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from core.decorators import log_model_change

@receiver(post_save, sender=MiModelo)
def audit_modelo_save(sender, instance, created, **kwargs):
    action = 'crear' if created else 'modificar'
    log_model_change(instance, action, user=instance.usuario if hasattr(instance, 'usuario') else None)

@receiver(pre_delete, sender=MiModelo)
def audit_modelo_delete(sender, instance, **kwargs):
    log_model_change(instance, 'eliminar', user=None)
"""
