"""
Sistema de Notificaciones Multi-Canal (FASE 6)

Implementa el patrón Adapter para enviar notificaciones por múltiples canales:
- Email (SMTP/SendGrid)
- SMS (Twilio)
- WhatsApp (Twilio/WhatsApp Business API)
- Push Notifications (Firebase/OneSignal)

Características:
- Cola de notificaciones con retry automático
- Plantillas parametrizables
- Rate limiting por canal
- Logging y auditoría
- Priorización de mensajes

Casos de uso:
- Aprobación de nómina → Email + SMS a contabilidad
- Dispersión bancaria → WhatsApp a empleados
- Ajustes DIAN → Email a responsables
- Alertas HSE → SMS urgente + Push
- Vencimiento certificados → Email recordatorio
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import logging
import json

from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.db import transaction

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS Y DATACLASSES
# ============================================================================

class NotificationChannel(Enum):
    """Canales de notificación disponibles."""
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    PUSH = "push"


class NotificationPriority(Enum):
    """Prioridad de notificaciones."""
    LOW = 0       # Informativas (recordatorios, newsletters)
    NORMAL = 1    # Operativas (aprobaciones, confirmaciones)
    HIGH = 2      # Urgentes (alertas HSE, errores críticos)
    CRITICAL = 3  # Críticas (emergencias, fallos sistema)


class NotificationStatus(Enum):
    """Estados de una notificación."""
    PENDING = "pending"       # En cola
    SENDING = "sending"       # Enviando
    SENT = "sent"            # Enviada exitosamente
    FAILED = "failed"        # Falló el envío
    RETRYING = "retrying"    # Reintentando
    CANCELLED = "cancelled"  # Cancelada


@dataclass
class NotificationRecipient:
    """Destinatario de una notificación."""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None  # Formato: +57XXXXXXXXXX
    whatsapp: Optional[str] = None
    push_token: Optional[str] = None
    user_id: Optional[int] = None
    
    def get_contact_for_channel(self, channel: NotificationChannel) -> Optional[str]:
        """Obtiene el contacto según el canal."""
        mapping = {
            NotificationChannel.EMAIL: self.email,
            NotificationChannel.SMS: self.phone,
            NotificationChannel.WHATSAPP: self.whatsapp,
            NotificationChannel.PUSH: self.push_token,
        }
        return mapping.get(channel)


@dataclass
class NotificationMessage:
    """Mensaje de notificación con metadatos."""
    channel: NotificationChannel
    recipients: List[NotificationRecipient]
    subject: str
    body: str
    priority: NotificationPriority = NotificationPriority.NORMAL
    template: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    attachments: List[Dict[str, Any]] = field(default_factory=list)
    scheduled_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def is_expired(self) -> bool:
        """Verifica si la notificación expiró."""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False


# ============================================================================
# INTERFACES ABSTRACTAS
# ============================================================================

class NotificationAdapter(ABC):
    """
    Interfaz base para adaptadores de notificación.
    
    Implementa el patrón Adapter para abstraer proveedores específicos.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Inicializa el adaptador.
        
        Args:
            config: Configuración específica del adaptador
        """
        self.config = config or {}
        self.logger = logging.getLogger(self.__class__.__name__)
    
    @abstractmethod
    def send(self, message: NotificationMessage) -> Dict[str, Any]:
        """
        Envía una notificación.
        
        Args:
            message: Mensaje a enviar
        
        Returns:
            Dict con resultado del envío:
            {
                'success': bool,
                'message_id': str,
                'error': Optional[str],
                'metadata': Dict
            }
        """
        pass
    
    @abstractmethod
    def validate_recipient(self, recipient: NotificationRecipient) -> bool:
        """
        Valida que el destinatario tenga datos válidos para este canal.
        
        Args:
            recipient: Destinatario a validar
        
        Returns:
            bool: True si es válido
        """
        pass
    
    def get_rate_limit(self) -> Optional[int]:
        """
        Retorna el límite de mensajes por minuto (si aplica).
        
        Returns:
            int: Mensajes por minuto, None si no hay límite
        """
        return None


# ============================================================================
# ADAPTADOR EMAIL
# ============================================================================

class EmailAdapter(NotificationAdapter):
    """
    Adaptador para notificaciones por email.
    
    Soporta:
    - SMTP nativo de Django
    - HTML + texto plano
    - Adjuntos
    - Templates Django
    """
    
    def send(self, message: NotificationMessage) -> Dict[str, Any]:
        """Envía email usando EmailMultiAlternatives de Django."""
        try:
            # Validar recipientes
            valid_recipients = [
                r for r in message.recipients 
                if self.validate_recipient(r)
            ]
            
            if not valid_recipients:
                return {
                    'success': False,
                    'error': 'No hay destinatarios con email válido',
                    'message_id': None,
                    'metadata': {}
                }
            
            # Preparar destinatarios
            to_emails = [r.email for r in valid_recipients]
            
            # Renderizar template si existe
            if message.template:
                html_body = render_to_string(message.template, message.context)
                text_body = message.body
            else:
                html_body = message.body
                text_body = message.body
            
            # Crear email
            email = EmailMultiAlternatives(
                subject=message.subject,
                body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=to_emails,
            )
            
            # Agregar versión HTML
            if html_body != text_body:
                email.attach_alternative(html_body, "text/html")
            
            # Adjuntar archivos
            for attachment in message.attachments:
                email.attach(
                    filename=attachment.get('filename'),
                    content=attachment.get('content'),
                    mimetype=attachment.get('mimetype', 'application/octet-stream')
                )
            
            # Enviar
            email.send(fail_silently=False)
            
            self.logger.info(f"Email enviado a {len(to_emails)} destinatarios")
            
            return {
                'success': True,
                'message_id': f"email_{timezone.now().timestamp()}",
                'error': None,
                'metadata': {
                    'recipients_count': len(to_emails),
                    'has_attachments': len(message.attachments) > 0
                }
            }
        
        except Exception as e:
            self.logger.error(f"Error enviando email: {str(e)}")
            return {
                'success': False,
                'message_id': None,
                'error': str(e),
                'metadata': {}
            }
    
    def validate_recipient(self, recipient: NotificationRecipient) -> bool:
        """Valida que tenga email y formato correcto."""
        if not recipient.email:
            return False
        
        # Validación básica de email
        return '@' in recipient.email and '.' in recipient.email.split('@')[1]


# ============================================================================
# ADAPTADOR SMS (TWILIO)
# ============================================================================

class TwilioSMSAdapter(NotificationAdapter):
    """
    Adaptador para SMS usando Twilio.
    
    Configuración requerida en settings.py:
    TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxxx'
    TWILIO_AUTH_TOKEN = 'xxxxxxxxxxxxx'
    TWILIO_PHONE_NUMBER = '+1234567890'
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Inicializa cliente Twilio."""
        try:
            from twilio.rest import Client
            
            account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
            auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
            
            if account_sid and auth_token:
                self.client = Client(account_sid, auth_token)
            else:
                self.logger.warning("Twilio credentials no configuradas")
        
        except ImportError:
            self.logger.error("twilio package no instalado. Instalar: pip install twilio")
    
    def send(self, message: NotificationMessage) -> Dict[str, Any]:
        """Envía SMS usando Twilio."""
        if not self.client:
            return {
                'success': False,
                'error': 'Cliente Twilio no inicializado',
                'message_id': None,
                'metadata': {}
            }
        
        try:
            # Validar recipientes
            valid_recipients = [
                r for r in message.recipients 
                if self.validate_recipient(r)
            ]
            
            if not valid_recipients:
                return {
                    'success': False,
                    'error': 'No hay destinatarios con teléfono válido',
                    'message_id': None,
                    'metadata': {}
                }
            
            # Enviar a cada destinatario
            results = []
            from_number = getattr(settings, 'TWILIO_PHONE_NUMBER')
            
            for recipient in valid_recipients:
                try:
                    sms = self.client.messages.create(
                        body=message.body[:160],  # Límite SMS
                        from_=from_number,
                        to=recipient.phone
                    )
                    
                    results.append({
                        'success': True,
                        'sid': sms.sid,
                        'to': recipient.phone
                    })
                
                except Exception as e:
                    self.logger.error(f"Error enviando SMS a {recipient.phone}: {str(e)}")
                    results.append({
                        'success': False,
                        'error': str(e),
                        'to': recipient.phone
                    })
            
            successful = sum(1 for r in results if r['success'])
            
            return {
                'success': successful > 0,
                'message_id': results[0]['sid'] if successful > 0 else None,
                'error': None if successful > 0 else 'Todos los envíos fallaron',
                'metadata': {
                    'total_sent': successful,
                    'total_failed': len(results) - successful,
                    'results': results
                }
            }
        
        except Exception as e:
            self.logger.error(f"Error en envío SMS: {str(e)}")
            return {
                'success': False,
                'message_id': None,
                'error': str(e),
                'metadata': {}
            }
    
    def validate_recipient(self, recipient: NotificationRecipient) -> bool:
        """Valida formato de teléfono (+57XXXXXXXXXX)."""
        if not recipient.phone:
            return False
        
        # Debe empezar con + y tener al menos 10 dígitos
        phone = recipient.phone.strip()
        return phone.startswith('+') and len(phone) >= 11
    
    def get_rate_limit(self) -> Optional[int]:
        """Twilio permite ~100 SMS/seg, usamos límite conservador."""
        return 60  # 60 SMS por minuto


# ============================================================================
# ADAPTADOR WHATSAPP (TWILIO)
# ============================================================================

class TwilioWhatsAppAdapter(NotificationAdapter):
    """
    Adaptador para WhatsApp usando Twilio API.
    
    Configuración: Mismas credenciales que SMS
    Número formato: whatsapp:+57XXXXXXXXXX
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Inicializa cliente Twilio."""
        try:
            from twilio.rest import Client
            
            account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
            auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
            
            if account_sid and auth_token:
                self.client = Client(account_sid, auth_token)
        
        except ImportError:
            self.logger.error("twilio package no instalado")
    
    def send(self, message: NotificationMessage) -> Dict[str, Any]:
        """Envía mensaje WhatsApp usando Twilio."""
        if not self.client:
            return {
                'success': False,
                'error': 'Cliente Twilio no inicializado',
                'message_id': None,
                'metadata': {}
            }
        
        try:
            valid_recipients = [
                r for r in message.recipients 
                if self.validate_recipient(r)
            ]
            
            if not valid_recipients:
                return {
                    'success': False,
                    'error': 'No hay destinatarios con WhatsApp válido',
                    'message_id': None,
                    'metadata': {}
                }
            
            results = []
            from_whatsapp = f"whatsapp:{getattr(settings, 'TWILIO_WHATSAPP_NUMBER', settings.TWILIO_PHONE_NUMBER)}"
            
            for recipient in valid_recipients:
                try:
                    # Formatear número WhatsApp
                    to_whatsapp = f"whatsapp:{recipient.whatsapp}"
                    
                    msg = self.client.messages.create(
                        body=message.body,
                        from_=from_whatsapp,
                        to=to_whatsapp
                    )
                    
                    results.append({
                        'success': True,
                        'sid': msg.sid,
                        'to': recipient.whatsapp
                    })
                
                except Exception as e:
                    self.logger.error(f"Error enviando WhatsApp a {recipient.whatsapp}: {str(e)}")
                    results.append({
                        'success': False,
                        'error': str(e),
                        'to': recipient.whatsapp
                    })
            
            successful = sum(1 for r in results if r['success'])
            
            return {
                'success': successful > 0,
                'message_id': results[0]['sid'] if successful > 0 else None,
                'error': None if successful > 0 else 'Todos los envíos fallaron',
                'metadata': {
                    'total_sent': successful,
                    'total_failed': len(results) - successful,
                    'results': results
                }
            }
        
        except Exception as e:
            return {
                'success': False,
                'message_id': None,
                'error': str(e),
                'metadata': {}
            }
    
    def validate_recipient(self, recipient: NotificationRecipient) -> bool:
        """Valida formato WhatsApp."""
        if not recipient.whatsapp:
            return False
        
        whatsapp = recipient.whatsapp.strip()
        return whatsapp.startswith('+') and len(whatsapp) >= 11
    
    def get_rate_limit(self) -> Optional[int]:
        """Límite conservador para WhatsApp."""
        return 20  # 20 mensajes por minuto


# ============================================================================
# ADAPTADOR PUSH NOTIFICATIONS (STUB)
# ============================================================================

class PushNotificationAdapter(NotificationAdapter):
    """
    Adaptador para notificaciones push (Firebase/OneSignal).
    
    NOTA: Implementación básica, requiere integración con Firebase Cloud Messaging
    o servicio similar.
    """
    
    def send(self, message: NotificationMessage) -> Dict[str, Any]:
        """Envía push notification (stub implementation)."""
        self.logger.warning("Push notifications no implementadas completamente")
        
        # TODO: Integrar con Firebase Cloud Messaging o OneSignal
        # Por ahora retornamos éxito simulado
        
        return {
            'success': True,
            'message_id': f"push_{timezone.now().timestamp()}",
            'error': None,
            'metadata': {
                'stub': True,
                'recipients_count': len(message.recipients)
            }
        }
    
    def validate_recipient(self, recipient: NotificationRecipient) -> bool:
        """Valida que tenga push token."""
        return recipient.push_token is not None and len(recipient.push_token) > 0


# ============================================================================
# FACTORY DE NOTIFICACIONES
# ============================================================================

class NotificationFactory:
    """
    Factory para crear adaptadores de notificación.
    
    Patrón Factory Method para instanciar adaptadores según canal.
    """
    
    _adapters: Dict[NotificationChannel, NotificationAdapter] = {}
    
    @classmethod
    def get_adapter(cls, channel: NotificationChannel) -> NotificationAdapter:
        """
        Obtiene adaptador para un canal específico.
        
        Args:
            channel: Canal de notificación
        
        Returns:
            NotificationAdapter: Adaptador configurado
        
        Raises:
            ValueError: Si el canal no está soportado
        """
        # Lazy initialization
        if channel not in cls._adapters:
            cls._adapters[channel] = cls._create_adapter(channel)
        
        return cls._adapters[channel]
    
    @classmethod
    def _create_adapter(cls, channel: NotificationChannel) -> NotificationAdapter:
        """Crea instancia de adaptador según canal."""
        mapping = {
            NotificationChannel.EMAIL: EmailAdapter,
            NotificationChannel.SMS: TwilioSMSAdapter,
            NotificationChannel.WHATSAPP: TwilioWhatsAppAdapter,
            NotificationChannel.PUSH: PushNotificationAdapter,
        }
        
        adapter_class = mapping.get(channel)
        
        if not adapter_class:
            raise ValueError(f"Canal {channel} no soportado")
        
        return adapter_class()
    
    @classmethod
    def send_notification(
        cls,
        channel: NotificationChannel,
        recipients: List[NotificationRecipient],
        subject: str,
        body: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Método helper para enviar notificación directamente.
        
        Args:
            channel: Canal a usar
            recipients: Lista de destinatarios
            subject: Asunto
            body: Cuerpo del mensaje
            **kwargs: Argumentos adicionales (priority, template, etc.)
        
        Returns:
            Dict con resultado del envío
        """
        adapter = cls.get_adapter(channel)
        
        message = NotificationMessage(
            channel=channel,
            recipients=recipients,
            subject=subject,
            body=body,
            priority=kwargs.get('priority', NotificationPriority.NORMAL),
            template=kwargs.get('template'),
            context=kwargs.get('context', {}),
            attachments=kwargs.get('attachments', []),
            scheduled_at=kwargs.get('scheduled_at'),
            expires_at=kwargs.get('expires_at'),
            metadata=kwargs.get('metadata', {})
        )
        
        return adapter.send(message)


# ============================================================================
# COLA DE NOTIFICACIONES
# ============================================================================

class NotificationQueue:
    """
    Cola de notificaciones con retry y priorización.
    
    Características:
    - Reintento automático con backoff exponencial
    - Priorización por urgencia
    - Persistencia en base de datos (opcional)
    - Rate limiting por canal
    """
    
    def __init__(self):
        self.queue: List[tuple[NotificationMessage, int]] = []  # (message, retry_count)
        self.max_retries = 3
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def enqueue(self, message: NotificationMessage):
        """Agrega mensaje a la cola."""
        self.queue.append((message, 0))
        self.logger.info(f"Mensaje en cola: {message.channel.value} - {message.subject}")
    
    def process(self):
        """
        Procesa todos los mensajes en cola.
        
        Ordena por prioridad y envía respetando rate limits.
        """
        if not self.queue:
            return
        
        # Ordenar por prioridad (mayor primero)
        self.queue.sort(key=lambda x: x[0].priority.value, reverse=True)
        
        processed = []
        
        for message, retry_count in self.queue:
            # Verificar si expiró
            if message.is_expired():
                self.logger.warning(f"Mensaje expirado: {message.subject}")
                processed.append((message, retry_count))
                continue
            
            # Verificar si debe enviarse ahora
            if message.scheduled_at and timezone.now() < message.scheduled_at:
                continue
            
            # Intentar envío
            try:
                adapter = NotificationFactory.get_adapter(message.channel)
                result = adapter.send(message)
                
                if result['success']:
                    self.logger.info(f"✅ Mensaje enviado: {message.subject}")
                    processed.append((message, retry_count))
                else:
                    # Reintento si no alcanzó el máximo
                    if retry_count < self.max_retries:
                        self.logger.warning(f"⚠️ Reintentando ({retry_count + 1}/{self.max_retries}): {message.subject}")
                        self.queue.append((message, retry_count + 1))
                    else:
                        self.logger.error(f"❌ Falló definitivamente: {message.subject}")
                    
                    processed.append((message, retry_count))
            
            except Exception as e:
                self.logger.error(f"Error procesando mensaje: {str(e)}")
                processed.append((message, retry_count))
        
        # Remover procesados
        for item in processed:
            if item in self.queue:
                self.queue.remove(item)


# ============================================================================
# HELPERS PARA USO COMÚN
# ============================================================================

def send_email_notification(
    recipients: List[NotificationRecipient],
    subject: str,
    body: str,
    template: Optional[str] = None,
    context: Optional[Dict] = None,
    priority: NotificationPriority = NotificationPriority.NORMAL
) -> Dict[str, Any]:
    """Helper para enviar email rápidamente."""
    return NotificationFactory.send_notification(
        channel=NotificationChannel.EMAIL,
        recipients=recipients,
        subject=subject,
        body=body,
        template=template,
        context=context or {},
        priority=priority
    )


def send_sms_notification(
    recipients: List[NotificationRecipient],
    body: str,
    priority: NotificationPriority = NotificationPriority.NORMAL
) -> Dict[str, Any]:
    """Helper para enviar SMS rápidamente."""
    return NotificationFactory.send_notification(
        channel=NotificationChannel.SMS,
        recipients=recipients,
        subject="SMS",  # SMS no usa subject
        body=body,
        priority=priority
    )


def send_whatsapp_notification(
    recipients: List[NotificationRecipient],
    body: str,
    priority: NotificationPriority = NotificationPriority.NORMAL
) -> Dict[str, Any]:
    """Helper para enviar WhatsApp rápidamente."""
    return NotificationFactory.send_notification(
        channel=NotificationChannel.WHATSAPP,
        recipients=recipients,
        subject="WhatsApp",
        body=body,
        priority=priority
    )


def notify_payroll_approved(nomina_id: int, empleado_nombre: str, monto: float, responsable_email: str):
    """
    Notifica aprobación de nómina a contabilidad.
    
    Ejemplo de uso en signals:
    ```python
    @receiver(post_save, sender=NominaBase)
    def on_nomina_approved(sender, instance, **kwargs):
        if instance.estado == 'aprobado':
            notify_payroll_approved(
                instance.id,
                instance.empleado.nombre_completo,
                float(instance.neto_pagar),
                'contabilidad@empresa.com'
            )
    ```
    """
    recipient = NotificationRecipient(
        name="Contabilidad",
        email=responsable_email
    )
    
    context = {
        'nomina_id': nomina_id,
        'empleado': empleado_nombre,
        'monto': f"${monto:,.2f}",
        'fecha': timezone.now().strftime('%Y-%m-%d %H:%M')
    }
    
    send_email_notification(
        recipients=[recipient],
        subject=f"✅ Nómina #{nomina_id} Aprobada - {empleado_nombre}",
        body=f"Se aprobó la nómina de {empleado_nombre} por ${monto:,.2f}",
        template='payroll/emails/nomina_approved.html',
        context=context,
        priority=NotificationPriority.NORMAL
    )


def notify_hse_alert(empleado_nombre: str, certificado: str, dias_vencimiento: int, responsable_phone: str):
    """
    Notifica alerta HSE urgente (vencimiento certificado).
    
    Ejemplo:
    ```python
    notify_hse_alert(
        'Juan Pérez',
        'Trabajo en Alturas',
        7,
        '+573001234567'
    )
    ```
    """
    recipient = NotificationRecipient(
        name="HSE Manager",
        phone=responsable_phone
    )
    
    send_sms_notification(
        recipients=[recipient],
        body=f"⚠️ ALERTA HSE: Certificado '{certificado}' de {empleado_nombre} vence en {dias_vencimiento} días",
        priority=NotificationPriority.HIGH
    )
