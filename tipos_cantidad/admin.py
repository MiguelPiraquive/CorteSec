from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import TipoCantidad


@admin.register(TipoCantidad)
class TipoCantidadAdmin(admin.ModelAdmin):
    list_display = [
        'codigo', 
        'descripcion', 
        'simbolo', 
        'activo', 
        'es_sistema',
        'orden',
        'fecha_creacion'
    ]
    
    list_filter = [
        'activo',
        'es_sistema',
        'fecha_creacion'
    ]
    
    search_fields = [
        'codigo',
        'descripcion',
        'simbolo'
    ]
    
    list_editable = [
        'activo',
        'orden'
    ]
    
    readonly_fields = [
        'fecha_creacion',
        'fecha_modificacion'
    ]
    
    fieldsets = (
        (_('Información básica'), {
            'fields': ('codigo', 'descripcion', 'simbolo')
        }),
        (_('Configuración'), {
            'fields': ('activo', 'es_sistema', 'orden')
        }),
        (_('Auditoría'), {
            'fields': ('fecha_creacion', 'fecha_modificacion'),
            'classes': ('collapse',)
        }),
    )
    
    ordering = ['orden', 'codigo']
    
    def has_delete_permission(self, request, obj=None):
        if obj and obj.es_sistema:
            return False
        return super().has_delete_permission(request, obj)
