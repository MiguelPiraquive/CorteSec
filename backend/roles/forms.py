from django import forms
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from .models import Rol, AsignacionRol, TipoRol, EstadoAsignacion, PlantillaRol, MetaRol, RolCondicional, AuditoriaRol, ConfiguracionRol

User = get_user_model()


class RolForm(forms.ModelForm):
    """Formulario avanzado para crear y editar roles"""
    
    class Meta:
        model = Rol
        fields = [
            'nombre', 'codigo', 'descripcion', 'rol_padre', 'tipo_rol', 'categoria',
            'activo', 'es_publico', 'requiere_aprobacion', 'tiene_restriccion_horario',
            'hora_inicio', 'hora_fin', 'dias_semana', 'fecha_inicio_vigencia',
            'fecha_fin_vigencia', 'prioridad', 'peso', 'color', 'icono',
            'metadatos', 'configuracion'
        ]
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': 'Ingrese el nombre del rol'
            }),
            'codigo': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': 'Código único del rol'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': 'Descripción detallada del rol',
                'rows': 3
            }),
            'rol_padre': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            }),
            'tipo_rol': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            }),
            'activo': forms.CheckboxInput(attrs={
                'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
            'hora_inicio': forms.TimeInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'time'
            }),
            'hora_fin': forms.TimeInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'time'
            }),
            'fecha_inicio_vigencia': forms.DateInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'date'
            }),
            'fecha_fin_vigencia': forms.DateInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'date'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Filtrar roles padre para evitar jerarquía circular
        if self.instance.pk:
            self.fields['rol_padre'].queryset = Rol.objects.filter(
                activo=True
            ).exclude(pk=self.instance.pk)
        else:
            self.fields['rol_padre'].queryset = Rol.objects.filter(activo=True)

    def clean_nombre(self):
        """Validar que el nombre sea único."""
        nombre = self.cleaned_data.get('nombre')
        if nombre:
            nombre = nombre.strip()
            queryset = Rol.objects.filter(nombre__iexact=nombre)
            if self.instance.pk:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise ValidationError(_("Ya existe un rol con este nombre."))
        return nombre

    def clean_codigo(self):
        """Validar que el código sea único."""
        codigo = self.cleaned_data.get('codigo')
        if codigo:
            codigo = codigo.strip().upper()
            queryset = Rol.objects.filter(codigo__iexact=codigo)
            if self.instance.pk:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise ValidationError(_("Ya existe un rol con este código."))
        return codigo


class AsignacionRolForm(forms.ModelForm):
    """Formulario para asignar roles a usuarios"""
    
    class Meta:
        model = AsignacionRol
        fields = [
            'usuario', 'rol', 'fecha_inicio', 'fecha_fin', 'justificacion',
            'observaciones'
        ]
        widgets = {
            'usuario': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            }),
            'rol': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            }),
            'fecha_inicio': forms.DateTimeInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'datetime-local'
            }),
            'fecha_fin': forms.DateTimeInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'type': 'datetime-local'
            }),
            'justificacion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'rows': 3
            }),
            'observaciones': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'rows': 3
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filtrar roles activos
        self.fields['rol'].queryset = Rol.objects.filter(activo=True)


class RolFilterForm(forms.Form):
    """Formulario para filtros en la lista de roles."""
    
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'placeholder': 'Buscar roles...'
        })
    )
    
    activo = forms.ChoiceField(
        choices=[('', 'Todos'), ('true', 'Activos'), ('false', 'Inactivos')],
        required=False,
        widget=forms.Select(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        })
    )

# ==================== FORMULARIOS PARA MODELOS AVANZADOS ====================

class MetaRolForm(forms.ModelForm):
    """Formulario para meta-roles"""
    
    class Meta:
        model = MetaRol
        fields = ['nombre', 'descripcion', 'reglas', 'roles_aplicables', 'activo']
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': 'Nombre del meta-rol'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
                'placeholder': 'Descripción del meta-rol',
                'rows': 3
            }),
            'reglas': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono',
                'placeholder': 'JSON con reglas del meta-rol',
                'rows': 5
            }),
            'roles_aplicables': forms.SelectMultiple(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            }),
            'activo': forms.CheckboxInput(attrs={
                'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
        }

    def clean_reglas(self):
        """Validar formato JSON de reglas"""
        reglas = self.cleaned_data.get('reglas')
        if reglas:
            try:
                import json
                json.loads(reglas)
            except json.JSONDecodeError:
                raise ValidationError(_("Las reglas deben ser un JSON válido"))
        return reglas


class RolCondicionalForm(forms.ModelForm):
    """Formulario para roles condicionales"""
    
    class Meta:
        model = RolCondicional
        fields = [
            'rol', 'condiciones_activacion', 'condiciones_desactivacion', 
            'evaluacion_automatica', 'frecuencia_evaluacion'
        ]
        widgets = {
            'rol': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            }),
            'condiciones_activacion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono',
                'placeholder': 'JSON array con condiciones de activación',
                'rows': 4
            }),
            'condiciones_desactivacion': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono',
                'placeholder': 'JSON array con condiciones de desactivación',
                'rows': 4
            }),
            'evaluacion_automatica': forms.CheckboxInput(attrs={
                'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
            }),
            'frecuencia_evaluacion': forms.Select(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            }),
        }

    def clean_condiciones_activacion(self):
        """Validar formato JSON de condiciones de activación"""
        condiciones = self.cleaned_data.get('condiciones_activacion')
        if condiciones:
            try:
                import json
                data = json.loads(condiciones)
                if not isinstance(data, list):
                    raise ValidationError(_("Las condiciones deben ser un array JSON"))
            except json.JSONDecodeError:
                raise ValidationError(_("Las condiciones deben ser un JSON válido"))
        return condiciones

    def clean_condiciones_desactivacion(self):
        """Validar formato JSON de condiciones de desactivación"""
        condiciones = self.cleaned_data.get('condiciones_desactivacion')
        if condiciones:
            try:
                import json
                data = json.loads(condiciones)
                if not isinstance(data, list):
                    raise ValidationError(_("Las condiciones deben ser un array JSON"))
            except json.JSONDecodeError:
                raise ValidationError(_("Las condiciones deben ser un JSON válido"))
        return condiciones


class BusquedaAsignacionForm(forms.Form):
    """Formulario para búsqueda y filtrado de asignaciones"""
    
    usuario = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'placeholder': 'Buscar por usuario...'
        })
    )
    
    rol = forms.ModelChoiceField(
        queryset=Rol.objects.filter(activo=True),
        required=False,
        empty_label="Todos los roles",
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        })
    )
    
    estado = forms.ModelChoiceField(
        queryset=EstadoAsignacion.objects.all(),
        required=False,
        empty_label="Todos los estados",
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        })
    )
    
    activa = forms.ChoiceField(
        choices=[('', 'Todas'), ('true', 'Activas'), ('false', 'Inactivas')],
        required=False,
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        })
    )
    
    fecha_desde = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'type': 'date'
        })
    )
    
    fecha_hasta = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'type': 'date'
        })
    )


class AuditoriaRolFilterForm(forms.Form):
    """Formulario para filtrar auditoría de roles"""
    
    rol = forms.ModelChoiceField(
        queryset=Rol.objects.filter(activo=True),
        required=False,
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        })
    )
    
    usuario_afectado = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'placeholder': 'Buscar por usuario afectado'
        })
    )
    
    usuario_ejecutor = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'placeholder': 'Buscar por usuario ejecutor'
        })
    )
    
    accion = forms.ChoiceField(
        choices=[('', 'Todas las acciones')] + AuditoriaRol._meta.get_field('accion').choices,
        required=False,
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        })
    )
    
    fecha_desde = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'type': 'date'
        })
    )
    
    fecha_hasta = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'type': 'date'
        })
    )


class ConfiguracionRolForm(forms.ModelForm):
    """Formulario para configuración dinámica de roles"""
    
    class Meta:
        model = ConfiguracionRol
        fields = [
            'configuracion_ui', 'configuracion_seguridad', 
            'configuracion_notificaciones', 'configuracion_integraciones'
        ]
        widgets = {
            'configuracion_ui': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono',
                'placeholder': 'JSON con configuración de UI',
                'rows': 4
            }),
            'configuracion_seguridad': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono',
                'placeholder': 'JSON con configuración de seguridad',
                'rows': 4
            }),
            'configuracion_notificaciones': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono',
                'placeholder': 'JSON con configuración de notificaciones',
                'rows': 4
            }),
            'configuracion_integraciones': forms.Textarea(attrs={
                'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono',
                'placeholder': 'JSON con configuración de integraciones',
                'rows': 4
            }),
        }

    def _validate_json_field(self, field_name):
        """Validar formato JSON de un campo"""
        data = self.cleaned_data.get(field_name)
        if data:
            try:
                import json
                json.loads(data)
            except json.JSONDecodeError:
                raise ValidationError(_(f"La {field_name.replace('_', ' ')} debe ser un JSON válido"))
        return data

    def clean_configuracion_ui(self):
        return self._validate_json_field('configuracion_ui')

    def clean_configuracion_seguridad(self):
        return self._validate_json_field('configuracion_seguridad')

    def clean_configuracion_notificaciones(self):
        return self._validate_json_field('configuracion_notificaciones')

    def clean_configuracion_integraciones(self):
        return self._validate_json_field('configuracion_integraciones')


class AsignacionMasivaRolForm(forms.Form):
    """Formulario para asignación masiva de roles"""
    
    usuarios = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'placeholder': 'IDs de usuarios separados por coma o uno por línea',
            'rows': 5
        }),
        help_text=_("Ingrese los IDs de usuarios, emails o usernames separados por coma o uno por línea")
    )
    
    roles = forms.ModelMultipleChoiceField(
        queryset=Rol.objects.filter(activo=True),
        widget=forms.SelectMultiple(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        }),
        help_text=_("Seleccione los roles a asignar")
    )
    
    fecha_inicio = forms.DateTimeField(
        required=False,
        widget=forms.DateTimeInput(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'type': 'datetime-local'
        })
    )
    
    fecha_fin = forms.DateTimeField(
        required=False,
        widget=forms.DateTimeInput(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'type': 'datetime-local'
        })
    )
    
    justificacion = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            'placeholder': 'Justificación para la asignación masiva',
            'rows': 3
        })
    )
    
    enviar_notificacion = forms.BooleanField(
        required=False,
        initial=True,
        widget=forms.CheckboxInput(attrs={
            'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        }),
        help_text=_("Enviar notificación a los usuarios sobre la asignación")
    )

    def clean_usuarios(self):
        """Validar y procesar lista de usuarios"""
        usuarios_texto = self.cleaned_data.get('usuarios')
        if not usuarios_texto:
            return []
        
        # Procesar texto: separar por comas o nuevas líneas
        lineas = usuarios_texto.replace(',', '\n').split('\n')
        usuarios_procesados = []
        
        for linea in lineas:
            linea = linea.strip()
            if linea:
                usuarios_procesados.append(linea)
        
        if not usuarios_procesados:
            raise ValidationError(_("Debe especificar al menos un usuario"))
        
        return usuarios_procesados

    def clean(self):
        """Validación general del formulario"""
        cleaned_data = super().clean()
        fecha_inicio = cleaned_data.get('fecha_inicio')
        fecha_fin = cleaned_data.get('fecha_fin')
        
        # Validar fechas
        if fecha_inicio and fecha_fin:
            if fecha_inicio >= fecha_fin:
                raise ValidationError(_("La fecha de inicio debe ser anterior a la fecha de fin"))
        
        return cleaned_data


# ==================== WIDGETS PERSONALIZADOS ====================

class RolHierarchyWidget(forms.SelectMultiple):
    """Widget personalizado para mostrar jerarquía de roles"""
    
    def create_option(self, name, value, label, selected, index, subindex=None, attrs=None):
        option = super().create_option(name, value, label, selected, index, subindex, attrs)
        
        # Agregar nivel de indentación basado en la jerarquía
        if value and value.instance:
            nivel = getattr(value.instance, 'nivel_jerarquico', 0)
            option['label'] = '&nbsp;&nbsp;' * nivel + str(option['label'])
        
        return option


# ==================== FORMULARIOS DE UTILIDAD ====================

class ImportarRolesForm(forms.Form):
    """Formulario para importar roles desde archivo"""
    
    archivo = forms.FileField(
        widget=forms.FileInput(attrs={
            'class': 'mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100',
            'accept': '.json,.csv,.xlsx'
        }),
        help_text=_("Archivo JSON, CSV o Excel con los roles a importar")
    )
    
    formato = forms.ChoiceField(
        choices=[
            ('json', 'JSON'),
            ('csv', 'CSV'),
            ('excel', 'Excel')
        ],
        widget=forms.Select(attrs={
            'class': 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
        })
    )
    
    actualizar_existentes = forms.BooleanField(
        required=False,
        initial=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        }),
        help_text=_("Actualizar roles existentes si ya existen")
    )
    
    validar_solo = forms.BooleanField(
        required=False,
        initial=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
        }),
        help_text=_("Solo validar el archivo sin importar")
    )

    def clean_archivo(self):
        """Validar archivo"""
        archivo = self.cleaned_data.get('archivo')
        
        if archivo:
            # Validar tamaño (máximo 10MB)
            if archivo.size > 10 * 1024 * 1024:
                raise ValidationError(_("El archivo no puede ser mayor a 10MB"))
            
            # Validar extensión
            formato = self.data.get('formato')
            extensiones_validas = {
                'json': ['.json'],
                'csv': ['.csv'],
                'excel': ['.xlsx', '.xls']
            }
            
            if formato in extensiones_validas:
                extension = '.' + archivo.name.split('.')[-1].lower()
                if extension not in extensiones_validas[formato]:
                    raise ValidationError(_(f"El archivo debe tener extensión {extensiones_validas[formato]}"))
        
        return archivo
