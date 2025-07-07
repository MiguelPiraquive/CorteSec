from django import forms
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

import json

from .models import (
    ConfiguracionGeneral,
    ParametroSistema,
    ConfiguracionModulo
)

User = get_user_model()


class ConfiguracionGeneralForm(forms.ModelForm):
    """Formulario para configuración general del sistema"""
    
    class Meta:
        model = ConfiguracionGeneral
        fields = [
            'nombre_empresa', 'nit', 'direccion', 'telefono', 'email', 'sitio_web', 'logo',
            'moneda', 'simbolo_moneda', 'zona_horaria', 'formato_fecha',
            'dia_pago_nomina', 'periodo_nomina',
            'cuenta_efectivo_defecto', 'cuenta_nomina_defecto',
            'sesion_timeout_minutos', 'max_intentos_login', 'requiere_cambio_password', 'dias_cambio_password',
            'servidor_email', 'puerto_email', 'email_usuario', 'usar_tls'
        ]
        widgets = {
            'nombre_empresa': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Nombre de la empresa'
            }),
            'nit': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'NIT de la empresa'
            }),
            'direccion': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Dirección principal de la empresa'
            }),
            'telefono': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Teléfono principal'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'form-control',
                'placeholder': 'email@empresa.com'
            }),
            'sitio_web': forms.URLInput(attrs={
                'class': 'form-control',
                'placeholder': 'https://www.empresa.com'
            }),
            'logo': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/*'
            }),
            'moneda': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'COP'
            }),
            'simbolo_moneda': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '$'
            }),
            'zona_horaria': forms.Select(attrs={'class': 'form-control'}),
            'formato_fecha': forms.Select(attrs={'class': 'form-control'}),
            'dia_pago_nomina': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 1,
                'max': 31
            }),
            'periodo_nomina': forms.Select(attrs={'class': 'form-control'}),
            'cuenta_efectivo_defecto': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Código de cuenta'
            }),
            'cuenta_nomina_defecto': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Código de cuenta'
            }),
            'sesion_timeout_minutos': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 5,
                'max': 480
            }),
            'max_intentos_login': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 1,
                'max': 10
            }),
            'requiere_cambio_password': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'dias_cambio_password': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 30,
                'max': 365
            }),
            'servidor_email': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'smtp.gmail.com'
            }),
            'puerto_email': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 1,
                'max': 65535
            }),
            'email_usuario': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'usuario@gmail.com'
            }),
            'usar_tls': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Configurar opciones de zona horaria
        zonas_horarias = [
            ('America/Bogota', 'Colombia (GMT-5)'),
            ('America/New_York', 'Estados Unidos Este (GMT-5)'),
            ('America/Los_Angeles', 'Estados Unidos Oeste (GMT-8)'),
            ('Europe/Madrid', 'España (GMT+1)'),
            ('America/Mexico_City', 'México (GMT-6)'),
            ('America/Argentina/Buenos_Aires', 'Argentina (GMT-3)'),
            ('America/Lima', 'Perú (GMT-5)'),
            ('America/Santiago', 'Chile (GMT-3)'),
        ]
        self.fields['zona_horaria'].widget = forms.Select(
            choices=zonas_horarias,
            attrs={'class': 'form-control'}
        )

    def clean_nit(self):
        """Validar formato del NIT"""
        nit = self.cleaned_data.get('nit')
        if nit:
            # Remover caracteres no numéricos excepto guión
            nit_clean = ''.join(c for c in nit if c.isdigit() or c == '-')
            if len(nit_clean) < 8:
                raise ValidationError(_('El NIT debe tener al menos 8 caracteres'))
        return nit

    def clean_email(self):
        """Validar email"""
        email = self.cleaned_data.get('email')
        if email:
            # Validación básica ya incluida por EmailField
            if not email.count('@') == 1:
                raise ValidationError(_('Email inválido'))
        return email

    def clean_dia_pago_nomina(self):
        """Validar día de pago de nómina"""
        dia = self.cleaned_data.get('dia_pago_nomina')
        if dia and (dia < 1 or dia > 31):
            raise ValidationError(_('El día debe estar entre 1 y 31'))
        return dia


class ParametroSistemaForm(forms.ModelForm):
    """Formulario para parámetros del sistema"""
    
    class Meta:
        model = ParametroSistema
        fields = [
            'codigo', 'nombre', 'descripcion', 'tipo_valor', 'valor', 
            'valor_defecto', 'es_sistema', 'activo'
        ]
        widgets = {
            'codigo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'CODIGO_PARAMETRO',
                'style': 'text-transform: uppercase;'
            }),
            'nombre': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Nombre descriptivo del parámetro'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Descripción detallada del parámetro'
            }),
            'tipo_valor': forms.Select(attrs={'class': 'form-control'}),
            'valor': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 2,
                'placeholder': 'Valor del parámetro'
            }),
            'valor_defecto': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 2,
                'placeholder': 'Valor por defecto (opcional)'
            }),
            'es_sistema': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'activo': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Si es un parámetro del sistema, deshabilitar ciertos campos
        if self.instance.pk and self.instance.es_sistema:
            self.fields['codigo'].widget.attrs['readonly'] = True
            self.fields['tipo_valor'].widget.attrs['disabled'] = True
            self.fields['es_sistema'].widget.attrs['disabled'] = True

    def clean_codigo(self):
        """Validar código del parámetro"""
        codigo = self.cleaned_data.get('codigo')
        if codigo:
            codigo = codigo.upper().strip()
            # Validar formato
            if not codigo.replace('_', '').replace('-', '').isalnum():
                raise ValidationError(_('El código solo puede contener letras, números, guiones y guiones bajos'))
            
            # Verificar unicidad
            if self.instance.pk:
                if ParametroSistema.objects.exclude(pk=self.instance.pk).filter(codigo=codigo).exists():
                    raise ValidationError(_('Ya existe un parámetro con este código'))
            else:
                if ParametroSistema.objects.filter(codigo=codigo).exists():
                    raise ValidationError(_('Ya existe un parámetro con este código'))
        
        return codigo

    def clean_valor(self):
        """Validar valor según el tipo"""
        valor = self.cleaned_data.get('valor')
        tipo_valor = self.cleaned_data.get('tipo_valor')
        
        if valor and tipo_valor:
            try:
                if tipo_valor == 'integer':
                    int(valor)
                elif tipo_valor == 'decimal':
                    from decimal import Decimal
                    Decimal(valor)
                elif tipo_valor == 'boolean':
                    if valor.lower() not in ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off']:
                        raise ValidationError(_('Valor booleano inválido'))
                elif tipo_valor == 'date':
                    from datetime import datetime
                    datetime.strptime(valor, '%Y-%m-%d')
                elif tipo_valor == 'json':
                    json.loads(valor)
            except (ValueError, TypeError, json.JSONDecodeError) as e:
                raise ValidationError(_(f'Valor inválido para el tipo {tipo_valor}: {str(e)}'))
        
        return valor


class ConfiguracionModuloForm(forms.ModelForm):
    """Formulario para configuración de módulos"""
    
    # Campo adicional para configuración JSON más amigable
    configuracion_json_text = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 10,
            'placeholder': '{"clave": "valor", "otra_clave": "otro_valor"}'
        }),
        required=False,
        help_text=_('Configuración en formato JSON')
    )
    
    class Meta:
        model = ConfiguracionModulo
        fields = [
            'modulo', 'activo', 'version', 'orden_menu', 'icono', 'color'
        ]
        widgets = {
            'modulo': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'nombre_modulo'
            }),
            'activo': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'version': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '1.0.0'
            }),
            'orden_menu': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 0,
                'max': 999
            }),
            'icono': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'fas fa-cog'
            }),
            'color': forms.TextInput(attrs={
                'class': 'form-control',
                'type': 'color'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Cargar configuración JSON existente
        if self.instance.pk and self.instance.configuracion_json:
            self.fields['configuracion_json_text'].initial = json.dumps(
                self.instance.configuracion_json, 
                indent=2, 
                ensure_ascii=False
            )

    def clean_configuracion_json_text(self):
        """Validar JSON de configuración"""
        json_text = self.cleaned_data.get('configuracion_json_text')
        if json_text:
            try:
                return json.loads(json_text)
            except json.JSONDecodeError as e:
                raise ValidationError(_(f'JSON inválido: {str(e)}'))
        return {}

    def save(self, commit=True):
        """Guardar con configuración JSON procesada"""
        instance = super().save(commit=False)
        
        # Procesar configuración JSON
        json_config = self.cleaned_data.get('configuracion_json_text', {})
        if isinstance(json_config, str):
            try:
                json_config = json.loads(json_config)
            except json.JSONDecodeError:
                json_config = {}
        
        instance.configuracion_json = json_config
        
        if commit:
            instance.save()
        return instance


class BusquedaParametrosForm(forms.Form):
    """Formulario de búsqueda para parámetros"""
    
    search = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Buscar por código, nombre o descripción...'
        })
    )
    
    tipo = forms.ChoiceField(
        choices=[('', 'Todos los tipos')] + ParametroSistema.TIPO_VALOR_CHOICES,
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    activo = forms.ChoiceField(
        choices=[
            ('', 'Todos'),
            ('true', 'Activos'),
            ('false', 'Inactivos')
        ],
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )


class ConfiguracionEmailForm(forms.Form):
    """Formulario para configurar email"""
    
    servidor_email = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'smtp.gmail.com'
        })
    )
    
    puerto_email = forms.IntegerField(
        min_value=1,
        max_value=65535,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': '587'
        })
    )
    
    email_usuario = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'usuario@gmail.com'
        })
    )
    
    email_password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Contraseña del email'
        })
    )
    
    usar_tls = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input'
        })
    )
    
    email_prueba = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Email para enviar prueba'
        })
    )

    def clean_puerto_email(self):
        """Validar puerto"""
        puerto = self.cleaned_data.get('puerto_email')
        if puerto and (puerto < 1 or puerto > 65535):
            raise ValidationError(_('Puerto debe estar entre 1 y 65535'))
        return puerto
