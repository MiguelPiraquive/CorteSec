from django import forms
from django.core.exceptions import ValidationError
from decimal import Decimal
from .models import Prestamo, PagoPrestamo, TipoPrestamo
from payroll.models import Empleado


class PrestamoForm(forms.ModelForm):
    """Formulario para crear y editar préstamos"""

    class Meta:
        model = Prestamo
        fields = ['empleado', 'tipo_prestamo', 'monto_solicitado', 'tasa_interes', 'plazo_meses', 
                 'fecha_solicitud', 'fecha_primer_pago', 'observaciones', 'garantia_descripcion']
        widgets = {
            'empleado': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            }),
            'tipo_prestamo': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            }),
            'monto_solicitado': forms.NumberInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': '0.00',
                'step': '0.01',
                'min': '0'
            }),
            'plazo_meses': forms.NumberInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'min': '1',
                'max': '60',
                'placeholder': 'Plazo en meses'
            }),
            'tasa_interes': forms.NumberInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': '0.00',
                'step': '0.01',
                'min': '0',
                'max': '100'
            }),
            'observaciones': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': 'Observaciones adicionales',
                'rows': 3
            }),
            'garantia_descripcion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': 'Descripción de la garantía',
                'rows': 3
            }),
            'estado': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            }),
            'fecha_solicitud': forms.DateInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'date'
            }),
            'fecha_primer_pago': forms.DateInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'date'
            }),
        }
        labels = {
            'empleado': 'Empleado',
            'tipo_prestamo': 'Tipo de Préstamo',
            'monto_solicitado': 'Monto Solicitado',
            'plazo_meses': 'Plazo (Meses)',
            'tasa_interes': 'Tasa de Interés (%)',
            'fecha_solicitud': 'Fecha de Solicitud',
            'fecha_primer_pago': 'Fecha Primer Pago',
            'observaciones': 'Observaciones',
            'garantia_descripcion': 'Descripción de Garantía',
        }
        help_texts = {
            'monto_solicitado': 'Monto total del préstamo solicitado',
            'plazo_meses': 'Número de meses para el pago (máximo 60)',
            'tasa_interes': 'Tasa de interés anual en porcentaje (puede ser 0)',
            'fecha_solicitud': 'Fecha en que se realiza la solicitud',
            'fecha_primer_pago': 'Fecha programada para el primer pago',
            'observaciones': 'Observaciones adicionales sobre el préstamo',
            'garantia_descripcion': 'Descripción de la garantía ofrecida',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Filtrar empleados activos (todos los empleados en este caso)
        self.fields['empleado'].queryset = Empleado.objects.all().order_by('nombres', 'apellidos')
        
        # Cargar tipos de préstamo disponibles
        self.fields['tipo_prestamo'].queryset = TipoPrestamo.objects.filter(activo=True).order_by('nombre')
        
        # Si es una edición, deshabilitar ciertos campos según el estado
        if self.instance and self.instance.pk:
            if self.instance.estado in ['aprobado', 'desembolsado', 'activo', 'completado']:
                # No permitir cambiar monto ni términos si ya está aprobado
                self.fields['monto_solicitado'].widget.attrs['readonly'] = True
                self.fields['plazo_meses'].widget.attrs['readonly'] = True
                self.fields['tasa_interes'].widget.attrs['readonly'] = True
                self.fields['empleado'].widget.attrs['disabled'] = True
                self.fields['tipo_prestamo'].widget.attrs['disabled'] = True

    def clean_monto_solicitado(self):
        monto = self.cleaned_data.get('monto_solicitado')
        if monto is not None:
            if monto <= 0:
                raise ValidationError('El monto debe ser mayor a cero.')
            if monto > Decimal('10000000'):  # 10 millones
                raise ValidationError('El monto no puede ser mayor a $10,000,000.')
        return monto

    def clean_plazo_meses(self):
        plazo = self.cleaned_data.get('plazo_meses')
        if plazo is not None:
            if plazo < 1:
                raise ValidationError('El plazo debe ser al menos 1 mes.')
            if plazo > 60:
                raise ValidationError('El plazo no puede ser mayor a 60 meses.')
        return plazo

    def clean_tasa_interes(self):
        tasa = self.cleaned_data.get('tasa_interes')
        if tasa is not None:
            if tasa < 0:
                raise ValidationError('La tasa de interés debe ser mayor o igual a cero.')
            if tasa > 50:
                raise ValidationError('La tasa de interés no puede ser mayor al 50%.')
        return tasa

    def clean(self):
        cleaned_data = super().clean()
        empleado = cleaned_data.get('empleado')
        monto_solicitado = cleaned_data.get('monto_solicitado')
        
        # Validar que el empleado no tenga préstamos activos
        if empleado and not self.instance.pk:
            prestamos_activos = Prestamo.objects.filter(
                empleado=empleado,
                estado__in=['aprobado', 'activo']
            )
            if prestamos_activos.exists():
                self.add_error('empleado', 'Este empleado ya tiene un préstamo activo.')
        
        return cleaned_data


class PagoPrestamoForm(forms.ModelForm):
    """Formulario para registrar pagos de préstamo"""

    class Meta:
        model = PagoPrestamo
        fields = ['monto_pago', 'monto_capital', 'monto_interes', 'fecha_pago', 'fecha_programada', 'tipo_pago', 'referencia', 'observaciones']
        widgets = {
            'monto_pago': forms.NumberInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'step': '0.01',
                'min': '0',
                'placeholder': '0.00'
            }),
            'monto_capital': forms.NumberInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'step': '0.01',
                'min': '0',
                'placeholder': '0.00'
            }),
            'monto_interes': forms.NumberInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'step': '0.01',
                'min': '0',
                'placeholder': '0.00'
            }),
            'fecha_pago': forms.DateInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'date'
            }),
            'fecha_programada': forms.DateInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'date'
            }),
            'tipo_pago': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            }),
            'referencia': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': 'Número de referencia'
            }),
            'observaciones': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'rows': 3,
                'placeholder': 'Observaciones adicionales'
            }),
        }
        labels = {
            'monto_pago': 'Monto del Pago',
            'monto_capital': 'Monto a Capital',
            'monto_interes': 'Monto a Interés',
            'fecha_pago': 'Fecha de Pago',
            'fecha_programada': 'Fecha Programada',
            'tipo_pago': 'Tipo de Pago',
            'referencia': 'Referencia',
            'observaciones': 'Observaciones',
        }

    def clean(self):
        cleaned_data = super().clean()
        monto_pago = cleaned_data.get('monto_pago')
        monto_capital = cleaned_data.get('monto_capital')
        monto_interes = cleaned_data.get('monto_interes')
        
        if monto_pago and monto_capital and monto_interes:
            if abs(monto_pago - (monto_capital + monto_interes)) > Decimal('0.01'):
                raise ValidationError('El monto del pago debe ser igual a la suma del capital más el interés.')
        
        return cleaned_data


class PrestamoFiltroForm(forms.Form):
    """Formulario para filtros en la lista de préstamos"""
    
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'placeholder': 'Buscar por empleado o concepto...'
        })
    )
    
    estado = forms.ChoiceField(
        choices=[('', 'Todos los estados')] + Prestamo.ESTADO_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        })
    )
    
    empleado = forms.ModelChoiceField(
        queryset=Empleado.objects.all().order_by('nombres', 'apellidos'),
        required=False,
        empty_label="Todos los empleados",
        widget=forms.Select(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        })
    )
