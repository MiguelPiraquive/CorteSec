# payroll/serializers_direct.py
from rest_framework import serializers
from .models import NominaElectronica, Empleado, PeriodoNomina


class NominaElectronicaDirectCreateSerializer(serializers.Serializer):
    """
    Serializer para crear nómina electrónica DIRECTAMENTE e INDEPENDIENTEMENTE
    SIN crear nómina simple de RRHH
    """
    empleado = serializers.IntegerField(required=True)
    periodo = serializers.IntegerField(required=True)
    dias_trabajados = serializers.IntegerField(default=30)
    observaciones = serializers.CharField(required=False, allow_blank=True)
    
    def validate_empleado(self, value):
        try:
            return Empleado.objects.get(id=value)
        except Empleado.DoesNotExist:
            raise serializers.ValidationError("Empleado no encontrado")
    
    def validate_periodo(self, value):
        try:
            return PeriodoNomina.objects.get(id=value)
        except PeriodoNomina.DoesNotExist:
            raise serializers.ValidationError("Periodo no encontrado")
    
    def create(self, validated_data):
        empleado = validated_data['empleado']
        periodo = validated_data['periodo']
        organization = self.context['request'].user.organization
        
        # Crear SOLO nómina electrónica (SIN nómina simple)
        nomina_electronica = NominaElectronica.objects.create(
            organization=organization,
            empleado=empleado,
            periodo=periodo,
            periodo_inicio=periodo.fecha_inicio,
            periodo_fin=periodo.fecha_fin,
            dias_trabajados=validated_data.get('dias_trabajados', 30),
            estado='BORRADOR',
            observaciones=validated_data.get('observaciones', ''),
            generado_por=self.context['request'].user,
            nomina=None  # SIN relación a nómina simple
        )
        
        nomina_electronica.generar_numero_documento()
        nomina_electronica.save()
        
        return nomina_electronica
