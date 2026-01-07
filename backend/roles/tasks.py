"""
Tareas programadas con Celery para gestión automática de roles
"""
from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta


@shared_task
def verificar_roles_expirados():
    """
    Tarea que se ejecuta cada hora para:
    - Desactivar roles que han expirado
    - Desactivar asignaciones que han expirado
    """
    from roles.models import Rol, AsignacionRol, EstadoAsignacion
    
    ahora = timezone.now()
    hoy = ahora.date()
    
    # 1. Verificar roles expirados
    roles_expirados = Rol.objects.filter(
        activo=True,
        fecha_fin_vigencia__lt=hoy
    )
    
    count_roles = 0
    for rol in roles_expirados:
        rol.activo = False
        rol.save()
        
        # Desactivar todas las asignaciones del rol
        AsignacionRol.objects.filter(
            rol=rol,
            activa=True
        ).update(activa=False)
        
        count_roles += 1
        print(f"✅ Rol expirado y desactivado: {rol.nombre}")
    
    # 2. Verificar asignaciones expiradas
    try:
        estado_inactiva = EstadoAsignacion.objects.filter(nombre='INACTIVA').first()
    except:
        estado_inactiva = None
    
    asignaciones_expiradas = AsignacionRol.objects.filter(
        activa=True,
        fecha_fin__lt=ahora
    )
    
    count_asignaciones = 0
    for asignacion in asignaciones_expiradas:
        asignacion.activa = False
        if estado_inactiva:
            asignacion.estado = estado_inactiva
        
        observacion = f"\n[{ahora}] Desactivado automáticamente por expiración"
        if asignacion.observaciones:
            asignacion.observaciones += observacion
        else:
            asignacion.observaciones = observacion
        
        asignacion.save()
        count_asignaciones += 1
        print(f"✅ Asignación expirada: Usuario {asignacion.usuario.username} - Rol {asignacion.rol.nombre}")
    
    return {
        'roles_desactivados': count_roles,
        'asignaciones_expiradas': count_asignaciones,
        'timestamp': str(ahora)
    }


@shared_task
def notificar_roles_proximos_expirar():
    """
    Tarea que se ejecuta diariamente para notificar:
    - Roles que expiran en 7 días
    - Asignaciones que expiran en 7 días
    """
    from roles.models import Rol, AsignacionRol
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    ahora = timezone.now()
    fecha_limite = ahora + timedelta(days=7)
    
    # 1. Roles próximos a expirar
    roles_proximos = Rol.objects.filter(
        activo=True,
        fecha_fin_vigencia__lte=fecha_limite.date(),
        fecha_fin_vigencia__gte=ahora.date()
    )
    
    for rol in roles_proximos:
        dias_restantes = (rol.fecha_fin_vigencia - ahora.date()).days
        
        # Obtener usuarios con este rol
        usuarios = User.objects.filter(
            asignaciones_rol__rol=rol,
            asignaciones_rol__activa=True
        ).distinct()
        
        for usuario in usuarios:
            enviar_email_expiracion_rol(
                usuario.email,
                rol.nombre,
                dias_restantes,
                rol.fecha_fin_vigencia
            )
        
        print(f"📧 Notificación enviada: Rol '{rol.nombre}' expira en {dias_restantes} días")
    
    # 2. Asignaciones próximas a expirar
    asignaciones_proximas = AsignacionRol.objects.filter(
        activa=True,
        fecha_fin__lte=fecha_limite,
        fecha_fin__gte=ahora
    ).select_related('usuario', 'rol')
    
    for asignacion in asignaciones_proximas:
        dias_restantes = (asignacion.fecha_fin - ahora).days
        
        enviar_email_expiracion_asignacion(
            asignacion.usuario.email,
            asignacion.rol.nombre,
            dias_restantes,
            asignacion.fecha_fin
        )
        
        print(f"📧 Notificación enviada: Asignación de '{asignacion.rol.nombre}' "
              f"para {asignacion.usuario.username} expira en {dias_restantes} días")
    
    return {
        'roles_notificados': roles_proximos.count(),
        'asignaciones_notificadas': asignaciones_proximas.count(),
        'timestamp': str(ahora)
    }


@shared_task
def actualizar_estadisticas_roles():
    """
    Tarea que actualiza las estadísticas de todos los roles
    Se ejecuta cada noche
    """
    from roles.models import Rol
    
    roles = Rol.objects.all()
    count = 0
    
    for rol in roles:
        try:
            rol.actualizar_estadisticas()
            count += 1
        except Exception as e:
            print(f"❌ Error actualizando estadísticas de {rol.nombre}: {e}")
    
    return {
        'roles_actualizados': count,
        'timestamp': str(timezone.now())
    }


def enviar_email_expiracion_rol(email, nombre_rol, dias_restantes, fecha_expiracion):
    """Envía email notificando expiración de rol"""
    subject = f"⚠️ El rol '{nombre_rol}' está próximo a expirar"
    
    message = f"""
Hola,

Te informamos que el rol '{nombre_rol}' que tienes asignado está próximo a expirar.

Días restantes: {dias_restantes}
Fecha de expiración: {fecha_expiracion.strftime('%d/%m/%Y')}

Después de esta fecha, perderás acceso a las funcionalidades asociadas a este rol.
Si necesitas mantener el acceso, contacta a tu supervisor o al departamento de RRHH.

Saludos,
Sistema CorteSec
    """
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=True,
        )
    except Exception as e:
        print(f"❌ Error enviando email a {email}: {e}")


def enviar_email_expiracion_asignacion(email, nombre_rol, dias_restantes, fecha_expiracion):
    """Envía email notificando expiración de asignación"""
    subject = f"⚠️ Tu asignación del rol '{nombre_rol}' está próxima a expirar"
    
    message = f"""
Hola,

Te informamos que tu asignación del rol '{nombre_rol}' está próxima a expirar.

Días restantes: {dias_restantes}
Fecha de expiración: {fecha_expiracion.strftime('%d/%m/%Y %H:%M')}

Después de esta fecha, este rol dejará de estar activo para tu usuario.
Si necesitas renovar la asignación, contacta a tu supervisor o al departamento de RRHH.

Saludos,
Sistema CorteSec
    """
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=True,
        )
    except Exception as e:
        print(f"❌ Error enviando email a {email}: {e}")
