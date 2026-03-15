"""
Script para verificar datos base y crear primera nómina completa
"""

import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from payroll.models.legacy import (
    Empleado, Contrato, PeriodoNomina,
    NominaSimple, DetalleItemNominaSimple, DetalleConceptoNominaSimple,
    NominaElectronica, ConceptoLaboral, TipoContrato
)
from items.models import Item
from core.models import Organizacion
from decimal import Decimal
from datetime import date, timedelta

# Verificar datos existentes
print("=" * 70)
print("📊 VERIFICACIÓN DE DATOS BASE")
print("=" * 70)

# Obtener organización
org = Organizacion.objects.first()
if not org:
    print("\n❌ ERROR: No hay organizaciones. Crea una primero.")
    exit(1)

print(f"\n🏢 Organización: {org.nombre if hasattr(org, 'nombre') else org.codigo}")

# Empleados
empleados = Empleado.objects.all()
print(f"\n👥 Empleados: {empleados.count()}")
if empleados.exists():
    emp = empleados.first()
    print(f"   - Nombre: {emp.nombre_completo}")
    print(f"   - ID: {emp.id}")

# Contratos
contratos = Contrato.objects.filter(activo=True)
print(f"\n📋 Contratos activos: {contratos.count()}")

# Periodos
periodos = PeriodoNomina.objects.all()
print(f"\n📅 Periodos: {periodos.count()}")

# Items
items = Item.objects.filter(activo=True)
print(f"\n📦 Items activos: {items.count()}")
if items.exists():
    print("   Primeros 3 items:")
    for item in items[:3]:
        print(f"   - {item.nombre} (${item.precio_unitario if hasattr(item, 'precio_unitario') else 'N/A'})")

# Conceptos laborales
conceptos = ConceptoLaboral.objects.filter(activo=True)
conceptos_dev = conceptos.filter(tipo_concepto='DEV')
conceptos_ded = conceptos.filter(tipo_concepto='DED')
print(f"\n💰 Conceptos laborales activos: {conceptos.count()}")
print(f"   - Devengados: {conceptos_dev.count()}")
print(f"   - Deducciones: {conceptos_ded.count()}")

# Nóminas
nominas_simples = NominaSimple.objects.all()
nominas_elect = NominaElectronica.objects.all()
print(f"\n💵 Nóminas simples: {nominas_simples.count()}")
print(f"📄 Nóminas electrónicas: {nominas_elect.count()}")

print("\n" + "=" * 70)
print("🎯 CREACIÓN DE DATOS NECESARIOS")
print("=" * 70)

# 1. Crear contrato si no existe
if not contratos.exists() and empleados.exists():
    emp = empleados.first()
    print(f"\n📋 Creando contrato para {emp.nombre_completo}...")
    
    # Buscar tipo de contrato INDEFINIDO
    tipo_indefinido = TipoContrato.objects.filter(codigo='INDEFINIDO').first()
    if not tipo_indefinido:
        print("   ⚠️ Creando tipo de contrato INDEFINIDO...")
        tipo_indefinido = TipoContrato.objects.create(
            organization=org,
            codigo='INDEFINIDO',
            nombre='Contrato a Término Indefinido',
            descripcion='Contrato laboral sin fecha de terminación definida',
            activo=True
        )
    
    contrato = Contrato.objects.create(
        organization=org,
        empleado=emp,
        tipo_contrato=tipo_indefinido,
        fecha_inicio=date(2024, 1, 1),
        salario_base=Decimal('1500000.00'),  # $1,500,000 COP
        nivel_riesgo_arl=1,  # Nivel de riesgo I
        estado='ACT',
        activo=True,
        cargo='Obrero',
        descripcion='Contrato inicial de prueba'
    )
    print(f"   ✅ Contrato creado: ID {contrato.id}, Salario: ${contrato.salario_base:,.0f}")
    contratos = Contrato.objects.filter(activo=True)

# 2. Crear periodo si no existe
if not periodos.exists():
    print(f"\n📅 Creando periodo para Enero 2026...")
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
    periodos = PeriodoNomina.objects.all()

print("\n" + "=" * 70)
print("✅ ESTADO FINAL DEL SISTEMA")
print("=" * 70)

print(f"\n🏢 Organización: {org.nombre if hasattr(org, 'nombre') else org.codigo}")
print(f"👥 Empleados: {empleados.count()}")
print(f"📋 Contratos activos: {contratos.count()}")
print(f"📅 Periodos: {periodos.count()}")
print(f"📦 Items activos: {items.count()}")
print(f"💰 Conceptos laborales: {conceptos.count()}")

if empleados.exists() and contratos.exists() and periodos.exists():
    print("\n" + "=" * 70)
    print("🎉 ¡SISTEMA LISTO PARA CREAR PRIMERA NÓMINA!")
    print("=" * 70)
    
    emp = empleados.first()
    cont = contratos.first()
    per = periodos.first()
    
    print(f"\n📋 DATOS PARA LA PRIMERA NÓMINA:")
    print(f"   Empleado: {emp.nombre_completo} (ID: {emp.id})")
    print(f"   Periodo: {per.nombre} (ID: {per.id})")
    print(f"   Salario Base: ${cont.salario_base:,.0f}")
    print(f"   Días Trabajados: 30")
    
    print(f"\n🚀 PASOS SIGUIENTES:")
    print(f"   1. Abrir frontend: http://localhost:5173")
    print(f"   2. Ir a: Recursos Humanos > Nómina")
    print(f"   3. Clic en [+ Nueva]")
    print(f"   4. Llenar formulario:")
    print(f"      - Empleado: {emp.nombre_completo}")
    print(f"      - Periodo: {per.nombre}")
    print(f"      - Días trabajados: 30")
    print(f"      - Salario base: $1,500,000")
    print(f"   5. Agregar items de trabajo (opcional)")
    print(f"   6. Guardar → Sistema calcula automáticamente")
    print(f"   7. Aprobar nómina")
    print(f"   8. Generar nómina electrónica desde la nómina simple")
    
    print(f"\n💡 O CREAR DESDE BACKEND CON ESTE SCRIPT:")
    print(f"   python crear_primera_nomina.py")
else:
    print("\n⚠️ AÚN FALTAN DATOS. Ejecuta este script de nuevo.")

print("\n" + "=" * 70)
