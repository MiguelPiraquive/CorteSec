# Generated manually - Seed default plans and convert Organization.plan to ForeignKey

from django.db import migrations, models
import django.db.models.deletion


def seed_default_plans(apps, schema_editor):
    """Seed the 4 default plans if they don't exist."""
    Plan = apps.get_model('core', 'Plan')
    
    defaults = [
        {
            'code': 'FREE',
            'name': 'Gratuito',
            'description': 'Plan gratuito con funciones básicas para empezar.',
            'price_monthly_cop': 0,
            'price_yearly_cop': 0,
            'max_users': 5,
            'max_storage_mb': 1024,
            'features': [
                'Hasta 5 usuarios',
                'Gestión básica de nómina',
                'Reportes básicos',
                'Soporte por correo',
            ],
            'is_public': True,
            'is_active': True,
            'sort_order': 0,
        },
        {
            'code': 'BASIC',
            'name': 'Básico',
            'description': 'Ideal para pequeñas empresas en crecimiento.',
            'price_monthly_cop': 99000,
            'price_yearly_cop': 990000,
            'max_users': 25,
            'max_storage_mb': 5120,
            'features': [
                'Hasta 25 usuarios',
                'Nómina completa',
                'Reportes avanzados',
                'Nómina electrónica',
                'Soporte prioritario',
            ],
            'is_public': True,
            'is_active': True,
            'sort_order': 1,
        },
        {
            'code': 'PRO',
            'name': 'Profesional',
            'description': 'Para empresas que necesitan potencia y control.',
            'price_monthly_cop': 199000,
            'price_yearly_cop': 1990000,
            'max_users': 100,
            'max_storage_mb': 20480,
            'features': [
                'Hasta 100 usuarios',
                'Nómina completa + electrónica',
                'Todos los reportes',
                'API RESTful',
                'Multi-sucursal',
                'Soporte dedicado',
            ],
            'is_public': True,
            'is_active': True,
            'sort_order': 2,
        },
        {
            'code': 'ENTERPRISE',
            'name': 'Empresarial',
            'description': 'Solución completa para grandes organizaciones.',
            'price_monthly_cop': None,
            'price_yearly_cop': None,
            'max_users': 9999,
            'max_storage_mb': 102400,
            'features': [
                'Usuarios ilimitados',
                'Todas las funcionalidades',
                'SLA garantizado',
                'Integración personalizada',
                'Soporte 24/7',
                'Gerente de cuenta dedicado',
            ],
            'is_public': True,
            'is_active': True,
            'sort_order': 3,
        },
    ]

    for plan_data in defaults:
        Plan.objects.get_or_create(
            code=plan_data['code'],
            defaults=plan_data,
        )


def ensure_org_plans_valid(apps, schema_editor):
    """Ensure all existing organizations reference a valid plan code."""
    Organizacion = apps.get_model('core', 'Organizacion')
    Plan = apps.get_model('core', 'Plan')
    valid_codes = set(Plan.objects.values_list('code', flat=True))
    
    # Fix any orgs with invalid plan codes
    for org in Organizacion.objects.all():
        if org.plan not in valid_codes:
            org.plan = 'FREE'
            org.save(update_fields=['plan'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_invitacion'),
    ]

    operations = [
        # Step 1: Seed plans
        migrations.RunPython(seed_default_plans, noop),
        # Step 2: Validate existing org plans
        migrations.RunPython(ensure_org_plans_valid, noop),
        # Step 3: Convert CharField to ForeignKey
        migrations.AlterField(
            model_name='organizacion',
            name='plan',
            field=models.ForeignKey(
                db_column='plan',
                default='FREE',
                help_text='Plan actual de la organización',
                on_delete=django.db.models.deletion.PROTECT,
                to='core.plan',
                to_field='code',
                verbose_name='Plan de suscripción',
            ),
        ),
    ]
