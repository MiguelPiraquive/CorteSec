"""
Comando para poblar el catálogo de tipos de deducción
"""
from django.core.management.base import BaseCommand
from payroll.models import TipoDeduccion


class Command(BaseCommand):
    help = 'Pobla el catálogo de tipos de deducción para nómina'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Poblando tipos de deducción...'))
        
        tipos_deduccion = [
            {
                'codigo': 'SALUD',
                'nombre': 'Salud (4%)',
                'descripcion': 'Aporte obligatorio a salud - 4% del IBC',
                'es_obligatoria': True,
                'aplica_sobre_ibc': True,
                'porcentaje_defecto': 4.00
            },
            {
                'codigo': 'PENSION',
                'nombre': 'Pensión (4%)',
                'descripcion': 'Aporte obligatorio a pensión - 4% del IBC',
                'es_obligatoria': True,
                'aplica_sobre_ibc': True,
                'porcentaje_defecto': 4.00
            },
            {
                'codigo': 'PRESTAMO',
                'nombre': 'Préstamo',
                'descripcion': 'Descuento por cuota de préstamo',
                'es_obligatoria': False,
                'aplica_sobre_ibc': False,
                'porcentaje_defecto': None
            },
            {
                'codigo': 'RETENCION',
                'nombre': 'Retención en la Fuente',
                'descripcion': 'Retención en la fuente según tabla DIAN',
                'es_obligatoria': True,
                'aplica_sobre_ibc': False,
                'porcentaje_defecto': None
            },
            {
                'codigo': 'EMBARGO',
                'nombre': 'Embargo Judicial',
                'descripcion': 'Descuento por embargo judicial',
                'es_obligatoria': False,
                'aplica_sobre_ibc': False,
                'porcentaje_defecto': None
            },
            {
                'codigo': 'FONDO',
                'nombre': 'Fondo de Empleados',
                'descripcion': 'Aporte voluntario a fondo de empleados',
                'es_obligatoria': False,
                'aplica_sobre_ibc': False,
                'porcentaje_defecto': None
            },
            {
                'codigo': 'COOPERATIVA',
                'nombre': 'Cooperativa',
                'descripcion': 'Aporte a cooperativa',
                'es_obligatoria': False,
                'aplica_sobre_ibc': False,
                'porcentaje_defecto': None
            },
            {
                'codigo': 'RESTAURANTE',
                'nombre': 'Restaurante',
                'descripcion': 'Descuento por servicio de restaurante',
                'es_obligatoria': False,
                'aplica_sobre_ibc': False,
                'porcentaje_defecto': None
            },
            {
                'codigo': 'SINDICATO',
                'nombre': 'Cuota Sindical',
                'descripcion': 'Cuota sindical',
                'es_obligatoria': False,
                'aplica_sobre_ibc': False,
                'porcentaje_defecto': None
            },
            {
                'codigo': 'OTRO',
                'nombre': 'Otra Deducción',
                'descripcion': 'Otras deducciones no clasificadas',
                'es_obligatoria': False,
                'aplica_sobre_ibc': False,
                'porcentaje_defecto': None
            },
        ]
        
        created_count = 0
        for tipo_data in tipos_deduccion:
            tipo, created = TipoDeduccion.objects.get_or_create(
                codigo=tipo_data['codigo'],
                defaults={
                    'nombre': tipo_data['nombre'],
                    'descripcion': tipo_data['descripcion'],
                    'es_obligatoria': tipo_data['es_obligatoria'],
                    'aplica_sobre_ibc': tipo_data['aplica_sobre_ibc'],
                    'porcentaje_defecto': tipo_data['porcentaje_defecto'],
                    'activo': True
                }
            )
            if created:
                created_count += 1
                obligatoria = "OBLIGATORIA" if tipo.es_obligatoria else "Opcional"
                self.stdout.write(f'  ✓ Creado: {tipo} ({obligatoria})')
            else:
                self.stdout.write(f'  - Ya existe: {tipo}')
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Tipos de Deducción: {created_count} creados, {len(tipos_deduccion) - created_count} ya existían\n'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS(f'Total de tipos de deducción: {TipoDeduccion.objects.count()}'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('\n✓ ¡Catálogo poblado exitosamente!'))
