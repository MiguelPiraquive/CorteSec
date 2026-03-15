"""
Script para actualizar PlanFeatures con nombres funcionales orientados al usuario.

Elimina features técnicos (API RESTful, SSO, audit logs) y los reemplaza
con descripciones funcionales del sistema que el usuario entiende.

Ejecutar: python update_plan_features.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from core.models import Plan
from billing.models import PlanFeature

# ═══════════════════════════════════════
# Definición de features funcionales
# ═══════════════════════════════════════
# Cada feature tiene:
#   code: identificador interno
#   name: nombre visible al usuario (funcional)
#   Planes: FREE, BASIC, PRO, ENTERPRISE con enabled y limit

FEATURES = [
    # ───── Gestión de Empleados ─────
    {
        'code': 'empleados',
        'name': 'Gestión de empleados',
        'plans': {
            'FREE':       {'enabled': True,  'limit': 10},
            'BASIC':      {'enabled': True,  'limit': 50},
            'PRO':        {'enabled': True,  'limit': 500},
            'ENTERPRISE': {'enabled': True,  'limit': 9999},
        }
    },
    {
        'code': 'cargos',
        'name': 'Cargos y organigrama',
        'plans': {
            'FREE':       {'enabled': True,  'limit': None},
            'BASIC':      {'enabled': True,  'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },
    {
        'code': 'contratos',
        'name': 'Contratos laborales',
        'plans': {
            'FREE':       {'enabled': True,  'limit': None},
            'BASIC':      {'enabled': True,  'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },

    # ───── Nómina ─────
    {
        'code': 'nomina_basica',
        'name': 'Liquidación de nómina básica',
        'plans': {
            'FREE':       {'enabled': True,  'limit': 2},    # 2 nóminas/mes
            'BASIC':      {'enabled': True,  'limit': 10},   # 10 nóminas/mes
            'PRO':        {'enabled': True,  'limit': 50},   # 50 nóminas/mes
            'ENTERPRISE': {'enabled': True,  'limit': 9999}, # ilimitado
        }
    },
    {
        'code': 'nomina_completa',
        'name': 'Nómina con deducciones y devengados',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': True,  'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },
    {
        'code': 'nomina_electronica',
        'name': 'Nómina electrónica DIAN',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': False, 'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },
    {
        'code': 'conceptos_laborales',
        'name': 'Conceptos laborales personalizados',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': True,  'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },

    # ───── Finanzas ─────
    {
        'code': 'prestamos',
        'name': 'Gestión de préstamos a empleados',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': True,  'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },
    {
        'code': 'contabilidad',
        'name': 'Módulo de contabilidad',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': False, 'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },

    # ───── Reportes ─────
    {
        'code': 'reportes_basicos',
        'name': 'Reportes y resúmenes básicos',
        'plans': {
            'FREE':       {'enabled': True,  'limit': None},
            'BASIC':      {'enabled': True,  'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },
    {
        'code': 'reportes_avanzados',
        'name': 'Reportes avanzados y exportación Excel/PDF',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': True,  'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },

    # ───── Operaciones ─────
    {
        'code': 'proyectos',
        'name': 'Gestión de proyectos',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': False, 'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },
    {
        'code': 'multi_sucursal',
        'name': 'Múltiples sucursales y sedes',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': False, 'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },

    # ───── Configuración ─────
    {
        'code': 'personalizacion',
        'name': 'Personalización de marca y colores',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': False, 'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },
    {
        'code': 'notificaciones_email',
        'name': 'Notificaciones por correo electrónico',
        'plans': {
            'FREE':       {'enabled': True,  'limit': None},
            'BASIC':      {'enabled': True,  'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },

    # ───── Seguridad y Usuarios ─────
    {
        'code': 'usuarios',
        'name': 'Usuarios del sistema',
        'plans': {
            'FREE':       {'enabled': True,  'limit': 5},
            'BASIC':      {'enabled': True,  'limit': 20},
            'PRO':        {'enabled': True,  'limit': 100},
            'ENTERPRISE': {'enabled': True,  'limit': 9999},
        }
    },
    {
        'code': 'roles_permisos',
        'name': 'Roles y permisos personalizados',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': True,  'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },
    {
        'code': 'auditoria',
        'name': 'Historial de actividad y auditoría',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': False, 'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },

    # ───── Soporte ─────
    {
        'code': 'soporte_email',
        'name': 'Soporte por correo electrónico',
        'plans': {
            'FREE':       {'enabled': True,  'limit': None},
            'BASIC':      {'enabled': True,  'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },
    {
        'code': 'soporte_prioritario',
        'name': 'Soporte prioritario con respuesta rápida',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': False, 'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },
    {
        'code': 'soporte_dedicado',
        'name': 'Soporte dedicado 24/7 con gerente de cuenta',
        'plans': {
            'FREE':       {'enabled': False, 'limit': None},
            'BASIC':      {'enabled': False, 'limit': None},
            'PRO':        {'enabled': False, 'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },
    {
        'code': 'centro_ayuda',
        'name': 'Centro de ayuda y tutoriales',
        'plans': {
            'FREE':       {'enabled': True,  'limit': None},
            'BASIC':      {'enabled': True,  'limit': None},
            'PRO':        {'enabled': True,  'limit': None},
            'ENTERPRISE': {'enabled': True,  'limit': None},
        }
    },
]


def run():
    print("═" * 60)
    print("  Actualizando PlanFeatures con nombres funcionales")
    print("═" * 60)
    
    plans = {p.code: p for p in Plan.objects.all()}
    
    if not plans:
        print("❌ No hay planes en la DB")
        return
    
    print(f"\nPlanes encontrados: {', '.join(plans.keys())}")
    
    # 1. Eliminar features antiguos
    old_count = PlanFeature.objects.count()
    PlanFeature.objects.all().delete()
    print(f"\n🗑️  Eliminados {old_count} features antiguos")
    
    # 2. Crear features nuevos
    created = 0
    for feat in FEATURES:
        for plan_code, config in feat['plans'].items():
            plan = plans.get(plan_code)
            if not plan:
                print(f"  ⚠️  Plan {plan_code} no encontrado, saltando")
                continue
            
            PlanFeature.objects.create(
                plan=plan,
                feature_code=feat['code'],
                feature_name=feat['name'],
                enabled=config['enabled'],
                limit_value=config.get('limit'),
            )
            created += 1
    
    print(f"✅ Creados {created} features nuevos\n")
    
    # 3. Resumen por plan
    for code in ['FREE', 'BASIC', 'PRO', 'ENTERPRISE']:
        plan = plans.get(code)
        if not plan:
            continue
        features = PlanFeature.objects.filter(plan=plan)
        enabled = features.filter(enabled=True).count()
        total = features.count()
        print(f"📦 {plan.name} ({code}): {enabled}/{total} features habilitados")
        for f in features.filter(enabled=True):
            limit_str = f" (máx {f.limit_value})" if f.limit_value else ""
            print(f"   ✓ {f.feature_name}{limit_str}")
        print()
    
    print("═" * 60)
    print("  ✅ Actualización completada")
    print("═" * 60)


if __name__ == '__main__':
    run()
