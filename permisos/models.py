from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
import datetime


class Modulo(models.Model):
    """
    Modelo para definir los módulos del sistema.
    """
    
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Nombre del módulo"),
        help_text=_("Nombre único del módulo del sistema")
    )
    
    codigo = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Código"),
        help_text=_("Código único del módulo (ej: payroll, prestamos)")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción"),
        help_text=_("Descripción detallada del módulo")
    )
    
    icono = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Icono"),
        help_text=_("Clase CSS del icono (ej: fas fa-users)")
    )
    
    url_base = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name=_("URL base"),
        help_text=_("URL base del módulo")
    )
    
    orden = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden"),
        help_text=_("Orden de visualización en el menú")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo"),
        help_text=_("Si está activo, el módulo estará disponible")
    )
    
    es_sistema = models.BooleanField(
        default=False,
        verbose_name=_("Es del sistema"),
        help_text=_("Los módulos del sistema no se pueden eliminar")
    )

    class Meta:
        verbose_name = _("Módulo")
        verbose_name_plural = _("Módulos")
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class TipoPermiso(models.Model):
    """
    Tipos de permisos disponibles (ver, crear, editar, eliminar, etc.).
    """
    
    TIPO_CHOICES = [
        ('view', _('Ver')),
        ('add', _('Crear')),
        ('change', _('Editar')),
        ('delete', _('Eliminar')),
        ('export', _('Exportar')),
        ('import', _('Importar')),
        ('approve', _('Aprobar')),
        ('reject', _('Rechazar')),
        ('custom', _('Personalizado')),
    ]
    
    codigo = models.CharField(
        max_length=50,
        unique=True,
        choices=TIPO_CHOICES,
        verbose_name=_("Código del tipo"),
        help_text=_("Código único del tipo de permiso")
    )
    
    nombre = models.CharField(
        max_length=100,
        verbose_name=_("Nombre"),
        help_text=_("Nombre descriptivo del tipo de permiso")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción"),
        help_text=_("Descripción detallada del tipo de permiso")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )

    class Meta:
        verbose_name = _("Tipo de Permiso")
        verbose_name_plural = _("Tipos de Permiso")
        ordering = ['codigo']

    def __str__(self):
        return self.nombre


class Permiso(models.Model):
    """
    Modelo para definir permisos específicos del sistema.
    """
    
    modulo = models.ForeignKey(
        Modulo,
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
    
    nombre = models.CharField(
        max_length=200,
        verbose_name=_("Nombre del permiso"),
        help_text=_("Nombre descriptivo del permiso específico")
    )
    
    codigo = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Código"),
        help_text=_("Código único del permiso (ej: payroll.view_nomina)")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción"),
        help_text=_("Descripción detallada del permiso")
    )
    
    vista_asociada = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name=_("Vista asociada"),
        help_text=_("Nombre de la vista o función asociada")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo"),
        help_text=_("Si está activo, el permiso estará disponible")
    )
    
    # Control de horarios para el permiso
    tiene_restriccion_horario = models.BooleanField(
        default=False,
        verbose_name=_("Tiene restricción de horario"),
        help_text=_("Si está activo, se aplicarán restricciones de horario")
    )
    
    hora_inicio = models.TimeField(
        blank=True,
        null=True,
        verbose_name=_("Hora de inicio"),
        help_text=_("Hora de inicio para usar este permiso")
    )
    
    hora_fin = models.TimeField(
        blank=True,
        null=True,
        verbose_name=_("Hora de fin"),
        help_text=_("Hora de fin para usar este permiso")
    )
    
    # Control de vigencia
    fecha_inicio_vigencia = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha inicio vigencia")
    )
    
    fecha_fin_vigencia = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha fin vigencia")
    )
    
    es_sistema = models.BooleanField(
        default=False,
        verbose_name=_("Es del sistema"),
        help_text=_("Los permisos del sistema no se pueden eliminar")
    )

    class Meta:
        verbose_name = _("Permiso")
        verbose_name_plural = _("Permisos")
        unique_together = ['modulo', 'tipo_permiso', 'codigo']
        ordering = ['modulo__orden', 'tipo_permiso__codigo', 'nombre']
        indexes = [
            models.Index(fields=['activo']),
            models.Index(fields=['codigo']),
            models.Index(fields=['modulo', 'activo']),
        ]

    def __str__(self):
        return f"{self.modulo.nombre} - {self.nombre}"

    def clean(self):
        super().clean()
        
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

    def esta_vigente(self):
        """Verifica si el permiso está vigente según las fechas"""
        if not self.activo:
            return False
        
        hoy = datetime.date.today()
        
        if self.fecha_inicio_vigencia and hoy < self.fecha_inicio_vigencia:
            return False
        
        if self.fecha_fin_vigencia and hoy > self.fecha_fin_vigencia:
            return False
        
        return True

    def puede_usarse_ahora(self):
        """Verifica si el permiso puede usarse en el momento actual"""
        if not self.esta_vigente():
            return False
        
        if not self.tiene_restriccion_horario:
            return True
        
        hora_actual = datetime.datetime.now().time()
        if self.hora_inicio <= hora_actual <= self.hora_fin:
            return True
        
        return False


class RolPermiso(models.Model):
    """
    Relación entre roles y permisos con control temporal.
    """
    
    rol = models.ForeignKey(
        'roles.Rol',
        on_delete=models.CASCADE,
        related_name='permisos_rol',
        verbose_name=_("Rol")
    )
    
    permiso = models.ForeignKey(
        Permiso,
        on_delete=models.CASCADE,
        related_name='roles_permiso',
        verbose_name=_("Permiso")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo"),
        help_text=_("Si está activo, el rol tiene este permiso")
    )
    
    # Control temporal específico para la asignación
    fecha_inicio = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Fecha de inicio"),
        help_text=_("Fecha desde la cual el permiso es válido para el rol")
    )
    
    fecha_fin = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Fecha de fin"),
        help_text=_("Fecha hasta la cual el permiso es válido para el rol")
    )
    
    observaciones = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Observaciones"),
        help_text=_("Notas adicionales sobre la asignación")
    )
    
    # Campos de auditoría
    fecha_asignacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de asignación")
    )

    class Meta:
        verbose_name = _("Rol - Permiso")
        verbose_name_plural = _("Roles - Permisos")
        unique_together = ['rol', 'permiso']
        ordering = ['rol__nombre', 'permiso__modulo__orden']
        indexes = [
            models.Index(fields=['rol', 'activo']),
            models.Index(fields=['permiso', 'activo']),
        ]

    def __str__(self):
        return f"{self.rol.nombre} - {self.permiso.nombre}"

    def clean(self):
        super().clean()
        
        if self.fecha_inicio and self.fecha_fin:
            if self.fecha_inicio >= self.fecha_fin:
                raise ValidationError(
                    _("La fecha de inicio debe ser menor que la fecha de fin")
                )

    def esta_vigente(self):
        """Verifica si la asignación del permiso al rol está vigente"""
        if not self.activo:
            return False
        
        ahora = datetime.datetime.now()
        
        if self.fecha_inicio and ahora < self.fecha_inicio:
            return False
        
        if self.fecha_fin and ahora > self.fecha_fin:
            return False
        
        return True
