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

# Alias para compatibilidad
Nomina = NominaSimple
DetalleNomina = DetalleItemNominaSimple


# ============================================
# ADMIN PARA CATÁLOGOS
# ============================================

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


# ============================================
# ADMIN PARA EMPLEADO
# ============================================

@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = [
        'documento', 
        'nombre_completo', 
        'tipo_vinculacion',
        'cargo', 
        'ibc_default',
        'activo',
        'fecha_ingreso'
    ]
    list_filter = [
        'activo', 
        'tipo_vinculacion',
        'genero',
        'departamento'
    ]
    search_fields = [
        'nombres', 
        'apellidos', 
        'documento', 
        'correo'
    ]
    readonly_fields = [
        'creado_el', 
        'actualizado_el',
        'usa_nomina_electronica',
        'es_subcontratista'
    ]
    
    fieldsets = (
        ('Información Personal', {
            'fields': (
                ('nombres', 'apellidos'),
                ('tipo_documento', 'documento'),
                ('fecha_nacimiento', 'genero'),
                ('correo', 'telefono'),
                'direccion',
                'foto'
            )
        }),
        ('Ubicación', {
            'fields': (
                ('departamento', 'municipio'),
            )
        }),
        ('Información Laboral', {
            'fields': (
                'cargo',
                'tipo_vinculacion',
                'fecha_ingreso',
                'ibc_default',
                'activo'
            )
        }),
        ('Propiedades Calculadas', {
            'fields': (
                'usa_nomina_electronica',
                'es_subcontratista'
            ),
            'classes': ('collapse',)
        }),
        ('Auditoría', {
            'fields': (
                'creado_el',
                'actualizado_el'
            ),
            'classes': ('collapse',)
        })
    )
    
    def nombre_completo(self, obj):
        return obj.nombre_completo
    nombre_completo.short_description = 'Nombre Completo'


# ============================================
# ADMIN PARA CONTRATO
# ============================================

@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = [
        'empleado',
        'tipo_contrato',
        'tipo_salario',
        'salario_base',
        'fecha_inicio',
        'fecha_fin',
        'estado_badge'
    ]
    list_filter = [
        'estado',
        'tipo_contrato',
        'tipo_salario',
        'jornada'
    ]
    search_fields = [
        'empleado__nombres',
        'empleado__apellidos',
        'empleado__documento'
    ]
    readonly_fields = [
        'esta_activo',
        'requiere_nomina_electronica',
        'creado_el',
        'actualizado_el'
    ]
    date_hierarchy = 'fecha_inicio'
    
    fieldsets = (
        ('Empleado', {
            'fields': ('empleado',)
        }),
        ('Información Contractual', {
            'fields': (
                'tipo_contrato',
                ('fecha_inicio', 'fecha_fin'),
                'estado'
            )
        }),
        ('Información Salarial', {
            'fields': (
                'tipo_salario',
                'salario_base',
                'auxilio_transporte'
            )
        }),
        ('Condiciones Laborales', {
            'fields': (
                'jornada',
                'nivel_riesgo_arl'
            )
        }),
        ('Terminación', {
            'fields': (
                'fecha_terminacion_real',
                'motivo_terminacion'
            ),
            'classes': ('collapse',)
        }),
        ('Propiedades', {
            'fields': (
                'esta_activo',
                'requiere_nomina_electronica'
            ),
            'classes': ('collapse',)
        }),
        ('Auditoría', {
            'fields': (
                'creado_el',
                'actualizado_el'
            ),
            'classes': ('collapse',)
        })
    )
    
    def estado_badge(self, obj):
        colors = {
            'ACT': 'green',
            'SUS': 'orange',
            'TER': 'red'
        }
        color = colors.get(obj.estado, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_estado_display()
        )
    estado_badge.short_description = 'Estado'


# ============================================
# ADMIN PARA PERIODO NÓMINA
# ============================================

@admin.register(PeriodoNomina)
class PeriodoNominaAdmin(admin.ModelAdmin):
    list_display = [
        'nombre',
        'tipo',
        'fecha_inicio',
        'fecha_fin',
        'fecha_pago',
        'estado_badge',
        'cantidad_nominas'
    ]
    list_filter = [
        'estado',
        'tipo'
    ]
    search_fields = ['nombre', 'observaciones']
    readonly_fields = [
        'creado_el',
        'actualizado_el',
        'cerrado_por',
        'fecha_cierre',
        'cantidad_nominas'
    ]
    date_hierarchy = 'fecha_inicio'
    
    fieldsets = (
        ('Información General', {
            'fields': (
                'nombre',
                'tipo'
            )
        }),
        ('Fechas', {
            'fields': (
                ('fecha_inicio', 'fecha_fin'),
                ('fecha_pago', 'fecha_pago_real')
            )
        }),
        ('Estado', {
            'fields': (
                'estado',
                'observaciones'
            )
        }),
        ('Auditoría', {
            'fields': (
                'cerrado_por',
                'fecha_cierre',
                'creado_el',
                'actualizado_el',
                'cantidad_nominas'
            ),
            'classes': ('collapse',)
        })
    )
    
    def estado_badge(self, obj):
        colors = {
            'ABI': 'blue',
            'CER': 'orange',
            'PAG': 'green',
            'APR': 'purple'
        }
        color = colors.get(obj.estado, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_estado_display()
        )
    estado_badge.short_description = 'Estado'
    
    def cantidad_nominas(self, obj):
        count = obj.nomina_set.count()
        return format_html(
            '<a href="{}?periodo__id__exact={}">{} nóminas</a>',
            reverse('admin:payroll_nomina_changelist'),
            obj.id,
            count
        )
    cantidad_nominas.short_description = 'Nóminas'


# ============================================
# ADMIN PARA DETALLE NÓMINA (INLINE)
# ============================================

class DetalleNominaInline(admin.TabularInline):
    model = DetalleNomina
    extra = 1
    fields = ['item', 'cantidad', 'total_display']
    readonly_fields = ['total_display']
    
    def total_display(self, obj):
        if obj.id:
            return f"${obj.total:,.2f}"
        return "-"
    total_display.short_description = 'Total'


# ============================================
# ADMIN PARA NÓMINA
# ============================================

@admin.register(Nomina)
class NominaAdmin(admin.ModelAdmin):
    list_display = [
        'empleado',
        'periodo_inicio',
        'periodo_fin',
        'ingreso_real_display',
        'ibc_display',
        'excedente_display',
        'neto_display'
    ]
    list_filter = [
        'periodo_inicio',
        'empleado__tipo_vinculacion'
    ]
    search_fields = [
        'empleado__nombres',
        'empleado__apellidos',
        'empleado__documento'
    ]
    readonly_fields = [
        'produccion_display',
        'total_deducciones_display',
        'neto_pagar_display',
        'desglose_display',
        'creado_el',
        'actualizado_el'
    ]
    date_hierarchy = 'periodo_fin'
    inlines = [DetalleNominaInline]
    
    fieldsets = (
        ('Empleado y Periodo', {
            'fields': (
                'empleado',
                'periodo',
                'contrato',
                ('periodo_inicio', 'periodo_fin')
            )
        }),
        ('Días', {
            'fields': (
                ('dias_trabajados', 'dias_incapacidad', 'dias_licencia'),
            )
        }),
        ('Ingresos (Crítico para Subcontratistas)', {
            'fields': (
                'produccion_display',
                'ingreso_real_periodo',
                'ibc_cotizacion',
                'excedente_no_salarial'
            ),
            'description': 'Para subcontratistas: ingreso_real = producción total, IBC = base fija para seguridad social, excedente = bonificación no salarial'
        }),
        ('Deducciones', {
            'fields': (
                ('deduccion_salud', 'deduccion_pension'),
                ('prestamos', 'restaurante', 'otras_deducciones'),
                'seguridad',
                'total_deducciones_display'
            )
        }),
        ('Resultado Final', {
            'fields': (
                'neto_pagar_display',
                'desglose_display'
            )
        }),
        ('Observaciones', {
            'fields': ('observaciones',),
            'classes': ('collapse',)
        }),
        ('Auditoría', {
            'fields': (
                'creado_el',
                'actualizado_el'
            ),
            'classes': ('collapse',)
        })
    )
    
    actions = ['calcular_automatico_seleccionados']
    
    def ingreso_real_display(self, obj):
        return format_html('<strong>${:,.2f}</strong>', obj.ingreso_real_periodo)
    ingreso_real_display.short_description = 'Ingreso Real'
    
    def ibc_display(self, obj):
        return format_html('${:,.2f}', obj.ibc_cotizacion)
    ibc_display.short_description = 'IBC'
    
    def excedente_display(self, obj):
        if obj.excedente_no_salarial > 0:
            return format_html('<span style="color: green;">${:,.2f}</span>', obj.excedente_no_salarial)
        return '-'
    excedente_display.short_description = 'Excedente No Salarial'
    
    def neto_display(self, obj):
        return format_html('<strong style="color: blue;">${:,.2f}</strong>', obj.neto_pagar)
    neto_display.short_description = 'Neto a Pagar'
    
    def produccion_display(self, obj):
        return format_html('${:,.2f}', obj.produccion)
    produccion_display.short_description = 'Producción Total'
    
    def total_deducciones_display(self, obj):
        return format_html('${:,.2f}', obj.total_deducciones)
    total_deducciones_display.short_description = 'Total Deducciones'
    
    def neto_pagar_display(self, obj):
        return format_html('<strong style="color: green; font-size: 16px;">${:,.2f}</strong>', obj.neto_pagar)
    neto_pagar_display.short_description = 'NETO A PAGAR'
    
    def desglose_display(self, obj):
        desglose = obj.desglose_completo
        html = '<table style="width: 100%; border-collapse: collapse;">'
        html += '<tr style="background-color: #f0f0f0;"><th colspan="2">Desglose Completo</th></tr>'
        
        html += '<tr><td><strong>Ingreso Real:</strong></td><td style="text-align: right;">${:,.2f}</td></tr>'.format(desglose['ingreso_real'])
        html += '<tr><td>IBC Cotización:</td><td style="text-align: right;">${:,.2f}</td></tr>'.format(desglose['ibc_cotizacion'])
        html += '<tr style="color: green;"><td>Excedente No Salarial:</td><td style="text-align: right;">${:,.2f}</td></tr>'.format(desglose['excedente_no_salarial'])
        
        html += '<tr style="background-color: #fff0f0;"><td colspan="2"><strong>Deducciones:</strong></td></tr>'
        html += '<tr><td>Salud (4%):</td><td style="text-align: right;">${:,.2f}</td></tr>'.format(desglose['salud_4pct'])
        html += '<tr><td>Pensión (4%):</td><td style="text-align: right;">${:,.2f}</td></tr>'.format(desglose['pension_4pct'])
        html += '<tr><td>Préstamos:</td><td style="text-align: right;">${:,.2f}</td></tr>'.format(desglose['prestamos'])
        html += '<tr><td>Restaurante:</td><td style="text-align: right;">${:,.2f}</td></tr>'.format(desglose['restaurante'])
        html += '<tr><td>Otras:</td><td style="text-align: right;">${:,.2f}</td></tr>'.format(desglose['otras_deducciones'])
        html += '<tr style="font-weight: bold;"><td>Total Deducciones:</td><td style="text-align: right;">${:,.2f}</td></tr>'.format(desglose['total_deducciones'])
        
        html += '<tr style="background-color: #f0fff0; font-weight: bold; font-size: 16px;"><td>NETO A PAGAR:</td><td style="text-align: right;">${:,.2f}</td></tr>'.format(desglose['neto_pagar'])
        html += '</table>'
        
        return mark_safe(html)
    desglose_display.short_description = 'Desglose Detallado'
    
    def calcular_automatico_seleccionados(self, request, queryset):
        """Acción para recalcular automáticamente nóminas seleccionadas"""
        count = 0
        for nomina in queryset:
            nomina.calcular_automatico()
            nomina.save()
            count += 1
        
        self.message_user(
            request,
            f'Se recalcularon automáticamente {count} nómina(s).'
        )
    calcular_automatico_seleccionados.short_description = 'Calcular automáticamente IBC y deducciones'


@admin.register(DetalleNomina)
class DetalleNominaAdmin(admin.ModelAdmin):
    list_display = ['nomina', 'item', 'cantidad', 'total_display']
    list_filter = ['nomina__periodo_inicio']
    search_fields = [
        'nomina__empleado__nombres',
        'nomina__empleado__apellidos',
        'item__nombre'
    ]
    readonly_fields = ['total_display', 'creado_el', 'actualizado_el']
    
    def total_display(self, obj):
        return format_html('${:,.2f}', obj.total)
    total_display.short_description = 'Total'


# ============================================
# ADMIN PARA FASE 2A - INTEGRACIONES
# ============================================

@admin.register(TipoDeduccion)
class TipoDeduccionAdmin(admin.ModelAdmin):
    list_display = [
        'codigo', 'nombre', 'porcentaje_defecto', 
        'es_obligatoria', 'aplica_sobre_ibc', 'activo'
    ]
    list_filter = ['es_obligatoria', 'aplica_sobre_ibc', 'activo']
    search_fields = ['codigo', 'nombre', 'descripcion']
    ordering = ['codigo']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('codigo', 'nombre', 'descripcion')
        }),
        ('Configuración', {
            'fields': (
                'porcentaje_defecto', 
                'es_obligatoria', 
                'aplica_sobre_ibc',
                'activo'
            )
        }),
    )


@admin.register(DetalleDeduccion)
class DetalleDeduccionAdmin(admin.ModelAdmin):
    list_display = [
        'nomina', 'tipo_deduccion', 'concepto', 'valor_display', 
        'porcentaje', 'prestamo', 'creado_el'
    ]
    list_filter = ['tipo_deduccion', 'creado_el']
    search_fields = [
        'nomina__numero_nomina',
        'nomina__empleado__nombres',
        'nomina__empleado__apellidos',
        'tipo_deduccion__nombre',
        'prestamo__numero_prestamo',
        'concepto'
    ]
    readonly_fields = ['creado_el', 'creado_por']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nomina', 'tipo_deduccion', 'concepto')
        }),
        ('Valores', {
            'fields': ('valor', 'base_calculo', 'porcentaje')
        }),
        ('Relaciones', {
            'fields': ('prestamo', 'pago_prestamo')
        }),
        ('Observaciones', {
            'fields': ('observaciones', 'creado_el', 'creado_por'),
            'classes': ('collapse',)
        })
    )
    
    def valor_display(self, obj):
        return format_html('${:,.2f}', obj.valor)
    valor_display.short_description = 'Valor'


@admin.register(ComprobanteContableNomina)
class ComprobanteContableNominaAdmin(admin.ModelAdmin):
    list_display = [
        'nomina_numero', 'comprobante_numero', 
        'estado', 'fecha_generacion'
    ]
    list_filter = ['estado', 'fecha_generacion']
    search_fields = [
        'nomina__numero_nomina',
        'nomina__empleado__nombres',
        'comprobante__numero_comprobante'
    ]
    readonly_fields = ['fecha_generacion', 'generado_por']
    
    def nomina_numero(self, obj):
        url = reverse('admin:payroll_nomina_change', args=[obj.nomina.id])
        return format_html('<a href="{}">{}</a>', url, obj.nomina.numero_nomina)
    nomina_numero.short_description = 'Nómina'
    
    def comprobante_numero(self, obj):
        return obj.comprobante.numero_comprobante
    comprobante_numero.short_description = 'Comprobante'


@admin.register(HistorialNomina)
class HistorialNominaAdmin(admin.ModelAdmin):
    list_display = [
        'nomina_numero', 'accion', 'usuario', 
        'campos_modificados_count', 'fecha'
    ]
    list_filter = ['accion', 'fecha', 'usuario']
    search_fields = [
        'nomina__numero_nomina',
        'nomina__empleado__nombres',
        'usuario__username'
    ]
    readonly_fields = [
        'fecha', 'datos_anteriores_display', 
        'datos_nuevos_display', 'campos_modificados_display'
    ]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nomina', 'usuario', 'accion', 'fecha', 'ip_address')
        }),
        ('Cambios', {
            'fields': (
                'campos_modificados_display',
                'datos_anteriores_display',
                'datos_nuevos_display'
            ),
            'classes': ('collapse',)
        }),
        ('Observaciones', {
            'fields': ('observaciones',)
        })
    )
    
    def nomina_numero(self, obj):
        url = reverse('admin:payroll_nomina_change', args=[obj.nomina.id])
        return format_html('<a href="{}">{}</a>', url, obj.nomina.numero_nomina)
    nomina_numero.short_description = 'Nómina'
    
    def campos_modificados_count(self, obj):
        if obj.campos_modificados:
            return len(obj.campos_modificados)
        return 0
    campos_modificados_count.short_description = 'Campos Modificados'
    
    def datos_anteriores_display(self, obj):
        import json
        if obj.datos_anteriores:
            return format_html('<pre>{}</pre>', json.dumps(obj.datos_anteriores, indent=2))
        return '-'
    datos_anteriores_display.short_description = 'Datos Anteriores'
    
    def datos_nuevos_display(self, obj):
        import json
        if obj.datos_nuevos:
            return format_html('<pre>{}</pre>', json.dumps(obj.datos_nuevos, indent=2))
        return '-'
    datos_nuevos_display.short_description = 'Datos Nuevos'
    
    def campos_modificados_display(self, obj):
        if obj.campos_modificados:
            return ', '.join(obj.campos_modificados)
        return '-'
    campos_modificados_display.short_description = 'Campos Modificados'


# ============================================
# ADMIN PARA FASE 2B - NÓMINA ELECTRÓNICA
# ============================================

@admin.register(NominaElectronica)
class NominaElectronicaAdmin(admin.ModelAdmin):
    list_display = [
        'numero_documento', 'empleado_nombre', 'estado',
        'fecha_emision', 'track_id', 'fecha_validacion_dian'
    ]
    list_filter = ['estado', 'tipo_documento', 'fecha_generacion', 'fecha_emision']
    search_fields = [
        'numero_documento', 'cune',
        'nomina__empleado__nombres',
        'nomina__empleado__apellidos',
        'nomina__empleado__documento'
    ]
    readonly_fields = [
        'cune', 'fecha_generacion', 'track_id',
        'codigo_respuesta', 'mensaje_respuesta',
        'fecha_validacion_dian', 'intentos_envio',
        'ultimo_intento', 'xml_preview'
    ]
    
    fieldsets = (
        ('Información Básica', {
            'fields': (
                'nomina', 'tipo_documento', 'numero_documento',
                'prefijo', 'fecha_emision', 'estado'
            )
        }),
        ('Identificación Electrónica', {
            'fields': ('cune', 'track_id', 'fecha_generacion')
        }),
        ('Documentos Generados', {
            'fields': ('xml_preview', 'pdf_generado'),
            'classes': ('collapse',)
        }),
        ('Respuesta DIAN', {
            'fields': (
                'codigo_respuesta', 'mensaje_respuesta',
                'fecha_validacion_dian', 'errores'
            ),
            'classes': ('collapse',)
        }),
        ('Control de Envío', {
            'fields': (
                'fecha_envio', 'intentos_envio',
                'ultimo_intento', 'generado_por'
            ),
            'classes': ('collapse',)
        }),
        ('Observaciones', {
            'fields': ('observaciones',)
        })
    )
    
    def empleado_nombre(self, obj):
        return obj.nomina.empleado.nombre_completo
    empleado_nombre.short_description = 'Empleado'
    
    def xml_preview(self, obj):
        if obj.xml_firmado:
            preview = obj.xml_firmado[:500] + '...' if len(obj.xml_firmado) > 500 else obj.xml_firmado
            return format_html('<pre style="max-height: 300px; overflow: auto;">{}</pre>', preview)
        elif obj.xml_contenido:
            preview = obj.xml_contenido[:500] + '...' if len(obj.xml_contenido) > 500 else obj.xml_contenido
            return format_html('<pre style="max-height: 300px; overflow: auto;">{}</pre>', preview)
        return 'No disponible'
    xml_preview.short_description = 'Vista Previa XML'
    
    actions = ['generar_xml_action', 'firmar_action', 'enviar_dian_action']
    
    def generar_xml_action(self, request, queryset):
        """Acción para generar XML de nóminas seleccionadas"""
        from .xml_generator import NominaElectronicaXMLGenerator
        
        exitosos = 0
        errores = 0
        
        for nomina in queryset.filter(estado__in=['borrador', 'error']):
            try:
                generator = NominaElectronicaXMLGenerator(nomina)
                xml = generator.generar()
                nomina.xml_contenido = xml
                nomina.estado = 'generado'
                nomina.save()
                exitosos += 1
            except Exception as e:
                nomina.estado = 'error'
                nomina.errores = {'error': str(e)}
                nomina.save()
                errores += 1
        
        self.message_user(
            request,
            f'{exitosos} XML generados exitosamente. {errores} errores.',
            'success' if errores == 0 else 'warning'
        )
    generar_xml_action.short_description = 'Generar XML de nóminas seleccionadas'
    
    def firmar_action(self, request, queryset):
        """Acción para firmar nóminas seleccionadas"""
        from .firma_digital import FirmaDigitalNomina
        
        exitosos = 0
        errores = 0
        firmador = FirmaDigitalNomina()
        
        for nomina in queryset.filter(estado='generado'):
            try:
                xml_firmado = firmador.firmar(nomina.xml_contenido, nomina.organization)
                nomina.xml_firmado = xml_firmado
                nomina.generar_cune()
                nomina.estado = 'firmado'
                nomina.save()
                exitosos += 1
            except Exception as e:
                nomina.estado = 'error'
                nomina.errores = {'error': str(e)}
                nomina.save()
                errores += 1
        
        self.message_user(
            request,
            f'{exitosos} nóminas firmadas. {errores} errores.',
            'success' if errores == 0 else 'warning'
        )
    firmar_action.short_description = 'Firmar digitalmente nóminas seleccionadas'
    
    def enviar_dian_action(self, request, queryset):
        """Acción para enviar nóminas a DIAN"""
        from .dian_client import DIANClient
        from datetime import datetime
        
        exitosos = 0
        errores = 0
        
        for nomina in queryset.filter(estado='firmado'):
            try:
                client = DIANClient(nomina.organization)
                respuesta = client.enviar_nomina(nomina)
                
                nomina.track_id = respuesta.get('track_id', '')
                nomina.codigo_respuesta = respuesta.get('codigo', '')
                nomina.mensaje_respuesta = respuesta.get('mensaje', '')
                nomina.fecha_envio = datetime.now()
                nomina.intentos_envio += 1
                
                if respuesta.get('exitoso'):
                    nomina.estado = 'aceptado'
                    nomina.fecha_validacion_dian = datetime.now()
                    exitosos += 1
                else:
                    nomina.estado = 'rechazado'
                    nomina.errores = respuesta.get('errores', {})
                    errores += 1
                
                nomina.save()
                
            except Exception as e:
                nomina.estado = 'error'
                nomina.errores = {'error': str(e)}
                nomina.save()
                errores += 1
        
        self.message_user(
            request,
            f'{exitosos} nóminas aceptadas por DIAN. {errores} rechazadas o con error.',
            'success' if errores == 0 else 'warning'
        )
    enviar_dian_action.short_description = 'Enviar a DIAN nóminas seleccionadas'


@admin.register(DevengadoNominaElectronica)
class DevengadoNominaElectronicaAdmin(admin.ModelAdmin):
    list_display = ['nomina_electronica', 'tipo', 'concepto', 'valor_total_display', 'es_salarial']
    list_filter = ['tipo', 'es_salarial']
    search_fields = ['nomina_electronica__numero_documento', 'concepto']
    
    def valor_total_display(self, obj):
        return format_html('${:,.2f}', obj.valor_total)
    valor_total_display.short_description = 'Valor Total'


@admin.register(DeduccionNominaElectronica)
class DeduccionNominaElectronicaAdmin(admin.ModelAdmin):
    list_display = ['nomina_electronica', 'tipo', 'concepto', 'porcentaje', 'valor_display']
    list_filter = ['tipo']
    search_fields = ['nomina_electronica__numero_documento', 'concepto']
    
    def valor_display(self, obj):
        return format_html('${:,.2f}', obj.valor)
    valor_display.short_description = 'Valor'


@admin.register(ConfiguracionNominaElectronica)
class ConfiguracionNominaElectronicaAdmin(admin.ModelAdmin):
    list_display = [
        'razon_social', 'nit', 'ambiente',
        'activa', 'tiene_certificado', 'fecha_modificacion'
    ]
    list_filter = ['activa', 'ambiente']
    search_fields = ['razon_social', 'nit']
    readonly_fields = ['fecha_creacion', 'fecha_modificacion']
    
    fieldsets = (
        ('Estado', {
            'fields': ('activa', 'ambiente')
        }),
        ('Datos del Empleador', {
            'fields': (
                'razon_social', 'nit', 'dv',
                'direccion', 'municipio_codigo',
                'telefono', 'email'
            )
        }),
        ('Numeración Autorizada', {
            'fields': (
                'prefijo', 'resolucion_numero', 'resolucion_fecha',
                'rango_inicio', 'rango_fin',
                'fecha_vigencia_desde', 'fecha_vigencia_hasta'
            )
        }),
        ('Parámetros Técnicos', {
            'fields': (
                'clave_tecnica', 'identificador_software',
                'url_webservice'
            )
        }),
        ('Certificado Digital', {
            'fields': ('certificado_archivo', 'certificado_password')
        }),
        ('Opciones de Envío', {
            'fields': ('envio_automatico', 'notificar_empleado')
        }),
        ('Auditoría', {
            'fields': ('fecha_creacion', 'fecha_modificacion'),
            'classes': ('collapse',)
        })
    )
    
    def tiene_certificado(self, obj):
        if obj.certificado_archivo:
            return format_html('<span style="color: green;">✓ Sí</span>')
        return format_html('<span style="color: red;">✗ No</span>')
    tiene_certificado.short_description = 'Certificado'
    
    actions = ['probar_conexion_action']
    
    def probar_conexion_action(self, request, queryset):
        """Acción para probar conexión con DIAN"""
        from .dian_client import DIANClient
        
        for config in queryset:
            client = DIANClient(config.organization)
            resultado = client.probar_conexion()
            
            if resultado['exitoso']:
                self.message_user(
                    request,
                    f"✓ {config.razon_social}: {resultado['mensaje']}",
                    'success'
                )
            else:
                self.message_user(
                    request,
                    f"✗ {config.razon_social}: {resultado['mensaje']}",
                    'error'
                )
    probar_conexion_action.short_description = 'Probar conexión con DIAN'


# ============================================
# ADMIN PARA WEBHOOKS (FASE 3)
# ============================================

class WebhookLogInline(admin.TabularInline):
    """Inline para logs de webhooks"""
    model = WebhookLog
    extra = 0
    max_num = 20
    can_delete = False
    fields = ['evento', 'exitoso', 'codigo_respuesta', 'tiempo_respuesta', 'fecha_disparo']
    readonly_fields = ['evento', 'exitoso', 'codigo_respuesta', 'tiempo_respuesta', 'fecha_disparo']
    ordering = ['-fecha_disparo']


@admin.register(WebhookConfig)
class WebhookConfigAdmin(admin.ModelAdmin):
    list_display = [
        'nombre', 
        'url_corto', 
        'activo_badge', 
        'total_disparos',
        'tasa_exito',
        'ultimo_disparo',
        'ultimo_estado_badge'
    ]
    list_filter = ['activo', 'ultimo_estado']
    search_fields = ['nombre', 'url']
    readonly_fields = [
        'total_disparos', 'total_exitosos', 'total_fallidos',
        'ultimo_disparo', 'ultimo_estado',
        'fecha_creacion', 'fecha_modificacion'
    ]
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'url', 'secret', 'activo')
        }),
        ('Configuración', {
            'fields': ('eventos', 'reintentos_maximos', 'timeout_segundos')
        }),
        ('Estadísticas', {
            'fields': (
                'total_disparos', 'total_exitosos', 'total_fallidos',
                'ultimo_disparo', 'ultimo_estado'
            ),
            'classes': ('collapse',)
        }),
        ('Auditoría', {
            'fields': ('fecha_creacion', 'fecha_modificacion'),
            'classes': ('collapse',)
        })
    )
    inlines = [WebhookLogInline]
    actions = ['probar_webhook_action', 'activar_webhooks', 'desactivar_webhooks']
    
    def url_corto(self, obj):
        """Muestra URL truncada"""
        if len(obj.url) > 40:
            return obj.url[:37] + '...'
        return obj.url
    url_corto.short_description = 'URL'
    
    def activo_badge(self, obj):
        """Badge de estado activo"""
        if obj.activo:
            return format_html(
                '<span style="background-color: #28a745; color: white; '
                'padding: 3px 10px; border-radius: 3px;">✓ Activo</span>'
            )
        return format_html(
            '<span style="background-color: #6c757d; color: white; '
            'padding: 3px 10px; border-radius: 3px;">✗ Inactivo</span>'
        )
    activo_badge.short_description = 'Estado'
    
    def tasa_exito(self, obj):
        """Calcula tasa de éxito"""
        if obj.total_disparos == 0:
            return '-'
        tasa = (obj.total_exitosos / obj.total_disparos) * 100
        color = '#28a745' if tasa >= 90 else '#ffc107' if tasa >= 70 else '#dc3545'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            color, tasa
        )
    tasa_exito.short_description = 'Tasa Éxito'
    
    def ultimo_estado_badge(self, obj):
        """Badge del último estado"""
        if not obj.ultimo_estado:
            return '-'
        
        if obj.ultimo_estado == 'exitoso':
            return format_html(
                '<span style="background-color: #28a745; color: white; '
                'padding: 2px 8px; border-radius: 3px;">✓</span>'
            )
        return format_html(
            '<span style="background-color: #dc3545; color: white; '
            'padding: 2px 8px; border-radius: 3px;">✗</span>'
        )
    ultimo_estado_badge.short_description = 'Último'
    
    @admin.action(description='Probar webhook seleccionados')
    def probar_webhook_action(self, request, queryset):
        """Prueba webhooks seleccionados"""
        from .notifications import WebhookNotifier
        from django.utils import timezone
        
        exitosos = 0
        fallidos = 0
        
        for webhook in queryset:
            if not webhook.activo:
                continue
                
            datos_prueba = {
                'test': True,
                'webhook_id': webhook.id,
                'timestamp': timezone.now().isoformat(),
                'mensaje': 'Este es un webhook de prueba desde el admin'
            }
            
            try:
                WebhookNotifier._enviar_webhook(
                    url=webhook.url,
                    evento='test',
                    datos=datos_prueba,
                    secret=webhook.secret
                )
                webhook.registrar_disparo(exitoso=True)
                exitosos += 1
            except Exception as e:
                webhook.registrar_disparo(exitoso=False)
                fallidos += 1
        
        if exitosos > 0:
            self.message_user(
                request,
                f'✓ {exitosos} webhook(s) probado(s) exitosamente',
                'success'
            )
        if fallidos > 0:
            self.message_user(
                request,
                f'✗ {fallidos} webhook(s) fallaron',
                'error'
            )
    
    @admin.action(description='Activar webhooks seleccionados')
    def activar_webhooks(self, request, queryset):
        """Activa webhooks"""
        count = queryset.update(activo=True)
        self.message_user(
            request,
            f'✓ {count} webhook(s) activado(s)',
            'success'
        )
    
    @admin.action(description='Desactivar webhooks seleccionados')
    def desactivar_webhooks(self, request, queryset):
        """Desactiva webhooks"""
        count = queryset.update(activo=False)
        self.message_user(
            request,
            f'✓ {count} webhook(s) desactivado(s)',
            'success'
        )


@admin.register(WebhookLog)
class WebhookLogAdmin(admin.ModelAdmin):
    list_display = [
        'webhook', 
        'evento', 
        'exitoso_badge', 
        'codigo_respuesta',
        'tiempo_respuesta_ms',
        'fecha_disparo'
    ]
    list_filter = ['exitoso', 'evento', 'fecha_disparo']
    search_fields = ['webhook__nombre', 'evento', 'error']
    readonly_fields = [
        'webhook', 'evento', 'payload', 'codigo_respuesta',
        'respuesta', 'exitoso', 'error', 'tiempo_respuesta', 'fecha_disparo'
    ]
    date_hierarchy = 'fecha_disparo'
    ordering = ['-fecha_disparo']
    
    def exitoso_badge(self, obj):
        """Badge de éxito"""
        if obj.exitoso:
            return format_html(
                '<span style="background-color: #28a745; color: white; '
                'padding: 3px 10px; border-radius: 3px;">✓ Exitoso</span>'
            )
        return format_html(
            '<span style="background-color: #dc3545; color: white; '
            'padding: 3px 10px; border-radius: 3px;">✗ Fallido</span>'
        )
    exitoso_badge.short_description = 'Estado'
    
    def tiempo_respuesta_ms(self, obj):
        """Muestra tiempo en ms"""
        if obj.tiempo_respuesta:
            ms = obj.tiempo_respuesta * 1000
            color = '#28a745' if ms < 500 else '#ffc107' if ms < 2000 else '#dc3545'
            return format_html(
                '<span style="color: {};">{:.0f} ms</span>',
                color, ms
            )
        return '-'
    tiempo_respuesta_ms.short_description = 'Tiempo'
    
    def has_add_permission(self, request):
        """No permitir crear logs manualmente"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """No permitir editar logs"""
        return False
