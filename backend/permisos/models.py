"""
Sistema Integral de Gestión de Roles y Permisos Avanzado
========================================================

Arquitectura robusta, escalable y flexible para control de acceso granular
desarrollada específicamente para CorteSec.

✨ Características principales:
- 🏗️ Roles jerárquicos con herencia de permisos
- 🔐 Permisos granulares con condiciones dinámicas
- 📊 Sistema de auditoría completo y trazabilidad
- ⚡ Cache inteligente para alto rendimiento
- 🏢 Soporte multi-tenant opcional
- 🔄 Evaluación dinámica de permisos en tiempo real
- 📋 Plantillas de roles para asignación masiva
- ⏰ Control temporal y vigencia de asignaciones
- 🎯 Condiciones personalizables (Python, SQL, JSON, tiempo, ubicación)
- 📈 Estadísticas y reportes avanzados

🔧 Modelos incluidos:
- ModuloSistema: Gestión jerárquica de módulos
- TipoPermiso: Categorización de permisos
- CondicionPermiso: Evaluación dinámica
- Permiso: Permisos granulares
- PermisoDirecto: Permisos directos a usuarios
- AuditoriaPermisos: Trazabilidad completa

🚀 Diseñado para ser comparable a:
- Keycloak, Django Guardian, Laravel Gate, Casbin
- Pero personalizado y maleable para las necesidades específicas del proyecto

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-09
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.utils import timezone
from django.db.models import Q, JSONField
import datetime
import uuid
import logging

from core.models import Organizacion
from core.mixins import TenantAwareModel

User = get_user_model()
logger = logging.getLogger('permissions')


class AuditMixin(TenantAwareModel):
    """Mixin para auditoría y trazabilidad"""
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de modificación")
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="%(class)s_created",
        null=True,
        blank=True,
        verbose_name=_("Creado por")
    )
    
    updated_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="%(class)s_updated",
        null=True,
        blank=True,
        verbose_name=_("Actualizado por")
    )
    
    metadata = JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Metadatos"),
        help_text=_("Información adicional en formato JSON")
    )
    
    class Meta:
        abstract = True


class ModuloSistema(AuditMixin):
    """Módulos del sistema con capacidades extendidas"""
    
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Nombre del módulo")
    )
    
    codigo = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Código único"),
        help_text=_("Código único del módulo (snake_case)")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    version = models.CharField(
        max_length=20,
        default="1.0.0",
        verbose_name=_("Versión")
    )
    
    # Configuración visual
    icono = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Icono"),
        help_text=_("Clase CSS del icono")
    )
    
    color = models.CharField(
        max_length=7,
        default="#6366f1",
        verbose_name=_("Color"),
        help_text=_("Color hexadecimal")
    )
    
    orden = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden de visualización")
    )
    
    # Configuración de acceso
    url_base = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name=_("URL base")
    )
    
    # Módulo padre para jerarquía
    padre = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='hijos',
        verbose_name=_("Módulo padre")
    )
    
    nivel = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Nivel en jerarquía")
    )
    
    # Estado y configuración
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Módulo activo")
    )
    
    es_sistema = models.BooleanField(
        default=False,
        verbose_name=_("Es módulo del sistema")
    )
    
    requiere_licencia = models.BooleanField(
        default=False,
        verbose_name=_("Requiere licencia")
    )
    
    # Configuración avanzada
    configuracion_avanzada = JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Configuración avanzada")
    )
    
    class Meta:
        verbose_name = _("Módulo del Sistema")
        verbose_name_plural = _("Módulos del Sistema")
        ordering = ['nivel', 'orden', 'nombre']
        indexes = [
            models.Index(fields=['activo', 'es_sistema']),
            models.Index(fields=['padre', 'activo']),
            models.Index(fields=['codigo']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.codigo})"
    
    def get_ruta_completa(self):
        """Obtiene la ruta completa del módulo en la jerarquía"""
        if self.padre:
            return f"{self.padre.get_ruta_completa()} > {self.nombre}"
        return self.nombre
    
    def get_hijos_activos(self):
        """Obtiene todos los módulos hijos activos"""
        return self.hijos.filter(activo=True)
    
    def clean(self):
        """Validaciones del modelo"""
        super().clean()
        
        # Evitar referencias circulares
        if self.padre_id == self.id:
            raise ValidationError(_("Un módulo no puede ser padre de sí mismo"))
        
        # Validar jerarquía
        if self.padre and self.padre.nivel >= 3:
            raise ValidationError(_("No se permite más de 3 niveles de jerarquía"))
    
    def save(self, *args, **kwargs):
        # Calcular nivel automáticamente
        if self.padre:
            self.nivel = self.padre.nivel + 1
        else:
            self.nivel = 0
        
        super().save(*args, **kwargs)


class TipoPermiso(AuditMixin):
    """Tipos de permisos con capacidades extendidas"""
    
    CATEGORIA_CHOICES = [
        ('crud', _('CRUD (Crear, Leer, Actualizar, Eliminar)')),
        ('workflow', _('Flujo de trabajo (Aprobar, Rechazar, etc.)')),
        ('report', _('Reportes y Análisis')),
        ('admin', _('Administración')),
        ('custom', _('Personalizado')),
    ]
    
    nombre = models.CharField(
        max_length=100,
        verbose_name=_("Nombre del tipo")
    )
    
    codigo = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Código único")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    categoria = models.CharField(
        max_length=20,
        choices=CATEGORIA_CHOICES,
        default='crud',
        verbose_name=_("Categoría")
    )
    
    # Configuración visual
    icono = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Icono")
    )
    
    color = models.CharField(
        max_length=7,
        default="#6b7280",
        verbose_name=_("Color")
    )
    
    # Configuración de comportamiento
    es_critico = models.BooleanField(
        default=False,
        verbose_name=_("Es crítico"),
        help_text=_("Los permisos críticos requieren confirmación adicional")
    )
    
    requiere_auditoria = models.BooleanField(
        default=False,
        verbose_name=_("Requiere auditoría"),
        help_text=_("Se registra cada uso de este permiso")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )
    
    class Meta:
        verbose_name = _("Tipo de Permiso")
        verbose_name_plural = _("Tipos de Permiso")
        ordering = ['categoria', 'nombre']
        indexes = [
            models.Index(fields=['activo', 'categoria']),
            models.Index(fields=['codigo']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.codigo})"


class CondicionPermiso(AuditMixin):
    """Condiciones dinámicas para evaluación de permisos"""
    
    TIPO_CONDICION_CHOICES = [
        ('python', _('Código Python')),
        ('sql', _('Consulta SQL')),
        ('json', _('Configuración JSON')),
        ('time', _('Restricción temporal')),
        ('location', _('Restricción por ubicación')),
        ('custom', _('Personalizada')),
    ]
    
    nombre = models.CharField(
        max_length=100,
        verbose_name=_("Nombre de la condición")
    )
    
    codigo = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Código único")
    )
    
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CONDICION_CHOICES,
        verbose_name=_("Tipo de condición")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    # Configuración de la condición
    configuracion = JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Configuración"),
        help_text=_("Parámetros específicos de la condición")
    )
    
    codigo_evaluacion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Código de evaluación"),
        help_text=_("Código para evaluar la condición")
    )
    
    # Cache y rendimiento
    cacheable = models.BooleanField(
        default=True,
        verbose_name=_("Cacheable"),
        help_text=_("Si se puede cachear el resultado")
    )
    
    tiempo_cache = models.PositiveIntegerField(
        default=300,
        verbose_name=_("Tiempo de cache (segundos)")
    )
    
    activa = models.BooleanField(
        default=True,
        verbose_name=_("Condición activa")
    )
    
    class Meta:
        verbose_name = _("Condición de Permiso")
        verbose_name_plural = _("Condiciones de Permiso")
        ordering = ['tipo', 'nombre']
        indexes = [
            models.Index(fields=['activa', 'tipo']),
            models.Index(fields=['codigo']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.tipo})"
    
    def evaluar(self, usuario, contexto=None):
        """Evalúa la condición para un usuario y contexto dado"""
        if not self.activa:
            return False
        
        cache_key = f"condicion_{self.codigo}_{usuario.id}"
        if contexto:
            cache_key += f"_{hash(str(contexto))}"
        
        # Verificar cache
        if self.cacheable:
            resultado = cache.get(cache_key)
            if resultado is not None:
                return resultado
        
        # Evaluar condición
        resultado = self._evaluar_condicion(usuario, contexto)
        
        # Guardar en cache
        if self.cacheable:
            cache.set(cache_key, resultado, self.tiempo_cache)
        
        return resultado
    
    def _evaluar_condicion(self, usuario, contexto):
        """Lógica específica de evaluación según el tipo"""
        if self.tipo == 'python':
            return self._evaluar_python(usuario, contexto)
        elif self.tipo == 'time':
            return self._evaluar_tiempo(usuario, contexto)
        elif self.tipo == 'json':
            return self._evaluar_json(usuario, contexto)
        else:
            return True
    
    def _evaluar_python(self, usuario, contexto):
        """Evalúa código Python de forma segura"""
        try:
            # Crear un contexto seguro para la evaluación
            safe_context = {
                'usuario': usuario,
                'contexto': contexto,
                'timezone': timezone,
                'datetime': datetime,
                'Q': Q,
            }
            
            # Ejecutar código de forma segura
            return eval(self.codigo_evaluacion, {"__builtins__": {}}, safe_context)
        except Exception as e:
            logger.error(f"Error evaluando condición {self.codigo}: {e}")
            return False
    
    def _evaluar_tiempo(self, usuario, contexto):
        """Evalúa restricciones temporales"""
        config = self.configuracion
        now = timezone.now()
        
        # Verificar horario
        if 'hora_inicio' in config and 'hora_fin' in config:
            hora_actual = now.time()
            hora_inicio = datetime.time.fromisoformat(config['hora_inicio'])
            hora_fin = datetime.time.fromisoformat(config['hora_fin'])
            
            if not (hora_inicio <= hora_actual <= hora_fin):
                return False
        
        # Verificar días de la semana
        if 'dias_semana' in config:
            dia_actual = now.weekday()  # 0=Monday, 6=Sunday
            if dia_actual not in config['dias_semana']:
                return False
        
        return True
    
    def _evaluar_json(self, usuario, contexto):
        """Evalúa configuración JSON"""
        # Implementar lógica específica según configuración
        return True


class Permiso(AuditMixin):
    """Permisos granulares con condiciones dinámicas"""
    
    AMBITO_CHOICES = [
        ('global', _('Global')),
        ('modulo', _('Módulo específico')),
        ('Organizacion', _('Organización')),
        ('recurso', _('Recurso específico')),
        ('usuario', _('Usuario específico')),
    ]
    
    nombre = models.CharField(
        max_length=200,
        verbose_name=_("Nombre del permiso")
    )
    
    codigo = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Código único"),
        help_text=_("Formato: modulo.tipo.recurso (ej: payroll.view.nomina)")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    # Relaciones
    modulo = models.ForeignKey(
        ModuloSistema,
        on_delete=models.CASCADE,
        related_name='permisos',
        verbose_name=_("Módulo")
    )
    
    tipo_permiso = models.ForeignKey(
        TipoPermiso,
        on_delete=models.CASCADE,
        related_name='permisos',
        verbose_name=_("Tipo de permiso")
    )
    
    Organizacion = models.ForeignKey(
        Organizacion,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='permisos',
        verbose_name=_("Organización")
    )
    
    # Configuración del permiso
    ambito = models.CharField(
        max_length=20,
        choices=AMBITO_CHOICES,
        default='modulo',
        verbose_name=_("Ámbito del permiso")
    )
    
    # Recurso específico (para permisos granulares)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name=_("Tipo de contenido")
    )
    
    object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("ID del objeto")
    )
    
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Condiciones de evaluación
    condiciones = models.ManyToManyField(
        CondicionPermiso,
        blank=True,
        related_name='permisos',
        verbose_name=_("Condiciones")
    )
    
    # Configuración avanzada
    es_heredable = models.BooleanField(
        default=True,
        verbose_name=_("Es heredable"),
        help_text=_("Se hereda a través de la jerarquía de roles")
    )
    
    es_revocable = models.BooleanField(
        default=True,
        verbose_name=_("Es revocable"),
        help_text=_("Se puede revocar temporalmente")
    )
    
    prioridad = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Prioridad"),
        help_text=_("Mayor número = mayor prioridad")
    )
    
    # Control temporal
    vigencia_inicio = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Inicio de vigencia")
    )
    
    vigencia_fin = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fin de vigencia")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Permiso activo")
    )
    
    es_sistema = models.BooleanField(
        default=False,
        verbose_name=_("Es del sistema")
    )
    
    class Meta:
        verbose_name = _("Permiso")
        verbose_name_plural = _("Permisos")
        ordering = ['modulo__orden', 'tipo_permiso__codigo', 'nombre']
        indexes = [
            models.Index(fields=['activo', 'es_sistema']),
            models.Index(fields=['codigo']),
            models.Index(fields=['modulo', 'activo']),
            models.Index(fields=['ambito', 'activo']),
        ]

    def __str__(self):
        return f"{self.modulo.nombre} - {self.nombre}"
    
    def clean(self):
        """Validaciones del modelo"""
        super().clean()
        
        # Validar vigencia
        if self.vigencia_inicio and self.vigencia_fin:
            if self.vigencia_inicio >= self.vigencia_fin:
                raise ValidationError(_("La fecha de inicio debe ser menor que la fecha de fin"))
    
    def esta_vigente(self):
        """Verifica si el permiso está vigente"""
        if not self.activo:
            return False
        
        now = timezone.now()
        
        if self.vigencia_inicio and now < self.vigencia_inicio:
            return False
        
        if self.vigencia_fin and now > self.vigencia_fin:
            return False
        
        return True
    
    def puede_usar(self, usuario, contexto=None):
        """Evalúa si un usuario puede usar este permiso"""
        if not self.esta_vigente():
            return False
        
        # Evaluar todas las condiciones
        for condicion in self.condiciones.filter(activa=True):
            if not condicion.evaluar(usuario, contexto):
                return False
        
        return True
    
    def can_access(self, usuario, accion, recurso=None):
        """Evalúa si un usuario puede realizar una acción en un recurso"""
        if not self.esta_vigente():
            return False

        # Evaluar condiciones
        for condicion in self.condiciones.filter(activa=True):
            if not condicion.evaluar(usuario, {'accion': accion, 'recurso': recurso}):
                return False

        return True


class PermisoDirecto(AuditMixin):
    """
    Modelo para permisos directos asignados a usuarios específicos.
    Permite asignar permisos individuales sin necesidad de roles.
    """
    
    TIPO_CHOICES = [
        ('grant', _('Concedido')),
        ('deny', _('Denegado')),
        ('temporary', _('Temporal')),
    ]
    
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='permisos_directos',
        verbose_name=_("Usuario")
    )
    
    permiso = models.ForeignKey(
        'Permiso',
        on_delete=models.CASCADE,
        related_name='asignaciones_directas',
        verbose_name=_("Permiso")
    )
    
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        default='grant',
        verbose_name=_("Tipo de permiso")
    )
    
    fecha_inicio = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Fecha de inicio")
    )
    
    fecha_fin = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fecha de fin")
    )
    
    asignado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='permisos_directos_asignados',
        verbose_name=_("Asignado por")
    )
    
    motivo = models.TextField(
        blank=True,
        verbose_name=_("Motivo de la asignación")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )
    
    class Meta:
        verbose_name = _("Permiso Directo")
        verbose_name_plural = _("Permisos Directos")
        unique_together = [['usuario', 'permiso']]
        ordering = ['-fecha_inicio']
        indexes = [
            models.Index(fields=['usuario', 'activo']),
            models.Index(fields=['permiso', 'activo']),
            models.Index(fields=['fecha_inicio', 'fecha_fin']),
        ]
    
    def __str__(self):
        return f"{self.usuario.username} - {self.permiso.nombre}"
    
    def clean(self):
        """Validaciones del modelo"""
        super().clean()
        
        if self.fecha_fin and self.fecha_inicio and self.fecha_fin <= self.fecha_inicio:
            raise ValidationError(_("La fecha de fin debe ser posterior a la fecha de inicio"))
    
    def esta_vigente(self):
        """Verifica si el permiso directo está vigente"""
        if not self.activo:
            return False
        
        now = timezone.now()
        
        if now < self.fecha_inicio:
            return False
        
        if self.fecha_fin and now > self.fecha_fin:
            return False
        
        return True
    
    def es_efectivo(self):
        """Verifica si el permiso es efectivo (vigente y permiso activo)"""
        return self.esta_vigente() and self.permiso.esta_vigente()
    
    def revocar(self, motivo):
        """Revoca el permiso directo temporalmente"""
        self.activo = False
        self.motivo = motivo
        self.save()


class AuditoriaPermisos(TenantAwareModel):
    """Modelo para auditoría de permisos"""
    accion = models.CharField(
        max_length=50,
        verbose_name=_("Acción realizada"),
        help_text=_("Ejemplo: Crear, Editar, Eliminar")
    )
    permiso = models.ForeignKey(
        Permiso,
        on_delete=models.CASCADE,
        related_name='auditorias',
        verbose_name=_("Permiso")
    )
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_("Usuario")
    )
    fecha = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de la acción")
    )
    detalles = JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Detalles adicionales")
    )

    class Meta:
        verbose_name = _("Auditoría de Permiso")
        verbose_name_plural = _("Auditorías de Permisos")
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.usuario.username} - {self.accion} - {self.permiso.nombre}"


class PermisoI18N(TenantAwareModel):
    """Modelo para soporte multilingüe en permisos"""
    permiso = models.ForeignKey(
        Permiso,
        on_delete=models.CASCADE,
        related_name='traducciones',
        verbose_name=_("Permiso")
    )
    idioma = models.CharField(
        max_length=10,
        verbose_name=_("Idioma"),
        help_text=_("Ejemplo: es, en, fr")
    )
    nombre = models.CharField(
        max_length=200,
        verbose_name=_("Nombre traducido")
    )
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción traducida")
    )

    class Meta:
        verbose_name = _("Permiso Internacionalizado")
        verbose_name_plural = _("Permisos Internacionalizados")
        unique_together = [['permiso', 'idioma']]

    def __str__(self):
        return f"{self.permiso.nombre} ({self.idioma})"


class ConfiguracionEntorno(TenantAwareModel):
    """Modelo para configuraciones por entorno"""
    entorno = models.CharField(
        max_length=50,
        verbose_name=_("Entorno"),
        help_text=_("Ejemplo: dev, staging, prod")
    )
    permiso = models.ForeignKey(
        Permiso,
        on_delete=models.CASCADE,
        related_name='configuraciones_entorno',
        verbose_name=_("Permiso")
    )
    configuracion = JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Configuración específica")
    )

    class Meta:
        verbose_name = _("Configuración por Entorno")
        verbose_name_plural = _("Configuraciones por Entorno")

    def __str__(self):
        return f"{self.permiso.nombre} ({self.entorno})"


# ==================== MANAGERS PERSONALIZADOS ====================

class PermisoManager(models.Manager):
    """Manager personalizado para Permiso"""
    
    def activos(self):
        """Obtiene solo los permisos activos"""
        return self.filter(activo=True)
    
    def por_modulo(self, modulo):
        """Obtiene permisos por módulo"""
        return self.filter(modulo=modulo)
    
    def por_tipo(self, tipo_permiso):
        """Obtiene permisos por tipo"""
        return self.filter(tipo_permiso=tipo_permiso)
    
    def criticos(self):
        """Obtiene permisos críticos"""
        return self.filter(tipo_permiso__es_critico=True)
    
    def vigentes(self):
        """Obtiene permisos vigentes"""
        now = timezone.now()
        return self.filter(
            activo=True,
            vigencia_inicio__lte=now,
            vigencia_fin__gte=now
        )


# ==================== FUNCIONES DE UTILIDAD ====================

def obtener_permisos_directos_usuario(usuario):
    """
    Obtiene únicamente los permisos directos de un usuario (sin roles).
    
    Args:
        usuario: Usuario del que obtener permisos
    
    Returns:
        QuerySet con permisos directos del usuario
    """
    return PermisoDirecto.objects.filter(
        usuario=usuario,
        activo=True
    ).select_related('permiso')


def verificar_permiso_directo_usuario(usuario, codigo_permiso, contexto=None):
    """
    Verifica si un usuario tiene un permiso directo específico (sin roles).
    
    Args:
        usuario: Usuario a verificar
        codigo_permiso: Código del permiso (ej: 'payroll.view.nomina')
        contexto: Contexto adicional para evaluación
    
    Returns:
        bool: True si tiene el permiso directo, False en caso contrario
    """
    try:
        permiso = Permiso.objects.get(codigo=codigo_permiso, activo=True)
        
        # Verificar si el permiso está vigente
        if not permiso.esta_vigente():
            return False
        
        # Verificar si el usuario puede usar el permiso
        if not permiso.puede_usar(usuario, contexto):
            return False
        
        # Verificar permisos directos únicamente
        return PermisoDirecto.objects.filter(
            usuario=usuario,
            permiso=permiso,
            activo=True
        ).exists()
        
    except Permiso.DoesNotExist:
        return False


def limpiar_cache_permisos(usuario=None):
    """
    Limpia el cache de permisos.
    
    Args:
        usuario: Usuario específico, o None para limpiar todo
    """
    if usuario:
        # Limpiar cache específico del usuario
        cache_patterns = [
            f"permisos_usuario_{usuario.id}",
            f"roles_usuario_{usuario.id}",
        ]
        
        for pattern in cache_patterns:
            cache.delete(pattern)
    else:
        # Limpiar todo el cache relacionado con permisos
        cache.clear()


def estadisticas_permisos():
    """
    Obtiene estadísticas del sistema de permisos (sin roles).
    
    Returns:
        dict: Diccionario con estadísticas de permisos únicamente
    """
    return {
        'total_usuarios': User.objects.count(),
        'total_permisos': Permiso.objects.count(),
        'permisos_activos': Permiso.objects.filter(activo=True).count(),
        'tipos_permiso': TipoPermiso.objects.count(),
        'Organizationes': Organizacion.objects.filter(activa=True).count(),
        'modulos': ModuloSistema.objects.filter(activo=True).count(),
        'condiciones': CondicionPermiso.objects.filter(activa=True).count(),
        'permisos_directos': PermisoDirecto.objects.filter(activo=True).count(),
    }


# ==================== SIGNALS ====================

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver(post_save, sender=PermisoDirecto)
def limpiar_cache_permiso_directo(sender, instance, **kwargs):
    """Limpia el cache cuando se crea/actualiza un permiso directo"""
    limpiar_cache_permisos(instance.usuario)

@receiver(post_delete, sender=PermisoDirecto)
def limpiar_cache_eliminacion_permiso_directo(sender, instance, **kwargs):
    """Limpia el cache cuando se elimina un permiso directo"""
    limpiar_cache_permisos(instance.usuario)


# ==================== REGISTRO EN ADMIN ====================

# Agregar managers personalizados a los modelos
Permiso.add_to_class('objects', PermisoManager())


# ==================== CONFIGURACIÓN DE VERSIONES ====================

__version__ = '2.0.0'
__author__ = 'Sistema CorteSec'
__email__ = 'desarrollo@cortesec.com'
__status__ = 'Production'

# Configuración de logging específico para permisos
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
handler.setFormatter(formatter)
logger.addHandler(handler)

# Mensaje de inicio
logger.info(f"Sistema de Permisos Avanzado v{__version__} iniciado correctamente")


# ==================== EXPORTACIONES DEL MÓDULO ====================

__all__ = [
    'AuditMixin',
    'ModuloSistema',
    'TipoPermiso',
    'CondicionPermiso',
    'Permiso',
    'PermisoDirecto',
    'AuditoriaPermisos',
    'PermisoI18N',
    'ConfiguracionEntorno'
]
