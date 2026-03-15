# Generated manually to handle data migration
# NOTE: This migration is now a no-op because 0005_change_location_fields.py
# already handles the CharField to ForeignKey conversion properly.
# Kept for migration history compatibility with existing databases.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('locations', '0001_initial'),
        ('nomina', '0004_empleado_departamento_empleado_foto_empleado_genero'),
    ]

    operations = [
        # No-op: conversion handled by 0005_change_location_fields.py
    ]
