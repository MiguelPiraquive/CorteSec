# Generated by Django 5.2 on 2025-06-15 13:47

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('items', '0002_item_tipo_cantidad'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='item',
            name='quantity',
        ),
    ]
