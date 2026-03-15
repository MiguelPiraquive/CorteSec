# dashboard/serializers.py
"""
SERIALIZERS PARA DRF - DASHBOARD
=================================

Serializers para las APIs REST del dashboard y proyectos.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Project, AsignacionProyecto, ActiveProject

User = get_user_model()


class ProjectResponsableSerializer(serializers.ModelSerializer):
    """Serializer mínimo para el responsable del proyecto."""
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'nombre']

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer completo para proyectos"""
    responsable_detail = ProjectResponsableSerializer(source='responsable', read_only=True)
    gasto_acumulado = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    presupuesto_restante = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    porcentaje_ejecucion = serializers.FloatField(read_only=True)
    empleados_count = serializers.IntegerField(read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    prioridad_display = serializers.CharField(source='get_prioridad_display', read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'codigo_proyecto', 'name', 'description',
            'estado', 'estado_display', 'prioridad', 'prioridad_display', 'progreso',
            'presupuesto_estimado', 'presupuesto_aprobado', 'moneda',
            'gasto_acumulado', 'presupuesto_restante', 'porcentaje_ejecucion',
            'responsable', 'responsable_detail', 'cliente', 'centro_costo',
            'color', 'icono', 'tags',
            'start_date', 'end_date', 'fecha_real_fin',
            'notas_internas', 'empleados_count',
            'created_at', 'updated_at', 'created_by',
        ]
        read_only_fields = ['id', 'codigo_proyecto', 'created_at', 'updated_at', 'created_by']


class ProjectSummarySerializer(serializers.ModelSerializer):
    """Serializer resumido para listados, selectores y dropdowns."""
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = Project
        fields = ['id', 'codigo_proyecto', 'name', 'estado', 'estado_display', 'color', 'icono', 'start_date', 'end_date']


class AsignacionProyectoSerializer(serializers.ModelSerializer):
    """Serializer para asignaciones de empleados a proyectos."""
    empleado_nombre = serializers.SerializerMethodField()
    proyecto_nombre = serializers.CharField(source='proyecto.name', read_only=True)

    class Meta:
        model = AsignacionProyecto
        fields = [
            'id', 'proyecto', 'proyecto_nombre',
            'empleado', 'empleado_nombre',
            'fecha_asignacion', 'fecha_desasignacion', 'activo',
            'observaciones', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_empleado_nombre(self, obj):
        return getattr(obj.empleado, 'nombre_completo', str(obj.empleado))


class ActiveProjectSerializer(serializers.ModelSerializer):
    """Serializer para el proyecto activo del usuario."""
    project_detail = ProjectSummarySerializer(source='project', read_only=True)

    class Meta:
        model = ActiveProject
        fields = ['id', 'mode', 'project', 'project_detail', 'updated_at']
        read_only_fields = ['id', 'updated_at']
