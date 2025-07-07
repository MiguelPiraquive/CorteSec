from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model

User = get_user_model()


class CategoriaAyuda(models.Model):
    """
    Categorías para organizar los artículos de ayuda.
    """
    
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Nombre de la categoría")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    icono = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Icono"),
        help_text=_("Clase CSS del icono")
    )
    
    orden = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden"),
        help_text=_("Orden de visualización")
    )
    
    activa = models.BooleanField(
        default=True,
        verbose_name=_("Activa")
    )

    class Meta:
        verbose_name = _("Categoría de Ayuda")
        verbose_name_plural = _("Categorías de Ayuda")
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class ArticuloAyuda(models.Model):
    """
    Artículos de ayuda y preguntas frecuentes.
    """
    
    categoria = models.ForeignKey(
        CategoriaAyuda,
        on_delete=models.CASCADE,
        related_name='articulos',
        verbose_name=_("Categoría")
    )
    
    titulo = models.CharField(
        max_length=200,
        verbose_name=_("Título")
    )
    
    contenido = models.TextField(
        verbose_name=_("Contenido"),
        help_text=_("Contenido del artículo (soporta HTML)")
    )
    
    tags = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name=_("Etiquetas"),
        help_text=_("Etiquetas separadas por comas para búsqueda")
    )
    
    es_faq = models.BooleanField(
        default=False,
        verbose_name=_("Es FAQ"),
        help_text=_("Si es una pregunta frecuente")
    )
    
    orden = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden")
    )
    
    publicado = models.BooleanField(
        default=True,
        verbose_name=_("Publicado")
    )
    
    # Campos de auditoría
    creado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='articulos_ayuda_creados',
        verbose_name=_("Creado por")
    )
    
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )
    
    fecha_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de modificación")
    )

    class Meta:
        verbose_name = _("Artículo de Ayuda")
        verbose_name_plural = _("Artículos de Ayuda")
        ordering = ['categoria__orden', 'orden', 'titulo']

    def __str__(self):
        return self.titulo


class SolicitudSoporte(models.Model):
    """
    Solicitudes de soporte de los usuarios.
    """
    
    PRIORIDAD_CHOICES = [
        ('baja', _('Baja')),
        ('media', _('Media')),
        ('alta', _('Alta')),
        ('critica', _('Crítica')),
    ]
    
    ESTADO_CHOICES = [
        ('abierto', _('Abierto')),
        ('en_proceso', _('En proceso')),
        ('esperando_usuario', _('Esperando usuario')),
        ('resuelto', _('Resuelto')),
        ('cerrado', _('Cerrado')),
    ]
    
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='solicitudes_soporte',
        verbose_name=_("Usuario")
    )
    
    asunto = models.CharField(
        max_length=200,
        verbose_name=_("Asunto")
    )
    
    descripcion = models.TextField(
        verbose_name=_("Descripción"),
        help_text=_("Descripción detallada del problema o consulta")
    )
    
    prioridad = models.CharField(
        max_length=10,
        choices=PRIORIDAD_CHOICES,
        default='media',
        verbose_name=_("Prioridad")
    )
    
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='abierto',
        verbose_name=_("Estado")
    )
    
    asignado_a = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='solicitudes_asignadas',
        verbose_name=_("Asignado a")
    )
    
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )
    
    fecha_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de modificación")
    )

    class Meta:
        verbose_name = _("Solicitud de Soporte")
        verbose_name_plural = _("Solicitudes de Soporte")
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"{self.asunto} - {self.usuario.username}"


class RespuestaSoporte(models.Model):
    """
    Respuestas a las solicitudes de soporte.
    """
    
    solicitud = models.ForeignKey(
        SolicitudSoporte,
        on_delete=models.CASCADE,
        related_name='respuestas',
        verbose_name=_("Solicitud")
    )
    
    respuesta = models.TextField(
        verbose_name=_("Respuesta")
    )
    
    es_interna = models.BooleanField(
        default=False,
        verbose_name=_("Es interna"),
        help_text=_("Si es una nota interna, no visible para el usuario")
    )
    
    usuario = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        verbose_name=_("Usuario")
    )
    
    fecha_respuesta = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de respuesta")
    )

    class Meta:
        verbose_name = _("Respuesta de Soporte")
        verbose_name_plural = _("Respuestas de Soporte")
        ordering = ['fecha_respuesta']

    def __str__(self):
        return f"Respuesta a: {self.solicitud.asunto}"
