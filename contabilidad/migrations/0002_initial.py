# Generated by Django 5.2 on 2025-06-30 02:54

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('contabilidad', '0001_initial'),
        ('prestamos', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='comprobantecontable',
            name='prestamo_relacionado',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='comprobantes_contables', to='prestamos.prestamo', verbose_name='Préstamo relacionado'),
        ),
        migrations.AddField(
            model_name='flujocaja',
            name='comprobante',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='movimientos_flujo', to='contabilidad.comprobantecontable', verbose_name='Comprobante relacionado'),
        ),
        migrations.AddField(
            model_name='movimientocontable',
            name='comprobante',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='movimientos', to='contabilidad.comprobantecontable', verbose_name='Comprobante'),
        ),
        migrations.AddField(
            model_name='plancuentas',
            name='cuenta_padre',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='subcuentas', to='contabilidad.plancuentas', verbose_name='Cuenta padre'),
        ),
        migrations.AddField(
            model_name='movimientocontable',
            name='cuenta',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='movimientos', to='contabilidad.plancuentas', verbose_name='Cuenta'),
        ),
    ]
