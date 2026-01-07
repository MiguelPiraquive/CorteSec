"""
Comando para poblar configuración de nómina electrónica para pruebas
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import Organization
from payroll.models import ConfiguracionNominaElectronica


class Command(BaseCommand):
    help = 'Crear configuración de nómina electrónica para pruebas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--organization',
            type=str,
            help='ID de la organización'
        )
        parser.add_argument(
            '--ambiente',
            type=str,
            default='habilitacion',
            choices=['habilitacion', 'produccion'],
            help='Ambiente DIAN (habilitacion o produccion)'
        )

    def handle(self, *args, **options):
        org_id = options.get('organization')
        ambiente = options.get('ambiente')

        if org_id:
            try:
                organization = Organization.objects.get(id=org_id)
            except Organization.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Organización con ID {org_id} no encontrada')
                )
                return
        else:
            # Usar la primera organización disponible
            organization = Organization.objects.first()
            if not organization:
                self.stdout.write(
                    self.style.ERROR('No hay organizaciones en el sistema')
                )
                return

        self.stdout.write(f'Usando organización: {organization.name}')

        # Verificar si ya existe una configuración
        config_existente = ConfiguracionNominaElectronica.objects.filter(
            organization=organization
        ).first()

        if config_existente:
            self.stdout.write(
                self.style.WARNING(
                    f'Ya existe configuración para {organization.name}. '
                    f'¿Desea continuar? (se marcará como inactiva)'
                )
            )
            # Marcar como inactiva
            config_existente.activa = False
            config_existente.save()

        # Datos de ejemplo según ambiente
        if ambiente == 'habilitacion':
            url_webservice = 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc'
            prefijo = 'TEST'
        else:
            url_webservice = 'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc'
            prefijo = 'NE'

        # Crear nueva configuración
        config = ConfiguracionNominaElectronica.objects.create(
            organization=organization,
            activa=True,
            ambiente=ambiente,
            
            # Datos del empleador
            razon_social=organization.name,
            nit='900123456',  # NIT de ejemplo
            dv='3',
            direccion='Calle 123 #45-67',
            municipio_codigo='11001',  # Bogotá
            telefono='3001234567',
            email=organization.email or 'nomina@empresa.com',
            
            # Numeración autorizada
            prefijo=prefijo,
            resolucion_numero='18760000001',
            resolucion_fecha=timezone.now().date() - timedelta(days=30),
            rango_inicio=1,
            rango_fin=5000,
            fecha_vigencia_desde=timezone.now().date() - timedelta(days=30),
            fecha_vigencia_hasta=timezone.now().date() + timedelta(days=365),
            
            # Parámetros técnicos
            clave_tecnica='abc123XYZ' if ambiente == 'habilitacion' else '',
            identificador_software='90f8g6789h-1234-5678-90ab-cdef12345678',
            url_webservice=url_webservice,
            
            # Opciones
            envio_automatico=False,
            notificar_empleado=True
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Configuración creada exitosamente:\n'
                f'  - Razón Social: {config.razon_social}\n'
                f'  - NIT: {config.nit}-{config.dv}\n'
                f'  - Ambiente: {config.get_ambiente_display()}\n'
                f'  - Prefijo: {config.prefijo}\n'
                f'  - Rango: {config.rango_inicio} - {config.rango_fin}\n'
                f'  - URL WebService: {config.url_webservice}\n'
            )
        )

        self.stdout.write(
            self.style.WARNING(
                f'\n⚠ IMPORTANTE:\n'
                f'  - Debe configurar un certificado digital válido\n'
                f'  - Debe actualizar el NIT con datos reales\n'
                f'  - Debe obtener la clave técnica y el identificador de software de DIAN\n'
                f'  - Esta es una configuración de prueba\n'
            )
        )

        # Mostrar instrucciones
        self.stdout.write(
            self.style.HTTP_INFO(
                f'\nPasos siguientes:\n'
                f'1. Acceder al admin de Django\n'
                f'2. Ir a Configuración Nómina Electrónica\n'
                f'3. Actualizar datos del empleador con información real\n'
                f'4. Cargar certificado digital (.p12 o .pfx)\n'
                f'5. Configurar clave técnica e identificador de software\n'
                f'6. Probar conexión con DIAN usando la acción del admin\n'
            )
        )
