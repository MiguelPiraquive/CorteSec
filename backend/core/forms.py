"""
Formularios para la aplicación Core
====================================

Formularios para modelos compartidos entre aplicaciones:
- Organizaciones
- Notificaciones 
- Configuraciones del sistema

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

from django import forms
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
import json

from .models import Organizacion, Notificacion, ConfiguracionSistema

User = get_user_model()


# ==================== ORGANIZACIONES ====================

class OrganizacionForm(forms.ModelForm):
    """Formulario para crear y editar organizaciones"""
    
    class Meta:
        model = Organizacion
        fields = [
            'nombre', 'codigo', 'razon_social', 'nit', 
            'email', 'telefono', 'direccion', 'activa', 
            'logo', 'configuracion'
        ]
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Nombre de la organización',
                'required': True
            }),
            'codigo': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Código único de la organización',
                'required': True
            }),
            'razon_social': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Razón social (opcional)'
            }),
            'nit': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'NIT (opcional)'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'email@organizacion.com'
            }),
            'telefono': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': '+57 300 123 4567'
            }),
            'direccion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Dirección física de la organización',
                'rows': 3
            }),
            'activa': forms.CheckboxInput(attrs={
                'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
            'logo': forms.FileInput(attrs={
                'class': 'mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100',
                'accept': 'image/*'
            }),
            'configuracion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': '{"key": "value"}',
                'rows': 4
            })
        }
        help_texts = {
            'codigo': _('Código único identificador (se convertirá a mayúsculas)'),
            'nit': _('Número de identificación tributaria'),
            'configuracion': _('Configuración en formato JSON'),
        }
    
    def clean_codigo(self):
        """Valida y convierte el código a mayúsculas"""
        codigo = self.cleaned_data.get('codigo')
        if codigo:
            codigo = codigo.upper().strip()
            
            # Verificar unicidad
            if self.instance.pk:
                # Editando - excluir la instancia actual
                if Organizacion.objects.filter(codigo=codigo).exclude(pk=self.instance.pk).exists():
                    raise ValidationError(_('Este código ya existe.'))
            else:
                # Creando - verificar que no exista
                if Organizacion.objects.filter(codigo=codigo).exists():
                    raise ValidationError(_('Este código ya existe.'))
        
        return codigo
    
    def clean_configuracion(self):
        """Valida que la configuración sea JSON válido"""
        configuracion = self.cleaned_data.get('configuracion')
        if configuracion:
            try:
                if isinstance(configuracion, str):
                    json.loads(configuracion)
            except json.JSONDecodeError:
                raise ValidationError(_('La configuración debe ser JSON válido.'))
        
        return configuracion


# ==================== NOTIFICACIONES ====================

class NotificacionForm(forms.ModelForm):
    """Formulario para crear notificaciones"""
    
    class Meta:
        model = Notificacion
        fields = [
            'usuario', 'titulo', 'mensaje', 'tipo', 
            'url_accion', 'icono'
        ]
        widgets = {
            'usuario': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'required': True
            }),
            'titulo': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Título de la notificación',
                'required': True
            }),
            'mensaje': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Contenido de la notificación',
                'rows': 4,
                'required': True
            }),
            'tipo': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
            'url_accion': forms.URLInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'https://ejemplo.com/accion'
            }),
            'icono': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'ti ti-bell'
            })
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Limitar usuarios a activos
        self.fields['usuario'].queryset = User.objects.filter(is_active=True).order_by('username')


# ==================== BÚSQUEDA ====================

class BusquedaGlobalForm(forms.Form):
    """Formulario para búsqueda global en el sistema"""
    
    q = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
            'placeholder': 'Buscar en todo el sistema...',
            'autocomplete': 'off'
        }),
        label=_('Búsqueda'),
        required=True
    )
    
    modulo = forms.ChoiceField(
        choices=[
            ('all', 'Todos los módulos'),
            ('organizaciones', 'Organizaciones'),
            ('usuarios', 'Usuarios'),
            ('notificaciones', 'Notificaciones'),
        ],
        widget=forms.Select(attrs={
            'class': 'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        }),
        label=_('Módulo'),
        required=False,
        initial='all'
    )
