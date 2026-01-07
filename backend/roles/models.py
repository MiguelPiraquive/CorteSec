from django.db import models, IntegrityError
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.core.cache import cache
from django.utils import timezone
import datetime
import json
import uuid
from core.mixins import TenantAwareModel

User = get_user_model()


class TipoRol(TenantAwareModel):
    """
    Tipos de roles para clasificación y organización
    """
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Nombre del tipo")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )
    
    orden = models.IntegerField(
        default=0,
        verbose_name=_("Orden de presentación")
    )
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Tipo de Rol")
        verbose_name_plural = _("Tipos de Rol")
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class Rol(TenantAwareModel):
    """
    Modelo avanzado para gestionar roles con jerarquía, herencia y características empresariales.
    """
    
    # Identificación única
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name=_("UUID")
    )
    
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Nombre del rol"),
        help_text=_("Nombre único del rol")
    )
    
    codigo = models.CharField(
        max_length=50,
        unique=True,
        default="NUEVO_ROL",
        verbose_name=_("Código"),
        help_text=_("Código único alfanumérico del rol")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción"),
        help_text=_("Descripción detallada del rol y sus responsabilidades")
    )
    
    # Jerarquía y herencia
    rol_padre = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='roles_hijo',
        verbose_name=_("Rol padre"),
        help_text=_("Rol del cual hereda permisos")
    )
    
    nivel_jerarquico = models.IntegerField(
        default=0,
        verbose_name=_("Nivel jerárquico"),
        help_text=_("Nivel en la jerarquía (0=raíz, mayor número=más bajo)")
    )
    
    hereda_permisos = models.BooleanField(
        default=True,
        verbose_name=_("Hereda permisos"),
        help_text=_("Si hereda permisos del rol padre")
    )
    
    # Clasificación
    tipo_rol = models.ForeignKey(
        TipoRol,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name=_("Tipo de rol")
    )
    
    categoria = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Categoría"),
        help_text=_("Categoría o departamento del rol")
    )
    
    # Estados y control
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo"),
        help_text=_("Si está activo, el rol estará disponible para asignar")
    )
    
    es_sistema = models.BooleanField(
        default=False,
        verbose_name=_("Es del sistema"),
        help_text=_("Los roles del sistema no se pueden eliminar")
    )
    
    es_publico = models.BooleanField(
        default=False,
        verbose_name=_("Es público"),
        help_text=_("Si es público, cualquier usuario puede solicitarlo")
    )
    
    requiere_aprobacion = models.BooleanField(
        default=False,
        verbose_name=_("Requiere aprobación"),
        help_text=_("La asignación requiere aprobación")
    )
    
    # Control de horarios
    tiene_restriccion_horario = models.BooleanField(
        default=False,
        verbose_name=_("Tiene restricción de horario"),
        help_text=_("Si está activo, se aplicarán las restricciones de horario")
    )
    
    hora_inicio = models.TimeField(
        blank=True,
        null=True,
        verbose_name=_("Hora de inicio"),
        help_text=_("Hora de inicio de acceso permitido")
    )
    
    hora_fin = models.TimeField(
        blank=True,
        null=True,
        verbose_name=_("Hora de fin"),
        help_text=_("Hora de fin de acceso permitido")
    )
    
    dias_semana = models.CharField(
        max_length=7,
        default='1234567',
        verbose_name=_("Días de la semana"),
        help_text=_("Días permitidos (1=Lunes, 7=Domingo). Ej: 12345 para L-V")
    )
    
    # Control de vigencia
    fecha_inicio_vigencia = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha inicio vigencia"),
        help_text=_("Fecha desde la cual el rol está vigente")
    )
    
    fecha_fin_vigencia = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha fin vigencia"),
        help_text=_("Fecha hasta la cual el rol está vigente")
    )
    
    # Metadatos y configuración
    prioridad = models.IntegerField(
        default=0,
        verbose_name=_("Prioridad"),
        help_text=_("Prioridad del rol (mayor número = mayor prioridad)")
    )
    
    peso = models.IntegerField(
        default=1,
        verbose_name=_("Peso"),
        help_text=_("Peso para cálculos de autorización")
    )
    
    color = models.CharField(
        max_length=7,
        blank=True,
        null=True,
        verbose_name=_("Color"),
        help_text=_("Color hexadecimal para UI (#FFFFFF)")
    )
    
    icono = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name=_("Icono"),
        help_text=_("Clase CSS del icono")
    )
    
    # Metadatos JSON
    metadatos = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Metadatos"),
        help_text=_("Datos adicionales en formato JSON")
    )
    
    configuracion = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Configuración"),
        help_text=_("Configuración específica del rol")
    )
    
    # Multi-tenant
    tenant_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("ID del tenant"),
        help_text=_("ID del tenant/organización")
    )
    
    # Campos de auditoría avanzada
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )
    
    fecha_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de modificación")
    )
    
    creado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='roles_creados',
        null=True,
        blank=True,
        verbose_name=_("Creado por")
    )
    
    modificado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='roles_modificados',
        null=True,
        blank=True,
        verbose_name=_("Modificado por")
    )

    # Campos de estadísticas
    total_asignaciones = models.IntegerField(
        default=0,
        verbose_name=_("Total de asignaciones"),
        help_text=_("Número total de asignaciones de este rol")
    )
    
    asignaciones_activas = models.IntegerField(
        default=0,
        verbose_name=_("Asignaciones activas"),
        help_text=_("Número de asignaciones activas")
    )
    
    ultima_asignacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Última asignación")
    )

    class Meta:
        verbose_name = _("Rol")
        verbose_name_plural = _("Roles")
        ordering = ['nivel_jerarquico', 'prioridad', 'nombre']
        indexes = [
            models.Index(fields=['activo']),
            models.Index(fields=['nombre']),
            models.Index(fields=['codigo']),
            models.Index(fields=['nivel_jerarquico']),
            models.Index(fields=['prioridad']),
            models.Index(fields=['tenant_id']),
            models.Index(fields=['tipo_rol']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['codigo', 'tenant_id'],
                name='unique_codigo_tenant'
            )
        ]

    def __str__(self):
        return f"{self.nombre} ({self.codigo})"

    def save(self, *args, **kwargs):
        """Override save para calcular nivel jerárquico"""
        if self.rol_padre:
            self.nivel_jerarquico = self.rol_padre.nivel_jerarquico + 1
        else:
            self.nivel_jerarquico = 0
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        
        # Validar jerarquía circular
        if self.rol_padre:
            if self._check_circular_hierarchy(self.rol_padre):
                raise ValidationError(
                    _("No se puede crear una jerarquía circular")
                )
        
        # Validar horarios
        if self.tiene_restriccion_horario:
            if not self.hora_inicio or not self.hora_fin:
                raise ValidationError(
                    _("Debe especificar hora de inicio y fin si tiene restricción de horario")
                )
            
            if self.hora_inicio >= self.hora_fin:
                raise ValidationError(
                    _("La hora de inicio debe ser menor que la hora de fin")
                )
        
        # Validar vigencia
        if self.fecha_inicio_vigencia and self.fecha_fin_vigencia:
            if self.fecha_inicio_vigencia > self.fecha_fin_vigencia:
                raise ValidationError(
                    _("La fecha de inicio debe ser menor que la fecha de fin")
                )
        
        # Validar color
        if self.color and not self.color.startswith('#'):
            raise ValidationError(
                _("El color debe ser un código hexadecimal válido (#FFFFFF)")
            )

    def _check_circular_hierarchy(self, parent):
        """Verifica si hay jerarquía circular"""
        if parent == self:
            return True
        if parent.rol_padre:
            return self._check_circular_hierarchy(parent.rol_padre)
        return False

    def get_jerarquia_completa(self):
        """Obtiene la jerarquía completa del rol"""
        jerarquia = []
        rol_actual = self
        
        while rol_actual:
            jerarquia.append(rol_actual)
            rol_actual = rol_actual.rol_padre
        
        return jerarquia[::-1]  # Invertir para mostrar desde la raíz

    def get_roles_descendientes(self):
        """Obtiene todos los roles descendientes"""
        descendientes = []
        
        def _get_hijos(rol):
            for hijo in rol.roles_hijo.all():
                descendientes.append(hijo)
                _get_hijos(hijo)
        
        _get_hijos(self)
        return descendientes

    def get_permisos_heredados(self):
        """Obtiene permisos heredados de roles padre"""
        if not self.hereda_permisos or not self.rol_padre:
            return []
        
        from permisos.models import AsignacionPermiso
        
        permisos = []
        
        # Obtener permisos del rol padre
        permisos_padre = AsignacionPermiso.objects.filter(
            rol=self.rol_padre,
            activo=True
        )
        
        permisos.extend(permisos_padre)
        
        # Recursivamente obtener permisos de ancestros
        if self.rol_padre.hereda_permisos:
            permisos.extend(self.rol_padre.get_permisos_heredados())
        
        return permisos

    def esta_vigente(self):
        """Verifica si el rol está vigente según las fechas"""
        hoy = datetime.date.today()
        
        if self.fecha_inicio_vigencia and hoy < self.fecha_inicio_vigencia:
            return False
        
        if self.fecha_fin_vigencia and hoy > self.fecha_fin_vigencia:
            return False
        
        return True

    def puede_acceder_ahora(self):
        """Verifica si el rol puede acceder en el momento actual"""
        if not self.activo or not self.esta_vigente():
            return False
        
        if not self.tiene_restriccion_horario:
            return True
        
        ahora = datetime.datetime.now()
        dia_semana = str(ahora.weekday() + 1)  # 1=Lunes, 7=Domingo
        
        # Verificar día de la semana
        if dia_semana not in self.dias_semana:
            return False
        
        # Verificar horario
        hora_actual = ahora.time()
        if self.hora_inicio <= hora_actual <= self.hora_fin:
            return True
        
        return False

    def actualizar_estadisticas(self):
        """Actualiza las estadísticas del rol"""
        from django.db.models import Count
        
        stats = self.asignaciones.aggregate(
            total=Count('id'),
            activas=Count('id', filter=models.Q(activa=True))
        )
        
        self.total_asignaciones = stats['total'] or 0
        self.asignaciones_activas = stats['activas'] or 0
        
        ultima = self.asignaciones.order_by('-fecha_asignacion').first()
        if ultima:
            self.ultima_asignacion = ultima.fecha_asignacion
        
        self.save(update_fields=['total_asignaciones', 'asignaciones_activas', 'ultima_asignacion'])

    def get_cache_key(self, suffix=""):
        """Genera clave de caché para el rol"""
        return f"rol_{self.uuid}_{suffix}"

    def invalidar_cache(self):
        """Invalida el caché relacionado con este rol"""
        cache_keys = [
            self.get_cache_key("permisos"),
            self.get_cache_key("usuarios"),
            self.get_cache_key("jerarquia"),
        ]
        cache.delete_many(cache_keys)

    def get_permisos_efectivos(self):
        """
        Obtiene todos los permisos efectivos del rol, incluyendo heredados.
        Este método es usado por la app permisos para verificar accesos.
        """
        from permisos.models import Permiso
        
        permisos = set()
        
        # TODO: Implementar relación con permisos
        # Por ahora retornamos un conjunto vacío, pero debería obtener
        # todos los permisos directos y heredados del rol
        
        # Esto se implementará cuando se cree la relación ManyToMany
        # o ForeignKey entre Rol y Permiso
        
        return permisos

class EstadoAsignacion(TenantAwareModel):
    """
    Estados posibles para asignaciones de roles
    """
    ESTADOS = [
        ('PENDIENTE', _('Pendiente')),
        ('APROBADA', _('Aprobada')),
        ('RECHAZADA', _('Rechazada')),
        ('ACTIVA', _('Activa')),
        ('INACTIVA', _('Inactiva')),
        ('EXPIRADA', _('Expirada')),
        ('REVOCADA', _('Revocada')),
    ]
    
    nombre = models.CharField(
        max_length=20,
        choices=ESTADOS,
        unique=True,
        verbose_name=_("Estado")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )
    
    color = models.CharField(
        max_length=7,
        blank=True,
        null=True,
        verbose_name=_("Color")
    )

    class Meta:
        verbose_name = _("Estado de Asignación")
        verbose_name_plural = _("Estados de Asignación")
        ordering = ['nombre']

    def __str__(self):
        return self.get_nombre_display()


class AsignacionRol(TenantAwareModel):
    """
    Modelo avanzado para asignar roles a usuarios con control temporal y auditoría.
    """
    
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='asignaciones_rol',
        verbose_name=_("Usuario")
    )
    
    rol = models.ForeignKey(
        Rol,
        on_delete=models.CASCADE,
        related_name='asignaciones',
        verbose_name=_("Rol")
    )
    
    # Estados y control
    estado = models.ForeignKey(
        EstadoAsignacion,
        on_delete=models.PROTECT,
        verbose_name=_("Estado")
    )
    
    activa = models.BooleanField(
        default=True,
        verbose_name=_("Asignación activa"),
        help_text=_("Si está activa, el usuario tiene este rol")
    )
    
    # Control temporal específico para la asignación
    fecha_inicio = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Fecha de inicio"),
        help_text=_("Fecha desde la cual la asignación es válida")
    )
    
    fecha_fin = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Fecha de fin"),
        help_text=_("Fecha hasta la cual la asignación es válida")
    )
    
    # Contexto de asignación
    contexto_tipo = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name=_("Tipo de contexto")
    )
    
    contexto_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("ID del contexto")
    )
    
    contexto_objeto = GenericForeignKey('contexto_tipo', 'contexto_id')
    
    # Justificación y observaciones
    justificacion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Justificación"),
        help_text=_("Razón de la asignación")
    )
    
    observaciones = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Observaciones"),
        help_text=_("Notas adicionales sobre la asignación")
    )
    
    # Metadatos
    metadatos = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Metadatos"),
        help_text=_("Datos adicionales en formato JSON")
    )
    
    # Prioridad y configuración
    prioridad = models.IntegerField(
        default=0,
        verbose_name=_("Prioridad"),
        help_text=_("Prioridad de la asignación")
    )
    
    configuracion = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Configuración"),
        help_text=_("Configuración específica de la asignación")
    )
    
    # Multi-tenant
    tenant_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("ID del tenant")
    )
    
    # Campos de auditoría completa
    asignado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='asignaciones_realizadas',
        verbose_name=_("Asignado por")
    )
    
    aprobado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='asignaciones_aprobadas',
        null=True,
        blank=True,
        verbose_name=_("Aprobado por")
    )
    
    fecha_asignacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de asignación")
    )
    
    fecha_aprobacion = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fecha de aprobación")
    )
    
    fecha_revocacion = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fecha de revocación")
    )
    
    revocado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='asignaciones_revocadas',
        null=True,
        blank=True,
        verbose_name=_("Revocado por")
    )
    
    razon_revocacion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Razón de revocación")
    )
    
    # Campos de seguimiento
    ip_asignacion = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("IP de asignación")
    )
    
    user_agent_asignacion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("User Agent de asignación")
    )

    class Meta:
        verbose_name = _("Asignación de Rol")
        verbose_name_plural = _("Asignaciones de Rol")
        unique_together = ['usuario', 'rol', 'contexto_tipo', 'contexto_id']
        ordering = ['-fecha_asignacion']
        indexes = [
            models.Index(fields=['usuario', 'activa']),
            models.Index(fields=['rol', 'activa']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_inicio']),
            models.Index(fields=['fecha_fin']),
            models.Index(fields=['contexto_tipo', 'contexto_id']),
            models.Index(fields=['tenant_id']),
        ]

    def __str__(self):
        contexto = f" en {self.contexto_objeto}" if self.contexto_objeto else ""
        return f"{self.usuario} - {self.rol}{contexto}"

    def clean(self):
        super().clean()
        
        if self.fecha_inicio and self.fecha_fin:
            if self.fecha_inicio >= self.fecha_fin:
                raise ValidationError(
                    _("La fecha de inicio debe ser menor que la fecha de fin")
                )

    def save(self, *args, **kwargs):
        """Override save para actualizar estadísticas del rol"""
        es_nueva = self.pk is None
        super().save(*args, **kwargs)
        
        if es_nueva:
            # Actualizar estadísticas del rol
            self.rol.actualizar_estadisticas()

    def esta_vigente(self):
        """Verifica si la asignación está vigente"""
        if not self.activa:
            return False
        
        if self.estado and self.estado.nombre not in ['ACTIVA', 'APROBADA']:
            return False
        
        ahora = datetime.datetime.now()
        
        if self.fecha_inicio and ahora < self.fecha_inicio:
            return False
        
        if self.fecha_fin and ahora > self.fecha_fin:
            return False
        
        return True

    def puede_ser_revocada(self):
        """Verifica si la asignación puede ser revocada"""
        return self.activa and not self.fecha_revocacion

    def revocar(self, usuario, razon=""):
        """Revoca la asignación"""
        if not self.puede_ser_revocada():
            raise ValidationError(_("La asignación no puede ser revocada"))
        
        self.activa = False
        self.fecha_revocacion = datetime.datetime.now()
        self.revocado_por = usuario
        self.razon_revocacion = razon
        
        # Cambiar estado
        estado_revocada = EstadoAsignacion.objects.get(nombre='REVOCADA')
        self.estado = estado_revocada
        
        self.save()
        
        # Actualizar estadísticas del rol
        self.rol.actualizar_estadisticas()

    def aprobar(self, usuario):
        """Aprueba la asignación"""
        if self.estado.nombre != 'PENDIENTE':
            raise ValidationError(_("Solo se pueden aprobar asignaciones pendientes"))
        
        self.aprobado_por = usuario
        self.fecha_aprobacion = datetime.datetime.now()
        self.activa = True
        
        # Cambiar estado
        estado_aprobada = EstadoAsignacion.objects.get(nombre='APROBADA')
        self.estado = estado_aprobada
        
        self.save()

    def rechazar(self, usuario, razon=""):
        """Rechaza la asignación"""
        if self.estado.nombre != 'PENDIENTE':
            raise ValidationError(_("Solo se pueden rechazar asignaciones pendientes"))
        
        self.activa = False
        self.razon_revocacion = razon
        
        # Cambiar estado
        estado_rechazada = EstadoAsignacion.objects.get(nombre='RECHAZADA')
        self.estado = estado_rechazada
        
        self.save()

    def get_tiempo_restante(self):
        """Obtiene el tiempo restante de la asignación"""
        if not self.fecha_fin:
            return None
        
        ahora = datetime.datetime.now()
        if self.fecha_fin > ahora:
            return self.fecha_fin - ahora
        
        return datetime.timedelta(0)

    def get_cache_key(self, suffix=""):
        """Genera clave de caché para la asignación"""
        return f"asignacion_{self.uuid}_{suffix}"


class HistorialAsignacion(TenantAwareModel):
    """
    Historial de cambios en asignaciones de roles
    """
    asignacion = models.ForeignKey(
        AsignacionRol,
        on_delete=models.CASCADE,
        related_name='historial',
        verbose_name=_("Asignación")
    )
    
    accion = models.CharField(
        max_length=50,
        verbose_name=_("Acción"),
        help_text=_("Tipo de acción realizada")
    )
    
    estado_anterior = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_("Estado anterior")
    )
    
    estado_nuevo = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_("Estado nuevo")
    )
    
    detalles = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Detalles"),
        help_text=_("Detalles del cambio")
    )
    
    usuario = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        verbose_name=_("Usuario que realizó el cambio")
    )
    
    fecha = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha del cambio")
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("Dirección IP")
    )
    
    user_agent = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("User Agent")
    )

    class Meta:
        verbose_name = _("Historial de Asignación")
        verbose_name_plural = _("Historial de Asignaciones")
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['asignacion', 'fecha']),
            models.Index(fields=['usuario', 'fecha']),
            models.Index(fields=['accion']),
        ]

    def __str__(self):
        return f"{self.asignacion} - {self.accion} - {self.fecha}"


class PlantillaRol(TenantAwareModel):
    """
    Plantillas predefinidas de roles para facilitar la creación
    """
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Nombre de la plantilla")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    tipo_rol = models.ForeignKey(
        TipoRol,
        on_delete=models.CASCADE,
        verbose_name=_("Tipo de rol")
    )
    
    configuracion_base = models.JSONField(
        default=dict,
        verbose_name=_("Configuración base"),
        help_text=_("Configuración predeterminada para roles creados con esta plantilla")
    )
    
    permisos_incluidos = models.JSONField(
        default=list,
        verbose_name=_("Permisos incluidos"),
        help_text=_("Lista de permisos que se asignarán automáticamente")
    )
    
    activa = models.BooleanField(
        default=True,
        verbose_name=_("Activa")
    )
    
    es_sistema = models.BooleanField(
        default=False,
        verbose_name=_("Es del sistema")
    )
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    creado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='plantillas_rol_creadas',
        verbose_name=_("Creado por")
    )

    class Meta:
        verbose_name = _("Plantilla de Rol")
        verbose_name_plural = _("Plantillas de Rol")
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

    def crear_rol(self, nombre, codigo, usuario_creador, **kwargs):
        """Crea un nuevo rol basado en esta plantilla"""
        # Combinar configuración base con parámetros adicionales
        config = self.configuracion_base.copy()
        config.update(kwargs.get('configuracion', {}))
        
        # Crear el rol
        rol = Rol.objects.create(
            nombre=nombre,
            codigo=codigo,
            descripcion=kwargs.get('descripcion', self.descripcion),
            tipo_rol=self.tipo_rol,
            configuracion=config,
            creado_por=usuario_creador,
            **{k: v for k, v in kwargs.items() if k not in ['configuracion', 'descripcion']}
        )
        
        # Asignar permisos automáticamente
        if self.permisos_incluidos:
            from permisos.models import Permiso, AsignacionPermiso
            
            for permiso_codigo in self.permisos_incluidos:
                try:
                    permiso = Permiso.objects.get(codigo=permiso_codigo)
                    AsignacionPermiso.objects.create(
                        rol=rol,
                        permiso=permiso,
                        activo=True,
                        asignado_por=usuario_creador
                    )
                except Permiso.DoesNotExist:
                    pass
        
        return rol

# ==================== MODELOS AVANZADOS DE ROLES ====================

class MetaRol(TenantAwareModel):
    """
    Meta-roles para definir comportamientos avanzados de roles
    """
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Nombre del meta-rol")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    reglas = models.JSONField(
        default=dict,
        verbose_name=_("Reglas de meta-rol"),
        help_text=_("Reglas JSON que definen el comportamiento del meta-rol")
    )
    
    roles_aplicables = models.ManyToManyField(
        Rol,
        related_name='meta_roles',
        blank=True,
        verbose_name=_("Roles aplicables")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Meta-rol")
        verbose_name_plural = _("Meta-roles")
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class RolCondicional(TenantAwareModel):
    """
    Roles que se activan/desactivan según condiciones específicas
    """
    rol = models.OneToOneField(
        Rol,
        on_delete=models.CASCADE,
        related_name='configuracion_condicional',
        verbose_name=_("Rol")
    )
    
    condiciones_activacion = models.JSONField(
        default=list,
        verbose_name=_("Condiciones de activación"),
        help_text=_("Lista de condiciones que deben cumplirse para activar el rol")
    )
    
    condiciones_desactivacion = models.JSONField(
        default=list,
        verbose_name=_("Condiciones de desactivación"),
        help_text=_("Lista de condiciones que desactivan el rol automáticamente")
    )
    
    evaluacion_automatica = models.BooleanField(
        default=True,
        verbose_name=_("Evaluación automática"),
        help_text=_("Si se evalúan las condiciones automáticamente")
    )
    
    frecuencia_evaluacion = models.CharField(
        max_length=20,
        choices=[
            ('tiempo_real', _('Tiempo real')),
            ('cada_hora', _('Cada hora')),
            ('diaria', _('Diaria')),
            ('semanal', _('Semanal')),
            ('manual', _('Manual'))
        ],
        default='cada_hora',
        verbose_name=_("Frecuencia de evaluación")
    )
    
    ultima_evaluacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Última evaluación")
    )
    
    resultado_ultima_evaluacion = models.JSONField(
        default=dict,
        verbose_name=_("Resultado de última evaluación")
    )

    class Meta:
        verbose_name = _("Rol Condicional")
        verbose_name_plural = _("Roles Condicionales")

    def __str__(self):
        return f"Configuración condicional de {self.rol.nombre}"

    def evaluar_condiciones(self, usuario=None, contexto=None):
        """
        Evalúa las condiciones del rol condicional
        """
        # TODO: Implementar evaluador de condiciones
        return True


class AuditoriaRol(TenantAwareModel):
    """
    Auditoría completa de cambios en roles y asignaciones
    """
    contexto_adicional = models.JSONField(
        default=dict,
        verbose_name=_("Contexto adicional"),
        help_text=_("Información adicional de contexto del cambio")
    )
    
    rol = models.ForeignKey(
        Rol,
        on_delete=models.CASCADE,
        related_name='auditoria',
        verbose_name=_("Rol")
    )
    
    usuario_afectado = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='auditoria_roles',
        null=True,
        blank=True,
        verbose_name=_("Usuario afectado")
    )
    
    accion = models.CharField(
        max_length=50,
        choices=[
            ('crear_rol', _('Crear rol')),
            ('modificar_rol', _('Modificar rol')),
            ('eliminar_rol', _('Eliminar rol')),
            ('asignar_rol', _('Asignar rol')),
            ('revocar_rol', _('Revocar rol')),
            ('modificar_asignacion', _('Modificar asignación')),
            ('activar_rol', _('Activar rol')),
            ('desactivar_rol', _('Desactivar rol')),
        ],
        verbose_name=_("Acción")
    )
    
    usuario_ejecutor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='acciones_roles_ejecutadas',
    null=True,
    blank=True,
    verbose_name=_("Usuario ejecutor")
    )
    
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha y hora")
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("Dirección IP")
    )
    
    user_agent = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("User Agent")
    )
    
    detalles_anterior = models.JSONField(
        default=dict,
        verbose_name=_("Estado anterior"),
        help_text=_("Estado del objeto antes del cambio")
    )
    
    detalles_nuevo = models.JSONField(
        default=dict,
        verbose_name=_("Estado nuevo"),
        help_text=_("Estado del objeto después del cambio")
    )
    
    contexto_adicional = models.JSONField(
        default=dict,
        verbose_name=_("Contexto adicional"),
        help_text=_("Información adicional del contexto")
    )
    
    justificacion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Justificación"),
        help_text=_("Justificación del cambio")
    )

    class Meta:
        verbose_name = _("Auditoría de Rol")
        verbose_name_plural = _("Auditorías de Roles")
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['rol', 'timestamp']),
            models.Index(fields=['usuario_afectado', 'timestamp']),
            models.Index(fields=['accion', 'timestamp']),
            models.Index(fields=['usuario_ejecutor', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.accion} - {self.rol.nombre} - {self.timestamp}"


class ConfiguracionRol(TenantAwareModel):
    """
    Configuraciones específicas de roles que pueden cambiar dinámicamente
    """
    rol = models.OneToOneField(
        Rol,
        on_delete=models.CASCADE,
        related_name='configuracion_dinamica',
        verbose_name=_("Rol")
    )
    
    configuracion_ui = models.JSONField(
    default=dict,
    blank=True,
    verbose_name=_("Configuración de UI"),
    help_text=_("Configuración específica para la interfaz de usuario")
    )
    
    configuracion_seguridad = models.JSONField(
    default=dict,
    blank=True,
    verbose_name=_("Configuración de seguridad"),
    help_text=_("Configuraciones de seguridad específicas del rol")
    )
    
    configuracion_notificaciones = models.JSONField(
    default=dict,
    blank=True,
    verbose_name=_("Configuración de notificaciones"),
    help_text=_("Configuración de notificaciones para el rol")
    )
    
    configuracion_integraciones = models.JSONField(
    default=dict,
    blank=True,
    verbose_name=_("Configuración de integraciones"),
    help_text=_("Configuraciones para integraciones externas")
    )
    
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Última actualización")
    )

    class Meta:
        verbose_name = _("Configuración de Rol")
        verbose_name_plural = _("Configuraciones de Roles")

    def __str__(self):
        return f"Configuración de {self.rol.nombre}"


# ==================== MANAGERS AVANZADOS ====================

class RolManager(models.Manager):
    """Manager avanzado para el modelo Rol"""
    
    def activos(self):
        """Obtiene solo los roles activos"""
        return self.filter(activo=True)
    
    def vigentes(self):
        """Obtiene roles vigentes"""
        hoy = timezone.now().date()
        return self.filter(
            activo=True,
            fecha_inicio_vigencia__lte=hoy,
            fecha_fin_vigencia__gte=hoy
        )
    
    def por_tenant(self, tenant_id):
        """Obtiene roles por tenant"""
        return self.filter(tenant_id=tenant_id)
    
    def raiz(self):
        """Obtiene roles raíz (sin padre)"""
        return self.filter(rol_padre__isnull=True)
    
    def jerarquicos(self):
        """Obtiene roles que tienen hijos"""
        return self.filter(roles_hijo__isnull=False).distinct()
    
    def con_restriccion_horario(self):
        """Obtiene roles con restricción de horario"""
        return self.filter(tiene_restriccion_horario=True)
    
    def publicos(self):
        """Obtiene roles públicos"""
        return self.filter(es_publico=True, activo=True)
    
    def buscar(self, termino):
        """Busca roles por nombre, código o descripción"""
        from django.db.models import Q
        return self.filter(
            Q(nombre__icontains=termino) |
            Q(codigo__icontains=termino) |
            Q(descripcion__icontains=termino)
        )


# Asignar el manager personalizado al modelo Rol
Rol.add_to_class('objects', RolManager())


# ==================== SIGNALS PARA ROLES ====================

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver

@receiver(pre_save, sender=Rol)
def pre_save_rol(sender, instance, **kwargs):
    """Acciones antes de guardar un rol"""
    # Calcular nivel jerárquico
    if instance.rol_padre:
        instance.nivel_jerarquico = instance.rol_padre.nivel_jerarquico + 1
    else:
        instance.nivel_jerarquico = 0

@receiver(post_save, sender=Rol)
def post_save_rol(sender, instance, created, **kwargs):
    """Acciones después de guardar un rol"""
    # Crear configuración dinámica solo si el rol es nuevo
    if created:
        try:
            ConfiguracionRol.objects.create(
                rol=instance,
                configuracion_ui={},
                configuracion_seguridad={},
                configuracion_notificaciones={},
                configuracion_integraciones={}
            )
        except IntegrityError:
            # Ya existe, no hacer nada
            pass
    
    # Limpiar cache
    cache.delete_many([
        f'rol_{instance.id}_permisos',
        f'rol_{instance.id}_jerarquia',
        'roles_activos',
        'roles_publicos'
    ])

@receiver(post_save, sender=AsignacionRol)
def post_save_asignacion_rol(sender, instance, created, **kwargs):
    """Acciones después de guardar una asignación de rol"""
    # Actualizar estadísticas del rol
    instance.rol.actualizar_estadisticas()
    
    # Crear auditoría solo si no estamos en el proceso de creación inicial
    # (evitar problemas con validación de campos)
    try:
        AuditoriaRol.objects.create(
            rol=instance.rol,
            usuario_afectado=instance.usuario,
            accion='asignar_rol' if created else 'modificar_asignacion',
            usuario_ejecutor=getattr(instance, 'modificado_por', None) or getattr(instance, 'creado_por', None) or instance.asignado_por,
            detalles_nuevo={
                'asignacion_id': instance.id,
                'fecha_inicio': instance.fecha_inicio.isoformat() if instance.fecha_inicio else None,
                'fecha_fin': instance.fecha_fin.isoformat() if instance.fecha_fin else None,
                'activa': instance.activa
            }
        )
    except Exception as e:
        # Log error but don't fail the asignación creation
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to create audit log for AsignacionRol {instance.id}: {e}")
    
    # Limpiar cache del usuario
    cache.delete_many([
        f'usuario_{instance.usuario.id}_roles',
        f'usuario_{instance.usuario.id}_permisos'
    ])

@receiver(post_delete, sender=AsignacionRol)
def post_delete_asignacion_rol(sender, instance, **kwargs):
    """Acciones después de eliminar una asignación de rol"""
    # Actualizar estadísticas del rol
    instance.rol.actualizar_estadisticas()
    
    # Crear auditoría
    AuditoriaRol.objects.create(
        rol=instance.rol,
        usuario_afectado=instance.usuario,
        accion='revocar_rol',
        usuario_ejecutor=getattr(instance, '_deleted_by', None),
        detalles_anterior={
            'asignacion_id': instance.id,
            'fecha_inicio': instance.fecha_inicio.isoformat() if instance.fecha_inicio else None,
            'fecha_fin': instance.fecha_fin.isoformat() if instance.fecha_fin else None,
            'activa': instance.activa
        },
        detalles_nuevo={},
        contexto_adicional={}
    )
    
    # Limpiar cache del usuario
    cache.delete_many([
        f'usuario_{instance.usuario.id}_roles',
        f'usuario_{instance.usuario.id}_permisos'
    ])


# ==================== FUNCIONES DE UTILIDAD ====================

def crear_auditoria_rol(rol, accion, usuario_ejecutor, usuario_afectado=None, 
                       detalles_anterior=None, detalles_nuevo=None, 
                       justificacion=None, contexto=None):
    """
    Crea una entrada de auditoría para un rol
    """
    auditoria = AuditoriaRol(
        rol=rol,
        usuario_afectado=usuario_afectado,
        accion=accion,
        usuario_ejecutor=usuario_ejecutor,
        detalles_anterior=detalles_anterior or {},
        detalles_nuevo=detalles_nuevo or {},
        justificacion=justificacion
    )
    
    if contexto:
        auditoria.ip_address = contexto.get('ip_address')
        auditoria.user_agent = contexto.get('user_agent')
        auditoria.contexto_adicional = contexto.get('adicional', {})
    
    auditoria.save()
    return auditoria


def obtener_roles_usuario_con_jerarquia(usuario, incluir_heredados=True):
    """
    Obtiene todos los roles de un usuario incluyendo jerarquía completa
    """
    cache_key = f'usuario_{usuario.id}_roles_jerarquia'
    roles = cache.get(cache_key)
    
    if roles is None:
        roles_directos = AsignacionRol.objects.filter(
            usuario=usuario,
            activo=True
        ).select_related('rol').values_list('rol', flat=True)
        
        roles = set(roles_directos)
        
        if incluir_heredados:
            for rol_id in roles_directos:
                rol = Rol.objects.get(id=rol_id)
                # Agregar roles padre
                jerarquia = rol.get_jerarquia_completa()
                roles.update(r.id for r in jerarquia)
        
        cache.set(cache_key, list(roles), 3600)  # Cache por 1 hora
    
    return Rol.objects.filter(id__in=roles)


def validar_asignacion_rol(usuario, rol, fecha_inicio=None, fecha_fin=None):
    """
    Valida si un usuario puede recibir una asignación de rol
    """
    errores = []
    
    # Verificar si el rol está activo
    if not rol.activo:
        errores.append(_("El rol no está activo"))
    
    # Verificar vigencia del rol
    if not rol.esta_vigente():
        errores.append(_("El rol no está vigente"))
    
    # Verificar si ya tiene el rol asignado
    asignacion_existente = AsignacionRol.objects.filter(
        usuario=usuario,
        rol=rol,
        activo=True
    ).exists()
    
    if asignacion_existente:
        errores.append(_("El usuario ya tiene este rol asignado"))
    
    # Verificar fechas
    if fecha_inicio and fecha_fin:
        if fecha_inicio >= fecha_fin:
            errores.append(_("La fecha de inicio debe ser anterior a la fecha de fin"))
    
    return errores


# ==================== CONFIGURACIÓN Y EXPORTACIONES ====================

# Configuración de logging
import logging
logger = logging.getLogger('roles')

# Versión del módulo
__version__ = '2.0.0'
__author__ = 'Sistema CorteSec - Roles'

# Exportaciones del módulo
__all__ = [
    'TipoRol',
    'Rol', 
    'EstadoAsignacion',
    'AsignacionRol',
    'HistorialAsignacion',
    'PlantillaRol',
    'MetaRol',
    'RolCondicional',
    'AuditoriaRol',
    'ConfiguracionRol',
    'crear_auditoria_rol',
    'obtener_roles_usuario_con_jerarquia',
    'validar_asignacion_rol'
]
