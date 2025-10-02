from django import forms
from .models import Empleado, Nomina, DetalleNomina
from locations.models import Municipio


class EmpleadoForm(forms.ModelForm):
    fecha_nacimiento = forms.DateField(
        widget=forms.DateInput(attrs={'type': 'date'}),
        required=False,
        label="Fecha de nacimiento"
    )

    class Meta:
        model = Empleado
        fields = [
            'nombres', 'apellidos', 'documento', 'correo', 'telefono',
            'direccion', 'fecha_nacimiento', 'genero','departamento', 'municipio', 'cargo', 'foto'
        ]
        widgets = {
            'nombres': forms.TextInput(attrs={'class': 'form-control'}),
            'apellidos': forms.TextInput(attrs={'class': 'form-control'}),
            'documento': forms.TextInput(attrs={'class': 'form-control'}),
            'correo': forms.EmailInput(attrs={'class': 'form-control'}),
            'telefono': forms.TextInput(attrs={'class': 'form-control'}),
            'direccion': forms.TextInput(attrs={'class': 'form-control'}),
            'genero': forms.Select(attrs={'class': 'form-select select2'}),
            'departamento': forms.Select(attrs={'class': 'form-select select2'}),
            'municipio': forms.Select(attrs={'class': 'form-select select2'}),
            'cargo': forms.Select(attrs={'class': 'form-select select2'}),
            'foto': forms.ClearableFileInput(attrs={'class': 'form-control'}),
        }
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Precargar los municipios con su departamento para optimizar el queryset
        self.fields['municipio'].queryset = Municipio.objects.select_related('departamento').all()


class NominaForm(forms.ModelForm):
    periodo_inicio = forms.DateField(
        widget=forms.DateInput(attrs={'type': 'date'}),
        label="Inicio del periodo"
    )
    periodo_fin = forms.DateField(
        widget=forms.DateInput(attrs={'type': 'date'}),
        label="Fin del periodo"
    )

    class Meta:
        model = Nomina
        fields = ['empleado', 'periodo_inicio', 'periodo_fin', 'seguridad', 'prestamos', 'restaurante']
        widgets = {
            'empleado': forms.Select(attrs={'class': 'form-select select2'}),
            'seguridad': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01', 'min': 0}),
            'prestamos': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01', 'min': 0}),
            'restaurante': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01', 'min': 0}),
        }

    def clean(self):
        cleaned_data = super().clean()
        empleado = cleaned_data.get('empleado')
        periodo_inicio = cleaned_data.get('periodo_inicio')
        periodo_fin = cleaned_data.get('periodo_fin')
        
        if empleado and periodo_inicio and periodo_fin:
            traslape = Nomina.objects.filter(
                empleado=empleado,
                periodo_inicio__lte=periodo_fin,
                periodo_fin__gte=periodo_inicio
            )
            if self.instance.pk:
                traslape = traslape.exclude(pk=self.instance.pk)
            if traslape.exists():
                raise forms.ValidationError("Ya existe una nómina para este empleado en el periodo seleccionado.")
        
        return cleaned_data


class DetalleNominaForm(forms.ModelForm):
    class Meta:
        model = DetalleNomina
        fields = ['item', 'cantidad']
        widgets = {
            'item': forms.Select(attrs={'class': 'form-select select2'}),
            'cantidad': forms.NumberInput(attrs={'class': 'form-control', 'min': 0, 'step': 'any'}),
        }
        labels = {
            'item': 'Ítem',
            'cantidad': 'Cantidad',
        }
