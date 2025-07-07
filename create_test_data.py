#!/usr/bin/env python
"""
Script para crear datos de prueba para el dashboard de CorteSec
"""
import os
import django
import random
from datetime import date, timedelta, datetime
from decimal import Decimal

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from payroll.models import Nomina, Empleado, Cargo
from prestamos.models import Prestamo
from locations.models import Departamento, Municipio

def create_test_data():
    """Crear datos de prueba para el dashboard"""
    print("🚀 Creando datos de prueba para CorteSec...")
    
    # 1. Crear departamentos si no existen
    if not Departamento.objects.exists():
        dept_tech = Departamento.objects.create(nombre="Tecnología", descripcion="Departamento de desarrollo")
        dept_admin = Departamento.objects.create(nombre="Administración", descripcion="Departamento administrativo")
        dept_ventas = Departamento.objects.create(nombre="Ventas", descripcion="Departamento de ventas")
        print("✅ Departamentos creados")
    else:
        dept_tech = Departamento.objects.filter(nombre__icontains="tecno").first() or Departamento.objects.first()
        dept_admin = Departamento.objects.filter(nombre__icontains="admin").first() or Departamento.objects.first()
        dept_ventas = Departamento.objects.filter(nombre__icontains="venta").first() or dept_tech
        print("✅ Usando departamentos existentes")
    
    # 2. Crear cargos adicionales
    cargos_data = [
        "Desarrollador Senior",
        "Desarrollador Junior",
        "Administrador",
        "Vendedor",
        "Gerente",
        "Analista",
        "Diseñador",
        "Soporte Técnico"
    ]
    
    cargos = []
    for cargo_nombre in cargos_data:
        cargo, created = Cargo.objects.get_or_create(nombre=cargo_nombre)
        cargos.append(cargo)
        if created:
            print(f"  ➕ Cargo creado: {cargo_nombre}")
    
    # 3. Crear empleados adicionales
    empleados_data = [
        ("Ana", "García López", "98765432", dept_tech, cargos[0]),
        ("Carlos", "Rodríguez Pérez", "87654321", dept_tech, cargos[1]),
        ("María", "González Silva", "76543210", dept_admin, cargos[2]),
        ("Luis", "Martínez Torres", "65432109", dept_ventas, cargos[3]),
        ("Carmen", "López Díaz", "54321098", dept_admin, cargos[4]),
        ("José", "Hernández Ruiz", "43210987", dept_tech, cargos[5]),
        ("Laura", "Morales Castro", "32109876", dept_tech, cargos[6]),
        ("Diego", "Vargas Mendoza", "21098765", dept_tech, cargos[7]),
    ]
    
    empleados = []
    for nombres, apellidos, documento, dept, cargo in empleados_data:
        empleado, created = Empleado.objects.get_or_create(
            documento=documento,
            defaults={
                'nombres': nombres,
                'apellidos': apellidos,
                'correo': f'{nombres.lower()}.{apellidos.lower().split()[0]}@cortesec.com',
                'fecha_contratacion': date.today() - timedelta(days=random.randint(30, 365)),
                'departamento': dept,
                'cargo': cargo,
            }
        )
        empleados.append(empleado)
        if created:
            print(f"  ➕ Empleado creado: {nombres} {apellidos}")
    
    # Incluir empleados existentes
    for emp in Empleado.objects.all():
        if emp not in empleados:
            empleados.append(emp)
    
    print(f"✅ Total empleados disponibles: {len(empleados)}")
    
    # 4. Crear nóminas históricas
    print("📊 Creando nóminas históricas...")
    
    # Obtener algunos items para usar en las nóminas
    from items.models import Item
    
    # Crear algunos items básicos si no existen
    items_base = [
        ("Corte básico", 15000),
        ("Corte avanzado", 25000),
        ("Peinado", 20000),
        ("Tinte", 35000),
        ("Manicure", 18000),
        ("Pedicure", 22000),
    ]
    
    items = []
    for nombre, precio in items_base:
        item, created = Item.objects.get_or_create(
            name=nombre,
            defaults={'price': Decimal(str(precio))}
        )
        items.append(item)
        if created:
            print(f"  ➕ Item creado: {nombre} - ${precio:,}")
    
    # Usar items existentes también
    for item in Item.objects.all():
        if item not in items:
            items.append(item)
    
    print(f"✅ Items disponibles: {len(items)}")
    
    # Crear nóminas para los últimos 6 meses
    from payroll.models import DetalleNomina
    
    for i in range(6):
        periodo_inicio = date.today().replace(day=1) - timedelta(days=i*30)
        periodo_fin = (periodo_inicio + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        for empleado in empleados:
            # No crear nóminas duplicadas
            if Nomina.objects.filter(empleado=empleado, periodo_inicio=periodo_inicio).exists():
                continue
                
            # Crear nómina base
            seguridad = random.randint(45000, 55000)
            prestamos_descuento = random.randint(0, 20000)
            restaurante = random.randint(8000, 15000)
            
            nomina = Nomina.objects.create(
                empleado=empleado,
                periodo_inicio=periodo_inicio,
                periodo_fin=periodo_fin,
                seguridad=Decimal(str(seguridad)),
                prestamos=Decimal(str(prestamos_descuento)),
                restaurante=Decimal(str(restaurante))
            )
            
            # Agregar detalles de trabajo (items realizados)
            num_items = random.randint(10, 30)  # Cantidad de trabajos realizados
            for _ in range(num_items):
                item = random.choice(items)
                cantidad = random.randint(1, 5)
                
                DetalleNomina.objects.create(
                    nomina=nomina,
                    item=item,
                    cantidad=Decimal(str(cantidad))
                )
            
        print(f"  📅 Nóminas creadas para {periodo_inicio.strftime('%B %Y')}")
    
    # 5. Crear préstamos básicos (omitir por ahora due to complexity)
    print("💰 Saltando creación de préstamos (modelo complejo)...")
    
    # 6. Resumen final
    print("\n📈 RESUMEN DE DATOS CREADOS:")
    print(f"  👥 Empleados: {Empleado.objects.count()}")
    print(f"  💼 Cargos: {Cargo.objects.count()}")
    print(f"  🏢 Departamentos: {Departamento.objects.count()}")
    print(f"  📊 Nóminas: {Nomina.objects.count()}")
    print(f"  💰 Préstamos: {Prestamo.objects.count()}")
    
    print("\n✅ ¡Datos de prueba creados exitosamente!")
    print("🎯 El dashboard ahora debería mostrar gráficos con datos reales.")

if __name__ == "__main__":
    create_test_data()
