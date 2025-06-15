from django.contrib import admin
from .models import Cargo, Empleado, Nomina, DetalleNomina

@admin.register(Cargo)
class CargoAdmin(admin.ModelAdmin):
    list_display = ('nombre',)
    search_fields = ('nombre',)

@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = ('nombres', 'apellidos', 'documento', 'correo', 'cargo', 'telefono')
    search_fields = ('nombres', 'apellidos', 'documento', 'correo')
    list_filter = ('cargo', 'genero')
    readonly_fields = ('creado_el', 'actualizado_el')
    fieldsets = (
        (None, {
            'fields': ('nombres', 'apellidos', 'documento', 'correo', 'telefono', 'direccion', 'fecha_nacimiento', 'genero', 'cargo', 'foto')
        }),
        ('Tiempos', {
            'fields': ('creado_el', 'actualizado_el'),
            'classes': ('collapse',),
        }),
    )

class DetalleNominaInline(admin.TabularInline):
    model = DetalleNomina
    extra = 1

@admin.register(Nomina)
class NominaAdmin(admin.ModelAdmin):
    list_display = ('empleado', 'periodo_inicio', 'periodo_fin', 'produccion', 'seguridad', 'prestamos', 'restaurante', 'total')
    search_fields = ('empleado__nombres', 'empleado__apellidos')
    list_filter = ('periodo_inicio', 'periodo_fin', 'empleado')
    readonly_fields = ('creado_el', 'actualizado_el', 'produccion', 'total')
    inlines = [DetalleNominaInline]
    fieldsets = (
        (None, {
            'fields': ('empleado', 'periodo_inicio', 'periodo_fin', 'seguridad', 'prestamos', 'restaurante')
        }),
        ('Cálculos', {
            'fields': ('produccion', 'total'),
        }),
        ('Tiempos', {
            'fields': ('creado_el', 'actualizado_el'),
            'classes': ('collapse',),
        }),
    )

@admin.register(DetalleNomina)
class DetalleNominaAdmin(admin.ModelAdmin):
    list_display = ('nomina', 'item', 'cantidad', 'total')
    search_fields = ('nomina__empleado__nombres', 'item__nombre')
    list_filter = ('item',)