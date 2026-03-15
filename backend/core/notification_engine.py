"""
Motor centralizado de notificaciones — CorteSec
=================================================

Servicio para crear notificaciones respetando preferencias del usuario.
Se usa desde signals, views o cualquier parte del backend.

Uso:
    from core.notification_engine import NotificationEngine

    NotificationEngine.notify(
        usuario=user,
        titulo="Nómina procesada",
        mensaje="La nómina de Febrero 2026 ha sido procesada.",
        tipo="success",
        categoria="nomina",
        url_accion="/dashboard/nomina",
        texto_accion="Ver nómina",
    )
"""

import logging
import datetime
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)

# Mapeo categoría → campo de preferencia en ConfiguracionNotificaciones
CATEGORIA_PREFERENCIA_MAP = {
    'general': 'notif_sistema',
    'nomina': 'notif_nomina',
    'prestamos': 'notif_prestamos',
    'contratos': 'notif_contratos',
    'empleados': 'notif_empleados',
    'contabilidad': 'notif_contabilidad',
    'proyectos': 'notif_proyectos',
    'seguridad': 'notif_seguridad',
    'sistema': 'notif_sistema',
}

# Categorías que por defecto envían email
CATEGORIAS_EMAIL_DEFAULT = {'nomina', 'prestamos', 'contratos', 'seguridad'}


class NotificationEngine:
    """Motor centralizado de notificaciones."""

    # ── API pública ──────────────────────────────────────────────

    @classmethod
    def notify(cls, usuario, titulo, mensaje, tipo='info', categoria='general',
               prioridad='normal', url_accion='', texto_accion='',
               origen_tipo='', origen_id='', datos_adicionales=None,
               enviar_email=None, icono='', expires_at=None):
        """
        Crear notificación para un usuario respetando sus preferencias.

        Args:
            usuario: instancia de CustomUser
            titulo: título corto de la notificación
            mensaje: texto completo
            tipo: 'info' | 'success' | 'warning' | 'error' | 'system'
            categoria: 'general' | 'nomina' | 'prestamos' | 'contratos' | ...
            prioridad: 'baja' | 'normal' | 'alta' | 'urgente'
            url_accion: ruta frontend para navegar (ej: '/dashboard/nomina')
            texto_accion: texto del botón (ej: 'Ver nómina')
            origen_tipo: modelo que la generó (ej: 'nomina')
            origen_id: ID del objeto origen
            datos_adicionales: dict con metadata extra
            enviar_email: True/False/None (None = auto según categoría)
            icono: clase CSS o nombre de ícono
            expires_at: datetime de expiración (None = sin expiración)

        Returns:
            Notificacion o None si el usuario tiene desactivada esa categoría
        """
        from core.models import Notificacion

        if not usuario:
            logger.warning('NotificationEngine.notify() llamado sin usuario')
            return None

        # 1. ¿Quiere notificaciones in-app de esta categoría?
        if not cls._debe_notificar(usuario, categoria):
            logger.debug('Usuario %s tiene desactivadas notificaciones de %s', usuario, categoria)
            return None

        # 2. Deduplicación: no repetir misma notificación en < 1h
        if origen_tipo and origen_id:
            if cls._es_duplicada(usuario, origen_tipo, origen_id):
                logger.debug('Notificación duplicada: %s/%s para %s', origen_tipo, origen_id, usuario)
                return None

        # 3. Obtener organization del usuario
        organization = getattr(usuario, 'organization', None)

        # 4. Crear la notificación
        try:
            notif = Notificacion.objects.create(
                organization=organization,
                usuario=usuario,
                titulo=titulo,
                mensaje=mensaje,
                tipo=tipo,
                categoria=categoria,
                prioridad=prioridad,
                url_accion=url_accion,
                texto_accion=texto_accion,
                origen_tipo=origen_tipo,
                origen_id=str(origen_id) if origen_id else '',
                icono=icono,
                datos_adicionales=datos_adicionales or {},
                expires_at=expires_at,
            )
        except Exception as exc:
            logger.error('Error creando notificación para %s: %s', usuario, exc, exc_info=True)
            return None

        # 5. Email si corresponde
        should_email = enviar_email if enviar_email is not None else (
            categoria in CATEGORIAS_EMAIL_DEFAULT or prioridad == 'urgente'
        )
        if should_email and cls._quiere_email(usuario):
            cls._enviar_email(usuario, notif)

        logger.info('Notificación creada: [%s/%s] %s → %s', categoria, prioridad, titulo, usuario)
        return notif

    @classmethod
    def notify_bulk(cls, usuarios, **kwargs):
        """Enviar la misma notificación a múltiples usuarios."""
        results = []
        for u in usuarios:
            result = cls.notify(u, **kwargs)
            if result:
                results.append(result)
        return results

    @classmethod
    def notify_organization(cls, organization, **kwargs):
        """Enviar a todos los usuarios activos de una organización."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        usuarios = User.objects.filter(organization=organization, is_active=True)
        return cls.notify_bulk(usuarios, **kwargs)

    @classmethod
    def notify_admins(cls, organization, **kwargs):
        """Enviar solo a administradores de una organización."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        usuarios = User.objects.filter(
            organization=organization,
            is_active=True,
            organization_role__in=['OWNER', 'ADMIN'],
        )
        return cls.notify_bulk(usuarios, **kwargs)

    # ── Helpers privados ─────────────────────────────────────────

    @classmethod
    def _debe_notificar(cls, usuario, categoria):
        """¿El usuario quiere recibir notificaciones in-app de esta categoría?"""
        # Seguridad SIEMPRE se notifica
        if categoria == 'seguridad':
            return True

        try:
            config = usuario.perfil.config_notificaciones
        except Exception:
            return True  # Si no tiene config, notificar por defecto

        # Verificar si quiere notificaciones en la plataforma
        if not config.via_plataforma:
            return False

        campo = CATEGORIA_PREFERENCIA_MAP.get(categoria, 'notif_sistema')
        return getattr(config, campo, True)

    @classmethod
    def _quiere_email(cls, usuario):
        """¿El usuario tiene habilitadas notificaciones por email?"""
        try:
            config = usuario.perfil.config_notificaciones
            return config.via_email
        except Exception:
            return True

    @classmethod
    def _dentro_de_horario(cls, usuario):
        """¿Estamos dentro del horario de notificaciones del usuario?"""
        try:
            config = usuario.perfil.config_notificaciones
            ahora = timezone.localtime().time()
            inicio = config.horario_inicio
            fin = config.horario_fin
            if inicio <= fin:
                return inicio <= ahora <= fin
            else:
                # Rango nocturno (ej: 22:00 a 06:00)
                return ahora >= inicio or ahora <= fin
        except Exception:
            return True

    @classmethod
    def _es_duplicada(cls, usuario, origen_tipo, origen_id):
        """Verificar si ya existe la misma notificación creada < 1h."""
        from core.models import Notificacion
        hace_una_hora = timezone.now() - datetime.timedelta(hours=1)
        return Notificacion.objects.filter(
            usuario=usuario,
            origen_tipo=origen_tipo,
            origen_id=str(origen_id),
            fecha__gte=hace_una_hora,
        ).exists()

    @classmethod
    def _enviar_email(cls, usuario, notificacion):
        """Enviar la notificación por email usando el servicio existente."""
        if not usuario.email:
            return

        # Verificar horario (no enviar emails fuera de horario)
        if not cls._dentro_de_horario(usuario):
            return

        try:
            from core.email_service import send_system_email

            # Construir asunto
            prioridad_tag = ''
            if notificacion.prioridad == 'urgente':
                prioridad_tag = '🔴 [URGENTE] '
            elif notificacion.prioridad == 'alta':
                prioridad_tag = '🟠 [ALTA] '

            subject = f"{prioridad_tag}{notificacion.titulo}"

            # Construir cuerpo HTML simple
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            action_url = ''
            if notificacion.url_accion:
                action_url = f'{frontend_url}{notificacion.url_accion}'

            html_content = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0; color: white;">
                    <h2 style="margin: 0; font-size: 20px;">{notificacion.titulo}</h2>
                    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 13px;">CorteSec • {notificacion.get_categoria_display()}</p>
                </div>
                <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
                    <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">{notificacion.mensaje}</p>
                    {f'<a href="{action_url}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">{notificacion.texto_accion or "Ver detalle"}</a>' if action_url else ''}
                </div>
                <div style="background: #f9fafb; padding: 16px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">Este correo fue generado automáticamente por CorteSec. Puedes configurar tus preferencias de notificación en tu perfil.</p>
                </div>
            </div>
            """

            send_system_email(
                subject=f"[CorteSec] {subject}",
                message=notificacion.mensaje,
                recipient_list=[usuario.email],
                html_message=html_content,
            )
            logger.info('Email de notificación enviado a %s: %s', usuario.email, notificacion.titulo)
        except Exception as exc:
            logger.error('Error enviando email de notificación a %s: %s', usuario.email, exc)
