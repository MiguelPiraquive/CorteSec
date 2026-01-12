from django.core.management.base import BaseCommand
from payroll.models import ConceptoNomina, PeriodoNomina, TipoConcepto
from decimal import Decimal


class Command(BaseCommand):
    help = 'Inicializa conceptos básicos de nómina'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina los conceptos existentes antes de crear nuevos',
        )

    def handle(self, *args, **options):
        if options['reset']:
            ConceptoNomina.objects.all().delete()
            TipoConcepto.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Conceptos de nómina existentes eliminados')
            )

        # Crear tipos de concepto
        tipos_concepto = [
            {
                'codigo': 'DEV',
                'nombre': 'Devengado',
                'descripcion': 'Conceptos que aumentan el salario',
                'es_devengado': True,
                'es_deduccion': False,
                'activo': True
            },
            {
                'codigo': 'DED',
                'nombre': 'Deducción',
                'descripcion': 'Conceptos que disminuyen el salario',
                'es_devengado': False,
                'es_deduccion': True,
                'activo': True
            },
            {
                'codigo': 'APO',
                'nombre': 'Aporte',
                'descripcion': 'Aportes patronales',
                'es_devengado': False,
                'es_deduccion': False,
                'activo': True
            },
        ]

        tipos_creados = {}
        for tipo_data in tipos_concepto:
            tipo, created = TipoConcepto.objects.get_or_create(
                codigo=tipo_data['codigo'],
                defaults=tipo_data
            )
            tipos_creados[tipo_data['codigo']] = tipo
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado tipo de concepto: {tipo.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe tipo de concepto: {tipo.nombre}')
                )

        # Crear conceptos básicos de nómina
        conceptos = [
            # DEVENGADOS
            {
                'codigo': 'SALARIO_BASE',
                'nombre': 'Salario Básico',
                'descripcion': 'Salario básico mensual',
                'tipo_concepto': 'DEV',
                'es_obligatorio': True,
                'calculo_automatico': False,
                'porcentaje': None,
                'valor_fijo': None,
                'activo': True
            },
            {
                'codigo': 'HORAS_EXTRA',
                'nombre': 'Horas Extras',
                'descripcion': 'Pago de horas extras',
                'tipo_concepto': 'DEV',
                'es_obligatorio': False,
                'calculo_automatico': True,
                'porcentaje': Decimal('25.00'),
                'valor_fijo': None,
                'activo': True
            },
            {
                'codigo': 'AUXILIO_TRANSPORTE',
                'nombre': 'Auxilio de Transporte',
                'descripcion': 'Auxilio de transporte',
                'tipo_concepto': 'DEV',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': None,
                'valor_fijo': Decimal('140606.00'),
                'activo': True
            },
            {
                'codigo': 'PRIMA_SERVICIOS',
                'nombre': 'Prima de Servicios',
                'descripcion': 'Prima de servicios semestral',
                'tipo_concepto': 'DEV',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': Decimal('8.33'),
                'valor_fijo': None,
                'activo': True
            },
            {
                'codigo': 'CESANTIAS',
                'nombre': 'Cesantías',
                'descripcion': 'Cesantías anuales',
                'tipo_concepto': 'DEV',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': Decimal('8.33'),
                'valor_fijo': None,
                'activo': True
            },
            {
                'codigo': 'INT_CESANTIAS',
                'nombre': 'Intereses sobre Cesantías',
                'descripcion': 'Intereses sobre cesantías',
                'tipo_concepto': 'DEV',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': Decimal('12.00'),
                'valor_fijo': None,
                'activo': True
            },
            {
                'codigo': 'VACACIONES',
                'nombre': 'Vacaciones',
                'descripcion': 'Vacaciones anuales',
                'tipo_concepto': 'DEV',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': Decimal('4.17'),
                'valor_fijo': None,
                'activo': True
            },
            
            # DEDUCCIONES
            {
                'codigo': 'SALUD_EMP',
                'nombre': 'Salud Empleado',
                'descripcion': 'Aporte a salud del empleado',
                'tipo_concepto': 'DED',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': Decimal('4.00'),
                'valor_fijo': None,
                'activo': True
            },
            {
                'codigo': 'PENSION_EMP',
                'nombre': 'Pensión Empleado',
                'descripcion': 'Aporte a pensión del empleado',
                'tipo_concepto': 'DED',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': Decimal('4.00'),
                'valor_fijo': None,
                'activo': True
            },
            {
                'codigo': 'RETENCION_FUENTE',
                'nombre': 'Retención en la Fuente',
                'descripcion': 'Retención en la fuente',
                'tipo_concepto': 'DED',
                'es_obligatorio': False,
                'calculo_automatico': True,
                'porcentaje': None,
                'valor_fijo': None,
                'activo': True
            },
            
            # APORTES PATRONALES
            {
                'codigo': 'SALUD_PAT',
                'nombre': 'Salud Patronal',
                'descripcion': 'Aporte patronal a salud',
                'tipo_concepto': 'APO',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': Decimal('8.50'),
                'valor_fijo': None,
                'activo': True
            },
            {
                'codigo': 'PENSION_PAT',
                'nombre': 'Pensión Patronal',
                'descripcion': 'Aporte patronal a pensión',
                'tipo_concepto': 'APO',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': Decimal('12.00'),
                'valor_fijo': None,
                'activo': True
            },
            {
                'codigo': 'ARL',
                'nombre': 'ARL',
                'descripcion': 'Riesgos laborales',
                'tipo_concepto': 'APO',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': Decimal('0.52'),
                'valor_fijo': None,
                'activo': True
            },
            {
                'codigo': 'CAJA_COMPENSACION',
                'nombre': 'Caja de Compensación',
                'descripcion': 'Aporte a caja de compensación',
                'tipo_concepto': 'APO',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': Decimal('4.00'),
                'valor_fijo': None,
                'activo': True
            },
            {
                'codigo': 'ICBF',
                'nombre': 'ICBF',
                'descripcion': 'Aporte al ICBF',
                'tipo_concepto': 'APO',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': Decimal('3.00'),
                'valor_fijo': None,
                'activo': True
            },
            {
                'codigo': 'SENA',
                'nombre': 'SENA',
                'descripcion': 'Aporte al SENA',
                'tipo_concepto': 'APO',
                'es_obligatorio': True,
                'calculo_automatico': True,
                'porcentaje': Decimal('2.00'),
                'valor_fijo': None,
                'activo': True
            },
        ]

        for concepto_data in conceptos:
            tipo_codigo = concepto_data.pop('tipo_concepto')
            concepto_data['tipo_concepto'] = tipos_creados[tipo_codigo]
            
            concepto, created = ConceptoNomina.objects.get_or_create(
                codigo=concepto_data['codigo'],
                defaults=concepto_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado concepto: {concepto.codigo} - {concepto.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe concepto: {concepto.codigo} - {concepto.nombre}')
                )

        self.stdout.write(
            self.style.SUCCESS('Conceptos básicos de nómina inicializados correctamente')
        )
