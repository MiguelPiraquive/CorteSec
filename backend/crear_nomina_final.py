"""
Script CORREGIDO para crear primera nómina
Analiza campos reales de los modelos
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from django.db import models
from payroll.models.legacy import (
    Empleado, Contrato, PeriodoNomina, NominaSimple,
    DetalleItemNominaSimple, DetalleConceptoNominaSimple, 
    ConceptoLaboral, TipoContrato
)
from items.models import Item
from core.models import Organizacion
from decimal import Decimal
from datetime import date

print("\n" + "="*80)
print("🚀 CREACIÓN DE PRIMERA NÓMINA - SCRIPT CORREGIDO")
print("="*80)

# 1. OBTENER ORGANIZACIÓN
org = Organizacion.objects.first()
if not org:
    print("❌ No hay organizaciones. Crea una primero.")
    exit(1)
print(f"\n🏢 Organización: {org.nombre if hasattr(org, 'nombre') else org}")

# 2. OBTENER EMPLEADO
empleado = Empleado.objects.first()
if not empleado:
    print("❌ No hay empleados. Crea uno desde el frontend primero.")
    exit(1)
print(f"👤 Empleado: {empleado.nombre_completo} (ID: {empleado.id})")

# 3. VERIFICAR/CREAR TIPO DE CONTRATO
tipo_contrato = TipoContrato.objects.filter(codigo='INDEFINIDO').first()
if not tipo_contrato:
    print("\n📋 Creando tipo de contrato INDEFINIDO...")
    tipo_contrato = TipoContrato.objects.create(
        codigo='INDEFINIDO',
        nombre='Contrato Indefinido',
        descripcion='Contrato a término indefinido',
        activo=True
    )
    print(f"   ✅ Tipo contrato creado: {tipo_contrato.nombre}")
else:
    print(f"📋 Tipo contrato: {tipo_contrato.nombre}")

# 4. VERIFICAR/CREAR CONTRATO PARA EMPLEADO
contrato = Contrato.objects.filter(empleado=empleado, estado='ACT').first()
if not contrato:
    print("\n💼 Creando contrato para el empleado...")
    contrato = Contrato.objects.create(
        organization=org,
        empleado=empleado,
        tipo_contrato=tipo_contrato,
        tipo_salario='ORD',
        salario_base=Decimal('1500000.00'),
        jornada='DIU',
        auxilio_transporte=True,
        nivel_riesgo_arl=3,
        fecha_inicio=date(2024, 1, 1),
        estado='ACT'
    )
    print(f"   ✅ Contrato creado: Salario ${contrato.salario_base:,.0f}")
else:
    print(f"💼 Contrato existente: Salario ${contrato.salario_base:,.0f}")

# 5. VERIFICAR/CREAR PERIODO DE NÓMINA
# Nota: PeriodoNomina no tiene anio/mes, solo fecha_inicio/fecha_fin/nombre
periodo = PeriodoNomina.objects.filter(
    organization=org,
    fecha_inicio=date(2026, 1, 1),
    fecha_fin=date(2026, 1, 31)
).first()

if not periodo:
    print("\n📅 Creando periodo Enero 2026...")
    periodo = PeriodoNomina.objects.create(
        organization=org,
        nombre='Enero 2026',
        tipo='MEN',  # Mensual (MEN, no MENSUAL)
        fecha_inicio=date(2026, 1, 1),
        fecha_fin=date(2026, 1, 31),
        fecha_pago=date(2026, 1, 31),
        estado='ABI',  # Abierto
        observaciones='Periodo de prueba'
    )
    print(f"   ✅ Periodo creado: {periodo.nombre}")
else:
    print(f"📅 Periodo existente: {periodo.nombre}")

# 6. VERIFICAR ITEMS Y CONCEPTOS
items = Item.objects.filter(activo=True)
conceptos = ConceptoLaboral.objects.filter(activo=True)
print(f"\n📦 Items activos: {items.count()}")
print(f"💰 Conceptos activos: {conceptos.count()}")

# 7. VERIFICAR SI YA EXISTE NÓMINA
nomina_existente = NominaSimple.objects.filter(
    empleado=empleado,
    periodo=periodo
).first()

if nomina_existente:
    print(f"\n📋 NÓMINA EXISTENTE ENCONTRADA:")
    print(f"   Número: {nomina_existente.numero_interno}")
    print(f"   Estado: {nomina_existente.get_estado_display()}")
    
    # Usar la nómina existente
    nomina = nomina_existente
    
    # Calcular total_items desde detalles existentes
    total_items_calculado = nomina.detalles_items.aggregate(
        total=models.Sum('valor_total')
    )['total'] or Decimal('0.00')
    
    # Si no hay items, agregar uno
    if total_items_calculado == Decimal('0.00') and items.exists():
        item = items.first()
        print(f"\n📦 Agregando item: {item.nombre}")
        detalle, created = DetalleItemNominaSimple.objects.get_or_create(
            nomina=nomina,
            item=item,
            defaults={
                'cantidad': Decimal('100'),
                'valor_unitario': Decimal('2500.00'),
                'observaciones': 'Item de prueba'
            }
        )
        detalle.save()  # Force valor_total calculation
        total_items_calculado = detalle.valor_total
        print(f"   ✅ Subtotal item: ${detalle.valor_total:,.0f}")
    
    # Actualizar total_items
    nomina.total_items = total_items_calculado
    nomina.save()
    print(f"   💵 Total items: ${nomina.total_items:,.0f}")
    
    # Procesar
    print("\n🧮 Procesando cálculos...")
    try:
        nomina.procesar_completo()
        nomina.refresh_from_db()
        print(f"   ✅ Nómina procesada exitosamente!")
        print(f"   💰 Neto a pagar: ${nomina.neto_pagar:,.0f}")
    except Exception as e:
        print(f"   ⚠️ Error procesando: {e}")
    
    print(f"\n💡 Ve al frontend: http://localhost:5173/dashboard/nomina")
else:
    # 8. CREAR NÓMINA SIMPLE
    print("\n" + "="*80)
    print("💵 CREANDO NÓMINA SIMPLE")
    print("="*80)
    
    # Generar número interno único
    from datetime import datetime as dt_now
    año = dt_now.now().year
    ultimo = NominaSimple.objects.filter(
        organization=org,
        numero_interno__startswith=f"NOM-{año}"
    ).count()
    numero_interno = f"NOM-{año}-{ultimo + 1:06d}"
    print(f"   📝 Número interno: {numero_interno}")
    
    nomina = NominaSimple.objects.create(
        organization=org,
        empleado=empleado,
        periodo=periodo,
        numero_interno=numero_interno,
        periodo_inicio=periodo.fecha_inicio,
        periodo_fin=periodo.fecha_fin,
        dias_trabajados=30,
        salario_base_contrato=contrato.salario_base,
        estado='BOR'  # Borrador
    )
    
    print(f"\n✅ Nómina creada:")
    print(f"   ID: {nomina.id}")
    print(f"   Número: {nomina.numero_interno}")
    print(f"   Empleado: {nomina.empleado.nombre_completo}")
    print(f"   Periodo: {periodo.nombre}")
    
    # 9. AGREGAR ITEM DE TRABAJO (opcional)
    total_items_calculado = Decimal('0.00')
    if items.exists():
        item = items.first()
        print(f"\n📦 Agregando item: {item.nombre}")
        detalle_item = DetalleItemNominaSimple.objects.create(
            nomina=nomina,
            item=item,
            cantidad=Decimal('100'),
            valor_unitario=Decimal('2500.00'),
            observaciones='Item de prueba'
        )
        total_items_calculado += detalle_item.valor_total
        print(f"   ✅ Subtotal item: ${detalle_item.valor_total:,.0f}")
    
    # Actualizar total_items en la nómina ANTES de procesar
    nomina.total_items = total_items_calculado
    nomina.save()
    print(f"   💵 Total items actualizado: ${nomina.total_items:,.0f}")
    
    # 10. PROCESAR NÓMINA (CÁLCULOS AUTOMÁTICOS)
    print("\n🧮 Procesando cálculos...")
    nomina.procesar_completo()
    nomina.refresh_from_db()
    
    print(f"\n📊 RESULTADO DE CÁLCULOS:")
    print(f"\n   💰 DEVENGADOS:")
    print(f"      Salario base: ${nomina.salario_base_contrato:,.0f}")
    print(f"      Total items: ${nomina.total_items:,.0f}")
    print(f"      IBC: ${nomina.base_cotizacion:,.0f}")
    
    print(f"\n   🏥 SEGURIDAD SOCIAL:")
    print(f"      Salud empleado (4%): ${nomina.aporte_salud_empleado:,.0f}")
    print(f"      Pensión empleado (4%): ${nomina.aporte_pension_empleado:,.0f}")
    print(f"      Salud empleador: ${nomina.aporte_salud_empleador:,.0f}")
    print(f"      Pensión empleador: ${nomina.aporte_pension_empleador:,.0f}")
    print(f"      ARL: ${nomina.aporte_arl:,.0f}")
    
    print(f"\n   📊 PARAFISCALES:")
    print(f"      SENA: ${nomina.aporte_sena:,.0f}")
    print(f"      ICBF: ${nomina.aporte_icbf:,.0f}")
    print(f"      Caja: ${nomina.aporte_caja_compensacion:,.0f}")
    
    print(f"\n   💼 PROVISIONES:")
    print(f"      Cesantías: ${nomina.provision_cesantias:,.0f}")
    print(f"      Prima: ${nomina.provision_prima:,.0f}")
    print(f"      Vacaciones: ${nomina.provision_vacaciones:,.0f}")
    
    print(f"\n   💸 DEDUCCIONES:")
    print(f"      Total deducciones: ${nomina.total_deducciones:,.0f}")
    
    print(f"\n   {'='*60}")
    print(f"   💵 NETO A PAGAR: ${nomina.neto_pagar:,.0f}")
    print(f"   {'='*60}")
    
    # 11. APROBAR NÓMINA
    print("\n✅ Aprobando nómina...")
    nomina.estado = 'APR'
    nomina.save()
    
    print(f"\n🎉 ¡PRIMERA NÓMINA CREADA Y APROBADA!")
    print(f"\n📋 RESUMEN FINAL:")
    print(f"   ID: {nomina.id}")
    print(f"   Número: {nomina.numero_interno}")
    print(f"   Estado: APROBADA")
    print(f"   Empleado: {nomina.empleado.nombre_completo}")
    print(f"   Neto: ${nomina.neto_pagar:,.0f}")
    
    print(f"\n🌐 PRÓXIMOS PASOS:")
    print(f"   1. Ver en frontend: http://localhost:5173/dashboard/nomina")
    print(f"   2. Generar nómina electrónica (si aplica)")
    print(f"   3. Enviar a DIAN")

print("\n" + "="*80)
print("✅ PROCESO COMPLETADO")
print("="*80 + "\n")
