from django.contrib import admin
from .models import Rol, AsignacionRol


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = [
        'nombre', 
        'activo', 
        'es_sistema',
        'tiene_restriccion_horario',
        'esta_vigente',
        'fecha_creacion'
    ]
    
    list_filter = [
        'activo',
        'es_sistema',
        'tiene_restriccion_horario',
        'fecha_creacion'
    ]
    
    search_fields = ['nombre', 'descripcion']
    
    readonly_fields = ['fecha_creacion', 'fecha_modificacion']
    
    fieldsets = (
        ('Información básica', {
            'fields': ('nombre', 'descripcion', 'activo', 'es_sistema')
        }),
        ('Control de horarios', {
            'fields': (
                'tiene_restriccion_horario', 
                'hora_inicio', 
                'hora_fin', 
                'dias_semana'
            ),
            'classes': ('collapse',)
        }),
        ('Control de vigencia', {
            'fields': ('fecha_inicio_vigencia', 'fecha_fin_vigencia'),
            'classes': ('collapse',)
        }),
        ('Auditoría', {
            'fields': ('fecha_creacion', 'fecha_modificacion'),
            'classes': ('collapse',)
        }),
    )


@admin.register(AsignacionRol)
class AsignacionRolAdmin(admin.ModelAdmin):
    list_display = [
        'usuario',
        'rol', 
        'activa',
        'esta_vigente',
        'fecha_asignacion',
        'asignado_por'
    ]
    
    list_filter = [
        'activa',
        'rol',
        'fecha_asignacion'
    ]
    
    search_fields = [
        'usuario__username',
        'usuario__first_name',
        'usuario__last_name',
        'rol__nombre'
    ]
    
    readonly_fields = ['fecha_asignacion']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'usuario', 'rol', 'asignado_por'
        )
