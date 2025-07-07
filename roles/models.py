from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
import datetime

User = get_user_model()


class Rol(models.Model):
    """
    Modelo para gestionar roles del sistema con control de acceso granular.
    """
    
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Nombre del rol"),
        help_text=_("Nombre único del rol")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción"),
        help_text=_("Descripción detallada del rol y sus responsabilidades")
    )
    
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
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )
    
    fecha_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de modificación")
    )

    class Meta:
        verbose_name = _("Rol")
        verbose_name_plural = _("Roles")
        ordering = ['nombre']
        indexes = [
            models.Index(fields=['activo']),
            models.Index(fields=['nombre']),
        ]

    def __str__(self):
        return self.nombre

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


class AsignacionRol(models.Model):
    """
    Modelo para asignar roles a usuarios con control temporal.
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
    
    observaciones = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Observaciones"),
        help_text=_("Notas adicionales sobre la asignación")
    )
    
    # Campos de auditoría
    asignado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='asignaciones_realizadas',
        verbose_name=_("Asignado por")
    )
    
    fecha_asignacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de asignación")
    )

    class Meta:
        verbose_name = _("Asignación de Rol")
        verbose_name_plural = _("Asignaciones de Rol")
        unique_together = ['usuario', 'rol']
        ordering = ['-fecha_asignacion']
        indexes = [
            models.Index(fields=['usuario', 'activa']),
            models.Index(fields=['rol', 'activa']),
        ]

    def __str__(self):
        return f"{self.usuario} - {self.rol}"

    def clean(self):
        super().clean()
        
        if self.fecha_inicio and self.fecha_fin:
            if self.fecha_inicio >= self.fecha_fin:
                raise ValidationError(
                    _("La fecha de inicio debe ser menor que la fecha de fin")
                )

    def esta_vigente(self):
        """Verifica si la asignación está vigente"""
        if not self.activa:
            return False
        
        ahora = datetime.datetime.now()
        
        if self.fecha_inicio and ahora < self.fecha_inicio:
            return False
        
        if self.fecha_fin and ahora > self.fecha_fin:
            return False
        
        return True
