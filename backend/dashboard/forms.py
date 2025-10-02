"""
Formularios del Dashboard
=========================

Formularios para contratistas, proyectos y pagos.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

from django import forms
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from .models import Contractor, Project, Payment


class ContractorForm(forms.ModelForm):
    """Formulario para crear y editar contratistas"""
    
    class Meta:
        model = Contractor
        fields = [
            'first_name', 'last_name', 'email', 
            'phone_number', 'company'
        ]
        widgets = {
            'first_name': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Nombre del contratista',
                'required': True
            }),
            'last_name': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Apellido del contratista',
                'required': True
            }),
            'email': forms.EmailInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'correo@ejemplo.com',
                'required': True
            }),
            'phone_number': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': '+57 300 123 4567'
            }),
            'company': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Nombre de la empresa'
            })
        }
        help_texts = {
            'email': _('Email único del contratista'),
            'phone_number': _('Número de teléfono de contacto'),
            'company': _('Empresa a la que pertenece (opcional)'),
        }

    def clean_email(self):
        """Valida que el email sea único"""
        email = self.cleaned_data.get('email')
        if email:
            # Si estamos editando, excluir el contratista actual
            if self.instance.pk:
                if Contractor.objects.filter(email=email).exclude(pk=self.instance.pk).exists():
                    raise ValidationError(_('Ya existe un contratista con este email.'))
            else:
                # Si estamos creando, verificar que no exista
                if Contractor.objects.filter(email=email).exists():
                    raise ValidationError(_('Ya existe un contratista con este email.'))
        return email

    def clean_phone_number(self):
        """Valida el formato del número de teléfono"""
        phone = self.cleaned_data.get('phone_number')
        if phone:
            # Limpiar el número (quitar espacios y caracteres especiales)
            cleaned_phone = ''.join(filter(str.isdigit, phone.replace('+', '')))
            if len(cleaned_phone) < 7:
                raise ValidationError(_('El número de teléfono debe tener al menos 7 dígitos.'))
        return phone


class ProjectForm(forms.ModelForm):
    """Formulario para crear y editar proyectos"""
    
    class Meta:
        model = Project
        fields = [
            'name', 'description', 'contractor', 
            'start_date', 'end_date'
        ]
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Nombre del proyecto',
                'required': True
            }),
            'description': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Descripción detallada del proyecto',
                'rows': 4
            }),
            'contractor': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'required': True
            }),
            'start_date': forms.DateInput(attrs={
                'type': 'date',
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'required': True
            }),
            'end_date': forms.DateInput(attrs={
                'type': 'date',
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            })
        }
        help_texts = {
            'name': _('Nombre descriptivo del proyecto'),
            'contractor': _('Contratista asignado al proyecto'),
            'start_date': _('Fecha de inicio del proyecto'),
            'end_date': _('Fecha de finalización (opcional, dejar vacío si está en curso)'),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Ordenar contratistas por apellido
        self.fields['contractor'].queryset = Contractor.objects.all().order_by('last_name', 'first_name')
        
        # Mejorar la visualización de contratistas en el select
        self.fields['contractor'].empty_label = "Seleccionar contratista..."

    def clean(self):
        """Validación personalizada del formulario"""
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')

        if start_date and end_date:
            if end_date <= start_date:
                raise ValidationError({
                    'end_date': _('La fecha de finalización debe ser posterior a la fecha de inicio.')
                })

        return cleaned_data


class PaymentForm(forms.ModelForm):
    """Formulario para crear y editar pagos"""
    
    class Meta:
        model = Payment
        fields = [
            'project', 'amount', 'payment_date', 'notes'
        ]
        widgets = {
            'project': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'required': True
            }),
            'amount': forms.NumberInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': '0.00',
                'step': '0.01',
                'min': '0.01',
                'required': True
            }),
            'payment_date': forms.DateInput(attrs={
                'type': 'date',
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'required': True
            }),
            'notes': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                'placeholder': 'Notas adicionales sobre el pago',
                'rows': 3
            })
        }
        help_texts = {
            'project': _('Proyecto al que pertenece el pago'),
            'amount': _('Monto del pago en pesos colombianos'),
            'payment_date': _('Fecha en que se realizó el pago'),
            'notes': _('Información adicional sobre el pago (opcional)'),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Ordenar proyectos por nombre
        self.fields['project'].queryset = Project.objects.select_related('contractor').all().order_by('name')
        
        # Mejorar la visualización de proyectos en el select
        self.fields['project'].empty_label = "Seleccionar proyecto..."
        
        # Configurar el valor por defecto de la fecha como hoy
        if not self.instance.pk:  # Solo para nuevos pagos
            from django.utils import timezone
            self.fields['payment_date'].initial = timezone.now().date()

    def clean_amount(self):
        """Valida que el monto sea positivo"""
        amount = self.cleaned_data.get('amount')
        if amount is not None:
            if amount <= 0:
                raise ValidationError(_('El monto debe ser mayor que cero.'))
        return amount


class BusquedaDashboardForm(forms.Form):
    """Formulario para búsqueda en el dashboard"""
    
    q = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
            'placeholder': 'Buscar contratistas, proyectos o pagos...',
            'autocomplete': 'off'
        }),
        label=_('Búsqueda'),
        required=True
    )
    
    tipo = forms.ChoiceField(
        choices=[
            ('all', 'Todo'),
            ('contractors', 'Contratistas'),
            ('projects', 'Proyectos'),
            ('payments', 'Pagos'),
        ],
        widget=forms.Select(attrs={
            'class': 'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        }),
        label=_('Tipo'),
        required=False,
        initial='all'
    )


class FiltroFechasForm(forms.Form):
    """Formulario para filtrar por fechas en reportes"""
    
    fecha_inicio = forms.DateField(
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        }),
        label=_('Fecha inicio'),
        required=False
    )
    
    fecha_fin = forms.DateField(
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        }),
        label=_('Fecha fin'),
        required=False
    )
    
    def clean(self):
        """Valida que la fecha de fin sea posterior a la de inicio"""
        cleaned_data = super().clean()
        fecha_inicio = cleaned_data.get('fecha_inicio')
        fecha_fin = cleaned_data.get('fecha_fin')
        
        if fecha_inicio and fecha_fin:
            if fecha_fin < fecha_inicio:
                raise ValidationError(_('La fecha de fin debe ser posterior a la fecha de inicio.'))
        
        return cleaned_data
