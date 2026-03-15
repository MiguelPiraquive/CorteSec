from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("login", "0003_alter_customuser_roles"),
    ]

    operations = [
        migrations.CreateModel(
            name="PasswordHistory",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "password_hash",
                    models.CharField(
                        help_text="Hash de la contraseña anterior",
                        max_length=256,
                        verbose_name="Hash de contraseña",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        verbose_name="Creado",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="password_history",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Usuario",
                    ),
                ),
            ],
            options={
                "verbose_name": "Historial de contraseña",
                "verbose_name_plural": "Historial de contraseñas",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AlterField(
            model_name="customuser",
            name="totp_secret",
            field=models.CharField(
                blank=True,
                help_text="Clave secreta para TOTP (encriptada)",
                max_length=256,
                verbose_name="Secreto TOTP",
            ),
        ),
    ]
