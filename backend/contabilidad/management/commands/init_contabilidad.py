from django.core.management.base import BaseCommand
from contabilidad.models import PlanCuentas, TipoMovimiento, CentroCosto
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

        # Crear tipos de movimiento
        tipos_movimiento = [
            {
                'codigo': 'ING',
                'nombre': 'Ingreso',
                'descripcion': 'Movimientos de ingreso',
                'afecta_debito': False,
                'afecta_credito': True,
                'activo': True
            },
            {
                'codigo': 'EGR',
                'nombre': 'Egreso',
                'descripcion': 'Movimientos de egreso',
                'afecta_debito': True,
                'afecta_credito': False,
                'activo': True
            },
            {
                'codigo': 'TRF',
                'nombre': 'Transferencia',
                'descripcion': 'Transferencias entre cuentas',
                'afecta_debito': True,
                'afecta_credito': True,
                'activo': True
            },
        ]

        tipos_creados = {}
        for tipo_data in tipos_movimiento:
            tipo, created = TipoMovimiento.objects.get_or_create(
                codigo=tipo_data['codigo'],
                defaults=tipo_data
            )
            tipos_creados[tipo_data['codigo']] = tipo
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado tipo de movimiento: {tipo.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe tipo de movimiento: {tipo.nombre}')
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
                'codigo': '4135',
                'nombre': 'SERVICIOS',
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
