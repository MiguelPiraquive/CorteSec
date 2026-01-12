"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ADMIN DE NÓMINA - CORTESEC                                 ║
║                Sistema de Nómina para Construcción                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Configuración del panel de administración para los modelos de nómina.

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: Enero 2026
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import (
    Empleado,
    TipoContrato,
    Contrato,
    ParametroLegal,
    ConceptoLaboral,
    NominaSimple,
    NominaItem,
    NominaConcepto,
    NominaPrestamo,
)


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN: EMPLEADO
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = [
        'numero_documento', 'nombre_completo', 'tipo_documento',
        'estado', 'fecha_ingreso', 'email', 'telefono'
    ]
    list_filter = ['estado', 'tipo_documento', 'organization']
    search_fields = ['primer_nombre', 'primer_apellido', 'numero_documento', 'email']
    ordering = ['primer_apellido', 'primer_nombre']
    date_hierarchy = 'fecha_ingreso'
    
    fieldsets = (
        ('Identificación', {
            'fields': ('organization', 'tipo_documento', 'numero_documento')
        }),
        ('Datos Personales', {
            'fields': (
                ('primer_nombre', 'segundo_nombre'),
                ('primer_apellido', 'segundo_apellido'),
                'fecha_nacimiento',
            )
        }),
        ('Contacto', {
            'fields': ('email', 'telefono', 'direccion', 'ciudad')
        }),
        ('Estado Laboral', {
            'fields': ('estado', 'fecha_ingreso', 'fecha_retiro')
        }),
        ('Datos Bancarios', {
            'fields': ('banco', 'tipo_cuenta', 'numero_cuenta'),
            'classes': ('collapse',)
        }),
        ('Observaciones', {
            'fields': ('observaciones',),
            'classes': ('collapse',)
        }),
    )
    
    def nombre_completo(self, obj):
        return obj.nombre_completo
    nombre_completo.short_description = 'Nombre'


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN: TIPO DE CONTRATO
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(TipoContrato)
class TipoContratoAdmin(admin.ModelAdmin):
    list_display = [
        'nombre', 'codigo', 'ibc_porcentaje',
        'aplica_salud', 'aplica_pension', 'aplica_arl', 'aplica_parafiscales',
        'activo'
    ]
    list_filter = ['activo', 'aplica_salud', 'aplica_pension', 'organization']
    search_fields = ['nombre', 'codigo']
    ordering = ['nombre']
    
    fieldsets = (
        ('Información General', {
            'fields': ('organization', 'nombre', 'codigo', 'descripcion')
        }),
        ('Reglas de Aportes', {
            'fields': (
                'aplica_salud', 'aplica_pension',
                'aplica_arl', 'aplica_parafiscales'
            )
        }),
        ('Configuración IBC', {
            'fields': ('ibc_porcentaje',)
        }),
        ('Estado', {
            'fields': ('requiere_fecha_fin', 'activo')
        }),
    )


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN: CONTRATO
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = [
        'empleado', 'tipo_contrato', 'salario_formateado',
        'nivel_arl', 'fecha_inicio', 'fecha_fin', 'activo'
    ]
    list_filter = ['activo', 'tipo_contrato', 'nivel_arl', 'organization']
    search_fields = ['empleado__primer_nombre', 'empleado__numero_documento', 'cargo']
    ordering = ['-fecha_inicio']
    date_hierarchy = 'fecha_inicio'
    raw_id_fields = ['empleado']
    
    fieldsets = (
        ('Empleado', {
            'fields': ('organization', 'empleado')
        }),
        ('Tipo y Salario', {
            'fields': ('tipo_contrato', 'salario', 'nivel_arl', 'cargo')
        }),
        ('Fechas', {
            'fields': ('fecha_inicio', 'fecha_fin', 'activo')
        }),
        ('Observaciones', {
            'fields': ('observaciones',),
            'classes': ('collapse',)
        }),
    )
    
    def salario_formateado(self, obj):
        return f"${obj.salario:,.0f}"
    salario_formateado.short_description = 'Salario'


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN: PARÁMETRO LEGAL
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(ParametroLegal)
class ParametroLegalAdmin(admin.ModelAdmin):
    list_display = [
        'concepto', 'porcentaje_total', 'porcentaje_empleado',
        'porcentaje_empleador', 'valor_fijo_formateado',
        'vigente_desde', 'vigente_hasta', 'activo'
    ]
    list_filter = ['concepto', 'activo', 'organization']
    ordering = ['concepto', '-vigente_desde']
    date_hierarchy = 'vigente_desde'
    
    fieldsets = (
        ('Concepto', {
            'fields': ('organization', 'concepto', 'descripcion')
        }),
        ('Porcentajes', {
            'fields': (
                'porcentaje_total',
                ('porcentaje_empleado', 'porcentaje_empleador')
            )
        }),
        ('Valor Fijo', {
            'fields': ('valor_fijo',),
            'description': 'Solo para SMMLV y Auxilio de Transporte'
        }),
        ('Vigencia', {
            'fields': ('vigente_desde', 'vigente_hasta', 'activo')
        }),
    )
    
    def valor_fijo_formateado(self, obj):
        if obj.valor_fijo > 0:
            return f"${obj.valor_fijo:,.0f}"
        return "-"
    valor_fijo_formateado.short_description = 'Valor Fijo'


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN: CONCEPTO LABORAL
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(ConceptoLaboral)
class ConceptoLaboralAdmin(admin.ModelAdmin):
    list_display = [
        'codigo', 'nombre', 'tipo_badge', 'valor_display',
        'base_calculo', 'es_legal', 'orden', 'activo'
    ]
    list_filter = ['tipo', 'activo', 'es_legal', 'aplica_porcentaje', 'organization']
    search_fields = ['codigo', 'nombre', 'descripcion']
    ordering = ['tipo', 'orden', 'nombre']
    
    fieldsets = (
        ('Identificación', {
            'fields': ('organization', 'codigo', 'nombre', 'descripcion')
        }),
        ('Tipo', {
            'fields': ('tipo', 'es_legal')
        }),
        ('Cálculo', {
            'fields': (
                'aplica_porcentaje',
                ('porcentaje', 'monto_fijo'),
                'base_calculo'
            )
        }),
        ('Configuración', {
            'fields': ('orden', 'activo')
        }),
    )
    
    def tipo_badge(self, obj):
        color = 'green' if obj.tipo == 'DEVENGADO' else 'red'
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 4px;">{}</span>',
            color, obj.get_tipo_display()
        )
    tipo_badge.short_description = 'Tipo'
    
    def valor_display(self, obj):
        if obj.aplica_porcentaje:
            return f"{obj.porcentaje}%"
        return f"${obj.monto_fijo:,.0f}"
    valor_display.short_description = 'Valor'


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN: NÓMINA SIMPLE
# ══════════════════════════════════════════════════════════════════════════════

class NominaItemInline(admin.TabularInline):
    model = NominaItem
    extra = 0
    fields = ['item', 'cantidad', 'valor_unitario', 'valor_total']
    readonly_fields = ['valor_total']


class NominaConceptoInline(admin.TabularInline):
    model = NominaConcepto
    extra = 0
    fields = ['concepto', 'tipo', 'base', 'porcentaje_aplicado', 'valor']
    readonly_fields = ['tipo', 'base', 'porcentaje_aplicado', 'valor']


class NominaPrestamoInline(admin.TabularInline):
    model = NominaPrestamo
    extra = 0
    fields = ['prestamo', 'valor_cuota', 'numero_cuota']
    readonly_fields = ['valor_cuota', 'numero_cuota']


@admin.register(NominaSimple)
class NominaSimpleAdmin(admin.ModelAdmin):
    list_display = [
        'numero', 'empleado_nombre', 'periodo_display',
        'estado_badge', 'total_devengado_fmt', 'total_deducciones_fmt',
        'total_pagar_fmt', 'created_at'
    ]
    list_filter = ['estado', 'organization']
    search_fields = [
        'numero', 'contrato__empleado__primer_nombre',
        'contrato__empleado__numero_documento'
    ]
    ordering = ['-periodo_fin', '-created_at']
    date_hierarchy = 'periodo_fin'
    raw_id_fields = ['contrato']
    inlines = [NominaItemInline, NominaConceptoInline, NominaPrestamoInline]
    
    fieldsets = (
        ('Información General', {
            'fields': ('organization', 'numero', 'contrato')
        }),
        ('Período', {
            'fields': (('periodo_inicio', 'periodo_fin'), 'fecha_pago')
        }),
        ('Estado', {
            'fields': ('estado',)
        }),
        ('Valores Calculados', {
            'fields': (
                ('salario_base', 'ibc'),
                'total_items',
                ('total_devengado', 'total_deducciones'),
                'total_prestamos',
                'total_pagar'
            ),
            'classes': ('collapse',)
        }),
        ('Aportes Empleador', {
            'fields': (
                ('aporte_salud_empleador', 'aporte_pension_empleador'),
                'aporte_arl',
                ('aporte_caja', 'aporte_sena', 'aporte_icbf')
            ),
            'classes': ('collapse',)
        }),
        ('Observaciones', {
            'fields': ('observaciones',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = [
        'salario_base', 'ibc', 'total_items',
        'total_devengado', 'total_deducciones', 'total_prestamos', 'total_pagar',
        'aporte_salud_empleador', 'aporte_pension_empleador', 'aporte_arl',
        'aporte_caja', 'aporte_sena', 'aporte_icbf'
    ]
    
    def empleado_nombre(self, obj):
        return obj.contrato.empleado.nombre_completo
    empleado_nombre.short_description = 'Empleado'
    
    def periodo_display(self, obj):
        return f"{obj.periodo_inicio} - {obj.periodo_fin}"
    periodo_display.short_description = 'Período'
    
    def estado_badge(self, obj):
        colors = {
            'borrador': 'gray',
            'calculada': 'blue',
            'aprobada': 'green',
            'pagada': 'darkgreen',
            'anulada': 'red',
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 4px;">{}</span>',
            colors.get(obj.estado, 'gray'), obj.get_estado_display()
        )
    estado_badge.short_description = 'Estado'
    
    def total_devengado_fmt(self, obj):
        return f"${obj.total_devengado:,.0f}"
    total_devengado_fmt.short_description = 'Devengado'
    
    def total_deducciones_fmt(self, obj):
        return f"${obj.total_deducciones:,.0f}"
    total_deducciones_fmt.short_description = 'Deducciones'
    
    def total_pagar_fmt(self, obj):
        return format_html(
            '<strong style="color: green;">${:,.0f}</strong>',
            obj.total_pagar
        )
    total_pagar_fmt.short_description = 'Neto a Pagar'
