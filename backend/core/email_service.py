"""
Servicio centralizado de email para CorteSec.
================================================

Lee la configuración SMTP, remitente, plantillas y límites desde
ConfiguracionEmail en la base de datos. Todos los envíos de email
del sistema deben pasar por este módulo.

Funciones principales:
- send_system_email() — Enviar email usando config de DB
- get_email_connection() — Obtener conexión SMTP configurada
- get_from_email() — Obtener remitente formateado
"""

import logging
from django.core.cache import cache
from django.core.mail import get_connection, EmailMessage
from django.conf import settings

logger = logging.getLogger('email_service')

# Cache para la configuración de email
_EMAIL_CONFIG_CACHE_KEY = 'email_config_cached'
_EMAIL_CONFIG_CACHE_TTL = 60  # 1 minuto


def _get_email_config():
    """
    Obtiene la configuración de email desde ConfiguracionEmail con cache.
    Si no hay config en DB, retorna None (se usará settings.py como fallback).
    """
    cached = cache.get(_EMAIL_CONFIG_CACHE_KEY)
    if cached is not None:
        return cached

    try:
        from configuracion.models import ConfiguracionEmail
        config = ConfiguracionEmail.get_config()
        result = {
            'servidor_smtp': config.servidor_smtp,
            'puerto_smtp': config.puerto_smtp,
            'usuario_smtp': config.usuario_smtp,
            'password_smtp': config.password_smtp,
            'usar_tls': config.usar_tls,
            'usar_ssl': config.usar_ssl,
            'email_remitente': config.email_remitente,
            'nombre_remitente': config.nombre_remitente,
            'email_respuesta': config.email_respuesta or '',
            'plantilla_header': config.plantilla_header or '',
            'plantilla_footer': config.plantilla_footer or '',
            'limite_emails_hora': config.limite_emails_hora or 100,
            'limite_emails_dia': config.limite_emails_dia or 1000,
            'notificar_error_envio': config.notificar_error_envio,
            'email_administrador': config.email_administrador or '',
            'servicio_activo': config.servicio_activo,
        }
        cache.set(_EMAIL_CONFIG_CACHE_KEY, result, _EMAIL_CONFIG_CACHE_TTL)
        return result
    except Exception as e:
        logger.warning(f"No se pudo leer ConfiguracionEmail: {e}. Usando settings.py como fallback.")
        return None


def _has_valid_smtp_config(config):
    """Verifica si la configuración de SMTP del modelo tiene datos válidos."""
    return bool(
        config
        and config.get('servidor_smtp')
        and config.get('usuario_smtp')
        and config.get('password_smtp')
    )


def get_email_connection(fail_silently=False):
    """
    Obtiene una conexión SMTP usando la configuración de ConfiguracionEmail.
    Si no hay config válida en DB, usa la conexión default de Django (settings.py).
    """
    config = _get_email_config()

    if _has_valid_smtp_config(config):
        return get_connection(
            host=config['servidor_smtp'],
            port=config['puerto_smtp'],
            username=config['usuario_smtp'],
            password=config['password_smtp'],
            use_tls=config['usar_tls'],
            use_ssl=config['usar_ssl'],
            fail_silently=fail_silently,
        )
    else:
        # Fallback a settings.py
        return get_connection(fail_silently=fail_silently)


def get_from_email():
    """
    Retorna el remitente formateado: 'Nombre <email>'
    Lee de ConfiguracionEmail, o fallback a settings.DEFAULT_FROM_EMAIL.
    """
    config = _get_email_config()

    if config and config.get('email_remitente'):
        nombre = config.get('nombre_remitente', 'CorteSec')
        email = config['email_remitente']
        return f"{nombre} <{email}>"
    else:
        return settings.DEFAULT_FROM_EMAIL


def get_reply_to():
    """
    Retorna el email de respuesta (Reply-To) si está configurado.
    Retorna una lista, o None si no hay reply-to configurado.
    """
    config = _get_email_config()
    if config and config.get('email_respuesta'):
        return [config['email_respuesta']]
    return None


def is_email_service_active():
    """
    Verifica si el servicio de email está activo.
    Si no hay config en DB, se asume activo.
    """
    config = _get_email_config()
    if config is None:
        return True  # Sin config = activo por defecto
    return config.get('servicio_activo', True)


def _wrap_with_templates(body, is_html=False):
    """
    Envuelve el contenido del email con plantilla_header y plantilla_footer.
    Solo aplica si hay plantillas configuradas.
    """
    config = _get_email_config()
    if not config:
        return body

    header = config.get('plantilla_header', '')
    footer = config.get('plantilla_footer', '')

    if not header and not footer:
        return body

    if is_html:
        return f"{header}\n{body}\n{footer}"
    else:
        # Para texto plano, no inyectar HTML
        return body


def _check_rate_limit():
    """
    Verifica si se ha excedido el límite de envío (hora/día).
    Usa cache para contar emails enviados.
    Retorna True si se puede enviar, False si se excedió el límite.
    """
    config = _get_email_config()
    if not config:
        return True  # Sin config = sin límites

    from datetime import datetime

    # Contador por hora
    hour_key = f"email_count_hour_{datetime.now().strftime('%Y%m%d%H')}"
    hour_count = cache.get(hour_key, 0)
    if hour_count >= config['limite_emails_hora']:
        logger.warning(f"Límite de emails por hora excedido ({hour_count}/{config['limite_emails_hora']})")
        return False

    # Contador por día
    day_key = f"email_count_day_{datetime.now().strftime('%Y%m%d')}"
    day_count = cache.get(day_key, 0)
    if day_count >= config['limite_emails_dia']:
        logger.warning(f"Límite de emails por día excedido ({day_count}/{config['limite_emails_dia']})")
        return False

    return True


def _increment_rate_counter():
    """Incrementa los contadores de rate limiting."""
    from datetime import datetime

    hour_key = f"email_count_hour_{datetime.now().strftime('%Y%m%d%H')}"
    hour_count = cache.get(hour_key, 0)
    cache.set(hour_key, hour_count + 1, 3600)  # Expira en 1 hora

    day_key = f"email_count_day_{datetime.now().strftime('%Y%m%d')}"
    day_count = cache.get(day_key, 0)
    cache.set(day_key, day_count + 1, 86400)  # Expira en 24 horas


def _notify_admin_error(subject, error_message):
    """
    Notifica al administrador sobre un error de envío de email.
    Usa la conexión directa de settings.py para evitar recursión.
    """
    config = _get_email_config()
    if not config or not config.get('notificar_error_envio'):
        return
    
    admin_email = config.get('email_administrador', '')
    if not admin_email:
        return

    try:
        # Usar conexión de settings.py directamente para evitar recursión
        fallback_connection = get_connection(fail_silently=True)
        EmailMessage(
            subject=f'[CorteSec] Error de envío de email: {subject}',
            body=f"Se produjo un error al enviar un email.\n\nAsunto original: {subject}\nError: {error_message}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[admin_email],
            connection=fallback_connection,
        ).send(fail_silently=True)
        logger.info(f"Notificación de error de email enviada a {admin_email}")
    except Exception as e:
        logger.error(f"Error enviando notificación de error al admin: {e}")


def send_system_email(subject, message, recipient_list, html_message=None, fail_silently=False):
    """
    Función principal para enviar emails del sistema.
    
    Aplica toda la configuración de ConfiguracionEmail:
    - servicio_activo: kill switch global
    - SMTP: servidor, puerto, usuario, contraseña, TLS/SSL
    - Remitente: email_remitente, nombre_remitente
    - Reply-To: email_respuesta
    - Plantillas: plantilla_header, plantilla_footer (solo HTML)
    - Rate limiting: limite_emails_hora, limite_emails_dia
    - Notificaciones: notificar_error_envio, email_administrador
    
    Args:
        subject: Asunto del email
        message: Cuerpo en texto plano
        recipient_list: Lista de destinatarios
        html_message: Cuerpo HTML opcional (se le aplican plantillas)
        fail_silently: Si True, no lanza excepción en caso de error
    
    Returns:
        True si se envió exitosamente, False si falló o está desactivado
    """
    # 1. Verificar si el servicio está activo
    if not is_email_service_active():
        logger.info(f"Email NO enviado (servicio desactivado): {subject} → {recipient_list}")
        return False

    # 2. Verificar rate limiting
    if not _check_rate_limit():
        logger.warning(f"Email NO enviado (límite excedido): {subject} → {recipient_list}")
        if not fail_silently:
            raise Exception("Límite de envío de emails excedido")
        return False

    # 3. Obtener conexión y remitente
    try:
        connection = get_email_connection(fail_silently=fail_silently)
        from_email = get_from_email()
        reply_to = get_reply_to()

        # 4. Aplicar plantillas al HTML si existe
        if html_message:
            html_message = _wrap_with_templates(html_message, is_html=True)

        # 5. Crear y enviar el email
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=from_email,
            to=recipient_list,
            reply_to=reply_to,
            connection=connection,
        )

        if html_message:
            email.content_subtype = 'html'
            email.body = html_message

        email.send(fail_silently=fail_silently)

        # 6. Incrementar contadores de rate limiting
        _increment_rate_counter()

        logger.info(f"Email enviado: {subject} → {recipient_list}")
        return True

    except Exception as e:
        logger.error(f"Error enviando email '{subject}' a {recipient_list}: {e}")
        # 7. Notificar al admin si está habilitado
        _notify_admin_error(subject, str(e))
        if not fail_silently:
            raise
        return False
