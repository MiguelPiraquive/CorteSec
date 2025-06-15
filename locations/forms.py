from django import forms
from .models import Departamento, Municipio

class DepartamentoForm(forms.ModelForm):
    class Meta:
        model = Departamento
        fields = ['codigo', 'nombre']
        labels = {
            'codigo': 'Código',
            'nombre': 'Nombre del Departamento',
        }
        widgets = {
            'codigo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Ingrese el código del departamento'
            }),
            'nombre': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Ingrese el nombre del departamento'
            }),
        }

class MunicipioForm(forms.ModelForm):
    class Meta:
        model = Municipio
        fields = ['departamento', 'codigo', 'nombre']
        labels = {
            'departamento': 'Departamento',
            'codigo': 'Código',
            'nombre': 'Nombre del Municipio',
        }
        widgets = {
            'departamento': forms.Select(attrs={'class': 'form-select'}),
            'codigo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Ingrese el código del municipio'
            }),
            'nombre': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Ingrese el nombre del municipio'
            }),
        }