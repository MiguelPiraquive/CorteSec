from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator
from PIL import Image
import os

User = get_user_model()


class Perfil(models.Model):
    """
    Modelo para gestionar perfiles de usuario del sistema.
    Información adicional del usuario separada del modelo de empleado.
    """
    
    ESTADO_CIVIL_CHOICES = [
        ('soltero', _('Soltero/a')),
        ('casado', _('Casado/a')),
        ('union_libre', _('Unión libre')),
        ('divorciado', _('Divorciado/a')),
        ('viudo', _('Viudo/a')),
    ]
    
    GENERO_CHOICES = [
        ('M', _('Masculino')),
        ('F', _('Femenino')),
        ('O', _('Otro')),
        ('N', _('Prefiero no decir')),
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
    
    # Relación uno a uno con User
    usuario = models.OneToOneField(
        User,
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
        max_length=1,
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
    
    # Direcciones
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
    
    codigo_postal = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_("Código postal")
    )
    
    # Información médica básica
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
        help_text=_("Alergias conocidas")
    )
    
    medicamentos = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Medicamentos"),
        help_text=_("Medicamentos que toma regularmente")
    )
    
    # Información profesional/educativa
    nivel_educacion = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Nivel de educación")
    )
    
    profesion = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        verbose_name=_("Profesión")
    )
    
    habilidades = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Habilidades"),
        help_text=_("Habilidades profesionales principales")
    )
    
    # Información bancaria personal
    banco = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Banco")
    )
    
    numero_cuenta = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name=_("Número de cuenta")
    )
    
    tipo_cuenta = models.CharField(
        max_length=20,
        choices=[
            ('ahorros', _('Ahorros')),
            ('corriente', _('Corriente')),
        ],
        blank=True,
        null=True,
        verbose_name=_("Tipo de cuenta")
    )
    
    # Configuraciones del perfil
    tema_preferido = models.CharField(
        max_length=20,
        choices=[
            ('light', _('Claro')),
            ('dark', _('Oscuro')),
            ('auto', _('Automático')),
        ],
        default='auto',
        verbose_name=_("Tema preferido")
    )
    
    idioma_preferido = models.CharField(
        max_length=10,
        choices=[
            ('es', _('Español')),
            ('en', _('English')),
        ],
        default='es',
        verbose_name=_("Idioma preferido")
    )
    
    recibir_notificaciones = models.BooleanField(
        default=True,
        verbose_name=_("Recibir notificaciones"),
        help_text=_("Recibir notificaciones por email")
    )
    
    # Información biométrica (opcional)
    acepta_biometria = models.BooleanField(
        default=False,
        verbose_name=_("Acepta biometría"),
        help_text=_("Acepta usar datos biométricos para autenticación")
    )
    
    # Campos de auditoría y control
    perfil_completado = models.BooleanField(
        default=False,
        verbose_name=_("Perfil completado"),
        help_text=_("Si el perfil tiene la información mínima completa")
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
def guardar_perfil_usuario(sender, instance, **kwargs):
    """Guarda el perfil cuando se guarda el usuario"""
    if hasattr(instance, 'perfil'):
        instance.perfil.save()
