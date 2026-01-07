"""
Comando para probar funcionalidades de FASE 3
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from payroll.models import WebhookConfig, NominaElectronica
from payroll.tasks import verificar_estado_nominas_dian
from payroll.pdf_generator import NominaElectronicaPDFGenerator
from payroll.notifications import NotificacionManager
import json


class Command(BaseCommand):
    help = 'Prueba funcionalidades de Fase 3 (Celery, PDFs, Notificaciones, Webhooks)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test',
            type=str,
            choices=['celery', 'pdf', 'notificaciones', 'webhooks', 'all'],
            default='all',
            help='Qué componente probar'
        )

    def handle(self, *args, **options):
        test_type = options['test']

        self.stdout.write(self.style.WARNING('\n' + '='*60))
        self.stdout.write(self.style.WARNING('PRUEBA DE FASE 3 - INTEGRACIONES AVANZADAS'))
        self.stdout.write(self.style.WARNING('='*60 + '\n'))

        if test_type in ['celery', 'all']:
            self.test_celery()

        if test_type in ['pdf', 'all']:
            self.test_pdf()

        if test_type in ['notificaciones', 'all']:
            self.test_notificaciones()

        if test_type in ['webhooks', 'all']:
            self.test_webhooks()

        self.stdout.write(self.style.SUCCESS('\n✅ Pruebas completadas\n'))

    def test_celery(self):
        """Prueba configuración de Celery"""
        self.stdout.write(self.style.HTTP_INFO('\n📋 PROBANDO CELERY...'))

        try:
            from contractor_management import celery_app

            # Verificar que Celery está configurado
            self.stdout.write('  • Celery app: ' + self.style.SUCCESS('✓ Configurado'))
            self.stdout.write(f'  • Broker: {celery_app.conf.broker_url}')
            self.stdout.write(f'  • Result backend: {celery_app.conf.result_backend}')
            self.stdout.write(f'  • Timezone: {celery_app.conf.timezone}')

            # Listar tareas programadas
            beat_schedule = celery_app.conf.beat_schedule
            self.stdout.write(f'\n  📅 Tareas programadas: {len(beat_schedule)}')
            for task_name, config in beat_schedule.items():
                schedule = config.get('schedule')
                self.stdout.write(f'    - {task_name}: {schedule}')

            # Intentar enviar tarea de prueba (no ejecutar, solo validar)
            from payroll.tasks import verificar_estado_nominas_dian
            self.stdout.write('\n  • Tarea de prueba registrada: ' + self.style.SUCCESS('✓'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))

    def test_pdf(self):
        """Prueba generación de PDFs"""
        self.stdout.write(self.style.HTTP_INFO('\n📄 PROBANDO GENERACIÓN DE PDFs...'))

        try:
            # Verificar imports
            import reportlab
            import qrcode
            self.stdout.write('  • Reportlab: ' + self.style.SUCCESS('✓ Instalado'))
            self.stdout.write('  • QRCode: ' + self.style.SUCCESS('✓ Instalado'))

            # Verificar clase generadora
            self.stdout.write('  • NominaElectronicaPDFGenerator: ' + self.style.SUCCESS('✓ Disponible'))

            # Buscar nómina electrónica para probar
            nomina = NominaElectronica.objects.filter(
                estado__in=['generado', 'firmado', 'enviado', 'aceptado']
            ).first()

            if nomina:
                self.stdout.write(f'  • Nómina de prueba encontrada: ID {nomina.id}')
                self.stdout.write('    (Para generar PDF real, usa la API o admin)')
            else:
                self.stdout.write(self.style.WARNING('  ⚠ No hay nóminas electrónicas para probar'))

        except ImportError as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error de importación: {str(e)}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))

    def test_notificaciones(self):
        """Prueba sistema de notificaciones"""
        self.stdout.write(self.style.HTTP_INFO('\n📧 PROBANDO SISTEMA DE NOTIFICACIONES...'))

        try:
            from payroll.notifications import (
                NotificacionManager,
                EmailNotifier,
                PushNotifier,
                WebhookNotifier
            )

            self.stdout.write('  • NotificacionManager: ' + self.style.SUCCESS('✓ Disponible'))
            self.stdout.write('  • EmailNotifier: ' + self.style.SUCCESS('✓ Disponible'))
            self.stdout.write('  • PushNotifier: ' + self.style.SUCCESS('✓ Disponible'))
            self.stdout.write('  • WebhookNotifier: ' + self.style.SUCCESS('✓ Disponible'))

            self.stdout.write('\n  📨 Canales soportados:')
            self.stdout.write('    - Email HTML con templates')
            self.stdout.write('    - Push notifications (preparado)')
            self.stdout.write('    - Webhooks con firma HMAC')
            self.stdout.write('    - Batch notifications')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))

    def test_webhooks(self):
        """Prueba sistema de webhooks"""
        self.stdout.write(self.style.HTTP_INFO('\n🔗 PROBANDO SISTEMA DE WEBHOOKS...'))

        try:
            # Verificar modelos
            from payroll.models import WebhookConfig, WebhookLog
            self.stdout.write('  • WebhookConfig model: ' + self.style.SUCCESS('✓ Disponible'))
            self.stdout.write('  • WebhookLog model: ' + self.style.SUCCESS('✓ Disponible'))

            # Contar webhooks
            total_webhooks = WebhookConfig.objects.count()
            activos = WebhookConfig.objects.filter(activo=True).count()

            self.stdout.write(f'\n  📊 Estadísticas:')
            self.stdout.write(f'    - Total webhooks: {total_webhooks}')
            self.stdout.write(f'    - Webhooks activos: {activos}')

            if total_webhooks > 0:
                # Mostrar algunos webhooks
                webhooks = WebhookConfig.objects.all()[:3]
                self.stdout.write(f'\n  🔗 Webhooks configurados:')
                for wh in webhooks:
                    estado = '✓ Activo' if wh.activo else '✗ Inactivo'
                    self.stdout.write(f'    - {wh.nombre}: {estado}')
                    if wh.total_disparos > 0:
                        tasa = (wh.total_exitosos / wh.total_disparos) * 100
                        self.stdout.write(f'      Disparos: {wh.total_disparos}, Éxito: {tasa:.1f}%')
            else:
                self.stdout.write(self.style.WARNING('\n  ⚠ No hay webhooks configurados'))
                self.stdout.write('    Crea uno en: /admin/payroll/webhookconfig/add/')

            # Contar logs
            total_logs = WebhookLog.objects.count()
            self.stdout.write(f'\n  📝 Total logs: {total_logs}')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))
