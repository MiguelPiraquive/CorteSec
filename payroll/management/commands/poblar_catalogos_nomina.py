"""
Comando para poblar catálogos base de nómina con datos iniciales
"""
from django.core.management.base import BaseCommand
from payroll.models import TipoDocumento, TipoTrabajador, TipoContrato


class Command(BaseCommand):
    help = 'Pobla los catálogos base de nómina (TipoDocumento, TipoTrabajador, TipoContrato)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Poblando catálogos de nómina...'))
        
        # ==========================================
        # TIPOS DE DOCUMENTO
        # ==========================================
        tipos_documento = [
            {'codigo': 'CC', 'nombre': 'Cédula de Ciudadanía', 'descripcion': 'Documento de identidad para ciudadanos colombianos mayores de 18 años'},
            {'codigo': 'CE', 'nombre': 'Cédula de Extranjería', 'descripcion': 'Documento de identidad para extranjeros residentes en Colombia'},
            {'codigo': 'TI', 'nombre': 'Tarjeta de Identidad', 'descripcion': 'Documento de identidad para menores de edad entre 7 y 17 años'},
            {'codigo': 'PA', 'nombre': 'Pasaporte', 'descripcion': 'Documento de viaje internacional'},
            {'codigo': 'RC', 'nombre': 'Registro Civil', 'descripcion': 'Documento de identidad para menores de 7 años'},
            {'codigo': 'NIT', 'nombre': 'NIT', 'descripcion': 'Número de Identificación Tributaria'},
            {'codigo': 'DIE', 'nombre': 'Documento de Identificación Extranjero', 'descripcion': 'Otros documentos de identificación de extranjeros'},
        ]
        
        created_docs = 0
        for tipo_data in tipos_documento:
            tipo, created = TipoDocumento.objects.get_or_create(
                codigo=tipo_data['codigo'],
                defaults={
                    'nombre': tipo_data['nombre'],
                    'descripcion': tipo_data['descripcion'],
                    'activo': True
                }
            )
            if created:
                created_docs += 1
                self.stdout.write(f'  ✓ Creado: {tipo}')
            else:
                self.stdout.write(f'  - Ya existe: {tipo}')
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Tipos de Documento: {created_docs} creados, {len(tipos_documento) - created_docs} ya existían\n'))
        
        # ==========================================
        # TIPOS DE TRABAJADOR
        # ==========================================
        tipos_trabajador = [
            {
                'codigo': 'DEP', 
                'nombre': 'Dependiente', 
                'descripcion': 'Trabajador dependiente con contrato laboral formal',
                'requiere_nomina_electronica': True
            },
            {
                'codigo': 'APR', 
                'nombre': 'Aprendiz', 
                'descripcion': 'Estudiante en etapa práctica o aprendiz SENA',
                'requiere_nomina_electronica': True
            },
            {
                'codigo': 'PEN', 
                'nombre': 'Pensionado', 
                'descripcion': 'Persona pensionada que recibe mesada',
                'requiere_nomina_electronica': False
            },
            {
                'codigo': 'SUB', 
                'nombre': 'Subcontratista', 
                'descripcion': 'Trabajador independiente por producción/destajo',
                'requiere_nomina_electronica': False
            },
        ]
        
        created_workers = 0
        for tipo_data in tipos_trabajador:
            tipo, created = TipoTrabajador.objects.get_or_create(
                codigo=tipo_data['codigo'],
                defaults={
                    'nombre': tipo_data['nombre'],
                    'descripcion': tipo_data['descripcion'],
                    'requiere_nomina_electronica': tipo_data['requiere_nomina_electronica'],
                    'activo': True
                }
            )
            if created:
                created_workers += 1
                nomina_elect = "SÍ requiere" if tipo.requiere_nomina_electronica else "NO requiere"
                self.stdout.write(f'  ✓ Creado: {tipo} ({nomina_elect} nómina electrónica)')
            else:
                self.stdout.write(f'  - Ya existe: {tipo}')
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Tipos de Trabajador: {created_workers} creados, {len(tipos_trabajador) - created_workers} ya existían\n'))
        
        # ==========================================
        # TIPOS DE CONTRATO
        # ==========================================
        tipos_contrato = [
            {
                'codigo': 'IND', 
                'nombre': 'Indefinido', 
                'descripcion': 'Contrato laboral a término indefinido',
                'requiere_fecha_fin': False
            },
            {
                'codigo': 'FIJ', 
                'nombre': 'Término Fijo', 
                'descripcion': 'Contrato laboral a término fijo',
                'requiere_fecha_fin': True
            },
            {
                'codigo': 'OBR', 
                'nombre': 'Obra o Labor', 
                'descripcion': 'Contrato por duración de obra o labor específica',
                'requiere_fecha_fin': True
            },
            {
                'codigo': 'APR', 
                'nombre': 'Aprendizaje', 
                'descripcion': 'Contrato de aprendizaje SENA',
                'requiere_fecha_fin': True
            },
            {
                'codigo': 'PSE', 
                'nombre': 'Prestación de Servicios', 
                'descripcion': 'Contrato de prestación de servicios profesionales',
                'requiere_fecha_fin': True
            },
        ]
        
        created_contracts = 0
        for tipo_data in tipos_contrato:
            tipo, created = TipoContrato.objects.get_or_create(
                codigo=tipo_data['codigo'],
                defaults={
                    'nombre': tipo_data['nombre'],
                    'descripcion': tipo_data['descripcion'],
                    'requiere_fecha_fin': tipo_data['requiere_fecha_fin'],
                    'activo': True
                }
            )
            if created:
                created_contracts += 1
                fecha_fin = "requiere" if tipo.requiere_fecha_fin else "no requiere"
                self.stdout.write(f'  ✓ Creado: {tipo} ({fecha_fin} fecha fin)')
            else:
                self.stdout.write(f'  - Ya existe: {tipo}')
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Tipos de Contrato: {created_contracts} creados, {len(tipos_contrato) - created_contracts} ya existían\n'))
        
        # ==========================================
        # RESUMEN FINAL
        # ==========================================
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('RESUMEN DE CATÁLOGOS POBLADOS'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'Tipos de Documento: {TipoDocumento.objects.count()} registros')
        self.stdout.write(f'Tipos de Trabajador: {TipoTrabajador.objects.count()} registros')
        self.stdout.write(f'Tipos de Contrato: {TipoContrato.objects.count()} registros')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('\n✓ ¡Catálogos poblados exitosamente!'))
