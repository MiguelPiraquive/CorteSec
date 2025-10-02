from django import forms
from .models import Departamento, Municipio


class DepartamentoForm(forms.ModelForm):
    """Formulario para departamentos"""
    
    class Meta:
        model = Departamento
        fields = ['nombre', 'codigo', 'capital', 'region']
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Nombre del departamento'
            }),
            'codigo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Código DANE'
            }),
            'capital': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Ciudad capital'
            }),
            'region': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Región geográfica'
            }),
        }
        labels = {
            'nombre': 'Nombre del Departamento',
            'codigo': 'Código',
            'capital': 'Capital',
            'region': 'Región',
        }
        help_texts = {
            'codigo': 'Código DANE del departamento',
            'region': 'Región geográfica (Andina, Caribe, Pacífica, etc.)',
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['nombre'].required = True
    
    def clean_nombre(self):
        """Validar que el nombre no esté vacío"""
        nombre = self.cleaned_data.get('nombre')
        if nombre:
            nombre = nombre.strip()
            if not nombre:
                raise forms.ValidationError('El nombre del departamento no puede estar vacío.')
        return nombre


class MunicipioForm(forms.ModelForm):
    """Formulario para municipios"""
    
    class Meta:
        model = Municipio
        fields = ['departamento', 'nombre', 'codigo']
        widgets = {
            'departamento': forms.Select(attrs={
                'class': 'form-select',
                'required': True
            }),
            'nombre': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Nombre del municipio'
            }),
            'codigo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Código DANE'
            }),
        }
        labels = {
            'departamento': 'Departamento',
            'nombre': 'Nombre del Municipio',
            'codigo': 'Código',
        }
        help_texts = {
            'codigo': 'Código DANE del municipio',
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Hacer campos requeridos
        self.fields['departamento'].required = True
        self.fields['nombre'].required = True
        
        # Ordenar departamentos por nombre
        self.fields['departamento'].queryset = Departamento.objects.all().order_by('nombre')
        
        # Configurar el widget del departamento
        self.fields['departamento'].empty_label = "Seleccione un departamento"
    
    def clean_nombre(self):
        """Validar que el nombre no esté vacío"""
        nombre = self.cleaned_data.get('nombre')
        if nombre:
            nombre = nombre.strip()
            if not nombre:
                raise forms.ValidationError('El nombre del municipio no puede estar vacío.')
        return nombre
    
    def clean(self):
        """Validaciones adicionales"""
        cleaned_data = super().clean()
        departamento = cleaned_data.get('departamento')
        nombre = cleaned_data.get('nombre')
        
        if departamento and nombre:
            # Verificar que no exista otro municipio con el mismo nombre en el departamento
            existing = Municipio.objects.filter(
                departamento=departamento,
                nombre=nombre
            )
            
            # Si estamos editando, excluir el registro actual
            if self.instance.pk:
                existing = existing.exclude(pk=self.instance.pk)
            
            if existing.exists():
                raise forms.ValidationError(
                    f'Ya existe un municipio llamado "{nombre}" en {departamento.nombre}'
                )
        
        return cleaned_data


class UbicacionBusquedaForm(forms.Form):
    """Formulario para búsqueda de ubicaciones"""
    
    search = forms.CharField(
        max_length=200,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Buscar departamento o municipio...',
        }),
        label='Buscar'
    )
    
    departamento = forms.ModelChoiceField(
        queryset=Departamento.objects.all().order_by('nombre'),
        required=False,
        empty_label='Todos los departamentos',
        widget=forms.Select(attrs={
            'class': 'form-select'
        }),
        label='Departamento'
    )
