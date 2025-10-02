from django import forms
from .models import Item

class ItemForm(forms.ModelForm):
    """Formulario para items de trabajo/servicios de construcción"""
    
    class Meta:
        model = Item
        fields = ['nombre', 'descripcion', 'precio_unitario', 'tipo_cantidad', 'codigo', 'activo', 'observaciones']
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Ej: Excavación manual, Instalación tubería PVC'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'form-control', 
                'rows': 3,
                'placeholder': 'Descripción detallada del trabajo o servicio'
            }),
            'precio_unitario': forms.NumberInput(attrs={
                'class': 'form-control', 
                'step': '0.01', 
                'min': 0,
                'placeholder': '0.00'
            }),
            'tipo_cantidad': forms.Select(attrs={
                'class': 'form-select'
            }),
            'codigo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Código interno (opcional)'
            }),
            'activo': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'observaciones': forms.Textarea(attrs={
                'class': 'form-control', 
                'rows': 2,
                'placeholder': 'Observaciones adicionales'
            }),
        }
        labels = {
            'nombre': 'Nombre del Trabajo/Servicio',
            'descripcion': 'Descripción',
            'precio_unitario': 'Precio Unitario',
            'tipo_cantidad': 'Tipo de Medición',
            'codigo': 'Código',
            'activo': 'Activo',
            'observaciones': 'Observaciones',
        }
        help_texts = {
            'precio_unitario': 'Precio por unidad de medida (por m², m³, ml o global)',
            'tipo_cantidad': 'Seleccione la unidad de medida para este trabajo',
            'codigo': 'Código interno para identificar el trabajo (opcional)',
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Hacer que algunos campos sean requeridos
        self.fields['nombre'].required = True
        self.fields['precio_unitario'].required = True
        self.fields['tipo_cantidad'].required = True
        
        # Agregar clases CSS adicionales
        for field_name, field in self.fields.items():
            if field.required:
                field.widget.attrs.update({'required': True})
    
    def clean_precio_unitario(self):
        """Validar que el precio sea positivo"""
        precio = self.cleaned_data.get('precio_unitario')
        if precio is not None and precio < 0:
            raise forms.ValidationError('El precio unitario debe ser mayor o igual a cero.')
        return precio
    
    def clean_nombre(self):
        """Validar que el nombre no esté vacío"""
        nombre = self.cleaned_data.get('nombre')
        if nombre:
            nombre = nombre.strip()
            if not nombre:
                raise forms.ValidationError('El nombre del trabajo no puede estar vacío.')
        return nombre


class ItemBusquedaForm(forms.Form):
    """Formulario para búsqueda de items"""
    
    search = forms.CharField(
        max_length=200,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Buscar por nombre, descripción o código...',
        }),
        label='Buscar'
    )
    
    tipo_cantidad = forms.ChoiceField(
        choices=[('', 'Todos los tipos')] + Item.TIPO_CANTIDAD_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-select'
        }),
        label='Tipo de Medición'
    )
    
    activo = forms.ChoiceField(
        choices=[
            ('', 'Todos'),
            ('true', 'Solo activos'),
            ('false', 'Solo inactivos')
        ],
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-select'
        }),
        label='Estado'
    )