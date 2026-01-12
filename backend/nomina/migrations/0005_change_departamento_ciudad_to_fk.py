# Generated manually to handle data migration

from django.db import migrations, models
import django.db.models.deletion


def limpiar_datos_ubicacion(apps, schema_editor):
    """
    Limpia los datos existentes de departamento y ciudad antes de cambiar
    el tipo de campo de CharField a ForeignKey.
    """
    # Usar SQL crudo porque el modelo aún no está migrado
    db_alias = schema_editor.connection.alias
    with schema_editor.connection.cursor() as cursor:
        # Primero permitir NULL en las columnas
        cursor.execute("ALTER TABLE nomina_empleado ALTER COLUMN departamento DROP NOT NULL;")
        cursor.execute("ALTER TABLE nomina_empleado ALTER COLUMN ciudad DROP NOT NULL;")
        
        # Luego limpiar datos
        cursor.execute("""
            UPDATE nomina_empleado 
            SET departamento = NULL, ciudad = NULL;
        """)


class Migration(migrations.Migration):

    dependencies = [
        ('locations', '0001_initial'),  # Asegurar que locations existe
        ('nomina', '0004_empleado_departamento_empleado_foto_empleado_genero'),
    ]

    operations = [
        # Primero limpiamos los datos
        migrations.RunPython(limpiar_datos_ubicacion, reverse_code=migrations.RunPython.noop),
        
        # Luego cambiamos el tipo de campo para departamento
        migrations.AlterField(
            model_name='empleado',
            name='departamento',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='empleados',
                to='locations.departamento',
                verbose_name='Departamento'
            ),
        ),
        
        # Y finalmente para ciudad
        migrations.AlterField(
            model_name='empleado',
            name='ciudad',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='empleados',
                to='locations.municipio',
                verbose_name='Ciudad/Municipio'
            ),
        ),
    ]
