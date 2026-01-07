"""
Admin para módulo de Nóminas - Arquitectura Definitiva v3.0
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    TipoDocumento, TipoTrabajador, TipoContrato,
    Empleado, Contrato, PeriodoNomina,
    NominaSimple, NominaElectronica,
    DetalleItemNominaSimple, DetalleItemNominaElectronica,
    ConfiguracionNominaElectronica, WebhookConfig, WebhookLog
)


# ══════════════════════════════════════════════════════════════════════════════
# CATÁLOGOS BASE
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(TipoDocumento)
class TipoDocumentoAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre', 'activo']
    list_filter = ['activo']
    search_fields = ['codigo', 'nombre']
    ordering = ['codigo']


@admin.register(TipoTrabajador)
class TipoTrabajadorAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre', 'requiere_nomina_electronica', 'activo']
    list_filter = ['requiere_nomina_electronica', 'activo']
    search_fields = ['codigo', 'nombre']
    ordering = ['codigo']


@admin.register(TipoContrato)
class TipoContratoAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre', 'requiere_fecha_fin', 'activo']
    list_filter = ['requiere_fecha_fin', 'activo']
    search_fields = ['codigo', 'nombre']
    ordering = ['codigo']


# ══════════════════════════════════════════════════════════════════════════════
# EMPLEADOS Y CONTRATOS
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = ['documento', 'nombre_completo', 'cargo', 'tipo_vinculacion', 'activo']
    list_filter = ['activo', 'tipo_vinculacion', 'cargo']
    search_fields = ['documento', 'nombres', 'apellidos', 'correo']
    readonly_fields = ['creado_el', 'actualizado_el']
    
    fieldsets = (
        ('Información Personal', {
            'fields': ('nombres', 'apellidos', 'tipo_documento', 'documento',
                      'fecha_nacimiento', 'genero', 'foto')
        }),
        ('Contacto', {
            'fields': ('correo', 'telefono', 'direccion', 'departamento', 'municipio')
        }),
        ('Información Laboral', {
            'fields': ('cargo', 'tipo_vinculacion', 'fecha_ingreso', 'ibc_default', 'activo')
        }),
        ('Metadatos', {
            'fields': ('creado_el', 'actualizado_el'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = ['empleado', 'tipo_contrato', 'salario_base', 'fecha_inicio', 'fecha_fin', 'estado']
    list_filter = ['estado', 'tipo_contrato', 'tipo_salario', 'nivel_riesgo_arl']
    search_fields = ['empleado__documento', 'empleado__nombres', 'empleado__apellidos']
    date_hierarchy = 'fecha_inicio'
    readonly_fields = ['creado_el', 'actualizado_el']
    
    fieldsets = (
        ('Información General', {
            'fields': ('empleado', 'tipo_contrato', 'fecha_inicio', 'fecha_fin')
        }),
        ('Información Salarial', {
            'fields': ('tipo_salario', 'salario_base', 'auxilio_transporte')
        }),
        ('Condiciones Laborales', {
            'fields': ('jornada', 'nivel_riesgo_arl')
        }),
        ('Estado', {
            'fields': ('estado', 'motivo_terminacion', 'fecha_terminacion_real')
        }),
        ('Metadatos', {
            'fields': ('creado_el', 'actualizado_el'),
            'classes': ('collapse',)
        }),
    )


# ══════════════════════════════════════════════════════════════════════════════
# PERIODOS DE NÓMINA
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(PeriodoNomina)
class PeriodoNominaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'tipo', 'fecha_inicio', 'fecha_fin', 'fecha_pago', 'estado']
    list_filter = ['estado', 'tipo']
    search_fields = ['nombre']
    date_hierarchy = 'fecha_inicio'
    readonly_fields = ['creado_el', 'actualizado_el', 'fecha_cierre', 'cerrado_por']
    
    fieldsets = (
        ('Información del Periodo', {
            'fields': ('nombre', 'tipo', 'fecha_inicio', 'fecha_fin')
        }),
        ('Pago', {
            'fields': ('fecha_pago', 'fecha_pago_real')
        }),
        ('Estado', {
            'fields': ('estado', 'observaciones')
        }),
        ('Auditoría', {
            'fields': ('creado_el', 'actualizado_el', 'cerrado_por', 'fecha_cierre'),
            'classes': ('collapse',)
        }),
    )


# ══════════════════════════════════════════════════════════════════════════════
# NÓMINA SIMPLE (RRHH)
# ══════════════════════════════════════════════════════════════════════════════

class DetalleItemNominaSimpleInline(admin.TabularInline):
    model = DetalleItemNominaSimple
    extra = 1
    fields = ['item', 'cantidad', 'valor_unitario', 'valor_total', 'observaciones']
    readonly_fields = ['valor_total']


@admin.register(NominaSimple)
class NominaSimpleAdmin(admin.ModelAdmin):
    list_display = [
        'numero_interno', 'empleado', 'periodo', 'total_items', 
        'total_deducciones', 'neto_pagar', 'estado'
    ]
    list_filter = ['estado', 'periodo']
    search_fields = ['numero_interno', 'empleado__documento', 'empleado__nombres', 'empleado__apellidos']
    date_hierarchy = 'fecha_creacion'
    readonly_fields = [
        'fecha_creacion', 'fecha_actualizacion', 'creado_por',
        'base_cotizacion', 'excedente_no_salarial',
        'aporte_salud_empleado', 'aporte_pension_empleado',
        'aporte_salud_empleador', 'aporte_pension_empleador', 'aporte_arl',
        'aporte_sena', 'aporte_icbf', 'aporte_caja_compensacion',
        'provision_cesantias', 'provision_intereses_cesantias',
        'provision_prima', 'provision_vacaciones',
        'total_deducciones', 'neto_pagar'
    ]
    inlines = [DetalleItemNominaSimpleInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('empleado', 'periodo', 'periodo_inicio', 'periodo_fin', 'dias_trabajados')
        }),
        ('Items de Trabajo', {
            'fields': ('total_items',)
        }),
        ('Salario Base y IBC', {
            'fields': ('salario_base_contrato', 'base_cotizacion', 'excedente_no_salarial')
        }),
        ('Aportes Seguridad Social - Empleado', {
            'fields': ('aporte_salud_empleado', 'aporte_pension_empleado'),
            'classes': ('collapse',)
        }),
        ('Aportes Seguridad Social - Empleador', {
            'fields': ('aporte_salud_empleador', 'aporte_pension_empleador', 'aporte_arl'),
            'classes': ('collapse',)
        }),
        ('Parafiscales', {
            'fields': ('aporte_sena', 'aporte_icbf', 'aporte_caja_compensacion'),
            'classes': ('collapse',)
        }),
        ('Provisiones', {
            'fields': ('provision_cesantias', 'provision_intereses_cesantias',
                      'provision_prima', 'provision_vacaciones'),
            'classes': ('collapse',)
        }),
        ('Deducciones', {
            'fields': ('deduccion_prestamos', 'deduccion_restaurante',
                      'deduccion_anticipos', 'otras_deducciones', 'total_deducciones')
        }),
        ('Resultado Final', {
            'fields': ('neto_pagar',)
        }),
        ('Estado y Control', {
            'fields': ('numero_interno', 'estado', 'fecha_aprobacion', 'aprobada_por',
                      'fecha_pago', 'comprobante_pago', 'observaciones')
        }),
        ('Auditoría', {
            'fields': ('fecha_creacion', 'fecha_actualizacion', 'creado_por'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['calcular_nominas', 'aprobar_nominas']
    
    def calcular_nominas(self, request, queryset):
        """Calcula automáticamente las nóminas seleccionadas"""
        count = 0
        for nomina in queryset:
            try:
                nomina.procesar_completo()
                count += 1
            except Exception as e:
                self.message_user(request, f"Error en {nomina}: {str(e)}", level='error')
        self.message_user(request, f"{count} nóminas calculadas exitosamente")
    calcular_nominas.short_description = "Calcular nóminas seleccionadas"
    
    def aprobar_nominas(self, request, queryset):
        """Aprueba las nóminas seleccionadas"""
        count = queryset.filter(estado='BOR').update(estado='APR', aprobada_por=request.user)
        self.message_user(request, f"{count} nóminas aprobadas")
    aprobar_nominas.short_description = "Aprobar nóminas"


# ══════════════════════════════════════════════════════════════════════════════
# NÓMINA ELECTRÓNICA (DIAN)
# ══════════════════════════════════════════════════════════════════════════════

class DetalleItemNominaElectronicaInline(admin.TabularInline):
    model = DetalleItemNominaElectronica
    extra = 1
    fields = ['item', 'cantidad', 'valor_unitario', 'valor_total', 'codigo_dian', 'observaciones']
    readonly_fields = ['valor_total']


@admin.register(NominaElectronica)
class NominaElectronicaAdmin(admin.ModelAdmin):
    list_display = [
        'numero_documento', 'empleado', 'periodo', 'total_items',
        'neto_pagar', 'estado', 'cune'
    ]
    list_filter = ['estado', 'periodo']
    search_fields = [
        'numero_documento', 'cune',
        'empleado__documento', 'empleado__nombres', 'empleado__apellidos'
    ]
    date_hierarchy = 'fecha_creacion'
    readonly_fields = [
        'fecha_creacion', 'fecha_actualizacion', 'creado_por',
        'base_cotizacion', 'excedente_no_salarial',
        'aporte_salud_empleado', 'aporte_pension_empleado',
        'total_deducciones', 'neto_pagar',
        'fecha_envio_dian', 'fecha_respuesta_dian'
    ]
    inlines = [DetalleItemNominaElectronicaInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('empleado', 'periodo', 'periodo_inicio', 'periodo_fin', 'dias_trabajados')
        }),
        ('Documento Electrónico', {
            'fields': ('numero_documento', 'estado', 'cune')
        }),
        ('Vinculación', {
            'fields': ('nomina_simple',),
            'classes': ('collapse',)
        }),
        ('Valores', {
            'fields': ('total_items', 'salario_base_contrato', 'base_cotizacion',
                      'total_deducciones', 'neto_pagar')
        }),
        ('Respuesta DIAN', {
            'fields': ('codigo_respuesta_dian', 'mensaje_respuesta_dian',
                      'fecha_envio_dian', 'fecha_respuesta_dian'),
            'classes': ('collapse',)
        }),
        ('XML', {
            'fields': ('xml_contenido',),
            'classes': ('collapse',)
        }),
        ('Auditoría', {
            'fields': ('fecha_creacion', 'fecha_actualizacion', 'creado_por', 'observaciones'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['calcular_nominas', 'enviar_a_dian']
    
    def calcular_nominas(self, request, queryset):
        """Calcula automáticamente las nóminas seleccionadas"""
        count = 0
        for nomina in queryset:
            try:
                nomina.procesar_completo()
                count += 1
            except Exception as e:
                self.message_user(request, f"Error en {nomina}: {str(e)}", level='error')
        self.message_user(request, f"{count} nóminas electrónicas calculadas")
    calcular_nominas.short_description = "Calcular nóminas electrónicas"
    
    def enviar_a_dian(self, request, queryset):
        """Envía las nóminas a DIAN (placeholder)"""
        self.message_user(request, "Función de envío a DIAN pendiente de implementación", level='warning')
    enviar_a_dian.short_description = "Enviar a DIAN"


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN Y WEBHOOKS
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(ConfiguracionNominaElectronica)
class ConfiguracionNominaElectronicaAdmin(admin.ModelAdmin):
    list_display = ['razon_social', 'nit', 'ambiente', 'activa']
    list_filter = ['activa', 'ambiente']
    search_fields = ['razon_social', 'nit']
    readonly_fields = ['fecha_creacion', 'fecha_modificacion']
    
    fieldsets = (
        ('Configuración General', {
            'fields': ('activa', 'ambiente')
        }),
        ('Datos del Empleador', {
            'fields': ('razon_social', 'nit', 'dv', 'direccion', 'telefono', 'email')
        }),
        ('Numeración DIAN', {
            'fields': ('prefijo', 'resolucion_numero', 'resolucion_fecha',
                      'rango_inicio', 'rango_fin', 'consecutivo_actual')
        }),
        ('Certificado Digital', {
            'fields': ('certificado_archivo', 'certificado_password'),
            'classes': ('collapse',)
        }),
        ('Software', {
            'fields': ('identificador_software', 'clave_tecnica'),
            'classes': ('collapse',)
        }),
        ('URLs DIAN', {
            'fields': ('url_webservice', 'url_recepcion'),
            'classes': ('collapse',)
        }),
        ('Opciones', {
            'fields': ('envio_automatico', 'notificar_empleado')
        }),
        ('Auditoría', {
            'fields': ('fecha_creacion', 'fecha_modificacion'),
            'classes': ('collapse',)
        }),
    )


class WebhookLogInline(admin.TabularInline):
    model = WebhookLog
    extra = 0
    max_num = 10
    fields = ['evento', 'exitoso', 'codigo_respuesta', 'fecha_disparo']
    readonly_fields = fields
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(WebhookConfig)
class WebhookConfigAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'url', 'activo', 'total_disparos', 'total_exitosos', 'ultimo_disparo']
    list_filter = ['activo', 'ultimo_estado']
    search_fields = ['nombre', 'url']
    readonly_fields = [
        'total_disparos', 'total_exitosos', 'total_fallidos',
        'ultimo_disparo', 'ultimo_estado', 'fecha_creacion', 'fecha_modificacion'
    ]
    inlines = [WebhookLogInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'url', 'secret', 'activo')
        }),
        ('Eventos', {
            'fields': ('eventos',)
        }),
        ('Configuración', {
            'fields': ('reintentos_maximos', 'timeout_segundos')
        }),
        ('Estadísticas', {
            'fields': ('total_disparos', 'total_exitosos', 'total_fallidos',
                      'ultimo_disparo', 'ultimo_estado')
        }),
        ('Auditoría', {
            'fields': ('fecha_creacion', 'fecha_modificacion'),
            'classes': ('collapse',)
        }),
    )


@admin.register(WebhookLog)
class WebhookLogAdmin(admin.ModelAdmin):
    list_display = ['webhook', 'evento', 'exitoso', 'codigo_respuesta', 'fecha_disparo']
    list_filter = ['exitoso', 'evento', 'fecha_disparo']
    search_fields = ['webhook__nombre', 'evento']
    date_hierarchy = 'fecha_disparo'
    readonly_fields = [
        'webhook', 'evento', 'payload', 'codigo_respuesta',
        'respuesta', 'exitoso', 'error', 'tiempo_respuesta', 'fecha_disparo'
    ]
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False

