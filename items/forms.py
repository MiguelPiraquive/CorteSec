from django import forms
from .models import Item

class ItemForm(forms.ModelForm):
    class Meta:
        model = Item
        fields = ['name', 'description', 'price', 'tipo_cantidad']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
            'price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01', 'min': 0}),
            'tipo_cantidad': forms.Select(attrs={'class': 'form-select select2'}),
        }
        labels = {
            'name': 'Nombre',
            'description': 'Descripción',
            'price': 'Precio Unitario',
            'tipo_cantidad': 'Tipo de cantidad',
        }