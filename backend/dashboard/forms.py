"""
Formularios del Dashboard
=========================

Formularios para proyectos.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

from django import forms
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from .models import Project


class ProjectForm(forms.ModelForm):
    """Formulario para crear y editar proyectos"""
    
    class Meta:
        model = Project
        fields = [
            'name', 'description',
            'start_date', 'end_date'
        ]
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Nombre del proyecto',
                'required': True
            }),
            'description': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Descripción detallada del proyecto',
                'rows': 4
            }),
            'start_date': forms.DateInput(attrs={
                'type': 'date',
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'required': True
            }),
            'end_date': forms.DateInput(attrs={
                'type': 'date',
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            })
        }
        help_texts = {
            'name': _('Nombre descriptivo del proyecto'),
            'start_date': _('Fecha de inicio del proyecto'),
            'end_date': _('Fecha de finalización (opcional, dejar vacío si está en curso)'),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def clean(self):
        """Validación personalizada del formulario"""
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')

        if start_date and end_date:
            if end_date <= start_date:
                raise ValidationError({
                    'end_date': _('La fecha de finalización debe ser posterior a la fecha de inicio.')
                })

        return cleaned_data



class BusquedaDashboardForm(forms.Form):
    """Formulario para búsqueda en el dashboard"""
    
    q = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
            'placeholder': 'Buscar proyectos...',
            'autocomplete': 'off'
        }),
        label=_('Búsqueda'),
        required=True
    )
    
    tipo = forms.ChoiceField(
        choices=[
            ('all', 'Todo'),
            ('projects', 'Proyectos'),
        ],
        widget=forms.Select(attrs={
            'class': 'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        }),
        label=_('Tipo'),
        required=False,
        initial='all'
    )


class FiltroFechasForm(forms.Form):
    """Formulario para filtrar por fechas en reportes"""
    
    fecha_inicio = forms.DateField(
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        }),
        label=_('Fecha inicio'),
        required=False
    )
    
    fecha_fin = forms.DateField(
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        }),
        label=_('Fecha fin'),
        required=False
    )
    
    def clean(self):
        """Valida que la fecha de fin sea posterior a la de inicio"""
        cleaned_data = super().clean()
        fecha_inicio = cleaned_data.get('fecha_inicio')
        fecha_fin = cleaned_data.get('fecha_fin')
        
        if fecha_inicio and fecha_fin:
            if fecha_fin < fecha_inicio:
                raise ValidationError(_('La fecha de fin debe ser posterior a la fecha de inicio.'))
        
        return cleaned_data
