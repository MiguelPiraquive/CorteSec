"""
Script COMPLETO para crear la primera nómina
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from payroll.models.legacy import (
    Empleado, Contrato, PeriodoNomina,
    NominaSimple, DetalleItemNominaSimple, DetalleConceptoNominaSimple,
    ConceptoLaboral, TipoContrato
)
from items.models import Item
from core.models import Organization
from decimal import Decimal
from datetime import date

print("\n" + "="*80)
print("🚀 CREACIÓN DE PRIMERA NÓMINA COMPLETA - CORTESEC")
print("="*80)

# Obtener organización
org = Organization.objects.first()
print(f"\n🏢 Organización: {org.name if hasattr(org, 'name') else org.codigo}")

# Obtener o crear empleado
empleado = Empleado.objects.first()
if not empleado:
    print("\n❌ No hay empleados. Crea uno desde el frontend primero.")
    exit(1)

print(f"👤 Empleado: {empleado.nombre_completo} (ID: {empleado.id})")

# Obtener o crear contrato
contratos = Contrato.objects.filter(empleado=empleado, estado='ACT')
if not contratos.exists():
    print("\n📋 Creando contrato...")
    
    # Crear/obtener tipo de contrato
    tipo_indefinido, created = TipoContrato.objects.get_or_create(
        organization=org,
        codigo='INDEFINIDO',
        defaults={
            'nombre': 'Contrato a Término Indefinido',
            'descripcion': 'Contrato laboral sin fecha de terminación',
        }
    )
    
    contrato = Contrato.objects.create(
        organization=org,
        empleado=empleado,
        tipo_contrato=tipo_indefinido,
        fecha_inicio=date(2024, 1, 1),
        salario_base=Decimal('1500000.00'),
        nivel_riesgo_arl=1,
        estado='ACT'
    )
    print(f"   ✅ Contrato creado: ${contrato.salario_base:,.0f}")
else:
    contrato = contratos.first()
    print(f"📋 Contrato existente: ${contrato.salario_base:,.0f}")

# Obtener o crear periodo
periodos = PeriodoNomina.objects.filter(anio=2026, mes=1)
if not periodos.exists():
    print("\n📅 Creando periodo Enero 2026...")
    periodo = PeriodoNomina.objects.create(
        organization=org,
        nombre='Enero 2026',
        fecha_inicio=date(2026, 1, 1),
        fecha_fin=date(2026, 1, 31),
        tipo='MENSUAL',
        anio=2026,
        mes=1,
        cerrado=False
    )
    print(f"   ✅ Periodo creado: {periodo.nombre}")
else:
    periodo = periodos.first()
    print(f"📅 Periodo existente: {periodo.nombre}")

# Verificar items y conceptos
items = Item.objects.filter(activo=True)
conceptos_dev = ConceptoLaboral.objects.filter(activo=True, tipo_concepto='DEV')
conceptos_ded = ConceptoLaboral.objects.filter(activo=True, tipo_concepto='DED')

print(f"\n📦 Items disponibles: {items.count()}")
print(f"💰 Conceptos devengados: {conceptos_dev.count()}")
print(f"💸 Conceptos deducciones: {conceptos_ded.count()}")

# Verificar si ya existe nómina para este empleado y periodo
nomina_existente = NominaSimple.objects.filter(
    empleado=empleado,
    periodo=periodo
).first()

if nomina_existente:
    print(f"\n⚠️ YA EXISTE UNA NÓMINA:")
    print(f"   Número: {nomina_existente.numero_interno}")
    print(f"   Estado: {nomina_existente.get_estado_display()}")
    print(f"   Neto a pagar: ${nomina_existente.neto_pagar:,.0f}")
    print(f"\n💡 Usa el frontend para ver/editar esta nómina")
    exit(0)

# CREAR NÓMINA SIMPLE
print("\n" + "="*80)
print("💵 CREANDO NÓMINA SIMPLE")
print("="*80)

nomina = NominaSimple.objects.create(
    organization=org,
    empleado=empleado,
    periodo=periodo,
    periodo_inicio=periodo.fecha_inicio,
    periodo_fin=periodo.fecha_fin,
    dias_trabajados=30,
    salario_base_contrato=contrato.salario_base,
    estado='BOR'  # Borrador
)

print(f"\n✅ Nómina creada:")
print(f"   Número: {nomina.numero_interno}")
print(f"   Empleado: {nomina.empleado.nombre_completo}")
print(f"   Periodo: {periodo.nombre}")
print(f"   Días: {nomina.dias_trabajados}")
print(f"   Salario base: ${nomina.salario_base_contrato:,.0f}")

# AGREGAR ITEMS (opcional - si existen)
if items.exists():
    print("\n📦 Agregando items de trabajo...")
    item = items.first()
    detalle_item = DetalleItemNominaSimple.objects.create(
        nomina=nomina,
        item=item,
        cantidad=Decimal('250'),
        valor_unitario=Decimal('1000.00'),  # $1,000 por unidad
        observaciones='Items de prueba para primera nómina'
    )
    print(f"   ✅ Item agregado: {item.nombre} x {detalle_item.cantidad}")
    print(f"      Subtotal: ${detalle_item.valor_total:,.0f}")

# AGREGAR CONCEPTOS ADICIONALES
print("\n💰 Agregando conceptos laborales...")

# Buscar auxilio de transporte
auxilio = conceptos_dev.filter(codigo__icontains='AUX').first()
if auxilio:
    detalle_concepto = DetalleConceptoNominaSimple.objects.create(
        nomina=nomina,
        concepto=auxilio,
        cantidad=Decimal('1'),
        valor_unitario=Decimal('162000.00'),  # Auxilio 2026
        observaciones='Auxilio de transporte'
    )
    print(f"   ✅ {auxilio.nombre}: ${detalle_concepto.valor_total:,.0f}")

# CALCULAR NÓMINA AUTOMÁTICAMENTE
print("\n" + "="*80)
print("🧮 CALCULANDO NÓMINA AUTOMÁTICAMENTE")
print("="*80)

nomina.procesar_completo()
nomina.refresh_from_db()

print(f"\n✅ CÁLCULOS COMPLETOS:")
print(f"\n💰 DEVENGADOS:")
print(f"   Salario base: ${nomina.salario_base_contrato:,.0f}")
print(f"   Total items: ${nomina.total_items:,.0f}")
print(f"   Base cotización (IBC): ${nomina.base_cotizacion:,.0f}")

print(f"\n🏥 SEGURIDAD SOCIAL:")
print(f"   Salud empleado (4%): ${nomina.aporte_salud_empleado:,.0f}")
print(f"   Pensión empleado (4%): ${nomina.aporte_pension_empleado:,.0f}")
print(f"   Salud empleador (8.5%): ${nomina.aporte_salud_empleador:,.0f}")
print(f"   Pensión empleador (12%): ${nomina.aporte_pension_empleador:,.0f}")
print(f"   ARL: ${nomina.aporte_arl:,.0f}")

print(f"\n📊 PARAFISCALES:")
print(f"   SENA (2%): ${nomina.aporte_sena:,.0f}")
print(f"   ICBF (3%): ${nomina.aporte_icbf:,.0f}")
print(f"   Caja (4%): ${nomina.aporte_caja_compensacion:,.0f}")

print(f"\n💼 PROVISIONES:")
print(f"   Cesantías (8.33%): ${nomina.provision_cesantias:,.0f}")
print(f"   Prima (8.33%): ${nomina.provision_prima:,.0f}")
print(f"   Vacaciones (4.17%): ${nomina.provision_vacaciones:,.0f}")

print(f"\n💸 DEDUCCIONES:")
print(f"   Préstamos: ${nomina.deduccion_prestamos:,.0f}")
print(f"   Total deducciones: ${nomina.total_deducciones:,.0f}")

print(f"\n💵 RESULTADO FINAL:")
print(f"   {'='*60}")
print(f"   NETO A PAGAR: ${nomina.neto_pagar:,.0f}")
print(f"   {'='*60}")

# APROBAR NÓMINA
print("\n✅ Aprobando nómina...")
nomina.estado = 'APR'  # Aprobada
nomina.save()

print(f"\n🎉 ¡PRIMERA NÓMINA CREADA EXITOSAMENTE!")
print(f"\n📋 RESUMEN:")
print(f"   ID: {nomina.id}")
print(f"   Número: {nomina.numero_interno}")
print(f"   Estado: {nomina.get_estado_display()}")
print(f"   Empleado: {nomina.empleado.nombre_completo}")
print(f"   Periodo: {periodo.nombre}")
print(f"   Neto a pagar: ${nomina.neto_pagar:,.0f}")

print(f"\n🚀 PRÓXIMOS PASOS:")
print(f"   1. Ver en frontend: http://localhost:5173/dashboard/nomina")
print(f"   2. Generar nómina electrónica desde esta nómina simple")
print(f"   3. Enviar a DIAN para obtener CUNE")

print(f"\n💡 COMANDOS RÁPIDOS:")
print(f"   - Ver nómina: python manage.py shell")
print(f"     >>> from payroll.models.legacy import NominaSimple")
print(f"     >>> nomina = NominaSimple.objects.get(id={nomina.id})")
print(f"     >>> print(nomina)")

print("\n" + "="*80)
