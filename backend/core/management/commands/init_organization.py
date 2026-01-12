"""
Management Command: init_organization
=====================================

Crea la organización principal del sistema.

Uso:
    python manage.py init_organization
    python manage.py init_organization --codigo MIEMPRESA --nombre "Mi Empresa SAS"

Autor: Sistema CorteSec
Fecha: Enero 2026
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import Organization


class Command(BaseCommand):
    help = 'Crea la organización principal del sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--codigo',
            type=str,
            default='CORTESEC',
            help='Código de la organización (default: CORTESEC)'
        )
        parser.add_argument(
            '--nombre',
            type=str,
            default='CorteSec S.A.S.',
            help='Nombre de la organización'
        )
        parser.add_argument(
            '--nit',
            type=str,
            default='900123456-1',
            help='NIT de la organización'
        )

    def handle(self, *args, **options):
        codigo = options['codigo']
        nombre = options['nombre']
        nit = options['nit']
        
        with transaction.atomic():
            org, created = Organization.objects.get_or_create(
                codigo=codigo,
                defaults={
                    'nombre': nombre,
                    'nit': nit,
                    'activa': True,
                }
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Organización "{nombre}" ({codigo}) creada exitosamente')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'⚠️ Organización "{codigo}" ya existe')
                )
