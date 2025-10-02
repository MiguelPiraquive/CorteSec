"""
Formularios del Sistema de Reportes Multi-Módulo
===============================================

Formularios para configurar y generar reportes de cualquier módulo
del sistema con filtros dinámicos.

Autor: Sistema CorteSec
"""

from django import forms
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.apps import apps
import json

from .models import ModuloReporte, ReporteGenerado, ConfiguracionReporte


class ReporteConfigForm(forms.ModelForm):
    """
    Formulario para configurar un reporte
    """
    
    class Meta:
        model = ReporteGenerado
        fields = ['titulo', 'descripcion', 'formato', 'fecha_inicio', 'fecha_fin']
        widgets = {
            'titulo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Nombre del reporte'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Descripción opcional del reporte'
            }),
            'formato': forms.Select(attrs={
                'class': 'form-select'
            }),
            'fecha_inicio': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date'
            }),
            'fecha_fin': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date'
            })
        }
    
    def clean(self):
        cleaned_data = super().clean()
        fecha_inicio = cleaned_data.get('fecha_inicio')
        fecha_fin = cleaned_data.get('fecha_fin')
        
        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            raise ValidationError(_("La fecha de inicio no puede ser mayor que la fecha de fin"))
        
        return cleaned_data


class ConfiguracionReporteForm(forms.ModelForm):
    """
    Formulario para guardar configuraciones de reportes
    """
    
    class Meta:
        model = ConfiguracionReporte
        fields = ['nombre', 'descripcion', 'es_publica', 'es_favorita']
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Nombre de la configuración'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Descripción opcional'
            }),
            'es_publica': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'es_favorita': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            })
        }


class ModuloReporteForm(forms.ModelForm):
    """
    Formulario para administrar módulos de reporte
    """
    
    class Meta:
        model = ModuloReporte
        fields = [
            'nombre', 'codigo', 'descripcion', 'app_name', 'model_name',
            'icono', 'color', 'activo', 'orden', 'requiere_permiso'
        ]
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Nombre del módulo'
            }),
            'codigo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'codigo_modulo'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3
            }),
            'app_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'nombre_app'
            }),
            'model_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'NombreModelo'
            }),
            'icono': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'fas fa-table'
            }),
            'color': forms.Select(
                choices=[
                    ('primary', 'Azul'),
                    ('secondary', 'Gris'),
                    ('success', 'Verde'),
                    ('danger', 'Rojo'),
                    ('warning', 'Amarillo'),
                    ('info', 'Cyan'),
                    ('dark', 'Negro'),
                ],
                attrs={'class': 'form-select'}
            ),
            'activo': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'orden': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '0'
            }),
            'requiere_permiso': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'app.permiso_modelo'
            })
        }
    
    def clean_codigo(self):
        codigo = self.cleaned_data['codigo']
        # Validar que el código sea válido (solo letras, números y guiones bajos)
        if not codigo.replace('_', '').replace('-', '').isalnum():
            raise ValidationError(_("El código solo puede contener letras, números, guiones y guiones bajos"))
        return codigo.lower()
    
    def clean(self):
        cleaned_data = super().clean()
        app_name = cleaned_data.get('app_name')
        model_name = cleaned_data.get('model_name')
        
        if app_name and model_name:
            # Validar que el modelo existe
            try:
                apps.get_model(app_name, model_name)
            except LookupError:
                raise ValidationError(
                    _("No se encontró el modelo '%(model)s' en la app '%(app)s'") % {
                        'model': model_name,
                        'app': app_name
                    }
                )
        
        return cleaned_data


class BusquedaReporteForm(forms.Form):
    """
    Formulario para buscar en el historial de reportes
    """
    
    busqueda = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Buscar por título, descripción...'
        })
    )
    
    modulo = forms.ModelChoiceField(
        queryset=ModuloReporte.objects.none(),
        required=False,
        empty_label="-- Todos los módulos --",
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    
    estado = forms.ChoiceField(
        choices=[('', '-- Todos los estados --')] + ReporteGenerado.ESTADO_CHOICES,
        required=False,
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    
    formato = forms.ChoiceField(
        choices=[('', '-- Todos los formatos --')] + ReporteGenerado.FORMATO_CHOICES,
        required=False,
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    
    fecha_desde = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        })
    )
    
    fecha_hasta = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        })
    )
    
    def __init__(self, *args, organizacion=None, **kwargs):
        super().__init__(*args, **kwargs)
        
        if organization:
            self.fields['modulo'].queryset = ModuloReporte.objects.filter(
                organizacion=organization,
                activo=True
            ).order_by('nombre')
