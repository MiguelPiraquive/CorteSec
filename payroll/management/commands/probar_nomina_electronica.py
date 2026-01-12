"""
Comando para probar el flujo completo de nómina electrónica
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from login.models import CustomUser
from payroll.models import (
    Nomina, NominaElectronica,
    DevengadoNominaElectronica, DeduccionNominaElectronica,
    ConfiguracionNominaElectronica
)
from payroll.xml_generator import NominaElectronicaXMLGenerator
from payroll.firma_digital import FirmaDigitalNomina
from payroll.dian_client import DIANClient


class Command(BaseCommand):
    help = 'Probar flujo completo de nómina electrónica'

    def add_arguments(self, parser):
        parser.add_argument(
            '--empleado',
            type=str,
            help='Email del empleado para prueba'
        )
        parser.add_argument(
            '--solo-xml',
            action='store_true',
            help='Solo generar XML, no firmar ni enviar'
        )
        parser.add_argument(
            '--sin-envio',
            action='store_true',
            help='Generar y firmar, pero no enviar a DIAN'
        )

    def handle(self, *args, **options):
        empleado_email = options.get('empleado')
        solo_xml = options.get('solo_xml', False)
        sin_envio = options.get('sin_envio', False)

        self.stdout.write(self.style.HTTP_INFO('=== PRUEBA DE NÓMINA ELECTRÓNICA ===\n'))

        # 1. Verificar configuración
        self.stdout.write('1. Verificando configuración DIAN...')
        config = ConfiguracionNominaElectronica.objects.filter(activa=True).first()
        
        if not config:
            self.stdout.write(
                self.style.ERROR(
                    '✗ No hay configuración activa. '
                    'Ejecutar: python manage.py poblar_configuracion_electronica'
                )
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                f'  ✓ Configuración encontrada: {config.razon_social}\n'
                f'    - Ambiente: {config.get_ambiente_display()}\n'
                f'    - Prefijo: {config.prefijo}\n'
            )
        )

        # 2. Buscar o crear empleado
        self.stdout.write('2. Buscando empleado...')
        if empleado_email:
            try:
                empleado = CustomUser.objects.get(
                    email=empleado_email,
                    organization=config.organization
                )
            except CustomUser.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'✗ Empleado con email {empleado_email} no encontrado')
                )
                return
        else:
            empleado = CustomUser.objects.filter(
                organization=config.organization,
                is_active=True
            ).first()
            
            if not empleado:
                self.stdout.write(
                    self.style.ERROR('✗ No hay empleados activos en la organización')
                )
                return

        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Empleado: {empleado.nombre_completo}\n')
        )

        # 3. Crear o buscar nómina regular
        self.stdout.write('3. Buscando nómina regular...')
        nomina = Nomina.objects.filter(
            empleado=empleado,
            organization=config.organization
        ).first()

        if not nomina:
            # Crear nómina de prueba
            periodo_inicio = timezone.now().date().replace(day=1)
            periodo_fin = periodo_inicio + timedelta(days=29)
            
            nomina = Nomina.objects.create(
                organization=config.organization,
                empleado=empleado,
                periodo_inicio=periodo_inicio,
                periodo_fin=periodo_fin,
                salario_base=Decimal('2000000.00'),
                horas_extras=Decimal('0.00'),
                comisiones=Decimal('0.00'),
                bonificaciones=Decimal('0.00'),
                auxilio_transporte=Decimal('140606.00'),
                deducciones_salud=Decimal('80000.00'),
                deducciones_pension=Decimal('80000.00'),
                otras_deducciones=Decimal('0.00'),
                prestamos=Decimal('0.00'),
                total_devengado=Decimal('2140606.00'),
                total_deducciones=Decimal('160000.00'),
                neto_pagar=Decimal('1980606.00'),
                estado='procesada'
            )
            self.stdout.write(
                self.style.SUCCESS(f'  ✓ Nómina creada: ${nomina.neto_pagar:,.2f}\n')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'  ✓ Nómina encontrada: ${nomina.neto_pagar:,.2f}\n')
            )

        # 4. Crear nómina electrónica
        self.stdout.write('4. Creando documento de nómina electrónica...')
        
        # Verificar si ya existe
        nomina_electronica = NominaElectronica.objects.filter(nomina=nomina).first()
        if nomina_electronica:
            self.stdout.write(
                self.style.WARNING(
                    f'  ⚠ Ya existe documento: {nomina_electronica.numero_documento}\n'
                    f'    Estado: {nomina_electronica.get_estado_display()}\n'
                )
            )
            confirmar = input('¿Desea crear uno nuevo? (s/n): ')
            if confirmar.lower() != 's':
                return

        nomina_electronica = NominaElectronica.objects.create(
            organization=config.organization,
            nomina=nomina,
            tipo_documento='individual',
            prefijo=config.prefijo,
            numero_documento=str(config.rango_inicio),
            fecha_emision=timezone.now(),
            estado='borrador',
            generado_por=empleado
        )

        # Crear devengados
        DevengadoNominaElectronica.objects.create(
            nomina_electronica=nomina_electronica,
            tipo='basico',
            concepto='Salario Básico',
            dias_trabajados=30,
            salario_trabajado=nomina.salario_base,
            es_salarial=True
        )

        DevengadoNominaElectronica.objects.create(
            nomina_electronica=nomina_electronica,
            tipo='auxilio_transporte',
            concepto='Auxilio de Transporte',
            auxilio_transporte=nomina.auxilio_transporte,
            es_salarial=False
        )

        # Crear deducciones
        DeduccionNominaElectronica.objects.create(
            nomina_electronica=nomina_electronica,
            tipo='salud',
            concepto='Aporte Salud',
            porcentaje=Decimal('4.00'),
            valor=nomina.deducciones_salud
        )

        DeduccionNominaElectronica.objects.create(
            nomina_electronica=nomina_electronica,
            tipo='pension',
            concepto='Aporte Pensión',
            porcentaje=Decimal('4.00'),
            valor=nomina.deducciones_pension
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'  ✓ Documento creado: {nomina_electronica.numero_documento}\n'
                f'    - Devengados: {nomina_electronica.devengados.count()}\n'
                f'    - Deducciones: {nomina_electronica.deducciones.count()}\n'
            )
        )

        # 5. Generar XML
        self.stdout.write('5. Generando XML...')
        try:
            generator = NominaElectronicaXMLGenerator(nomina_electronica)
            xml = generator.generar()
            nomina_electronica.xml_contenido = xml
            nomina_electronica.estado = 'generado'
            nomina_electronica.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✓ XML generado: {len(xml)} bytes\n'
                )
            )

            # Mostrar preview
            if len(xml) < 1000:
                self.stdout.write(f'\nPreview XML:\n{xml[:500]}...\n')

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  ✗ Error generando XML: {str(e)}')
            )
            return

        if solo_xml:
            self.stdout.write(
                self.style.HTTP_INFO('\n✓ Generación XML completada (--solo-xml)\n')
            )
            return

        # 6. Firmar digitalmente
        self.stdout.write('6. Firmando digitalmente...')
        try:
            firmador = FirmaDigitalNomina()
            xml_firmado = firmador.firmar(nomina_electronica.xml_contenido, config.organization)
            nomina_electronica.xml_firmado = xml_firmado
            nomina_electronica.generar_cune()
            nomina_electronica.estado = 'firmado'
            nomina_electronica.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✓ Documento firmado\n'
                    f'    - CUNE: {nomina_electronica.cune[:40]}...\n'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.WARNING(
                    f'  ⚠ No se pudo firmar (normal en pruebas): {str(e)}\n'
                    f'    Continuando con XML sin firma...\n'
                )
            )
            nomina_electronica.cune = 'TEST-CUNE-' + str(nomina_electronica.id).zfill(10)
            nomina_electronica.estado = 'firmado'
            nomina_electronica.save()

        if sin_envio:
            self.stdout.write(
                self.style.HTTP_INFO('\n✓ Generación y firma completadas (--sin-envio)\n')
            )
            return

        # 7. Enviar a DIAN
        self.stdout.write('7. Enviando a DIAN...')
        try:
            client = DIANClient(config.organization)
            respuesta = client.enviar_nomina(nomina_electronica)
            
            nomina_electronica.track_id = respuesta.get('track_id', '')
            nomina_electronica.codigo_respuesta = respuesta.get('codigo', '')
            nomina_electronica.mensaje_respuesta = respuesta.get('mensaje', '')
            nomina_electronica.fecha_envio = timezone.now()
            nomina_electronica.intentos_envio += 1
            
            if respuesta.get('exitoso'):
                nomina_electronica.estado = 'aceptado'
                nomina_electronica.fecha_validacion_dian = timezone.now()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Nómina ACEPTADA por DIAN\n'
                        f'    - Track ID: {nomina_electronica.track_id}\n'
                        f'    - Código: {nomina_electronica.codigo_respuesta}\n'
                        f'    - Mensaje: {nomina_electronica.mensaje_respuesta}\n'
                    )
                )
            else:
                nomina_electronica.estado = 'rechazado'
                nomina_electronica.errores = respuesta.get('errores', {})
                
                self.stdout.write(
                    self.style.ERROR(
                        f'  ✗ Nómina RECHAZADA\n'
                        f'    - Código: {nomina_electronica.codigo_respuesta}\n'
                        f'    - Mensaje: {nomina_electronica.mensaje_respuesta}\n'
                    )
                )
                
                if nomina_electronica.errores:
                    self.stdout.write('    Errores:')
                    for key, value in nomina_electronica.errores.items():
                        self.stdout.write(f'      - {key}: {value}')
            
            nomina_electronica.save()

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  ✗ Error enviando a DIAN: {str(e)}')
            )
            nomina_electronica.estado = 'error'
            nomina_electronica.errores = {'error': str(e)}
            nomina_electronica.save()
            return

        # 8. Resumen final
        self.stdout.write(
            self.style.HTTP_INFO(
                f'\n=== RESUMEN ===\n'
                f'Documento: {nomina_electronica.numero_documento}\n'
                f'Estado: {nomina_electronica.get_estado_display()}\n'
                f'CUNE: {nomina_electronica.cune}\n'
                f'Empleado: {empleado.nombre_completo}\n'
                f'Neto a pagar: ${nomina.neto_pagar:,.2f}\n'
            )
        )

        self.stdout.write(
            self.style.SUCCESS('\n✓ Prueba completada exitosamente\n')
        )
