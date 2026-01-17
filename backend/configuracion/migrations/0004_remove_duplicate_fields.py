# Generated migration to remove duplicate security and email fields from ConfiguracionGeneral
# These fields already exist in specialized models (ConfiguracionSeguridad and ConfiguracionEmail)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('configuracion', '0003_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='configuraciongeneral',
            name='sesion_timeout_minutos',
        ),
        migrations.RemoveField(
            model_name='configuraciongeneral',
            name='max_intentos_login',
        ),
        migrations.RemoveField(
            model_name='configuraciongeneral',
            name='requiere_cambio_password',
        ),
        migrations.RemoveField(
            model_name='configuraciongeneral',
            name='dias_cambio_password',
        ),
        migrations.RemoveField(
            model_name='configuraciongeneral',
            name='servidor_email',
        ),
        migrations.RemoveField(
            model_name='configuraciongeneral',
            name='puerto_email',
        ),
        migrations.RemoveField(
            model_name='configuraciongeneral',
            name='email_usuario',
        ),
        migrations.RemoveField(
            model_name='configuraciongeneral',
            name='usar_tls',
        ),
    ]
