from django.core.management.base import BaseCommand
from reportes.models import TipoReporte, PlantillaReporte


class Command(BaseCommand):
    help = 'Inicializa tipos de reportes y plantillas básicas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina los reportes existentes antes de crear nuevos',
        )

    def handle(self, *args, **options):
        if options['reset']:
            PlantillaReporte.objects.all().delete()
            TipoReporte.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Reportes existentes eliminados')
            )

        # Crear tipos de reportes
        tipos_reportes = [
            {
                'codigo': 'NOMINA',
                'nombre': 'Reportes de Nómina',
                'descripcion': 'Reportes relacionados con nómina y pagos',
                'activo': True
            },
            {
                'codigo': 'RRHH',
                'nombre': 'Reportes de Recursos Humanos',
                'descripcion': 'Reportes de empleados y personal',
                'activo': True
            },
            {
                'codigo': 'CONTABLE',
                'nombre': 'Reportes Contables',
                'descripcion': 'Reportes financieros y contables',
                'activo': True
            },
            {
                'codigo': 'INVENTARIO',
                'nombre': 'Reportes de Inventario',
                'descripcion': 'Reportes de items y stock',
                'activo': True
            },
            {
                'codigo': 'PRESTAMOS',
                'nombre': 'Reportes de Préstamos',
                'descripcion': 'Reportes de préstamos y cuotas',
                'activo': True
            },
            {
                'codigo': 'DASHBOARD',
                'nombre': 'Reportes de Dashboard',
                'descripcion': 'Reportes ejecutivos y KPIs',
                'activo': True
            },
        ]

        tipos_creados = {}
        for tipo_data in tipos_reportes:
            tipo, created = TipoReporte.objects.get_or_create(
                codigo=tipo_data['codigo'],
                defaults=tipo_data
            )
            tipos_creados[tipo_data['codigo']] = tipo
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado tipo de reporte: {tipo.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe tipo de reporte: {tipo.nombre}')
                )

        # Crear plantillas de reportes
        plantillas = [
            {
                'codigo': 'NOM_MENSUAL',
                'nombre': 'Nómina Mensual',
                'descripcion': 'Reporte de nómina mensual por empleado',
                'tipo_reporte': 'NOMINA',
                'formato': 'pdf',
                'query_sql': '''
                    SELECT 
                        u.first_name, u.last_name, 
                        p.salario_base, p.fecha_inicio
                    FROM auth_user u
                    JOIN payroll_empleado p ON u.id = p.usuario_id
                    WHERE p.activo = true
                ''',
                'activo': True
            },
            {
                'codigo': 'EMP_ACTIVOS',
                'nombre': 'Empleados Activos',
                'descripcion': 'Lista de empleados activos',
                'tipo_reporte': 'RRHH',
                'formato': 'excel',
                'query_sql': '''
                    SELECT 
                        u.username, u.first_name, u.last_name, u.email,
                        p.telefono, p.direccion, pe.fecha_ingreso
                    FROM auth_user u
                    LEFT JOIN perfil_perfilusuario p ON u.id = p.usuario_id
                    LEFT JOIN payroll_empleado pe ON u.id = pe.usuario_id
                    WHERE u.is_active = true
                ''',
                'activo': True
            },
            {
                'codigo': 'BAL_GENERAL',
                'nombre': 'Balance General',
                'descripcion': 'Balance general contable',
                'tipo_reporte': 'CONTABLE',
                'formato': 'pdf',
                'query_sql': '''
                    SELECT 
                        pc.codigo, pc.nombre, pc.tipo_cuenta,
                        COALESCE(SUM(mc.valor_debito), 0) as total_debito,
                        COALESCE(SUM(mc.valor_credito), 0) as total_credito
                    FROM contabilidad_plancuentas pc
                    LEFT JOIN contabilidad_movimientocontable mc ON pc.id = mc.cuenta_id
                    WHERE pc.activo = true
                    GROUP BY pc.id, pc.codigo, pc.nombre, pc.tipo_cuenta
                    ORDER BY pc.codigo
                ''',
                'activo': True
            },
            {
                'codigo': 'INV_STOCK',
                'nombre': 'Inventario por Stock',
                'descripcion': 'Reporte de inventario actual',
                'tipo_reporte': 'INVENTARIO',
                'formato': 'excel',
                'query_sql': '''
                    SELECT 
                        i.codigo, i.nombre, i.descripcion,
                        c.nombre as categoria,
                        u.abreviatura as unidad,
                        i.stock_actual, i.stock_minimo,
                        i.precio_unitario
                    FROM items_item i
                    JOIN items_categoriaitem c ON i.categoria_id = c.id
                    JOIN items_unidadmedida u ON i.unidad_medida_id = u.id
                    WHERE i.activo = true
                    ORDER BY i.codigo
                ''',
                'activo': True
            },
            {
                'codigo': 'PREST_ACTIVOS',
                'nombre': 'Préstamos Activos',
                'descripcion': 'Reporte de préstamos vigentes',
                'tipo_reporte': 'PRESTAMOS',
                'formato': 'pdf',
                'query_sql': '''
                    SELECT 
                        p.numero_prestamo,
                        u.first_name, u.last_name,
                        tp.nombre as tipo_prestamo,
                        p.monto_aprobado, p.saldo_pendiente,
                        p.fecha_desembolso, p.estado
                    FROM prestamos_prestamo p
                    JOIN auth_user u ON p.empleado_id = u.id
                    JOIN prestamos_tipoprestamo tp ON p.tipo_prestamo_id = tp.id
                    WHERE p.estado IN ('activo', 'aprobado')
                    ORDER BY p.fecha_solicitud DESC
                ''',
                'activo': True
            },
            {
                'codigo': 'DASH_EJECUTIVO',
                'nombre': 'Dashboard Ejecutivo',
                'descripcion': 'Resumen ejecutivo de indicadores',
                'tipo_reporte': 'DASHBOARD',
                'formato': 'pdf',
                'query_sql': '''
                    SELECT 
                        'Total Empleados' as indicador,
                        COUNT(*) as valor
                    FROM auth_user u
                    WHERE u.is_active = true
                    
                    UNION ALL
                    
                    SELECT 
                        'Préstamos Activos' as indicador,
                        COUNT(*) as valor
                    FROM prestamos_prestamo p
                    WHERE p.estado = 'activo'
                ''',
                'activo': True
            },
        ]

        for plantilla_data in plantillas:
            tipo_codigo = plantilla_data.pop('tipo_reporte')
            plantilla_data['tipo_reporte'] = tipos_creados[tipo_codigo]
            
            plantilla, created = PlantillaReporte.objects.get_or_create(
                codigo=plantilla_data['codigo'],
                defaults=plantilla_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creada plantilla: {plantilla.codigo} - {plantilla.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe plantilla: {plantilla.codigo} - {plantilla.nombre}')
                )

        self.stdout.write(
            self.style.SUCCESS('Tipos de reportes y plantillas inicializados correctamente')
        )
