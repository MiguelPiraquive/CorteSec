from django import forms
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError

from .models import TipoCantidad


class TipoCantidadForm(forms.ModelForm):
    """Formulario para crear/editar tipos de cantidad"""
    
    class Meta:
        model = TipoCantidad
        fields = ['codigo', 'descripcion', 'simbolo', 'orden', 'activo']
        widgets = {
            'codigo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Ej: m2, kg, hrs'
            }),
            'descripcion': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Descripción completa del tipo de cantidad'
            }),
            'simbolo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Símbolo (opcional)'
            }),
            'orden': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '0',
                'value': '0'
            }),
            'activo': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
        }
        labels = {
            'codigo': _('Código'),
            'descripcion': _('Descripción'),
            'simbolo': _('Símbolo'),
            'orden': _('Orden'),
            'activo': _('Activo'),
        }
        help_texts = {
            'codigo': _('Código único identificador del tipo de cantidad'),
            'descripcion': _('Descripción completa y detallada'),
            'simbolo': _('Símbolo o abreviatura (opcional)'),
            'orden': _('Número para ordenar en listados'),
            'activo': _('Si está marcado, estará disponible para su uso'),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Hacer que el campo activo esté marcado por defecto
        if not self.instance.pk:
            self.fields['activo'].initial = True

    def clean_codigo(self):
        codigo = self.cleaned_data.get('codigo')
        if codigo:
            codigo = codigo.lower().strip()
            
            # Validar que no contenga espacios
            if ' ' in codigo:
                raise ValidationError(_('El código no debe contener espacios'))
            
            # Validar que sea alfanumérico (permitir algunos símbolos)
            import re
            if not re.match(r'^[a-z0-9_-]+$', codigo):
                raise ValidationError(_('El código solo puede contener letras, números, guiones y guiones bajos'))
        
        return codigo

    def clean_simbolo(self):
        simbolo = self.cleaned_data.get('simbolo')
        if simbolo:
            simbolo = simbolo.strip()
            if len(simbolo) > 10:
                raise ValidationError(_('El símbolo no puede tener más de 10 caracteres'))
        return simbolo

    def clean_orden(self):
        orden = self.cleaned_data.get('orden')
        if orden is None:
            orden = 0
        if orden < 0:
            raise ValidationError(_('El orden no puede ser negativo'))
        return orden


class TipoCantidadFiltroForm(forms.Form):
    """Formulario para filtros en la lista de tipos de cantidad"""
    
    search = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Buscar por código, descripción o símbolo...'
        })
    )
    
    estado = forms.ChoiceField(
        choices=[
            ('', 'Todos'),
            ('activos', 'Activos'),
            ('inactivos', 'Inactivos')
        ],
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-select'
        })
    )
    
    orden_por = forms.ChoiceField(
        choices=[
            ('orden', 'Orden'),
            ('codigo', 'Código'),
            ('descripcion', 'Descripción'),
            ('fecha_creacion', 'Fecha de creación')
        ],
        initial='orden',
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-select'
        })
    )
