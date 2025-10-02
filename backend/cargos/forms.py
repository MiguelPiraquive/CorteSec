from django import forms
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError

from .models import Cargo


class CargoForm(forms.ModelForm):
    """Formulario para crear y editar cargos."""
    
    class Meta:
        model = Cargo
        fields = [
            'nombre', 'codigo', 'descripcion', 'cargo_superior', 
            'nivel_jerarquico', 'salario_base_minimo', 'salario_base_maximo',
            'requiere_aprobacion', 'activo'
        ]
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Nombre del cargo'
            }),
            'codigo': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Código único del cargo'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'rows': 4,
                'placeholder': 'Descripción del cargo y sus responsabilidades'
            }),
            'cargo_superior': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
            'nivel_jerarquico': forms.NumberInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'min': '1',
                'max': '10'
            }),
            'salario_base_minimo': forms.NumberInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'step': '0.01',
                'min': '0'
            }),
            'salario_base_maximo': forms.NumberInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'step': '0.01',
                'min': '0'
            }),
            'requiere_aprobacion': forms.CheckboxInput(attrs={
                'class': 'h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded'
            }),
            'activo': forms.CheckboxInput(attrs={
                'class': 'h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Filtrar cargos superiores disponibles (excluyendo el cargo actual)
        queryset = Cargo.objects.filter(activo=True).order_by('nivel_jerarquico', 'nombre')
        if self.instance and self.instance.pk:
            queryset = queryset.exclude(pk=self.instance.pk)
        self.fields['cargo_superior'].queryset = queryset
        
        # Hacer el cargo superior opcional
        self.fields['cargo_superior'].required = False
        
        # Hacer el salario máximo opcional
        self.fields['salario_base_maximo'].required = False

    def clean_codigo(self):
        """Validar que el código sea único."""
        codigo = self.cleaned_data.get('codigo')
        if codigo:
            queryset = Cargo.objects.filter(codigo=codigo)
            if self.instance and self.instance.pk:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise ValidationError(_('Ya existe un cargo con este código.'))
        return codigo

    def clean_nombre(self):
        """Validar que el nombre sea único."""
        nombre = self.cleaned_data.get('nombre')
        if nombre:
            queryset = Cargo.objects.filter(nombre=nombre)
            if self.instance and self.instance.pk:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise ValidationError(_('Ya existe un cargo con este nombre.'))
        return nombre
