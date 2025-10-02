"""
🏢 Multi-Tenant Models - CorteSec SaaS
======================================

Modelos para funcionalidad Multi-Tenant que transforman CorteSec en una plataforma SaaS.
Cada organización tiene su propio espacio aislado de datos y configuraciones.

Características principales:
- Organización como unidad de tenant
- Planes de suscripción (FREE, BASIC, PRO, ENTERPRISE)
- Límites por organización (usuarios, proyectos, almacenamiento)
- Invitaciones y gestión de miembros
- Configuraciones personalizables por organización

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: 2025-08-17
"""

import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.urls import reverse


class Organization(models.Model):
    """
    🏢 Modelo principal para Multi-Tenancy.
    
    Cada organización representa un tenant completamente aislado con:
    - Sus propios usuarios y datos
    - Plan de suscripción específico
    - Límites y cuotas configurables
    - Configuraciones personalizables
    - Subdomain para acceso directo
    """
    
    # Identificación única
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False,
        help_text=_("Identificador único de la organización")
    )
    
    name = models.CharField(
        _("Nombre de la organización"),
        max_length=200,
        help_text=_("Nombre completo de la organización o empresa")
    )
    
    slug = models.SlugField(
        _("Slug/Subdominio"),
        max_length=50,
        unique=True,
        help_text=_("Identificador único para URL (ej: empresa.cortesec.com)")
    )
    
    display_name = models.CharField(
        _("Nombre para mostrar"),
        max_length=100,
        blank=True,
        help_text=_("Nombre corto para mostrar en la interfaz")
    )
    
    description = models.TextField(
        _("Descripción"),
        blank=True,
        help_text=_("Descripción de la organización y su actividad")
    )
    
    # Información de contacto
    email = models.EmailField(
        _("Email de contacto"),
        blank=True,
        help_text=_("Email principal de la organización")
    )
    
    phone = models.CharField(
        _("Teléfono"),
        max_length=20,
        blank=True,
        help_text=_("Teléfono de contacto principal")
    )
    
    website = models.URLField(
        _("Sitio web"),
        blank=True,
        help_text=_("Sitio web oficial de la organización")
    )
    
    # Dirección
    address = models.TextField(
        _("Dirección"),
        blank=True,
        help_text=_("Dirección física de la organización")
    )
    
    city = models.CharField(
        _("Ciudad"),
        max_length=100,
        blank=True,
        help_text=_("Ciudad donde se ubica la organización")
    )
    
    state = models.CharField(
        _("Estado/Provincia"),
        max_length=100,
        blank=True,
        help_text=_("Estado o provincia")
    )
    
    country = models.CharField(
        _("País"),
        max_length=100,
        blank=True,
        help_text=_("País donde opera la organización")
    )
    
    postal_code = models.CharField(
        _("Código postal"),
        max_length=20,
        blank=True,
        help_text=_("Código postal o ZIP")
    )
    
    # Plan y límites
    PLAN_CHOICES = [
        ('FREE', _('Gratuito')),
        ('BASIC', _('Básico')),
        ('PRO', _('Profesional')),
        ('ENTERPRISE', _('Empresarial')),
    ]
    
    plan = models.CharField(
        _("Plan de suscripción"),
        max_length=20,
        choices=PLAN_CHOICES,
        default='FREE',
        help_text=_("Plan actual de la organización")
    )
    
    max_users = models.PositiveIntegerField(
        _("Máximo de usuarios"),
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(10000)],
        help_text=_("Número máximo de usuarios permitidos")
    )
    
    max_storage_mb = models.PositiveIntegerField(
        _("Almacenamiento máximo (MB)"),
        default=1024,  # 1GB por defecto
        validators=[MinValueValidator(100)],
        help_text=_("Espacio de almacenamiento máximo en megabytes")
    )
    
    # Estado y configuración
    is_active = models.BooleanField(
        _("Activa"),
        default=True,
        help_text=_("Si la organización está activa y operativa")
    )
    
    is_trial = models.BooleanField(
        _("En periodo de prueba"),
        default=True,
        help_text=_("Si la organización está en periodo de prueba")
    )
    
    trial_ends_at = models.DateTimeField(
        _("Fin del periodo de prueba"),
        null=True,
        blank=True,
        help_text=_("Fecha y hora cuando termina el periodo de prueba")
    )
    
    # Configuraciones adicionales
    settings = models.JSONField(
        _("Configuraciones"),
        default=dict,
        blank=True,
        help_text=_("Configuraciones específicas de la organización")
    )
    
    # Personalización visual
    logo = models.ImageField(
        _("Logo"),
        upload_to='organizations/logos/',
        blank=True,
        null=True,
        help_text=_("Logo de la organización")
    )
    
    primary_color = models.CharField(
        _("Color primario"),
        max_length=7,
        default='#007bff',
        help_text=_("Color primario para la interfaz (formato hex)")
    )
    
    # Configuración regional
    timezone = models.CharField(
        _("Zona horaria"),
        max_length=50,
        default='America/Bogota',
        help_text=_("Zona horaria predeterminada")
    )
    
    language = models.CharField(
        _("Idioma"),
        max_length=10,
        default='es',
        help_text=_("Idioma predeterminado")
    )
    
    currency = models.CharField(
        _("Moneda"),
        max_length=3,
        default='COP',
        help_text=_("Moneda predeterminada (código ISO)")
    )
    
    # Fechas de control
    created_at = models.DateTimeField(
        _("Fecha de creación"),
        auto_now_add=True,
        help_text=_("Fecha y hora de creación de la organización")
    )
    
    updated_at = models.DateTimeField(
        _("Última actualización"),
        auto_now=True,
        help_text=_("Fecha y hora de la última actualización")
    )

    class Meta:
        verbose_name = _("Organización")
        verbose_name_plural = _("Organizaciones")
        ordering = ['name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
            models.Index(fields=['plan']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Generar display_name automáticamente si no se proporciona"""
        if not self.display_name:
            self.display_name = self.name[:50]
        super().save(*args, **kwargs)

    @property
    def is_enterprise(self):
        """Verifica si es plan empresarial"""
        return self.plan == 'ENTERPRISE'

    @property
    def is_free_plan(self):
        """Verifica si es plan gratuito"""
        return self.plan == 'FREE'

    @property
    def users_count(self):
        """Cuenta los usuarios activos"""
        return self.users.filter(is_active=True).count()

    @property
    def storage_used_mb(self):
        """Calcula el almacenamiento usado (placeholder)"""
        # TODO: Implementar cálculo real de almacenamiento
        return 0

    @property
    def storage_usage_percentage(self):
        """Porcentaje de almacenamiento usado"""
        if self.max_storage_mb == 0:
            return 0
        return (self.storage_used_mb / self.max_storage_mb) * 100

    @property
    def users_usage_percentage(self):
        """Porcentaje de usuarios usados"""
        if self.max_users == 0:
            return 0
        return (self.users_count / self.max_users) * 100

    @property
    def can_add_users(self):
        """Verifica si se pueden añadir más usuarios"""
        return self.users_count < self.max_users

    @property
    def is_trial_expired(self):
        """Verifica si el periodo de prueba ha expirado"""
        if not self.is_trial or not self.trial_ends_at:
            return False
        return timezone.now() > self.trial_ends_at

    def get_plan_limits(self):
        """Obtiene los límites según el plan"""
        limits = {
            'FREE': {
                'max_users': 3,
                'max_storage_mb': 512,
                'max_projects': 5,
                'features': ['basic_reports', 'email_support']
            },
            'BASIC': {
                'max_users': 10,
                'max_storage_mb': 2048,
                'max_projects': 20,
                'features': ['advanced_reports', 'email_support', 'export_data']
            },
            'PRO': {
                'max_users': 50,
                'max_storage_mb': 10240,
                'max_projects': 100,
                'features': ['all_reports', 'priority_support', 'api_access', 'custom_branding']
            },
            'ENTERPRISE': {
                'max_users': 1000,
                'max_storage_mb': 51200,
                'max_projects': 1000,
                'features': ['unlimited_features', 'dedicated_support', 'sso', 'audit_logs']
            }
        }
        return limits.get(self.plan, limits['FREE'])

    def upgrade_plan(self, new_plan):
        """Actualizar plan de la organización"""
        old_plan = self.plan
        self.plan = new_plan
        
        # Actualizar límites según el nuevo plan
        limits = self.get_plan_limits()
        self.max_users = limits['max_users']
        self.max_storage_mb = limits['max_storage_mb']
        
        self.save()
        
        # TODO: Registrar cambio de plan en auditoría
        return f"Plan actualizado de {old_plan} a {new_plan}"

    def get_absolute_url(self):
        """URL de la organización"""
        return reverse('organization:detail', kwargs={'slug': self.slug})


class OrganizationInvitation(models.Model):
    """
    🤝 Invitaciones para unirse a una organización.
    
    Permite invitar usuarios por email para que se unan a la organización
    con un rol específico.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='invitations',
        help_text=_("Organización que envía la invitación")
    )
    
    email = models.EmailField(
        _("Email del invitado"),
        help_text=_("Email de la persona a invitar")
    )
    
    role = models.CharField(
        _("Rol propuesto"),
        max_length=20,
        choices=[
            ('ADMIN', _('Administrador')),
            ('MANAGER', _('Gerente')),
            ('MEMBER', _('Miembro')),
            ('VIEWER', _('Visualizador')),
        ],
        default='MEMBER',
        help_text=_("Rol que tendrá el usuario en la organización")
    )
    
    invited_by = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.CASCADE,
        related_name='sent_invitations',
        help_text=_("Usuario que envió la invitación")
    )
    
    message = models.TextField(
        _("Mensaje personalizado"),
        blank=True,
        help_text=_("Mensaje opcional para incluir en la invitación")
    )
    
    is_accepted = models.BooleanField(
        _("Aceptada"),
        default=False,
        help_text=_("Si la invitación ha sido aceptada")
    )
    
    accepted_by = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accepted_invitations',
        help_text=_("Usuario que aceptó la invitación")
    )
    
    accepted_at = models.DateTimeField(
        _("Fecha de aceptación"),
        null=True,
        blank=True,
        help_text=_("Fecha y hora cuando se aceptó la invitación")
    )
    
    expires_at = models.DateTimeField(
        _("Fecha de expiración"),
        help_text=_("Fecha y hora cuando expira la invitación")
    )
    
    created_at = models.DateTimeField(
        _("Fecha de creación"),
        auto_now_add=True
    )

    class Meta:
        verbose_name = _("Invitación a organización")
        verbose_name_plural = _("Invitaciones a organización")
        unique_together = [['organization', 'email']]
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"Invitación a {self.email} para {self.organization.name}"

    @property
    def is_expired(self):
        """Verifica si la invitación ha expirado"""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Verifica si la invitación es válida"""
        return not self.is_accepted and not self.is_expired

    def accept(self, user):
        """Acepta la invitación y añade el usuario a la organización"""
        if not self.is_valid:
            raise ValueError("La invitación no es válida")
        
        # Actualizar el usuario
        user.organization = self.organization
        user.organization_role = self.role
        user.save()
        
        # Marcar invitación como aceptada
        self.is_accepted = True
        self.accepted_by = user
        self.accepted_at = timezone.now()
        self.save()
        
        return user

    def get_absolute_url(self):
        """URL para aceptar la invitación"""
        return reverse('organization:accept_invitation', kwargs={'invitation_id': self.id})
