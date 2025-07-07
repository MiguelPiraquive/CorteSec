#!/usr/bin/env python
"""
Script para verificar los datos del dashboard
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from payroll.models import Nomina, Empleado
from prestamos.models import Prestamo

print('📊 Verificación de datos para dashboard:')
print(f'  👥 Empleados totales: {Empleado.objects.count()}')
print(f'  📊 Nóminas totales: {Nomina.objects.count()}')
print(f'  💰 Préstamos totales: {Prestamo.objects.count()}')

# Verificar nóminas con producción
print('\n🔍 Verificando nóminas:')
nominas_con_produccion = 0
total_produccion = 0

for i, nomina in enumerate(Nomina.objects.all()[:10]):
    produccion = nomina.produccion
    total = nomina.total
    if produccion > 0:
        nominas_con_produccion += 1
        total_produccion += float(produccion)
    
    if i < 5:  # Mostrar solo las primeras 5
        print(f'  📋 {nomina.empleado.nombres}: Prod=${produccion:,.0f}, Total=${total:,.0f}')

print(f'\n✅ Nóminas con producción: {nominas_con_produccion}/{Nomina.objects.count()}')
print(f'💵 Producción total: ${total_produccion:,.0f}')

# Verificar empleados por mes
from datetime import date, timedelta
print('\n📅 Empleados por mes:')
for i in range(3):
    inicio_mes = date.today().replace(day=1) - timedelta(days=i*30)
    empleados_mes = Empleado.objects.filter(fecha_contratacion__year=inicio_mes.year, fecha_contratacion__month=inicio_mes.month).count()
    print(f'  {inicio_mes.strftime("%B %Y")}: {empleados_mes} empleados')

print('\n🎯 ¡Los datos están listos para el dashboard!')
