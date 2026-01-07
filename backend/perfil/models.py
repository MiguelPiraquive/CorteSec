from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator, FileExtensionValidator
from PIL import Image
import os
from core.mixins import TenantAwareModel

User = get_user_model()

class Perfil(TenantAwareModel):
    """
    Modelo extendido de perfil de usuario con información completa
    para el manejo de empleados y contratistas.
    """
    
    # Choices para diferentes campos
    ESTADO_CIVIL_CHOICES = [
        ('soltero', _('Soltero/a')),
        ('casado', _('Casado/a')),
        ('divorciado', _('Divorciado/a')),
        ('viudo', _('Viudo/a')),
        ('union_libre', _('Unión libre')),
    ]
    
    GENERO_CHOICES = [
        ('masculino', _('Masculino')),
        ('femenino', _('Femenino')),
        ('otro', _('Otro')),
        ('prefiero_no_decir', _('Prefiero no decir')),
    ]
    
    TIPO_SANGRE_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]
    
    NIVEL_EDUCACION_CHOICES = [
        ('primaria', _('Primaria')),
        ('secundaria', _('Secundaria')),
        ('tecnico', _('Técnico')),
        ('tecnologo', _('Tecnólogo')),
        ('universitario', _('Universitario')),
        ('especializacion', _('Especialización')),
        ('maestria', _('Maestría')),
        ('doctorado', _('Doctorado')),
    ]
    
    TIPO_CUENTA_CHOICES = [
        ('ahorros', _('Ahorros')),
        ('corriente', _('Corriente')),
    ]
    
    TEMA_CHOICES = [
        ('claro', _('Claro')),
        ('oscuro', _('Oscuro')),
        ('automatico', _('Automático')),
    ]
    
    IDIOMA_CHOICES = [
        ('es', _('Español')),
        ('en', _('English')),
    ]

    # Relación con el usuario de Django
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='perfil',
        verbose_name=_("Usuario")
    )
    
    # Información personal básica
    foto = models.ImageField(
        upload_to='perfiles/fotos/',
        blank=True,
        null=True,
        verbose_name=_("Foto de perfil"),
        help_text=_("Foto de perfil del usuario")
    )
    
    fecha_nacimiento = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha de nacimiento")
    )
    
    genero = models.CharField(
        max_length=20,
        choices=GENERO_CHOICES,
        blank=True,
        null=True,
        verbose_name=_("Género")
    )
    
    estado_civil = models.CharField(
        max_length=20,
        choices=ESTADO_CIVIL_CHOICES,
        blank=True,
        null=True,
        verbose_name=_("Estado civil")
    )
    
    nacionalidad = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Nacionalidad")
    )
    
    # Información de contacto
    telefono_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message=_("El teléfono debe tener entre 9 y 15 dígitos.")
    )
    
    telefono = models.CharField(
        validators=[telefono_regex],
        max_length=17,
        blank=True,
        null=True,
        verbose_name=_("Teléfono")
    )
    
    telefono_emergencia = models.CharField(
        validators=[telefono_regex],
        max_length=17,
        blank=True,
        null=True,
        verbose_name=_("Teléfono de emergencia")
    )
    
    contacto_emergencia = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name=_("Contacto de emergencia"),
        help_text=_("Nombre del contacto de emergencia")
    )
    
    # Información de dirección
    direccion_residencia = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Dirección de residencia")
    )
    
    ciudad_residencia = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Ciudad de residencia")
    )
    
    departamento_residencia = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Departamento de residencia")
    )
    
    codigo_postal = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name=_("Código postal")
    )

    # Información médica
    tipo_sangre = models.CharField(
        max_length=3,
        choices=TIPO_SANGRE_CHOICES,
        blank=True,
        null=True,
        verbose_name=_("Tipo de sangre")
    )
    
    alergias = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Alergias"),
        help_text=_("Describa cualquier alergia conocida")
    )
    
    medicamentos = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Medicamentos"),
        help_text=_("Medicamentos que toma regularmente")
    )
    
    condiciones_medicas = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Condiciones médicas"),
        help_text=_("Condiciones médicas relevantes")
    )

    # Información profesional
    nivel_educacion = models.CharField(
        max_length=20,
        choices=NIVEL_EDUCACION_CHOICES,
        blank=True,
        null=True,
        verbose_name=_("Nivel de educación")
    )
    
    profesion = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Profesión")
    )
    
    habilidades = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Habilidades"),
        help_text=_("Describa sus habilidades principales")
    )
    
    experiencia_laboral = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Experiencia laboral"),
        help_text=_("Resumen de experiencia laboral relevante")
    )
    
    certificaciones = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Certificaciones"),
        help_text=_("Certificaciones profesionales obtenidas")
    )
    
    # Información bancaria
    banco = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Banco")
    )
    
    numero_cuenta = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_("Número de cuenta"),
        help_text=_("Número de cuenta bancaria para pagos")
    )
    
    tipo_cuenta = models.CharField(
        max_length=10,
        choices=TIPO_CUENTA_CHOICES,
        blank=True,
        null=True,
        verbose_name=_("Tipo de cuenta")
    )

    # Información de identificación
    numero_cedula = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        unique=True,
        verbose_name=_("Número de cédula"),
        validators=[RegexValidator(
            regex=r'^\d{8,12}$',
            message=_("El número de cédula debe contener entre 8 y 12 dígitos.")
        )]
    )
    
    departamento_expedicion_cedula = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Departamento de expedición de cédula")
    )
    
    lugar_expedicion_cedula = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Lugar de expedición de cédula (Municipio)")
    )
    
    # Preferencias de usuario
    tema_preferido = models.CharField(
        max_length=15,
        choices=TEMA_CHOICES,
        default='claro',
        verbose_name=_("Tema preferido")
    )
    
    idioma_preferido = models.CharField(
        max_length=5,
        choices=IDIOMA_CHOICES,
        default='es',
        verbose_name=_("Idioma preferido")
    )
    
    zona_horaria = models.CharField(
        max_length=50,
        default='America/Bogota',
        verbose_name=_("Zona horaria")
    )

    # Configuración de privacidad
    perfil_completado = models.BooleanField(
        default=False,
        verbose_name=_("Perfil completado"),
        help_text=_("Indica si el perfil tiene la información mínima requerida")
    )
    
    privacidad_publica = models.BooleanField(
        default=False,
        verbose_name=_("Información pública"),
        help_text=_("Si algunos datos pueden ser visibles a otros usuarios")
    )
    
    ultima_actualizacion_perfil = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Última actualización")
    )
    
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )
    
    # Manager adicional sin filtro de tenant para operaciones especiales
    all_objects = models.Manager()  # Manager sin filtro de organización

    class Meta:
        verbose_name = _("Perfil de Usuario")
        verbose_name_plural = _("Perfiles de Usuario")
        ordering = ['usuario__first_name', 'usuario__last_name']

    def __str__(self):
        return f"Perfil de {self.usuario.get_full_name() or self.usuario.username}"

    def save(self, *args, **kwargs):
        # Redimensionar imagen si es muy grande
        super().save(*args, **kwargs)
        
        if self.foto:
            self.redimensionar_foto()
        
        # Calcular si el perfil está completado
        self.verificar_completitud()

    def redimensionar_foto(self):
        """Redimensiona la foto de perfil para optimizar espacio"""
        if self.foto:
            img = Image.open(self.foto.path)
            
            # Redimensionar si es muy grande
            if img.height > 300 or img.width > 300:
                output_size = (300, 300)
                img.thumbnail(output_size)
                img.save(self.foto.path)

    def verificar_completitud(self):
        """Verifica si el perfil tiene la información mínima completa"""
        campos_requeridos = [
            self.telefono,
            self.direccion_residencia,
            self.ciudad_residencia,
            self.fecha_nacimiento,
        ]
        
        completado = all(campo for campo in campos_requeridos)
        
        if self.perfil_completado != completado:
            self.perfil_completado = completado
            # Evitar recursión infinita
            Perfil.objects.filter(pk=self.pk).update(perfil_completado=completado)

    @property
    def edad(self):
        """Calcula la edad del usuario"""
        if self.fecha_nacimiento:
            from datetime import date
            today = date.today()
            return today.year - self.fecha_nacimiento.year - (
                (today.month, today.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
            )
        return None

    @property
    def nombre_completo(self):
        """Retorna el nombre completo del usuario"""
        return self.usuario.get_full_name() or self.usuario.username

    def get_foto_url(self):
        """Retorna la URL de la foto o una por defecto"""
        if self.foto:
            return self.foto.url
        return '/static/img/default-avatar.png'

    def puede_ver_info_usuario(self, otro_usuario):
        """Verifica si puede ver información de otro usuario"""
        if not self.privacidad_publica:
            return False
        
        # TODO: Implementar lógica de permisos según roles
        return True

    def get_informacion_publica(self):
        """Retorna solo la información que puede ser pública"""
        return {
            'nombre': self.nombre_completo,
            'foto': self.get_foto_url(),
            'profesion': self.profesion,
            'habilidades': self.habilidades,
        }


class ConfiguracionNotificaciones(models.Model):
    """
    Configuración específica de notificaciones por usuario.
    """
    
    perfil = models.OneToOneField(
        Perfil,
        on_delete=models.CASCADE,
        related_name='config_notificaciones',
        verbose_name=_("Perfil")
    )
    
    # Tipos de notificaciones
    notif_prestamos = models.BooleanField(
        default=True,
        verbose_name=_("Notificaciones de préstamos"),
        help_text=_("Recibir notificaciones sobre préstamos")
    )
    
    notif_nomina = models.BooleanField(
        default=True,
        verbose_name=_("Notificaciones de nómina"),
        help_text=_("Recibir notificaciones sobre nómina")
    )
    
    notif_documentos = models.BooleanField(
        default=True,
        verbose_name=_("Notificaciones de documentos"),
        help_text=_("Recibir notificaciones sobre documentos")
    )
    
    notif_sistema = models.BooleanField(
        default=True,
        verbose_name=_("Notificaciones del sistema"),
        help_text=_("Recibir notificaciones importantes del sistema")
    )
    
    # Canales de notificación
    via_email = models.BooleanField(
        default=True,
        verbose_name=_("Vía email"),
        help_text=_("Recibir notificaciones por correo electrónico")
    )
    
    via_sms = models.BooleanField(
        default=False,
        verbose_name=_("Vía SMS"),
        help_text=_("Recibir notificaciones por SMS")
    )
    
    via_plataforma = models.BooleanField(
        default=True,
        verbose_name=_("En la plataforma"),
        help_text=_("Mostrar notificaciones en la plataforma")
    )
    
    # Horarios de notificación
    horario_inicio = models.TimeField(
        default='08:00',
        verbose_name=_("Hora inicio notificaciones"),
        help_text=_("Hora desde la cual recibir notificaciones")
    )
    
    horario_fin = models.TimeField(
        default='18:00',
        verbose_name=_("Hora fin notificaciones"),
        help_text=_("Hora hasta la cual recibir notificaciones")
    )

    class Meta:
        verbose_name = _("Configuración de Notificaciones")
        verbose_name_plural = _("Configuraciones de Notificaciones")
        ordering = ['-id']

    def __str__(self):
        return f"Notificaciones - {self.perfil.usuario.username}"


# Signal para crear perfil automáticamente
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def crear_perfil_usuario(sender, instance, created, **kwargs):
    """Crea automáticamente un perfil cuando se crea un usuario"""
    if created:
        perfil = Perfil.objects.create(usuario=instance)
        ConfiguracionNotificaciones.objects.create(perfil=perfil)

@receiver(post_save, sender=User)
def guardar_perfil_usuario(sender, instance, created, **kwargs):
    """Guarda el perfil cuando se actualiza el usuario.

    Evitar volver a guardar inmediatamente el perfil creado en el mismo
    post_save (evita validaciones que exigen 'organization' antes de tiempo).
    """
    # Sólo guardar perfil en actualizaciones, no justo después de su creación
    if not created and hasattr(instance, 'perfil'):
        try:
            instance.perfil.save()
        except Exception:
            # Evitar que errores de validación en perfil rompan el flujo de guardado de usuario
            pass
