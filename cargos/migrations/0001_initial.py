# Generated by Django 5.2 on 2025-06-30 02:54

import django.db.models.deletion
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('payroll', '0001_initial'),
        ('roles', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Cargo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(help_text='Nombre único del cargo', max_length=150, unique=True, verbose_name='Nombre del cargo')),
                ('codigo', models.CharField(help_text='Código único del cargo', max_length=20, unique=True, verbose_name='Código')),
                ('descripcion', models.TextField(blank=True, help_text='Descripción detallada del cargo y sus responsabilidades', null=True, verbose_name='Descripción')),
                ('nivel_jerarquico', models.PositiveIntegerField(default=1, help_text='Nivel en la jerarquía (1=más alto)', verbose_name='Nivel jerárquico')),
                ('salario_base_minimo', models.DecimalField(decimal_places=2, default=Decimal('0.00'), help_text='Salario base mínimo para este cargo', max_digits=12, verbose_name='Salario base mínimo')),
                ('salario_base_maximo', models.DecimalField(blank=True, decimal_places=2, help_text='Salario base máximo para este cargo', max_digits=12, null=True, verbose_name='Salario base máximo')),
                ('requiere_aprobacion', models.BooleanField(default=False, help_text='Si las acciones de este cargo requieren aprobación', verbose_name='Requiere aprobación')),
                ('puede_aprobar', models.BooleanField(default=False, help_text='Si este cargo puede aprobar acciones de otros', verbose_name='Puede aprobar')),
                ('limite_aprobacion', models.DecimalField(blank=True, decimal_places=2, help_text='Monto máximo que puede aprobar', max_digits=12, null=True, verbose_name='Límite de aprobación')),
                ('activo', models.BooleanField(default=True, help_text='Si está activo, el cargo estará disponible', verbose_name='Activo')),
                ('es_temporal', models.BooleanField(default=False, help_text='Si es un cargo temporal', verbose_name='Es temporal')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')),
                ('fecha_modificacion', models.DateTimeField(auto_now=True, verbose_name='Fecha de modificación')),
                ('cargo_superior', models.ForeignKey(blank=True, help_text='Cargo del cual depende jerárquicamente', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cargos_subordinados', to='cargos.cargo', verbose_name='Cargo superior')),
                ('roles_permitidos', models.ManyToManyField(blank=True, help_text='Roles que pueden ser asignados a este cargo', related_name='cargos_permitidos', to='roles.rol', verbose_name='Roles permitidos')),
            ],
            options={
                'verbose_name': 'Cargo',
                'verbose_name_plural': 'Cargos',
                'ordering': ['nivel_jerarquico', 'nombre'],
            },
        ),
        migrations.CreateModel(
            name='HistorialCargo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_inicio', models.DateField(help_text='Fecha en que inició en el nuevo cargo', verbose_name='Fecha de inicio')),
                ('fecha_fin', models.DateField(blank=True, help_text='Fecha en que terminó en el cargo (si aplica)', null=True, verbose_name='Fecha de fin')),
                ('salario_asignado', models.DecimalField(decimal_places=2, help_text='Salario asignado en este cargo', max_digits=12, verbose_name='Salario asignado')),
                ('motivo_cambio', models.TextField(blank=True, help_text='Razón del cambio de cargo', null=True, verbose_name='Motivo del cambio')),
                ('observaciones', models.TextField(blank=True, help_text='Observaciones adicionales', null=True, verbose_name='Observaciones')),
                ('fecha_registro', models.DateTimeField(auto_now_add=True, verbose_name='Fecha de registro')),
                ('cargo_anterior', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='historiales_anterior', to='cargos.cargo', verbose_name='Cargo anterior')),
                ('cargo_nuevo', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='historiales_nuevo', to='cargos.cargo', verbose_name='Cargo nuevo')),
                ('creado_por', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='cambios_cargo_realizados', to=settings.AUTH_USER_MODEL, verbose_name='Creado por')),
                ('empleado', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='historial_cargos', to='payroll.empleado', verbose_name='Empleado')),
            ],
            options={
                'verbose_name': 'Historial de Cargo',
                'verbose_name_plural': 'Historiales de Cargo',
                'ordering': ['-fecha_inicio', '-fecha_registro'],
            },
        ),
        migrations.AddIndex(
            model_name='cargo',
            index=models.Index(fields=['activo'], name='cargos_carg_activo_2e51c4_idx'),
        ),
        migrations.AddIndex(
            model_name='cargo',
            index=models.Index(fields=['nivel_jerarquico'], name='cargos_carg_nivel_j_0f40c3_idx'),
        ),
        migrations.AddIndex(
            model_name='cargo',
            index=models.Index(fields=['codigo'], name='cargos_carg_codigo_683cdd_idx'),
        ),
        migrations.AddIndex(
            model_name='historialcargo',
            index=models.Index(fields=['empleado', 'fecha_inicio'], name='cargos_hist_emplead_96c82e_idx'),
        ),
        migrations.AddIndex(
            model_name='historialcargo',
            index=models.Index(fields=['cargo_nuevo', 'fecha_inicio'], name='cargos_hist_cargo_n_e6a28a_idx'),
        ),
    ]
