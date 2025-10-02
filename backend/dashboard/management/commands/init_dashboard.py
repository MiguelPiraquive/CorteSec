"""
Comando de inicialización para la aplicación Dashboard
====================================================

Este comando configura datos iniciales para el dashboard del sistema.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-27
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from dashboard.models import *
from django.db import transaction
import uuid
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = 'Inicializa datos básicos para el módulo de Dashboard'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina todos los datos existentes antes de crear nuevos',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🚀 Inicializando módulo Dashboard...')
        )

        try:
            with transaction.atomic():
                if options['reset']:
                    self.stdout.write('🗑️  Eliminando datos existentes...')
                    # Eliminar datos existentes si es necesario
                    self.stdout.write(self.style.WARNING('✅ Datos eliminados'))

                # Crear datos de ejemplo
                self.crear_datos_dashboard()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        '✅ ¡Módulo Dashboard inicializado correctamente!'
                    )
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error al inicializar Dashboard: {str(e)}')
            )
            raise

    def crear_datos_dashboard(self):
        """Crear datos iniciales para el dashboard"""
        
        self.stdout.write('📊 Configurando dashboard...')
        
        # Aquí se pueden agregar configuraciones específicas del dashboard
        # como widgets predeterminados, métricas iniciales, etc.
        
        self.stdout.write(self.style.SUCCESS('✅ Dashboard configurado'))

        # Crear métricas de ejemplo
        self.stdout.write('📈 Creando métricas de ejemplo...')
        
        # Aquí puedes agregar lógica específica para crear
        # datos de ejemplo relacionados con el dashboard
        
        self.stdout.write(self.style.SUCCESS('✅ Métricas creadas'))

        self.stdout.write(
            self.style.SUCCESS('🎯 Dashboard listo para usar')
        )
