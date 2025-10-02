"""
Formularios del Sistema de Permisos
===================================

Formularios para la gestión de permisos con validaciones avanzadas
y interfaces de usuario optimizadas.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from django import forms
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
import json

from .models import (
    ModuloSistema, TipoPermiso, CondicionPermiso, 
    Permiso, PermisoDirecto, PermisoI18N, ConfiguracionEntorno
)
from core.models import Organizacion

User = get_user_model()


class BaseFormMixin:
    """Mixin base para formularios con estilos comunes."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.apply_common_styles()
    
    def apply_common_styles(self):
        """Aplica estilos CSS comunes a los campos."""
        common_class = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        
        for field_name, field in self.fields.items():
            if isinstance(field.widget, (forms.TextInput, forms.EmailInput, forms.URLInput)):
                field.widget.attrs.update({'class': common_class})
            elif isinstance(field.widget, forms.Textarea):
                field.widget.attrs.update({
                    'class': common_class,
                    'rows': 3
                })
            elif isinstance(field.widget, forms.Select):
                field.widget.attrs.update({
                    'class': common_class
                })
            elif isinstance(field.widget, forms.CheckboxInput):
                field.widget.attrs.update({
                    'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500'
                })


class ModuloSistemaForm(BaseFormMixin, forms.ModelForm):
    """Formulario para crear y editar módulos del sistema."""
    
    class Meta:
        model = ModuloSistema
        fields = [
            'nombre', 'codigo', 'descripcion', 'version', 'icono', 'color',
            'url_base', 'padre', 'orden', 'activo', 'es_sistema', 
            'requiere_licencia', 'configuracion_avanzada'
        ]
        widgets = {
            'nombre': forms.TextInput(attrs={
                'placeholder': 'Nombre del módulo'
            }),
            'codigo': forms.TextInput(attrs={
                'placeholder': 'Código único del módulo (ej: usuarios, reportes)'
            }),
            'descripcion': forms.Textarea(attrs={
                'placeholder': 'Descripción detallada del módulo',
                'rows': 3
            }),
            'version': forms.TextInput(attrs={
                'placeholder': '1.0.0'
            }),
            'icono': forms.TextInput(attrs={
                'placeholder': 'Clase CSS del icono (ej: fas fa-users)'
            }),
            'color': forms.TextInput(attrs={
                'placeholder': 'Color hexadecimal (ej: #3B82F6)',
                'type': 'color'
            }),
            'url_base': forms.TextInput(attrs={
                'placeholder': 'URL base del módulo (ej: /usuarios/)'
            }),
            'orden': forms.NumberInput(attrs={
                'min': 1,
                'placeholder': 'Orden de visualización'
            }),
            'configuracion_avanzada': forms.Textarea(attrs={
                'placeholder': 'Configuración JSON (opcional)',
                'rows': 4
            })
        }
        help_texts = {
            'codigo': 'Código único que identificará este módulo en el sistema',
            'padre': 'Módulo padre si este es un submódulo',
            'orden': 'Orden de visualización en menús y listados',
            'es_sistema': 'Los módulos del sistema no pueden ser eliminados',
            'requiere_licencia': 'Requiere licencia especial para ser usado',
            'configuracion_avanzada': 'Configuración adicional en formato JSON'
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filtrar módulos padre para evitar referencias circulares
        if self.instance.pk:
            descendants = self.instance.get_descendants()
            self.fields['padre'].queryset = ModuloSistema.objects.exclude(
                pk__in=[self.instance.pk] + list(descendants.values_list('pk', flat=True))
            )
    
    def clean_codigo(self):
        """Valida que el código sea único."""
        codigo = self.cleaned_data['codigo']
        
        # Verificar unicidad
        qs = ModuloSistema.objects.filter(codigo=codigo)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        
        if qs.exists():
            raise ValidationError('Ya existe un módulo con este código.')
        
        return codigo
    
    def clean_configuracion_avanzada(self):
        """Valida que la configuración sea JSON válido."""
        config = self.cleaned_data.get('configuracion_avanzada')
        
        if config:
            try:
                json.loads(config)
            except json.JSONDecodeError:
                raise ValidationError('La configuración debe ser un JSON válido.')
        
        return config


class TipoPermisoForm(BaseFormMixin, forms.ModelForm):
    """Formulario para crear y editar tipos de permiso."""
    
    class Meta:
        model = TipoPermiso
        fields = [
            'nombre', 'codigo', 'descripcion', 'categoria', 
            'icono', 'color', 'es_critico', 'requiere_auditoria', 'activo'
        ]
        widgets = {
            'nombre': forms.TextInput(attrs={
                'placeholder': 'Nombre del tipo de permiso'
            }),
            'codigo': forms.TextInput(attrs={
                'placeholder': 'Código único (ej: view, create, delete)'
            }),
            'descripcion': forms.Textarea(attrs={
                'placeholder': 'Descripción del tipo de permiso',
                'rows': 3
            }),
            'icono': forms.TextInput(attrs={
                'placeholder': 'Clase CSS del icono (ej: fas fa-eye)'
            }),
            'color': forms.TextInput(attrs={
                'placeholder': 'Color hexadecimal',
                'type': 'color'
            })
        }
        help_texts = {
            'codigo': 'Código único que identificará este tipo en el sistema',
            'categoria': 'Categoría a la que pertenece este tipo de permiso',
            'es_critico': 'Los permisos críticos requieren confirmación adicional',
            'requiere_auditoria': 'Registra automáticamente el uso de permisos de este tipo'
        }
    
    def clean_codigo(self):
        """Valida que el código sea único."""
        codigo = self.cleaned_data['codigo']
        
        qs = TipoPermiso.objects.filter(codigo=codigo)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        
        if qs.exists():
            raise ValidationError('Ya existe un tipo de permiso con este código.')
        
        return codigo


class CondicionPermisoForm(BaseFormMixin, forms.ModelForm):
    """Formulario para crear y editar condiciones de permiso."""
    
    class Meta:
        model = CondicionPermiso
        fields = [
            'nombre', 'codigo', 'tipo', 'descripcion', 'configuracion',
            'codigo_evaluacion', 'cacheable', 'tiempo_cache', 'activa'
        ]
        widgets = {
            'nombre': forms.TextInput(attrs={
                'placeholder': 'Nombre de la condición'
            }),
            'codigo': forms.TextInput(attrs={
                'placeholder': 'Código único de la condición'
            }),
            'descripcion': forms.Textarea(attrs={
                'placeholder': 'Descripción de la condición',
                'rows': 3
            }),
            'configuracion': forms.Textarea(attrs={
                'placeholder': 'Configuración JSON para la condición',
                'rows': 4
            }),
            'codigo_evaluacion': forms.Textarea(attrs={
                'placeholder': 'Código Python para evaluación personalizada',
                'rows': 6,
                'style': 'font-family: monospace;'
            }),
            'tiempo_cache': forms.NumberInput(attrs={
                'min': 60,
                'max': 86400,
                'placeholder': 'Tiempo en segundos'
            })
        }
        help_texts = {
            'codigo': 'Código único que identificará esta condición',
            'tipo': 'Tipo de evaluación de la condición',
            'configuracion': 'Configuración específica en formato JSON',
            'codigo_evaluacion': 'Código Python que debe retornar True o False',
            'cacheable': 'Si el resultado puede ser almacenado en cache',
            'tiempo_cache': 'Tiempo de vida del cache en segundos (60-86400)'
        }
    
    def clean_codigo(self):
        """Valida que el código sea único."""
        codigo = self.cleaned_data['codigo']
        
        qs = CondicionPermiso.objects.filter(codigo=codigo)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        
        if qs.exists():
            raise ValidationError('Ya existe una condición con este código.')
        
        return codigo
    
    def clean_configuracion(self):
        """Valida que la configuración sea JSON válido."""
        config = self.cleaned_data.get('configuracion')
        
        if config:
            try:
                json.loads(config)
            except json.JSONDecodeError:
                raise ValidationError('La configuración debe ser un JSON válido.')
        
        return config
    
    def clean_codigo_evaluacion(self):
        """Valida que el código de evaluación sea sintácticamente correcto."""
        codigo = self.cleaned_data.get('codigo_evaluacion')
        
        if codigo and self.cleaned_data.get('tipo') == 'python':
            try:
                compile(codigo, '<string>', 'exec')
            except SyntaxError as e:
                raise ValidationError(f'Error de sintaxis en el código: {e}')
        
        return codigo
    
    def clean(self):
        """Validaciones adicionales."""
        cleaned_data = super().clean()
        cacheable = cleaned_data.get('cacheable')
        tiempo_cache = cleaned_data.get('tiempo_cache')
        
        if cacheable and not tiempo_cache:
            raise ValidationError('Debe especificar el tiempo de cache si la condición es cacheable.')
        
        return cleaned_data


class PermisoForm(BaseFormMixin, forms.ModelForm):
    """Formulario para crear y editar permisos."""
    
    class Meta:
        model = Permiso
        fields = [
            'nombre', 'codigo', 'descripcion', 'modulo', 'tipo_permiso',
            'organizacion', 'ambito', 'content_type', 'object_id', 'condiciones',
            'es_heredable', 'es_revocable', 'prioridad', 'vigencia_inicio',
            'vigencia_fin', 'activo', 'es_sistema'
        ]
        widgets = {
            'nombre': forms.TextInput(attrs={
                'placeholder': 'Nombre del permiso'
            }),
            'codigo': forms.TextInput(attrs={
                'placeholder': 'Código único del permiso'
            }),
            'descripcion': forms.Textarea(attrs={
                'placeholder': 'Descripción detallada del permiso',
                'rows': 3
            }),
            'object_id': forms.TextInput(attrs={
                'placeholder': 'ID del objeto específico (opcional)'
            }),
            'prioridad': forms.NumberInput(attrs={
                'min': 1,
                'max': 100,
                'placeholder': 'Prioridad (1-100)'
            }),
            'vigencia_inicio': forms.DateTimeInput(attrs={
                'type': 'datetime-local'
            }),
            'vigencia_fin': forms.DateTimeInput(attrs={
                'type': 'datetime-local'
            }),
            'condiciones': forms.CheckboxSelectMultiple()
        }
        help_texts = {
            'codigo': 'Código único que identificará este permiso en verificaciones',
            'modulo': 'Módulo al que pertenece este permiso',
            'tipo_permiso': 'Tipo de operación que permite este permiso',
            'organizacion': 'Organización específica (opcional)',
            'ambito': 'Alcance del permiso en el sistema',
            'content_type': 'Tipo de contenido específico (opcional)',
            'object_id': 'ID del objeto específico (opcional)',
            'condiciones': 'Condiciones que deben cumplirse para usar este permiso',
            'es_heredable': 'Los permisos heredables se propagan a sub-elementos',
            'es_revocable': 'Los permisos revocables pueden ser retirados temporalmente',
            'prioridad': 'Prioridad de evaluación (mayor número = mayor prioridad)',
            'es_sistema': 'Los permisos del sistema no pueden ser eliminados'
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Filtrar organizaciones activas
        self.fields['organizacion'].queryset = Organizacion.objects.filter(activa=True)
        
        # Filtrar condiciones activas
        self.fields['condiciones'].queryset = CondicionPermiso.objects.filter(activa=True)
        
        # Configurar campos opcionales
        self.fields['organizacion'].required = False
        self.fields['content_type'].required = False
        self.fields['object_id'].required = False
        self.fields['vigencia_inicio'].required = False
        self.fields['vigencia_fin'].required = False
    
    def clean_codigo(self):
        """Valida que el código sea único."""
        codigo = self.cleaned_data['codigo']
        
        qs = Permiso.objects.filter(codigo=codigo)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        
        if qs.exists():
            raise ValidationError('Ya existe un permiso con este código.')
        
        return codigo
    
    def clean(self):
        """Validaciones adicionales."""
        cleaned_data = super().clean()
        vigencia_inicio = cleaned_data.get('vigencia_inicio')
        vigencia_fin = cleaned_data.get('vigencia_fin')
        ambito = cleaned_data.get('ambito')
        content_type = cleaned_data.get('content_type')
        object_id = cleaned_data.get('object_id')
        
        # Validar fechas de vigencia
        if vigencia_inicio and vigencia_fin:
            if vigencia_inicio >= vigencia_fin:
                raise ValidationError('La fecha de fin debe ser posterior a la fecha de inicio.')
        
        # Validar campos requeridos según el ámbito
        if ambito == 'recurso':
            if not content_type:
                raise ValidationError('Debe especificar el tipo de contenido para el ámbito "recurso".')
        
        if content_type and not object_id:
            if ambito == 'recurso':
                # Para ámbito recurso específico, object_id es opcional
                pass
        
        return cleaned_data


class PermisoDirectoForm(BaseFormMixin, forms.ModelForm):
    """Formulario para asignar permisos directos."""
    
    class Meta:
        model = PermisoDirecto
        fields = [
            'usuario', 'permiso', 'tipo', 'fecha_inicio', 'fecha_fin',
            'motivo', 'activo'
        ]
        widgets = {
            'usuario': forms.Select(attrs={
                'placeholder': 'Seleccionar usuario'
            }),
            'permiso': forms.Select(attrs={
                'placeholder': 'Seleccionar permiso'
            }),
            'fecha_inicio': forms.DateTimeInput(attrs={
                'type': 'datetime-local'
            }),
            'fecha_fin': forms.DateTimeInput(attrs={
                'type': 'datetime-local'
            }),
            'motivo': forms.Textarea(attrs={
                'placeholder': 'Motivo de la asignación',
                'rows': 3
            })
        }
        help_texts = {
            'usuario': 'Usuario al que se asignará el permiso',
            'permiso': 'Permiso a asignar',
            'tipo': 'Tipo de asignación: Grant (permitir) o Deny (denegar)',
            'fecha_inicio': 'Fecha y hora de inicio de vigencia',
            'fecha_fin': 'Fecha y hora de fin de vigencia (opcional)',
            'motivo': 'Justificación para la asignación del permiso'
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Filtrar usuarios activos
        self.fields['usuario'].queryset = User.objects.filter(is_active=True).order_by('username')
        
        # Filtrar permisos activos
        self.fields['permiso'].queryset = Permiso.objects.filter(activo=True).select_related(
            'modulo', 'tipo_permiso'
        ).order_by('modulo__nombre', 'nombre')
        
        # Establecer valor por defecto para fecha_inicio
        if not self.instance.pk:
            self.fields['fecha_inicio'].initial = timezone.now()
    
    def clean(self):
        """Validaciones adicionales."""
        cleaned_data = super().clean()
        usuario = cleaned_data.get('usuario')
        permiso = cleaned_data.get('permiso')
        fecha_inicio = cleaned_data.get('fecha_inicio')
        fecha_fin = cleaned_data.get('fecha_fin')
        
        # Validar fechas
        if fecha_inicio and fecha_fin:
            if fecha_inicio >= fecha_fin:
                raise ValidationError('La fecha de fin debe ser posterior a la fecha de inicio.')
        
        # Verificar duplicados (solo para creación)
        if usuario and permiso and not self.instance.pk:
            if PermisoDirecto.objects.filter(
                usuario=usuario,
                permiso=permiso,
                activo=True
            ).exists():
                raise ValidationError('Ya existe una asignación activa de este permiso para este usuario.')
        
        return cleaned_data


class PermisoI18NForm(BaseFormMixin, forms.ModelForm):
    """Formulario para traducciones de permisos."""
    
    class Meta:
        model = PermisoI18N
        fields = ['permiso', 'idioma', 'nombre', 'descripcion']
        widgets = {
            'nombre': forms.TextInput(attrs={
                'placeholder': 'Nombre traducido'
            }),
            'descripcion': forms.Textarea(attrs={
                'placeholder': 'Descripción traducida',
                'rows': 3
            })
        }
    
    def clean(self):
        """Valida que no exista otra traducción para el mismo idioma."""
        cleaned_data = super().clean()
        permiso = cleaned_data.get('permiso')
        idioma = cleaned_data.get('idioma')
        
        if permiso and idioma:
            qs = PermisoI18N.objects.filter(permiso=permiso, idioma=idioma)
            if self.instance.pk:
                qs = qs.exclude(pk=self.instance.pk)
            
            if qs.exists():
                raise ValidationError('Ya existe una traducción para este permiso en este idioma.')
        
        return cleaned_data


class ConfiguracionEntornoForm(BaseFormMixin, forms.ModelForm):
    """Formulario para configuraciones por entorno."""
    
    class Meta:
        model = ConfiguracionEntorno
        fields = ['entorno', 'permiso', 'configuracion']
        widgets = {
            'configuracion': forms.Textarea(attrs={
                'placeholder': 'Configuración JSON específica del entorno',
                'rows': 6,
                'style': 'font-family: monospace;'
            })
        }
    
    def clean_configuracion(self):
        """Valida que la configuración sea JSON válido."""
        config = self.cleaned_data.get('configuracion')
        
        if config:
            try:
                json.loads(config)
            except json.JSONDecodeError:
                raise ValidationError('La configuración debe ser un JSON válido.')
        
        return config


class BusquedaPermisosForm(forms.Form):
    """Formulario de búsqueda avanzada de permisos."""
    
    q = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'placeholder': 'Buscar por nombre, código o descripción...',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )
    
    modulo = forms.ModelChoiceField(
        queryset=ModuloSistema.objects.filter(activo=True),
        required=False,
        empty_label="Todos los módulos",
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )
    
    tipo_permiso = forms.ModelChoiceField(
        queryset=TipoPermiso.objects.filter(activo=True),
        required=False,
        empty_label="Todos los tipos",
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )
    
    organizacion = forms.ModelChoiceField(
        queryset=Organizacion.objects.filter(activa=True),
        required=False,
        empty_label="Todas las organizaciones",
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )
    
    activo = forms.ChoiceField(
        choices=[
            ('', 'Todos'),
            ('true', 'Activos'),
            ('false', 'Inactivos')
        ],
        required=False,
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )
    
    ambito = forms.ChoiceField(
        choices=[('', 'Todos')] + Permiso.AMBITO_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )


class FiltroUsuariosForm(forms.Form):
    """Formulario para filtrar usuarios en asignación de permisos."""
    
    q = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'placeholder': 'Buscar usuarios...',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )
    
    is_active = forms.ChoiceField(
        choices=[
            ('', 'Todos'),
            ('true', 'Activos'),
            ('false', 'Inactivos')
        ],
        required=False,
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )
