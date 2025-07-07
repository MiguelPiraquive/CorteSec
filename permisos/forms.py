from django import forms
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError

from .models import Modulo, TipoPermiso, Permiso


class ModuloForm(forms.ModelForm):
    """Formulario para crear y editar módulos."""
    
    class Meta:
        model = Modulo
        fields = [
            'nombre', 'codigo', 'descripcion', 'icono', 
            'url_base', 'orden', 'activo', 'es_sistema'
        ]
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Nombre del módulo'
            }),
            'codigo': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Código único del módulo'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'rows': 3,
                'placeholder': 'Descripción del módulo'
            }),
            'icono': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Ej: fas fa-users'
            }),
            'url_base': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'URL base del módulo'
            }),
            'orden': forms.NumberInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'min': 0
            }),
            'activo': forms.CheckboxInput(attrs={
                'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
            'es_sistema': forms.CheckboxInput(attrs={
                'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
        }

    def clean_codigo(self):
        """Validar que el código sea único y tenga formato correcto."""
        codigo = self.cleaned_data.get('codigo')
        if codigo:
            codigo = codigo.lower().strip()
            
            # Verificar que solo contenga letras, números y guiones bajos
            if not codigo.replace('_', '').replace('-', '').isalnum():
                raise ValidationError(
                    _('El código solo puede contener letras, números, guiones y guiones bajos.')
                )
            
            # Verificar unicidad
            queryset = Modulo.objects.filter(codigo=codigo)
            if self.instance.pk:
                queryset = queryset.exclude(pk=self.instance.pk)
            
            if queryset.exists():
                raise ValidationError(_('Ya existe un módulo con este código.'))
        
        return codigo

    def clean(self):
        """Validaciones adicionales del formulario."""
        cleaned_data = super().clean()
        es_sistema = cleaned_data.get('es_sistema')
        activo = cleaned_data.get('activo')
        
        # Los módulos del sistema deben estar activos
        if es_sistema and not activo:
            raise ValidationError(
                _('Los módulos del sistema deben estar activos.')
            )
        
        return cleaned_data


class TipoPermisoForm(forms.ModelForm):
    """Formulario para crear y editar tipos de permiso."""
    
    class Meta:
        model = TipoPermiso
        fields = ['codigo', 'nombre', 'descripcion', 'activo']
        widgets = {
            'codigo': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
            'nombre': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Nombre del tipo de permiso'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'rows': 3,
                'placeholder': 'Descripción del tipo de permiso'
            }),
            'activo': forms.CheckboxInput(attrs={
                'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
        }

    def clean_codigo(self):
        """Validar que el código sea único."""
        codigo = self.cleaned_data.get('codigo')
        if codigo:
            queryset = TipoPermiso.objects.filter(codigo=codigo)
            if self.instance.pk:
                queryset = queryset.exclude(pk=self.instance.pk)
            
            if queryset.exists():
                raise ValidationError(_('Ya existe un tipo de permiso con este código.'))
        
        return codigo


class PermisoForm(forms.ModelForm):
    """Formulario para crear y editar permisos."""
    
    class Meta:
        model = Permiso
        fields = [
            'modulo', 'tipo_permiso', 'nombre', 'codigo', 
            'descripcion', 'activo', 'es_sistema'
        ]
        widgets = {
            'modulo': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
            'tipo_permiso': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
            'nombre': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Nombre del permiso'
            }),
            'codigo': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Código único del permiso'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'rows': 3,
                'placeholder': 'Descripción del permiso'
            }),
            'activo': forms.CheckboxInput(attrs={
                'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
            'es_sistema': forms.CheckboxInput(attrs={
                'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filtrar solo módulos y tipos de permiso activos
        self.fields['modulo'].queryset = Modulo.objects.filter(activo=True).order_by('nombre')
        self.fields['tipo_permiso'].queryset = TipoPermiso.objects.filter(activo=True).order_by('nombre')

    def clean_codigo(self):
        """Validar que el código sea único dentro del módulo."""
        codigo = self.cleaned_data.get('codigo')
        modulo = self.cleaned_data.get('modulo')
        
        if codigo and modulo:
            codigo = codigo.lower().strip()
            
            # Verificar que solo contenga letras, números y guiones bajos
            if not codigo.replace('_', '').replace('-', '').isalnum():
                raise ValidationError(
                    _('El código solo puede contener letras, números, guiones y guiones bajos.')
                )
            
            # Verificar unicidad dentro del módulo
            queryset = Permiso.objects.filter(modulo=modulo, codigo=codigo)
            if self.instance.pk:
                queryset = queryset.exclude(pk=self.instance.pk)
            
            if queryset.exists():
                raise ValidationError(
                    _('Ya existe un permiso con este código en el módulo seleccionado.')
                )
        
        return codigo

    def clean(self):
        """Validaciones adicionales del formulario."""
        cleaned_data = super().clean()
        es_sistema = cleaned_data.get('es_sistema')
        activo = cleaned_data.get('activo')
        
        # Los permisos del sistema deben estar activos
        if es_sistema and not activo:
            raise ValidationError(
                _('Los permisos del sistema deben estar activos.')
            )
        
        return cleaned_data


class ModuloFilterForm(forms.Form):
    """Formulario para filtros en la lista de módulos."""
    
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
            'placeholder': 'Buscar módulos...'
        })
    )
    
    activo = forms.ChoiceField(
        choices=[('', 'Todos'), ('true', 'Activos'), ('false', 'Inactivos')],
        required=False,
        widget=forms.Select(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )
    
    es_sistema = forms.ChoiceField(
        choices=[('', 'Todos'), ('true', 'Sistema'), ('false', 'Personalizados')],
        required=False,
        widget=forms.Select(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )


class TipoPermisoFilterForm(forms.Form):
    """Formulario para filtros en la lista de tipos de permiso."""
    
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
            'placeholder': 'Buscar tipos de permiso...'
        })
    )
    
    activo = forms.ChoiceField(
        choices=[('', 'Todos'), ('true', 'Activos'), ('false', 'Inactivos')],
        required=False,
        widget=forms.Select(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )


class PermisoFilterForm(forms.Form):
    """Formulario para filtros en la lista de permisos."""
    
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
            'placeholder': 'Buscar permisos...'
        })
    )
    
    modulo = forms.ModelChoiceField(
        queryset=Modulo.objects.filter(activo=True).order_by('nombre'),
        required=False,
        empty_label="Todos los módulos",
        widget=forms.Select(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )
    
    tipo_permiso = forms.ModelChoiceField(
        queryset=TipoPermiso.objects.filter(activo=True).order_by('nombre'),
        required=False,
        empty_label="Todos los tipos",
        widget=forms.Select(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )
    
    activo = forms.ChoiceField(
        choices=[('', 'Todos'), ('true', 'Activos'), ('false', 'Inactivos')],
        required=False,
        widget=forms.Select(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        })
    )
