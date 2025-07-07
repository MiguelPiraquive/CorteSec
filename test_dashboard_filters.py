#!/usr/bin/env python3
"""
Test script para verificar la funcionalidad de los filtros del dashboard
"""

import os
import sys
import django
import json
from datetime import datetime, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse
from payroll.models import Empleado, Cargo, Nomina
from locations.models import Departamento
from prestamos.models import Prestamo, TipoPrestamo

User = get_user_model()

def test_dashboard_filters():
    """Test de funcionalidad de filtros del dashboard"""
    print("🧪 Iniciando test de filtros del dashboard...")
    
    client = Client()
    
    # Crear usuario de prueba
    try:
        user = User.objects.get(username='admin')
    except User.DoesNotExist:
        user = User.objects.create_user(username='admin', password='admin123')
    
    # Login
    client.force_login(user)
    
    # Test 1: Dashboard principal se carga
    print("\n1️⃣ Probando carga del dashboard principal...")
    response = client.get('/dashboard/')
    print(f"   Status: {response.status_code}")
    print(f"   Template: {response.templates[0].name if response.templates else 'None'}")
    
    # Test 2: API de filtros GET (opciones)
    print("\n2️⃣ Probando API de filtros GET (opciones)...")
    response = client.get('/dashboard/api/filtros/')
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Success: {data.get('success', False)}")
        if data.get('opciones'):
            print(f"   Departamentos: {len(data['opciones'].get('departamentos', []))}")
            print(f"   Cargos: {len(data['opciones'].get('cargos', []))}")
            if data['opciones'].get('rangos'):
                print(f"   Rango salarial: {data['opciones']['rangos'].get('salario', {})}")
                print(f"   Rango experiencia: {data['opciones']['rangos'].get('experiencia', {})}")
    
    # Test 3: API de filtros POST (aplicar filtros)
    print("\n3️⃣ Probando API de filtros POST (aplicar filtros)...")
    filtros_test = {
        'globalSearch': '',
        'quickFilters': [],
        'dateFrom': '',
        'dateTo': '',
        'department': '',
        'cargo': '',
        'location': '',
        'salaryRange': [0, 5000000],
        'experienceRange': [0, 10],
        'onlyActive': False,
        'withLoans': False,
        'recentPayroll': False,
        'newEmployees': False
    }
    
    response = client.post('/dashboard/api/filtros/', 
                          data=json.dumps(filtros_test),
                          content_type='application/json')
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Success: {data.get('success', False)}")
        print(f"   Total resultados: {data.get('total_resultados', 0)}")
        print(f"   Resultados encontrados: {len(data.get('resultados', []))}")
    
    # Test 4: Verificar modelos relacionados
    print("\n4️⃣ Verificando modelos en la base de datos...")
    print(f"   Empleados: {Empleado.objects.count()}")
    print(f"   Cargos: {Cargo.objects.count()}")
    print(f"   Nóminas: {Nomina.objects.count()}")
    print(f"   Departamentos: {Departamento.objects.count()}")
    print(f"   Préstamos: {Prestamo.objects.count()}")
    
    # Test 5: Verificar Alpine.js store
    print("\n5️⃣ Verificando archivo Alpine.js...")
    store_path = 'static/js/dashboard-alpine-store.js'
    if os.path.exists(store_path):
        with open(store_path, 'r', encoding='utf-8') as f:
            content = f.read()
            print(f"   Archivo existe: ✅")
            print(f"   Tamaño: {len(content)} caracteres")
            print(f"   Contiene updateSalaryRange: {'updateSalaryRange' in content}")
            print(f"   Contiene updateExperienceRange: {'updateExperienceRange' in content}")
    else:
        print(f"   ❌ Archivo no encontrado: {store_path}")
    
    print("\n✅ Test completado!")

if __name__ == '__main__':
    test_dashboard_filters()
