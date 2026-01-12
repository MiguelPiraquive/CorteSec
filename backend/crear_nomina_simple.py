"""
Script SIMPLIFICADO para crear primera nómina
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from payroll.models.legacy import (
    Empleado, Contrato, PeriodoNomina, NominaSimple,
    DetalleItemNominaSimple, DetalleConceptoNominaSimple, ConceptoLaboral
)
from items.models import Item
from core.models import Organization
from decimal import Decimal
from datetime import date

print("\n🚀 CREANDO PRIMERA NÓMINA\n")

org = Organization.objects.first()
emp = Empleado.objects.first()

if not emp:
    print("❌ No hay empleados")
    exit(1)

print(f"👤 Empleado: {emp.nombre_completo}")

# Crear periodo
periodo, created = PeriodoNomina.objects.get_or_create(
    organization=org,
    anio=2026,
    mes=1,
    defaults={
        'nombre': 'Enero 2026',
        'fecha_inicio': date(2026, 1, 1),
        'fecha_fin': date(2026, 1, 31),
        'tipo': 'MENSUAL',
        'cerrado': False
    }
)
print(f"📅 Periodo: {periodo.nombre}")

# Crear nómina
nomina, created = NominaSimple.objects.get_or_create(
    organization=org,
    empleado=emp,
    periodo=periodo,
    defaults={
        'periodo_inicio': date(2026, 1, 1),
        'periodo_fin': date(2026, 1, 31),
        'dias_trabajados': 30,
        'salario_base_contrato': Decimal('1500000'),
        'estado': 'BOR'
    }
)

if created:
    print(f"✅ Nómina creada: {nomina.numero_interno}")
    
    # Calcular
    nomina.procesar_completo()
    nomina.refresh_from_db()
    
    print(f"\n💵 RESULTADO:")
    print(f"   Salario: ${nomina.salario_base_contrato:,.0f}")
    print(f"   IBC: ${nomina.base_cotizacion:,.0f}")
    print(f"   Deducciones: ${nomina.total_deducciones:,.0f}")
    print(f"   NETO: ${nomina.neto_pagar:,.0f}")
    
    # Aprobar
    nomina.estado = 'APR'
    nomina.save()
    print(f"\n✅ Nómina aprobada!")
    print(f"\n🌐 Ve al frontend: http://localhost:5173/dashboard/nomina")
else:
    print(f"⚠️ Ya existe nómina: {nomina.numero_interno}")
    print(f"   Neto: ${nomina.neto_pagar:,.0f}")
