"""
Agrega el feature 'proyectos' a todos los planes (BASIC, PRO, ENTERPRISE).
FREE no lo incluye.
"""

from django.db import migrations


def add_proyectos_feature(apps, schema_editor):
    Plan = apps.get_model('core', 'Plan')
    PlanFeature = apps.get_model('billing', 'PlanFeature')

    # Planes que tendrán el feature proyectos
    plan_codes = ['BASIC', 'PRO', 'ENTERPRISE']

    for code in plan_codes:
        try:
            plan = Plan.objects.get(code=code)
        except Plan.DoesNotExist:
            continue

        PlanFeature.objects.update_or_create(
            plan=plan,
            feature_code='proyectos',
            defaults={
                'feature_name': 'Gestión de Proyectos',
                'enabled': True,
                'limit_value': None,
            },
        )


def reverse(apps, schema_editor):
    PlanFeature = apps.get_model('billing', 'PlanFeature')
    PlanFeature.objects.filter(feature_code='proyectos').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('billing', '0003_add_wompi_gateway'),
        ('core', '0009_seed_plans_and_convert_fk'),
    ]

    operations = [
        migrations.RunPython(add_proyectos_feature, reverse),
    ]
