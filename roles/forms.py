from django import forms
from django.core.exceptions import ValidationError
from .models import Rol
from permisos.models import Permiso


class RolForm(forms.ModelForm):
    """Formulario para crear y editar roles"""
    
    permisos = forms.ModelMultipleChoiceField(
        queryset=Permiso.objects.filter(activo=True),
        widget=forms.CheckboxSelectMultiple(attrs={
            'class': 'form-check-input'
        }),
        required=False,
        label="Permisos"
    )

    class Meta:
        model = Rol
        fields = ['nombre', 'descripcion', 'activo', 'tiene_restriccion_horario', 
                  'hora_inicio', 'hora_fin', 'dias_semana', 'fecha_inicio_vigencia', 
                  'fecha_fin_vigencia']
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': 'Ingrese el nombre del rol'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': 'Ingrese una descripción del rol',
                'rows': 3
            }),
            'activo': forms.CheckboxInput(attrs={
                'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
            'tiene_restriccion_horario': forms.CheckboxInput(attrs={
                'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
            'hora_inicio': forms.TimeInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'time'
            }),
            'hora_fin': forms.TimeInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'time'
            }),
            'dias_semana': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': '1234567 (1=Lunes, 7=Domingo)'
            }),
            'fecha_inicio_vigencia': forms.DateInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'date'
            }),
            'fecha_fin_vigencia': forms.DateInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'date'
            }),
        }

    def clean_nombre(self):
        """Validar que el nombre sea único."""
        nombre = self.cleaned_data.get('nombre')
        if nombre:
            nombre = nombre.strip()
            queryset = Rol.objects.filter(nombre__iexact=nombre)
            if self.instance.pk:
                queryset = queryset.exclude(pk=self.instance.pk)
            
            if queryset.exists():
                raise ValidationError('Ya existe un rol con este nombre.')
        
        return nombre


class RolFilterForm(forms.Form):
    """Formulario para filtros en la lista de roles."""
    
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'placeholder': 'Buscar roles...'
        })
    )
    
    activo = forms.ChoiceField(
        choices=[('', 'Todos'), ('true', 'Activos'), ('false', 'Inactivos')],
        required=False,
        widget=forms.Select(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        })
    )
