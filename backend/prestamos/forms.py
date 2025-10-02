"""
Formularios del Sistema de Préstamos
===================================

Formularios Django para la gestión de préstamos.
Incluye validaciones avanzadas y widgets personalizados.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from django import forms
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from decimal import Decimal
import datetime

from .models import TipoPrestamo, Prestamo, PagoPrestamo

User = get_user_model()


class BasePrestamoForm(forms.Form):
    """Formulario base con widgets comunes"""
    
    def __init__(self, *args, **kwargs):
        self.organizacion = kwargs.pop('organization', None)
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        # Aplicar clases CSS comunes
        for field_name, field in self.fields.items():
            if isinstance(field.widget, (forms.TextInput, forms.NumberInput, forms.EmailInput)):
                field.widget.attrs.update({
                    'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
                })
            elif isinstance(field.widget, forms.Select):
                field.widget.attrs.update({
                    'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
                })
            elif isinstance(field.widget, forms.Textarea):
                field.widget.attrs.update({
                    'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                    'rows': 3
                })
            elif isinstance(field.widget, forms.DateInput):
                field.widget.attrs.update({
                    'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                    'type': 'date'
                })


class TipoPrestamoForm(BasePrestamoForm, forms.ModelForm):
    """Formulario para crear y editar tipos de préstamo"""
    
    class Meta:
        model = TipoPrestamo
        fields = [
            'codigo', 'nombre', 'descripcion',
            'monto_minimo', 'monto_maximo',
            'tasa_interes_defecto', 'tasa_interes_minima', 'tasa_interes_maxima',
            'plazo_minimo_meses', 'plazo_maximo_meses',
            'requiere_garantia', 'requiere_aprobacion', 'permite_prepago',
            'configuracion_avanzada', 'activo', 'orden'
        ]
        
        widgets = {
            'codigo': forms.TextInput(attrs={
                'placeholder': 'Ej: PERS_01',
                'maxlength': 20,
                'pattern': '[A-Z0-9_]+',
                'title': 'Solo letras mayúsculas, números y guiones bajos'
            }),
            'nombre': forms.TextInput(attrs={
                'placeholder': 'Ej: Préstamo Personal'
            }),
            'descripcion': forms.Textarea(attrs={
                'placeholder': 'Descripción detallada del tipo de préstamo...',
                'rows': 4
            }),
            'monto_minimo': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0.01',
                'placeholder': '0.00'
            }),
            'monto_maximo': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0.01',
                'placeholder': '0.00'
            }),
            'tasa_interes_defecto': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0',
                'max': '100',
                'placeholder': '0.00'
            }),
            'tasa_interes_minima': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0',
                'max': '100',
                'placeholder': '0.00'
            }),
            'tasa_interes_maxima': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0',
                'max': '100',
                'placeholder': '0.00'
            }),
            'plazo_minimo_meses': forms.NumberInput(attrs={
                'min': '1',
                'max': '120',
                'placeholder': '1'
            }),
            'plazo_maximo_meses': forms.NumberInput(attrs={
                'min': '1',
                'max': '120',
                'placeholder': '60'
            }),
            'orden': forms.NumberInput(attrs={
                'min': '0',
                'placeholder': '0'
            }),
            'configuracion_avanzada': forms.Textarea(attrs={
                'placeholder': '{"configuracion": "valor"}',
                'rows': 3
            }),
        }
        
        labels = {
            'codigo': 'Código del Tipo',
            'nombre': 'Nombre del Tipo',
            'descripcion': 'Descripción',
            'monto_minimo': 'Monto Mínimo ($)',
            'monto_maximo': 'Monto Máximo ($)',
            'tasa_interes_defecto': 'Tasa de Interés por Defecto (%)',
            'tasa_interes_minima': 'Tasa de Interés Mínima (%)',
            'tasa_interes_maxima': 'Tasa de Interés Máxima (%)',
            'plazo_minimo_meses': 'Plazo Mínimo (meses)',
            'plazo_maximo_meses': 'Plazo Máximo (meses)',
            'requiere_garantia': 'Requiere Garantía',
            'requiere_aprobacion': 'Requiere Aprobación',
            'permite_prepago': 'Permite Prepago',
            'configuracion_avanzada': 'Configuración Avanzada (JSON)',
            'activo': 'Activo',
            'orden': 'Orden de Presentación'
        }
        
        help_texts = {
            'codigo': 'Código único identificador (solo mayúsculas, números y guiones bajos)',
            'monto_minimo': 'Monto mínimo permitido para este tipo de préstamo',
            'monto_maximo': 'Monto máximo permitido para este tipo de préstamo',
            'tasa_interes_defecto': 'Tasa que se aplicará por defecto (anual)',
            'plazo_minimo_meses': 'Plazo mínimo en meses',
            'plazo_maximo_meses': 'Plazo máximo en meses',
            'requiere_garantia': 'Si este tipo de préstamo requiere algún tipo de garantía',
            'requiere_aprobacion': 'Si requiere aprobación de un supervisor',
            'permite_prepago': 'Si permite pagos anticipados sin penalización',
            'configuracion_avanzada': 'Configuraciones adicionales en formato JSON',
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Validación del código en tiempo real
        self.fields['codigo'].widget.attrs.update({
            'onkeyup': 'this.value = this.value.toUpperCase().replace(/[^A-Z0-9_]/g, "")',
        })
    
    def clean_codigo(self):
        """Validar formato del código"""
        codigo = self.cleaned_data.get('codigo', '').upper()
        
        if not codigo:
            raise ValidationError(_("El código es requerido"))
        
        # Verificar que no exista otro tipo con el mismo código en la organización
        if self.organizacion:
            queryset = TipoPrestamo.objects.filter(
                organizacion=self.organizacion,
                codigo=codigo
            )
            if self.instance and self.instance.pk:
                queryset = queryset.exclude(pk=self.instance.pk)
            
            if queryset.exists():
                raise ValidationError(_("Ya existe un tipo de préstamo con este código"))
        
        return codigo
    
    def clean(self):
        """Validaciones cruzadas"""
        cleaned_data = super().clean()
        
        # Validar montos
        monto_min = cleaned_data.get('monto_minimo')
        monto_max = cleaned_data.get('monto_maximo')
        
        if monto_min and monto_max:
            if monto_min >= monto_max:
                raise ValidationError({
                    'monto_maximo': _("El monto máximo debe ser mayor al mínimo")
                })
        
        # Validar plazos
        plazo_min = cleaned_data.get('plazo_minimo_meses')
        plazo_max = cleaned_data.get('plazo_maximo_meses')
        
        if plazo_min and plazo_max:
            if plazo_min >= plazo_max:
                raise ValidationError({
                    'plazo_maximo_meses': _("El plazo máximo debe ser mayor al mínimo")
                })
        
        # Validar tasas de interés
        tasa_min = cleaned_data.get('tasa_interes_minima')
        tasa_max = cleaned_data.get('tasa_interes_maxima')
        tasa_def = cleaned_data.get('tasa_interes_defecto')
        
        if tasa_min is not None and tasa_max is not None:
            if tasa_min > tasa_max:
                raise ValidationError({
                    'tasa_interes_maxima': _("La tasa máxima debe ser mayor o igual a la mínima")
                })
        
        if tasa_def is not None and tasa_min is not None and tasa_max is not None:
            if not (tasa_min <= tasa_def <= tasa_max):
                raise ValidationError({
                    'tasa_interes_defecto': _("La tasa por defecto debe estar entre la mínima y máxima")
                })
        
        return cleaned_data


class PrestamoForm(BasePrestamoForm, forms.ModelForm):
    """Formulario para crear y editar préstamos"""
    
    class Meta:
        model = Prestamo
        fields = [
            'empleado', 'tipo_prestamo', 'monto_solicitado', 'tasa_interes',
            'plazo_meses', 'fecha_solicitud', 'fecha_primer_pago',
            'tipo_garantia', 'garantia_descripcion', 'observaciones'
        ]
        
        widgets = {
            'monto_solicitado': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0.01',
                'placeholder': '0.00'
            }),
            'tasa_interes': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0',
                'max': '100',
                'placeholder': '0.00'
            }),
            'plazo_meses': forms.NumberInput(attrs={
                'min': '1',
                'max': '120',
                'placeholder': 'Meses'
            }),
            'garantia_descripcion': forms.Textarea(attrs={
                'placeholder': 'Descripción detallada de la garantía ofrecida...',
                'rows': 3
            }),
            'observaciones': forms.Textarea(attrs={
                'placeholder': 'Observaciones adicionales sobre el préstamo...',
                'rows': 3
            }),
        }
        
        labels = {
            'empleado': 'Empleado Solicitante',
            'tipo_prestamo': 'Tipo de Préstamo',
            'monto_solicitado': 'Monto Solicitado ($)',
            'tasa_interes': 'Tasa de Interés Anual (%)',
            'plazo_meses': 'Plazo (meses)',
            'fecha_solicitud': 'Fecha de Solicitud',
            'fecha_primer_pago': 'Fecha Programada Primer Pago',
            'tipo_garantia': 'Tipo de Garantía',
            'garantia_descripcion': 'Descripción de la Garantía',
            'observaciones': 'Observaciones',
        }
        
        help_texts = {
            'monto_solicitado': 'Monto total solicitado por el empleado',
            'tasa_interes': 'Tasa de interés anual que se aplicará',
            'plazo_meses': 'Número de meses para el pago del préstamo',
            'fecha_primer_pago': 'Fecha en que se realizará el primer pago',
            'garantia_descripcion': 'Descripción detallada de la garantía ofrecida',
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Filtrar empleados por organización
        if self.organizacion:
            try:
                from payroll.models import Empleado
                self.fields['empleado'].queryset = Empleado.objects.filter(
                    organizacion=self.organizacion,
                    activo=True
                ).order_by('nombres', 'apellidos')
            except ImportError:
                pass
            
            # Filtrar tipos de préstamo por organización
            self.fields['tipo_prestamo'].queryset = TipoPrestamo.objects.filter(
                organizacion=self.organizacion,
                activo=True
            ).order_by('orden', 'nombre')
        
        # Si es edición, deshabilitar ciertos campos según el estado
        if self.instance and self.instance.pk:
            if self.instance.estado in ['aprobado', 'desembolsado', 'activo', 'completado']:
                # Campos que no se pueden modificar después de aprobar
                readonly_fields = ['empleado', 'tipo_prestamo', 'monto_solicitado', 'plazo_meses']
                for field_name in readonly_fields:
                    if field_name in self.fields:
                        self.fields[field_name].widget.attrs['readonly'] = True
                        self.fields[field_name].disabled = True
        
        # Configurar el tipo de préstamo para cargar valores por defecto
        self.fields['tipo_prestamo'].widget.attrs.update({
            'onchange': 'cargarDatosTipoPrestamo(this.value)'
        })
        
        # Agregar calculadora de cuota
        self.fields['monto_solicitado'].widget.attrs.update({
            'onchange': 'calcularCuota()'
        })
        self.fields['tasa_interes'].widget.attrs.update({
            'onchange': 'calcularCuota()'
        })
        self.fields['plazo_meses'].widget.attrs.update({
            'onchange': 'calcularCuota()'
        })
    
    def clean_empleado(self):
        """Validar que el empleado no tenga préstamos activos"""
        empleado = self.cleaned_data.get('empleado')
        
        if empleado and not self.instance.pk:  # Solo para nuevos préstamos
            prestamos_activos = Prestamo.objects.filter(
                empleado=empleado,
                estado__in=['aprobado', 'desembolsado', 'activo']
            )
            if prestamos_activos.exists():
                raise ValidationError(
                    _("Este empleado ya tiene un préstamo activo: {}").format(
                        prestamos_activos.first().numero_prestamo
                    )
                )
        
        return empleado
    
    def clean_monto_solicitado(self):
        """Validar monto según tipo de préstamo"""
        monto = self.cleaned_data.get('monto_solicitado')
        tipo_prestamo = self.cleaned_data.get('tipo_prestamo')
        
        if monto and tipo_prestamo:
            if monto < tipo_prestamo.monto_minimo:
                raise ValidationError(
                    _("El monto debe ser al menos ${:,.2f}").format(tipo_prestamo.monto_minimo)
                )
            if monto > tipo_prestamo.monto_maximo:
                raise ValidationError(
                    _("El monto no puede exceder ${:,.2f}").format(tipo_prestamo.monto_maximo)
                )
        
        return monto
    
    def clean_plazo_meses(self):
        """Validar plazo según tipo de préstamo"""
        plazo = self.cleaned_data.get('plazo_meses')
        tipo_prestamo = self.cleaned_data.get('tipo_prestamo')
        
        if plazo and tipo_prestamo:
            if plazo < tipo_prestamo.plazo_minimo_meses:
                raise ValidationError(
                    _("El plazo debe ser al menos {} meses").format(tipo_prestamo.plazo_minimo_meses)
                )
            if plazo > tipo_prestamo.plazo_maximo_meses:
                raise ValidationError(
                    _("El plazo no puede exceder {} meses").format(tipo_prestamo.plazo_maximo_meses)
                )
        
        return plazo
    
    def clean_tasa_interes(self):
        """Validar tasa según tipo de préstamo"""
        tasa = self.cleaned_data.get('tasa_interes')
        tipo_prestamo = self.cleaned_data.get('tipo_prestamo')
        
        if tasa is not None and tipo_prestamo:
            if not (tipo_prestamo.tasa_interes_minima <= tasa <= tipo_prestamo.tasa_interes_maxima):
                raise ValidationError(
                    _("La tasa debe estar entre {}% y {}%").format(
                        tipo_prestamo.tasa_interes_minima,
                        tipo_prestamo.tasa_interes_maxima
                    )
                )
        
        return tasa
    
    def clean(self):
        """Validaciones adicionales"""
        cleaned_data = super().clean()
        
        # Validar que el tipo requiera garantía si se especifica
        tipo_prestamo = cleaned_data.get('tipo_prestamo')
        tipo_garantia = cleaned_data.get('tipo_garantia')
        garantia_descripcion = cleaned_data.get('garantia_descripcion')
        
        if tipo_prestamo and tipo_prestamo.requiere_garantia:
            if tipo_garantia == 'ninguna':
                raise ValidationError({
                    'tipo_garantia': _("Este tipo de préstamo requiere garantía")
                })
            if not garantia_descripcion:
                raise ValidationError({
                    'garantia_descripcion': _("Debe describir la garantía ofrecida")
                })
        
        return cleaned_data


class PrestamoAprobacionForm(forms.ModelForm):
    """Formulario para aprobar/rechazar préstamos"""
    
    accion = forms.ChoiceField(
        choices=[
            ('aprobar', 'Aprobar'),
            ('rechazar', 'Rechazar')
        ],
        widget=forms.RadioSelect,
        label='Acción'
    )
    
    monto_aprobado = forms.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        widget=forms.NumberInput(attrs={
            'step': '0.01',
            'min': '0.01',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        }),
        label='Monto Aprobado ($)',
        help_text='Puede ser diferente al monto solicitado'
    )
    
    motivo_rechazo = forms.CharField(
        widget=forms.Textarea(attrs={
            'rows': 3,
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'placeholder': 'Especifique el motivo del rechazo...'
        }),
        required=False,
        label='Motivo del Rechazo'
    )
    
    observaciones_aprobacion = forms.CharField(
        widget=forms.Textarea(attrs={
            'rows': 3,
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'placeholder': 'Observaciones sobre la aprobación...'
        }),
        required=False,
        label='Observaciones'
    )
    
    class Meta:
        model = Prestamo
        fields = []
    
    def clean(self):
        """Validaciones para aprobación/rechazo"""
        cleaned_data = super().clean()
        accion = cleaned_data.get('accion')
        monto_aprobado = cleaned_data.get('monto_aprobado')
        motivo_rechazo = cleaned_data.get('motivo_rechazo')
        
        if accion == 'aprobar':
            if not monto_aprobado:
                cleaned_data['monto_aprobado'] = self.instance.monto_solicitado
            elif monto_aprobado > self.instance.monto_solicitado * Decimal('1.2'):
                raise ValidationError({
                    'monto_aprobado': _("El monto aprobado no puede exceder el 120% del solicitado")
                })
        
        elif accion == 'rechazar':
            if not motivo_rechazo or len(motivo_rechazo.strip()) < 10:
                raise ValidationError({
                    'motivo_rechazo': _("Debe especificar un motivo detallado para el rechazo")
                })
        
        return cleaned_data


class PagoPrestamoForm(BasePrestamoForm, forms.ModelForm):
    """Formulario para registrar pagos de préstamos"""
    
    class Meta:
        model = PagoPrestamo
        fields = [
            'prestamo', 'fecha_pago', 'tipo_pago', 'metodo_pago',
            'monto_pago', 'monto_capital', 'monto_interes', 'monto_mora',
            'comprobante', 'observaciones'
        ]
        
        widgets = {
            'monto_pago': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0.01',
                'placeholder': '0.00'
            }),
            'monto_capital': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0',
                'placeholder': '0.00'
            }),
            'monto_interes': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0',
                'placeholder': '0.00'
            }),
            'monto_mora': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0',
                'placeholder': '0.00'
            }),
            'comprobante': forms.TextInput(attrs={
                'placeholder': 'Número de comprobante, recibo, etc.'
            }),
            'observaciones': forms.Textarea(attrs={
                'placeholder': 'Observaciones sobre el pago...',
                'rows': 3
            }),
        }
        
        labels = {
            'prestamo': 'Préstamo',
            'fecha_pago': 'Fecha del Pago',
            'tipo_pago': 'Tipo de Pago',
            'metodo_pago': 'Método de Pago',
            'monto_pago': 'Monto del Pago ($)',
            'monto_capital': 'Aplicado a Capital ($)',
            'monto_interes': 'Aplicado a Intereses ($)',
            'monto_mora': 'Aplicado a Mora ($)',
            'comprobante': 'Número de Comprobante',
            'observaciones': 'Observaciones',
        }
    
    def __init__(self, *args, **kwargs):
        prestamo = kwargs.pop('prestamo', None)
        super().__init__(*args, **kwargs)
        
        # Filtrar préstamos que pueden recibir pagos
        if self.organizacion:
            self.fields['prestamo'].queryset = Prestamo.objects.filter(
                organizacion=self.organizacion,
                estado__in=['desembolsado', 'activo', 'en_mora']
            ).order_by('-numero_prestamo')
        
        # Si se especifica un préstamo, usarlo por defecto
        if prestamo:
            self.fields['prestamo'].initial = prestamo
            self.fields['prestamo'].widget.attrs['readonly'] = True
            
            # Llenar montos sugeridos
            if prestamo.cuota_mensual:
                self.fields['monto_pago'].initial = prestamo.cuota_mensual
        
        # Configurar fecha por defecto
        self.fields['fecha_pago'].initial = datetime.date.today()
        
        # Agregar funcionalidad JavaScript para cálculos
        self.fields['monto_pago'].widget.attrs.update({
            'onchange': 'distribuirMontoPago()'
        })
    
    def clean_prestamo(self):
        """Validar que el préstamo pueda recibir pagos"""
        prestamo = self.cleaned_data.get('prestamo')
        
        if prestamo and not prestamo.puede_recibir_pagos():
            raise ValidationError(
                _("Este préstamo no puede recibir pagos en su estado actual: {}").format(
                    prestamo.get_estado_display()
                )
            )
        
        return prestamo
    
    def clean_monto_pago(self):
        """Validar que el monto no exceda el saldo pendiente"""
        monto_pago = self.cleaned_data.get('monto_pago')
        prestamo = self.cleaned_data.get('prestamo')
        
        if monto_pago and prestamo:
            if monto_pago > prestamo.saldo_pendiente:
                raise ValidationError(
                    _("El monto del pago (${:,.2f}) no puede exceder el saldo pendiente (${:,.2f})").format(
                        monto_pago, prestamo.saldo_pendiente
                    )
                )
        
        return monto_pago
    
    def clean(self):
        """Validaciones adicionales"""
        cleaned_data = super().clean()
        
        monto_pago = cleaned_data.get('monto_pago', Decimal('0.00'))
        monto_capital = cleaned_data.get('monto_capital', Decimal('0.00'))
        monto_interes = cleaned_data.get('monto_interes', Decimal('0.00'))
        monto_mora = cleaned_data.get('monto_mora', Decimal('0.00'))
        
        # Verificar que la suma de componentes no exceda el monto total
        suma_componentes = monto_capital + monto_interes + monto_mora
        if suma_componentes > monto_pago:
            raise ValidationError(
                _("La suma de capital (${:,.2f}) + intereses (${:,.2f}) + mora (${:,.2f}) = ${:,.2f} "
                  "excede el monto del pago (${:,.2f})").format(
                    monto_capital, monto_interes, monto_mora, suma_componentes, monto_pago
                )
            )
        
        return cleaned_data


class PrestamoFiltroForm(forms.Form):
    """Formulario para filtros en la lista de préstamos"""
    
    busqueda = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'placeholder': 'Buscar por número, empleado...',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        }),
        label='Búsqueda'
    )
    
    estado = forms.ChoiceField(
        choices=[('', 'Todos los estados')] + Prestamo.ESTADO_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        }),
        label='Estado'
    )
    
    tipo_prestamo = forms.ModelChoiceField(
        queryset=TipoPrestamo.objects.none(),
        required=False,
        empty_label='Todos los tipos',
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        }),
        label='Tipo de Préstamo'
    )
    
    fecha_desde = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        }),
        label='Fecha Desde'
    )
    
    fecha_hasta = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        }),
        label='Fecha Hasta'
    )
    
    def __init__(self, *args, **kwargs):
        organization = kwargs.pop('organization', None)
        super().__init__(*args, **kwargs)
        
        if organization:
            self.fields['tipo_prestamo'].queryset = TipoPrestamo.objects.filter(
                organizacion=organization
            ).order_by('nombre')


class CalculadoraPrestamoForm(forms.Form):
    """Formulario para calculadora de préstamos"""
    
    monto = forms.DecimalField(
        max_digits=12,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            'step': '0.01',
            'min': '0.01',
            'placeholder': '0.00',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        }),
        label='Monto del Préstamo ($)'
    )
    
    tasa_interes = forms.DecimalField(
        max_digits=5,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            'step': '0.01',
            'min': '0',
            'max': '100',
            'placeholder': '0.00',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        }),
        label='Tasa de Interés Anual (%)'
    )
    
    plazo_meses = forms.IntegerField(
        widget=forms.NumberInput(attrs={
            'min': '1',
            'max': '120',
            'placeholder': 'Meses',
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        }),
        label='Plazo (meses)'
    )
    
    def calcular_cuota(self):
        """Calcula la información del préstamo"""
        if not self.is_valid():
            return None
        
        monto = self.cleaned_data['monto']
        tasa = self.cleaned_data['tasa_interes']
        plazo = self.cleaned_data['plazo_meses']
        
        if tasa == 0:
            cuota_mensual = monto / plazo
        else:
            tasa_mensual = tasa / 100 / 12
            factor = (1 + tasa_mensual) ** plazo
            cuota_mensual = monto * (tasa_mensual * factor) / (factor - 1)
        
        total_con_intereses = cuota_mensual * plazo
        total_intereses = total_con_intereses - monto
        
        return {
            'monto_prestamo': monto,
            'tasa_interes_anual': tasa,
            'plazo_meses': plazo,
            'cuota_mensual': round(cuota_mensual, 2),
            'total_con_intereses': round(total_con_intereses, 2),
            'total_intereses': round(total_intereses, 2)
        }
