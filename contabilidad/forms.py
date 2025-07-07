from django import forms
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from decimal import Decimal

from .models import PlanCuentas, ComprobanteContable, MovimientoContable, FlujoCaja


class PlanCuentasForm(forms.ModelForm):
    """Formulario para crear/editar plan de cuentas"""
    
    class Meta:
        model = PlanCuentas
        fields = [
            'codigo', 'nombre', 'descripcion', 'cuenta_padre', 
            'tipo_cuenta', 'naturaleza', 'acepta_movimientos', 
            'requiere_tercero', 'activa'
        ]
        widgets = {
            'codigo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Ej: 1105'
            }),
            'nombre': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Nombre de la cuenta'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Descripción detallada de la cuenta'
            }),
            'cuenta_padre': forms.Select(attrs={
                'class': 'form-control'
            }),
            'tipo_cuenta': forms.Select(attrs={
                'class': 'form-control'
            }),
            'naturaleza': forms.Select(attrs={
                'class': 'form-control'
            }),
            'acepta_movimientos': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'requiere_tercero': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'activa': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Filtrar cuentas padre disponibles
        if self.instance.pk:
            # Excluir la cuenta actual y sus subcuentas para evitar referencias circulares
            descendientes = self._get_descendientes(self.instance)
            self.fields['cuenta_padre'].queryset = PlanCuentas.objects.filter(
                activa=True
            ).exclude(pk__in=[self.instance.pk] + descendientes)
        else:
            self.fields['cuenta_padre'].queryset = PlanCuentas.objects.filter(activa=True)
        
        # Hacer que el campo cuenta_padre no sea requerido
        self.fields['cuenta_padre'].required = False

    def _get_descendientes(self, cuenta):
        """Obtiene todos los descendientes de una cuenta"""
        descendientes = []
        for subcuenta in cuenta.subcuentas.all():
            descendientes.append(subcuenta.pk)
            descendientes.extend(self._get_descendientes(subcuenta))
        return descendientes

    def clean_codigo(self):
        codigo = self.cleaned_data.get('codigo')
        if codigo:
            # Validar formato del código
            if not codigo.replace('.', '').isdigit():
                raise ValidationError(_('El código debe contener solo números y puntos'))
        return codigo

    def clean(self):
        cleaned_data = super().clean()
        cuenta_padre = cleaned_data.get('cuenta_padre')
        acepta_movimientos = cleaned_data.get('acepta_movimientos')
        
        # Si tiene subcuentas, no debe aceptar movimientos
        if self.instance.pk and acepta_movimientos:
            if self.instance.subcuentas.exists():
                raise ValidationError(_('Las cuentas con subcuentas no pueden aceptar movimientos directos'))
        
        return cleaned_data


class ComprobanteContableForm(forms.ModelForm):
    """Formulario para crear/editar comprobantes contables"""
    
    class Meta:
        model = ComprobanteContable
        fields = [
            'numero', 'tipo_comprobante', 'fecha', 'descripcion'
        ]
        widgets = {
            'numero': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Número del comprobante'
            }),
            'tipo_comprobante': forms.Select(attrs={
                'class': 'form-control'
            }),
            'fecha': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Descripción del comprobante'
            }),
        }

    def __init__(self, *args, **kwargs):
        self.usuario = kwargs.pop('usuario', None)
        super().__init__(*args, **kwargs)

    def save(self, commit=True):
        instance = super().save(commit=False)
        if self.usuario:
            instance.creado_por = self.usuario
        if commit:
            instance.save()
        return instance


class MovimientoContableForm(forms.ModelForm):
    """Formulario para crear/editar movimientos contables"""
    
    class Meta:
        model = MovimientoContable
        fields = [
            'cuenta', 'descripcion', 'valor_debito', 'valor_credito',
            'tercero', 'centro_costo'
        ]
        widgets = {
            'cuenta': forms.Select(attrs={
                'class': 'form-control'
            }),
            'descripcion': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Descripción del movimiento'
            }),
            'valor_debito': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.01',
                'min': '0',
                'placeholder': '0.00'
            }),
            'valor_credito': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.01',
                'min': '0',
                'placeholder': '0.00'
            }),
            'tercero': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Identificación o nombre del tercero'
            }),
            'centro_costo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Centro de costo'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Solo mostrar cuentas que aceptan movimientos
        self.fields['cuenta'].queryset = PlanCuentas.objects.filter(
            activa=True, 
            acepta_movimientos=True
        ).order_by('codigo')


class FlujoCajaForm(forms.ModelForm):
    """Formulario para crear/editar flujo de caja"""
    
    class Meta:
        model = FlujoCaja
        fields = [
            'fecha', 'tipo_movimiento', 'concepto', 'valor',
            'comprobante', 'observaciones'
        ]
        widgets = {
            'fecha': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date'
            }),
            'tipo_movimiento': forms.Select(attrs={
                'class': 'form-control'
            }),
            'concepto': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Concepto del movimiento'
            }),
            'valor': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.01',
                'min': '0',
                'placeholder': '0.00'
            }),
            'comprobante': forms.Select(attrs={
                'class': 'form-control'
            }),
            'observaciones': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Observaciones adicionales'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Solo mostrar comprobantes contabilizados
        self.fields['comprobante'].queryset = ComprobanteContable.objects.filter(
            estado='contabilizado'
        ).order_by('-fecha')
        self.fields['comprobante'].required = False


# Formset para manejar múltiples movimientos en un comprobante
MovimientoFormSet = forms.inlineformset_factory(
    ComprobanteContable,
    MovimientoContable,
    form=MovimientoContableForm,
    extra=2,
    min_num=2,
    validate_min=True,
    can_delete=True
)


class FiltroContableForm(forms.Form):
    """Formulario para filtros en reportes contables"""
    
    fecha_inicio = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        }),
        label=_('Fecha inicio')
    )
    
    fecha_fin = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        }),
        label=_('Fecha fin')
    )
    
    cuenta = forms.ModelChoiceField(
        queryset=PlanCuentas.objects.filter(activa=True).order_by('codigo'),
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-control'
        }),
        label=_('Cuenta')
    )
    
    tipo_comprobante = forms.ChoiceField(
        choices=[('', 'Todos')] + ComprobanteContable.TIPO_COMPROBANTE_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-control'
        }),
        label=_('Tipo comprobante')
    )
    
    estado = forms.ChoiceField(
        choices=[('', 'Todos')] + ComprobanteContable.ESTADO_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-control'
        }),
        label=_('Estado')
    )


class BalanceGeneralForm(forms.Form):
    """Formulario para generar balance general"""
    
    fecha_corte = forms.DateField(
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        }),
        label=_('Fecha de corte')
    )
    
    incluir_saldos_cero = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input'
        }),
        label=_('Incluir cuentas con saldo cero')
    )
    
    nivel_detalle = forms.ChoiceField(
        choices=[
            (1, 'Nivel 1 - Mayor'),
            (2, 'Nivel 2 - Subcuentas'),
            (3, 'Nivel 3 - Auxiliares'),
            (0, 'Todos los niveles')
        ],
        widget=forms.Select(attrs={
            'class': 'form-control'
        }),
        label=_('Nivel de detalle')
    )


class EstadoResultadosForm(forms.Form):
    """Formulario para generar estado de resultados"""
    
    fecha_inicio = forms.DateField(
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        }),
        label=_('Fecha inicio')
    )
    
    fecha_fin = forms.DateField(
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        }),
        label=_('Fecha fin')
    )
    
    incluir_saldos_cero = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input'
        }),
        label=_('Incluir cuentas con saldo cero')
    )
    
    comparativo = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input'
        }),
        label=_('Generar comparativo con período anterior')
    )
