"""
Seed de PlanFeature — Features por cada plan.
"""

from django.db import migrations


FEATURE_DEFINITIONS = {
    # (feature_code, feature_name)
    'nomina_basica':       'Gestión básica de nómina',
    'nomina_completa':     'Nómina completa con deducciones',
    'nomina_electronica':  'Nómina electrónica DIAN',
    'prestamos':           'Módulo de préstamos',
    'contabilidad':        'Módulo de contabilidad',
    'reportes_basicos':    'Reportes básicos',
    'reportes_avanzados':  'Reportes avanzados y exportación',
    'api_access':          'Acceso API RESTful',
    'multi_sucursal':      'Soporte multi-sucursal',
    'custom_branding':     'Branding personalizado',
    'email_notifications': 'Notificaciones por email',
    'sso':                 'Single Sign-On',
    'audit_logs':          'Logs de auditoría avanzados',
    'support_email':       'Soporte por email',
    'support_priority':    'Soporte prioritario',
    'support_dedicated':   'Soporte dedicado 24/7',
    'max_empleados':       'Límite de empleados',
    'max_nominas_mes':     'Límite de nóminas por mes',
}

# plan_code → { feature_code: (enabled, limit_value|None) }
PLAN_FEATURES = {
    'FREE': {
        'nomina_basica':       (True, None),
        'nomina_completa':     (False, None),
        'nomina_electronica':  (False, None),
        'prestamos':           (False, None),
        'contabilidad':        (False, None),
        'reportes_basicos':    (True, None),
        'reportes_avanzados':  (False, None),
        'api_access':          (False, None),
        'multi_sucursal':      (False, None),
        'custom_branding':     (False, None),
        'email_notifications': (True, None),
        'sso':                 (False, None),
        'audit_logs':          (False, None),
        'support_email':       (True, None),
        'support_priority':    (False, None),
        'support_dedicated':   (False, None),
        'max_empleados':       (True, 10),
        'max_nominas_mes':     (True, 2),
    },
    'BASIC': {
        'nomina_basica':       (True, None),
        'nomina_completa':     (True, None),
        'nomina_electronica':  (False, None),
        'prestamos':           (True, None),
        'contabilidad':        (False, None),
        'reportes_basicos':    (True, None),
        'reportes_avanzados':  (True, None),
        'api_access':          (False, None),
        'multi_sucursal':      (False, None),
        'custom_branding':     (False, None),
        'email_notifications': (True, None),
        'sso':                 (False, None),
        'audit_logs':          (False, None),
        'support_email':       (True, None),
        'support_priority':    (False, None),
        'support_dedicated':   (False, None),
        'max_empleados':       (True, 50),
        'max_nominas_mes':     (True, 10),
    },
    'PRO': {
        'nomina_basica':       (True, None),
        'nomina_completa':     (True, None),
        'nomina_electronica':  (True, None),
        'prestamos':           (True, None),
        'contabilidad':        (True, None),
        'reportes_basicos':    (True, None),
        'reportes_avanzados':  (True, None),
        'api_access':          (True, None),
        'multi_sucursal':      (True, None),
        'custom_branding':     (True, None),
        'email_notifications': (True, None),
        'sso':                 (False, None),
        'audit_logs':          (True, None),
        'support_email':       (True, None),
        'support_priority':    (True, None),
        'support_dedicated':   (False, None),
        'max_empleados':       (True, 500),
        'max_nominas_mes':     (True, 50),
    },
    'ENTERPRISE': {
        'nomina_basica':       (True, None),
        'nomina_completa':     (True, None),
        'nomina_electronica':  (True, None),
        'prestamos':           (True, None),
        'contabilidad':        (True, None),
        'reportes_basicos':    (True, None),
        'reportes_avanzados':  (True, None),
        'api_access':          (True, None),
        'multi_sucursal':      (True, None),
        'custom_branding':     (True, None),
        'email_notifications': (True, None),
        'sso':                 (True, None),
        'audit_logs':          (True, None),
        'support_email':       (True, None),
        'support_priority':    (True, None),
        'support_dedicated':   (True, None),
        'max_empleados':       (True, 9999),
        'max_nominas_mes':     (True, 9999),
    },
}


def seed_plan_features(apps, schema_editor):
    Plan = apps.get_model('core', 'Plan')
    PlanFeature = apps.get_model('billing', 'PlanFeature')

    for plan_code, features in PLAN_FEATURES.items():
        try:
            plan = Plan.objects.get(code=plan_code)
        except Plan.DoesNotExist:
            continue

        for feature_code, (enabled, limit_value) in features.items():
            feature_name = FEATURE_DEFINITIONS.get(feature_code, feature_code)
            PlanFeature.objects.update_or_create(
                plan=plan,
                feature_code=feature_code,
                defaults={
                    'feature_name': feature_name,
                    'enabled': enabled,
                    'limit_value': limit_value,
                },
            )


def reverse_seed(apps, schema_editor):
    PlanFeature = apps.get_model('billing', 'PlanFeature')
    PlanFeature.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('billing', '0001_initial'),
        ('core', '0009_seed_plans_and_convert_fk'),
    ]

    operations = [
        migrations.RunPython(seed_plan_features, reverse_seed),
    ]
