from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from core.mixins import TenantAwareModel

User = get_user_model()


class TipoAyuda(TenantAwareModel):
    """
    Tipos de ayuda disponibles en el sistema.
    """
    
    TIPOS = [
        ('articulo', _('Artículo')),
        ('faq', _('FAQ')),
        ('tutorial', _('Tutorial')),
        ('video', _('Video')),
        ('documento', _('Documento')),
    ]
    
    nombre = models.CharField(
        max_length=100,
        verbose_name=_("Nombre")
    )
    
    tipo = models.CharField(
        max_length=20,
        choices=TIPOS,
        verbose_name=_("Tipo")
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
    
    color = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_("Color"),
        help_text=_("Color hexadecimal o nombre CSS")
    )
    
    orden = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )
    
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )

    class Meta:
        verbose_name = _("Tipo de Ayuda")
        verbose_name_plural = _("Tipos de Ayuda")
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class CategoriaAyuda(TenantAwareModel):
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


class ArticuloAyuda(TenantAwareModel):
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
    
    slug = models.SlugField(
        max_length=220,
        unique=True,
        blank=True,
        verbose_name=_("Slug")
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
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )
    
    vistas = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Vistas")
    )
    
    # Campos de auditoría
    autor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='articulos_ayuda_creados',
        verbose_name=_("Autor")
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

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.titulo)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.titulo


class FAQ(TenantAwareModel):
    """
    Preguntas frecuentes.
    """
    
    CATEGORIAS_FAQ = [
        ('general', _('General')),
        ('cuenta', _('Cuenta')),
        ('facturacion', _('Facturación')),
        ('tecnico', _('Técnico')),
        ('seguridad', _('Seguridad')),
    ]
    
    pregunta = models.CharField(
        max_length=300,
        verbose_name=_("Pregunta")
    )
    
    respuesta = models.TextField(
        verbose_name=_("Respuesta")
    )
    
    categoria = models.CharField(
        max_length=20,
        choices=CATEGORIAS_FAQ,
        default='general',
        verbose_name=_("Categoría")
    )
    
    orden = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )
    
    vistas = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Vistas")
    )
    
    util_si = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Útil - Sí")
    )
    
    util_no = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Útil - No")
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
        verbose_name = _("Pregunta Frecuente")
        verbose_name_plural = _("Preguntas Frecuentes")
        ordering = ['categoria', 'orden', 'pregunta']

    def __str__(self):
        return self.pregunta


class SolicitudSoporte(TenantAwareModel):
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
        ('abierta', _('Abierta')),
        ('en_proceso', _('En proceso')),
        ('esperando_usuario', _('Esperando usuario')),
        ('resuelta', _('Resuelta')),
        ('cerrada', _('Cerrada')),
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
        default='abierta',
        verbose_name=_("Estado")
    )
    
    categoria = models.CharField(
        max_length=50,
        default='general',
        verbose_name=_("Categoría"),
        help_text=_("Categoría de la solicitud")
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


class RespuestaSoporte(TenantAwareModel):
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


class Tutorial(TenantAwareModel):
    """
    Tutoriales paso a paso.
    """
    
    DIFICULTAD_CHOICES = [
        ('basico', _('Básico')),
        ('intermedio', _('Intermedio')),
        ('avanzado', _('Avanzado')),
    ]
    
    titulo = models.CharField(
        max_length=200,
        verbose_name=_("Título")
    )
    
    descripcion = models.TextField(
        verbose_name=_("Descripción")
    )
    
    slug = models.SlugField(
        max_length=220,
        unique=True,
        blank=True,
        verbose_name=_("Slug")
    )
    
    categoria = models.ForeignKey(
        TipoAyuda,
        on_delete=models.CASCADE,
        related_name='tutoriales',
        verbose_name=_("Categoría")
    )
    
    dificultad = models.CharField(
        max_length=15,
        choices=DIFICULTAD_CHOICES,
        default='basico',
        verbose_name=_("Dificultad")
    )
    
    tiempo_estimado = models.PositiveIntegerField(
        help_text=_("Tiempo estimado en minutos"),
        verbose_name=_("Tiempo estimado")
    )
    
    imagen_portada = models.ImageField(
        upload_to='tutoriales/portadas/',
        blank=True,
        null=True,
        verbose_name=_("Imagen de portada")
    )
    
    tags = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name=_("Etiquetas"),
        help_text=_("Etiquetas separadas por comas")
    )
    
    publicado = models.BooleanField(
        default=False,
        verbose_name=_("Publicado")
    )
    
    destacado = models.BooleanField(
        default=False,
        verbose_name=_("Destacado")
    )
    
    vistas = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Vistas")
    )
    
    autor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='tutoriales_creados',
        verbose_name=_("Autor")
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
        verbose_name = _("Tutorial")
        verbose_name_plural = _("Tutoriales")
        ordering = ['-fecha_creacion']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.titulo)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.titulo


class PasoTutorial(TenantAwareModel):
    """
    Pasos individuales de un tutorial.
    """
    
    tutorial = models.ForeignKey(
        Tutorial,
        on_delete=models.CASCADE,
        related_name='pasos',
        verbose_name=_("Tutorial")
    )
    
    numero_paso = models.PositiveIntegerField(
        verbose_name=_("Número de paso")
    )
    
    titulo = models.CharField(
        max_length=200,
        verbose_name=_("Título del paso")
    )
    
    contenido = models.TextField(
        verbose_name=_("Contenido")
    )
    
    imagen = models.ImageField(
        upload_to='tutoriales/pasos/',
        blank=True,
        null=True,
        verbose_name=_("Imagen")
    )
    
    video_url = models.URLField(
        blank=True,
        null=True,
        verbose_name=_("URL del video")
    )
    
    codigo_ejemplo = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Código de ejemplo")
    )

    class Meta:
        verbose_name = _("Paso de Tutorial")
        verbose_name_plural = _("Pasos de Tutorial")
        ordering = ['tutorial', 'numero_paso']
        unique_together = ['tutorial', 'numero_paso']

    def __str__(self):
        return f"{self.tutorial.titulo} - Paso {self.numero_paso}"


class ProgresoTutorial(TenantAwareModel):
    """
    Progreso de los usuarios en los tutoriales.
    """
    
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='progreso_tutoriales',
        verbose_name=_("Usuario")
    )
    
    tutorial = models.ForeignKey(
        Tutorial,
        on_delete=models.CASCADE,
        related_name='progreso_usuarios',
        verbose_name=_("Tutorial")
    )
    
    paso_actual = models.ForeignKey(
        PasoTutorial,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        verbose_name=_("Paso actual")
    )
    
    completado = models.BooleanField(
        default=False,
        verbose_name=_("Completado")
    )
    
    fecha_inicio = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de inicio")
    )
    
    fecha_completado = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Fecha de completado")
    )
    
    tiempo_total = models.PositiveIntegerField(
        default=0,
        help_text=_("Tiempo total en segundos"),
        verbose_name=_("Tiempo total")
    )

    class Meta:
        verbose_name = _("Progreso de Tutorial")
        verbose_name_plural = _("Progreso de Tutoriales")
        unique_together = ['usuario', 'tutorial']

    def __str__(self):
        return f"{self.usuario.username} - {self.tutorial.titulo}"


class RecursoAyuda(TenantAwareModel):
    """
    Recursos adicionales como archivos, enlaces, etc.
    """
    
    TIPOS_RECURSO = [
        ('archivo', _('Archivo')),
        ('enlace', _('Enlace')),
        ('video', _('Video')),
        ('imagen', _('Imagen')),
    ]
    
    nombre = models.CharField(
        max_length=200,
        verbose_name=_("Nombre")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    tipo = models.CharField(
        max_length=10,
        choices=TIPOS_RECURSO,
        verbose_name=_("Tipo")
    )
    
    archivo = models.FileField(
        upload_to='ayuda/recursos/',
        blank=True,
        null=True,
        verbose_name=_("Archivo")
    )
    
    url = models.URLField(
        blank=True,
        null=True,
        verbose_name=_("URL")
    )
    
    # Relaciones opcionales
    articulo = models.ForeignKey(
        ArticuloAyuda,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='recursos',
        verbose_name=_("Artículo")
    )
    
    tutorial = models.ForeignKey(
        Tutorial,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='recursos',
        verbose_name=_("Tutorial")
    )
    
    paso_tutorial = models.ForeignKey(
        PasoTutorial,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='recursos',
        verbose_name=_("Paso de tutorial")
    )
    
    orden = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )
    
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )

    class Meta:
        verbose_name = _("Recurso de Ayuda")
        verbose_name_plural = _("Recursos de Ayuda")
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre
