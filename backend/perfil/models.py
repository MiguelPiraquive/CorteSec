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
        help_text=_("Foto de perfil del usuario"),
        validators=[FileExtensionValidator(
            allowed_extensions=['jpg', 'jpeg', 'png', 'webp']
        )]
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

    # Preferencia de modal de proyecto
    mostrar_modal_proyecto = models.BooleanField(
        default=True,
        verbose_name=_("Mostrar modal de proyecto al iniciar"),
        help_text=_("Si se debe mostrar el selector de proyecto al iniciar sesión")
    )

    # Proyecto fijo/favorito: si está set, se auto-selecciona al iniciar y no sale el modal
    proyecto_fijo = models.UUIDField(
        null=True,
        blank=True,
        verbose_name=_("Proyecto fijo"),
        help_text=_("UUID del proyecto que se selecciona automáticamente al iniciar sesión")
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
        unique_together = [['organization', 'numero_cedula']]

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

    def calcular_porcentaje_completitud(self):
        """Calcula el porcentaje de completitud del perfil"""
        campos = [
            ('fecha_nacimiento', self.fecha_nacimiento, 10),
            ('genero', self.genero, 5),
            ('estado_civil', self.estado_civil, 5),
            ('nacionalidad', self.nacionalidad, 5),
            ('telefono', self.telefono, 10),
            ('direccion_residencia', self.direccion_residencia, 10),
            ('ciudad_residencia', self.ciudad_residencia, 8),
            ('departamento_residencia', self.departamento_residencia, 7),
            ('tipo_sangre', self.tipo_sangre, 5),
            ('nivel_educacion', self.nivel_educacion, 5),
            ('profesion', self.profesion, 5),
            ('banco', self.banco, 5),
            ('numero_cuenta', self.numero_cuenta, 5),
            ('tipo_cuenta', self.tipo_cuenta, 5),
            ('numero_cedula', self.numero_cedula, 10),
        ]
        total_peso = sum(peso for _, _, peso in campos)
        completados = sum(peso for _, valor, peso in campos if valor)
        return round((completados / total_peso) * 100) if total_peso > 0 else 0

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
        if not otro_usuario:
            return False

        # El mismo usuario siempre puede ver su información
        if otro_usuario.id == self.usuario_id:
            return True

        # Si el perfil es público, permitir acceso
        if self.privacidad_publica:
            return True

        # Administradores y staff pueden ver
        if getattr(otro_usuario, 'is_superuser', False) or getattr(otro_usuario, 'is_staff', False):
            return True

        # Permiso explícito
        try:
            if otro_usuario.has_perm('perfil.view_perfil') or otro_usuario.has_perm('perfil.ver_perfil'):
                return True
        except Exception:
            pass

        # Misma organización
        org_self = getattr(self.usuario, 'organization_id', None)
        org_other = getattr(otro_usuario, 'organization_id', None)
        if org_self and org_other and org_self == org_other:
            return True

        return False

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

    notif_contratos = models.BooleanField(
        default=True,
        verbose_name=_("Notificaciones de contratos"),
        help_text=_("Recibir notificaciones sobre contratos")
    )

    notif_empleados = models.BooleanField(
        default=True,
        verbose_name=_("Notificaciones de empleados"),
        help_text=_("Recibir notificaciones sobre empleados")
    )

    notif_proyectos = models.BooleanField(
        default=True,
        verbose_name=_("Notificaciones de proyectos"),
        help_text=_("Recibir notificaciones sobre proyectos")
    )

    notif_contabilidad = models.BooleanField(
        default=True,
        verbose_name=_("Notificaciones de contabilidad"),
        help_text=_("Recibir notificaciones sobre contabilidad")
    )

    notif_seguridad = models.BooleanField(
        default=True,
        verbose_name=_("Notificaciones de seguridad"),
        help_text=_("Recibir alertas de seguridad")
    )

    # Preferencias adicionales
    sonido_enabled = models.BooleanField(
        default=True,
        verbose_name=_("Sonido de notificaciones"),
        help_text=_("Activar sonido al recibir notificaciones")
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
