from django import forms
from django.contrib.auth.models import User
from .models import Perfil, ConfiguracionNotificaciones


class PerfilForm(forms.ModelForm):
    """Formulario para crear/editar perfiles"""
    
    class Meta:
        model = Perfil
        fields = [
            'foto', 'fecha_nacimiento', 'genero', 'estado_civil', 'nacionalidad',
            'telefono', 'telefono_emergencia', 'contacto_emergencia',
            'direccion_residencia', 'ciudad_residencia', 'departamento_residencia',
            'codigo_postal', 'tipo_sangre', 'alergias', 'medicamentos',
            'condiciones_medicas', 'nivel_educacion', 'profesion', 'habilidades',
            'experiencia_laboral', 'certificaciones', 'banco', 'numero_cuenta',
            'tipo_cuenta', 'numero_cedula', 'lugar_expedicion_cedula',
            'tema_preferido', 'idioma_preferido', 'zona_horaria', 'privacidad_publica'
        ]
        widgets = {
            'fecha_nacimiento': forms.DateInput(
                attrs={'type': 'date', 'class': 'form-control'}
            ),
            'genero': forms.Select(
                attrs={'class': 'form-control'}
            ),
            'estado_civil': forms.Select(
                attrs={'class': 'form-control'}
            ),
            'nacionalidad': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Ej: Colombiana'}
            ),
            'telefono': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': '+57 300 123 4567'}
            ),
            'telefono_emergencia': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': '+57 300 123 4567'}
            ),
            'contacto_emergencia': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Nombre del contacto'}
            ),
            'direccion_residencia': forms.Textarea(
                attrs={'class': 'form-control', 'rows': 3}
            ),
            'ciudad_residencia': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Ej: Bogotá'}
            ),
            'departamento_residencia': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Ej: Cundinamarca'}
            ),
            'codigo_postal': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': '110111'}
            ),
            'tipo_sangre': forms.Select(
                attrs={'class': 'form-control'}
            ),
            'alergias': forms.Textarea(
                attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Describa alergias conocidas'}
            ),
            'medicamentos': forms.Textarea(
                attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Medicamentos que toma regularmente'}
            ),
            'condiciones_medicas': forms.Textarea(
                attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Condiciones médicas relevantes'}
            ),
            'nivel_educacion': forms.Select(
                attrs={'class': 'form-control'}
            ),
            'profesion': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Ej: Ingeniero Civil'}
            ),
            'habilidades': forms.Textarea(
                attrs={'class': 'form-control', 'rows': 4, 'placeholder': 'Describa sus habilidades principales'}
            ),
            'experiencia_laboral': forms.Textarea(
                attrs={'class': 'form-control', 'rows': 4, 'placeholder': 'Resumen de experiencia laboral'}
            ),
            'certificaciones': forms.Textarea(
                attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Certificaciones obtenidas'}
            ),
            'banco': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Ej: Bancolombia'}
            ),
            'numero_cuenta': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': '1234567890'}
            ),
            'tipo_cuenta': forms.Select(
                attrs={'class': 'form-control'}
            ),
            'numero_cedula': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': '12345678'}
            ),
            'lugar_expedicion_cedula': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Ej: Bogotá'}
            ),
            'tema_preferido': forms.Select(
                attrs={'class': 'form-control'}
            ),
            'idioma_preferido': forms.Select(
                attrs={'class': 'form-control'}
            ),
            'zona_horaria': forms.TextInput(
                attrs={'class': 'form-control'}
            ),
            'privacidad_publica': forms.CheckboxInput(
                attrs={'class': 'form-check-input'}
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Agregar clases CSS a todos los campos
        for field_name, field in self.fields.items():
            if field_name not in ['privacidad_publica']:
                if 'class' not in field.widget.attrs:
                    field.widget.attrs['class'] = 'form-control'
        
        # Campos requeridos para completitud del perfil
        campos_importantes = [
            'telefono', 'direccion_residencia', 'ciudad_residencia', 
            'fecha_nacimiento', 'numero_cedula'
        ]
        
        for campo in campos_importantes:
            if campo in self.fields:
                self.fields[campo].required = True

    def clean_numero_cedula(self):
        """Validar número de cédula único"""
        numero_cedula = self.cleaned_data.get('numero_cedula')
        if numero_cedula:
            # Verificar que no exista otro perfil con la misma cédula
            qs = Perfil.objects.filter(numero_cedula=numero_cedula)
            if self.instance.pk:
                qs = qs.exclude(pk=self.instance.pk)
            
            if qs.exists():
                raise forms.ValidationError("Ya existe un perfil con este número de cédula.")
        
        return numero_cedula

    def clean_telefono(self):
        """Validar formato de teléfono"""
        telefono = self.cleaned_data.get('telefono')
        if telefono:
            import re
            if not re.match(r'^\+?[\d\s\-\(\)]+$', telefono):
                raise forms.ValidationError("Formato de teléfono inválido.")
        return telefono

    def save(self, commit=True):
        """Guardar perfil y verificar completitud"""
        perfil = super().save(commit=False)
        
        if commit:
            perfil.save()
            # La verificación de completitud se hace automáticamente en el modelo
            
        return perfil


class ConfiguracionNotificacionesForm(forms.ModelForm):
    """Formulario para configuración de notificaciones"""
    
    class Meta:
        model = ConfiguracionNotificaciones
        fields = [
            'notif_prestamos', 'notif_nomina', 'notif_documentos', 'notif_sistema',
            'via_email', 'via_sms', 'via_plataforma', 'horario_inicio', 'horario_fin'
        ]
        widgets = {
            'horario_inicio': forms.TimeInput(
                attrs={'type': 'time', 'class': 'form-control'}
            ),
            'horario_fin': forms.TimeInput(
                attrs={'type': 'time', 'class': 'form-control'}
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Configurar widgets para checkboxes
        checkbox_fields = [
            'notif_prestamos', 'notif_nomina', 'notif_documentos', 'notif_sistema',
            'via_email', 'via_sms', 'via_plataforma'
        ]
        
        for field_name in checkbox_fields:
            if field_name in self.fields:
                self.fields[field_name].widget.attrs.update({
                    'class': 'form-check-input'
                })


class PerfilBasicoForm(forms.ModelForm):
    """Formulario simplificado para información básica del perfil"""
    
    class Meta:
        model = Perfil
        fields = [
            'foto', 'telefono', 'fecha_nacimiento', 'genero', 'profesion',
            'direccion_residencia', 'ciudad_residencia'
        ]
        widgets = {
            'fecha_nacimiento': forms.DateInput(
                attrs={'type': 'date', 'class': 'form-control'}
            ),
            'genero': forms.Select(
                attrs={'class': 'form-control'}
            ),
            'telefono': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': '+57 300 123 4567'}
            ),
            'profesion': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Su profesión'}
            ),
            'direccion_residencia': forms.Textarea(
                attrs={'class': 'form-control', 'rows': 2}
            ),
            'ciudad_residencia': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Su ciudad'}
            ),
        }


class UsuarioPerfilForm(forms.ModelForm):
    """Formulario combinado para Usuario y Perfil"""
    
    # Campos del usuario
    first_name = forms.CharField(
        max_length=30,
        required=True,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nombres'})
    )
    last_name = forms.CharField(
        max_length=30,
        required=True,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Apellidos'})
    )
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'email@ejemplo.com'})
    )
    
    class Meta:
        model = Perfil
        fields = [
            'foto', 'telefono', 'fecha_nacimiento', 'genero', 'profesion',
            'direccion_residencia', 'ciudad_residencia', 'numero_cedula'
        ]
        widgets = {
            'fecha_nacimiento': forms.DateInput(
                attrs={'type': 'date', 'class': 'form-control'}
            ),
            'genero': forms.Select(
                attrs={'class': 'form-control'}
            ),
            'telefono': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': '+57 300 123 4567'}
            ),
            'profesion': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Su profesión'}
            ),
            'direccion_residencia': forms.Textarea(
                attrs={'class': 'form-control', 'rows': 2}
            ),
            'ciudad_residencia': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': 'Su ciudad'}
            ),
            'numero_cedula': forms.TextInput(
                attrs={'class': 'form-control', 'placeholder': '12345678'}
            ),
        }

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        if self.user:
            self.fields['first_name'].initial = self.user.first_name
            self.fields['last_name'].initial = self.user.last_name
            self.fields['email'].initial = self.user.email

    def save(self, commit=True):
        """Guardar tanto el usuario como el perfil"""
        perfil = super().save(commit=False)
        
        if self.user:
            # Actualizar datos del usuario
            self.user.first_name = self.cleaned_data['first_name']
            self.user.last_name = self.cleaned_data['last_name']
            self.user.email = self.cleaned_data['email']
            
            if commit:
                self.user.save()
                perfil.save()
        
        return perfil
