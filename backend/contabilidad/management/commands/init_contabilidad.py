from django.core.management.base import BaseCommand
from contabilidad.models import PlanCuentas, CentroCosto
from decimal import Decimal


class Command(BaseCommand):
    help = 'Inicializa el plan de cuentas básico del sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina los datos contables existentes antes de crear nuevos',
        )

    def handle(self, *args, **options):
        if options['reset']:
            PlanCuentas.objects.all().delete()
            TipoMovimiento.objects.all().delete()
            CentroCosto.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Datos contables existentes eliminados')
            )

        # Crear centros de costo
        centros_costo = [
            {
                'codigo': 'ADM',
                'nombre': 'Administración',
                'descripcion': 'Centro de costo administrativo',
                'activo': True
            },
            {
                'codigo': 'OPE',
                'nombre': 'Operacional',
                'descripcion': 'Centro de costo operacional',
                'activo': True
            },
            {
                'codigo': 'VEN',
                'nombre': 'Ventas',
                'descripcion': 'Centro de costo de ventas',
                'activo': True
            },
            {
                'codigo': 'FIN',
                'nombre': 'Financiero',
                'descripcion': 'Centro de costo financiero',
                'activo': True
            },
        ]

        centros_creados = {}
        for centro_data in centros_costo:
            centro, created = CentroCosto.objects.get_or_create(
                codigo=centro_data['codigo'],
                defaults=centro_data
            )
            centros_creados[centro_data['codigo']] = centro
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado centro de costo: {centro.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe centro de costo: {centro.nombre}')
                )

        # Crear plan de cuentas básico
        cuentas = [
            # ACTIVOS
            {
                'codigo': '1',
                'nombre': 'ACTIVOS',
                'tipo_cuenta': 'activo',
                'naturaleza': 'debito',
                'nivel': 1,
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '11',
                'nombre': 'DISPONIBLE',
                'tipo_cuenta': 'activo',
                'naturaleza': 'debito',
                'nivel': 2,
                'cuenta_padre': '1',
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '1105',
                'nombre': 'CAJA',
                'tipo_cuenta': 'activo',
                'naturaleza': 'debito',
                'nivel': 3,
                'cuenta_padre': '11',
                'es_auxiliar': True,
                'activo': True
            },
            {
                'codigo': '1110',
                'nombre': 'BANCOS',
                'tipo_cuenta': 'activo',
                'naturaleza': 'debito',
                'nivel': 3,
                'cuenta_padre': '11',
                'es_auxiliar': True,
                'activo': True
            },
            {
                'codigo': '13',
                'nombre': 'DEUDORES',
                'tipo_cuenta': 'activo',
                'naturaleza': 'debito',
                'nivel': 2,
                'cuenta_padre': '1',
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '1365',
                'nombre': 'CUENTAS POR COBRAR A TRABAJADORES',
                'tipo_cuenta': 'activo',
                'naturaleza': 'debito',
                'nivel': 3,
                'cuenta_padre': '13',
                'es_auxiliar': True,
                'activo': True
            },
            {
                'codigo': '1305',
                'nombre': 'CARTERA PRÉSTAMOS',
                'tipo_cuenta': 'activo',
                'naturaleza': 'debito',
                'nivel': 3,
                'cuenta_padre': '13',
                'es_auxiliar': True,
                'activo': True
            },
            
            # PASIVOS
            {
                'codigo': '2',
                'nombre': 'PASIVOS',
                'tipo_cuenta': 'pasivo',
                'naturaleza': 'credito',
                'nivel': 1,
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '21',
                'nombre': 'OBLIGACIONES FINANCIERAS',
                'tipo_cuenta': 'pasivo',
                'naturaleza': 'credito',
                'nivel': 2,
                'cuenta_padre': '2',
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '2105',
                'nombre': 'BANCOS NACIONALES',
                'tipo_cuenta': 'pasivo',
                'naturaleza': 'credito',
                'nivel': 3,
                'cuenta_padre': '21',
                'es_auxiliar': True,
                'activo': True
            },
            {
                'codigo': '23',
                'nombre': 'CUENTAS POR PAGAR',
                'tipo_cuenta': 'pasivo',
                'naturaleza': 'credito',
                'nivel': 2,
                'cuenta_padre': '2',
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '2370',
                'nombre': 'RETENCIONES Y APORTES DE NÓMINA',
                'tipo_cuenta': 'pasivo',
                'naturaleza': 'credito',
                'nivel': 3,
                'cuenta_padre': '23',
                'es_auxiliar': True,
                'activo': True
            },
            {
                'codigo': '237005',
                'nombre': 'APORTES A EPS',
                'tipo_cuenta': 'pasivo',
                'naturaleza': 'credito',
                'nivel': 4,
                'cuenta_padre': '2370',
                'es_auxiliar': True,
                'activo': True
            },
            {
                'codigo': '2380',
                'nombre': 'ACREEDORES VARIOS',
                'tipo_cuenta': 'pasivo',
                'naturaleza': 'credito',
                'nivel': 3,
                'cuenta_padre': '23',
                'es_auxiliar': True,
                'activo': True
            },
            {
                'codigo': '238030',
                'nombre': 'FONDOS DE CESANTÍAS Y/O PENSIONES',
                'tipo_cuenta': 'pasivo',
                'naturaleza': 'credito',
                'nivel': 4,
                'cuenta_padre': '2380',
                'es_auxiliar': True,
                'activo': True
            },
            
            # PATRIMONIO
            {
                'codigo': '3',
                'nombre': 'PATRIMONIO',
                'tipo_cuenta': 'patrimonio',
                'naturaleza': 'credito',
                'nivel': 1,
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '31',
                'nombre': 'CAPITAL SOCIAL',
                'tipo_cuenta': 'patrimonio',
                'naturaleza': 'credito',
                'nivel': 2,
                'cuenta_padre': '3',
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '3105',
                'nombre': 'CAPITAL SUSCRITO Y PAGADO',
                'tipo_cuenta': 'patrimonio',
                'naturaleza': 'credito',
                'nivel': 3,
                'cuenta_padre': '31',
                'es_auxiliar': True,
                'activo': True
            },
            
            # INGRESOS
            {
                'codigo': '4',
                'nombre': 'INGRESOS',
                'tipo_cuenta': 'ingreso',
                'naturaleza': 'credito',
                'nivel': 1,
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '41',
                'nombre': 'INGRESOS OPERACIONALES',
                'tipo_cuenta': 'ingreso',
                'naturaleza': 'credito',
                'nivel': 2,
                'cuenta_padre': '4',
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '42',
                'nombre': 'OTROS INGRESOS',
                'tipo_cuenta': 'ingreso',
                'naturaleza': 'credito',
                'nivel': 2,
                'cuenta_padre': '4',
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '4135',
                'nombre': 'SERVICIOS',
                'tipo_cuenta': 'ingreso',
                'naturaleza': 'credito',
                'nivel': 3,
                'cuenta_padre': '41',
                'es_auxiliar': True,
                'activo': True
            },
            {
                'codigo': '4210',
                'nombre': 'INGRESOS FINANCIEROS',
                'tipo_cuenta': 'ingreso',
                'naturaleza': 'credito',
                'nivel': 3,
                'cuenta_padre': '42',
                'es_auxiliar': True,
                'activo': True
            },
            {
                'codigo': '421005',
                'nombre': 'INTERESES',
                'tipo_cuenta': 'ingreso',
                'naturaleza': 'credito',
                'nivel': 4,
                'cuenta_padre': '4210',
                'es_auxiliar': True,
                'activo': True
            },
            {
                'codigo': '4175',
                'nombre': 'INGRESOS POR MORA',
                'tipo_cuenta': 'ingreso',
                'naturaleza': 'credito',
                'nivel': 3,
                'cuenta_padre': '41',
                'es_auxiliar': True,
                'activo': True
            },
            
            # GASTOS
            {
                'codigo': '5',
                'nombre': 'GASTOS',
                'tipo_cuenta': 'gasto',
                'naturaleza': 'debito',
                'nivel': 1,
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '51',
                'nombre': 'GASTOS OPERACIONALES',
                'tipo_cuenta': 'gasto',
                'naturaleza': 'debito',
                'nivel': 2,
                'cuenta_padre': '5',
                'es_auxiliar': False,
                'activo': True
            },
            {
                'codigo': '5105',
                'nombre': 'GASTOS DE PERSONAL',
                'tipo_cuenta': 'gasto',
                'naturaleza': 'debito',
                'nivel': 3,
                'cuenta_padre': '51',
                'es_auxiliar': True,
                'activo': True
            },
        ]

        cuentas_creadas = {}
        # Ordenar por nivel para crear primero las cuentas padre
        cuentas_ordenadas = sorted(cuentas, key=lambda x: x['nivel'])
        
        for cuenta_data in cuentas_ordenadas:
            cuenta_data['activa'] = cuenta_data.pop('activo', True)
            cuenta_data['acepta_movimientos'] = cuenta_data.pop('es_auxiliar', True)
            cuenta_data.setdefault('requiere_tercero', False)
            cuenta_padre_codigo = cuenta_data.pop('cuenta_padre', None)
            if cuenta_padre_codigo:
                cuenta_data['cuenta_padre'] = cuentas_creadas[cuenta_padre_codigo]
            
            cuenta, created = PlanCuentas.objects.get_or_create(
                codigo=cuenta_data['codigo'],
                defaults=cuenta_data
            )
            cuentas_creadas[cuenta_data['codigo']] = cuenta
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creada cuenta: {cuenta.codigo} - {cuenta.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe cuenta: {cuenta.codigo} - {cuenta.nombre}')
                )

        self.stdout.write(
            self.style.SUCCESS('Plan de cuentas básico inicializado correctamente')
        )
