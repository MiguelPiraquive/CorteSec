from django.core.management.base import BaseCommand
from documentacion.models import TipoDocumento, Documento
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Inicializa tipos de documentos y documentación básica'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina la documentación existente antes de crear nueva',
        )

    def handle(self, *args, **options):
        if options['reset']:
            Documento.objects.all().delete()
            TipoDocumento.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Documentación existente eliminada')
            )

        # Crear tipos de documentos
        tipos_documentos = [
            {
                'nombre': 'Manual de Usuario',
                'descripcion': 'Manuales para usuarios finales',
                'extension_permitida': '.pdf,.doc,.docx',
                'tamaño_maximo': 10485760,  # 10MB
                'activo': True
            },
            {
                'nombre': 'Manual Técnico',
                'descripcion': 'Documentación técnica del sistema',
                'extension_permitida': '.pdf,.doc,.docx,.md',
                'tamaño_maximo': 20971520,  # 20MB
                'activo': True
            },
            {
                'nombre': 'Política',
                'descripcion': 'Políticas de la empresa',
                'extension_permitida': '.pdf,.doc,.docx',
                'tamaño_maximo': 5242880,  # 5MB
                'activo': True
            },
            {
                'nombre': 'Procedimiento',
                'descripcion': 'Procedimientos operativos',
                'extension_permitida': '.pdf,.doc,.docx',
                'tamaño_maximo': 5242880,  # 5MB
                'activo': True
            },
            {
                'nombre': 'Formato',
                'descripcion': 'Formatos y plantillas',
                'extension_permitida': '.pdf,.doc,.docx,.xls,.xlsx',
                'tamaño_maximo': 2097152,  # 2MB
                'activo': True
            },
            {
                'nombre': 'Video Tutorial',
                'descripcion': 'Videos explicativos',
                'extension_permitida': '.mp4,.avi,.mov',
                'tamaño_maximo': 104857600,  # 100MB
                'activo': True
            },
        ]

        tipos_creados = {}
        for tipo_data in tipos_documentos:
            tipo, created = TipoDocumento.objects.get_or_create(
                nombre=tipo_data['nombre'],
                defaults=tipo_data
            )
            tipos_creados[tipo_data['nombre']] = tipo
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado tipo de documento: {tipo.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe tipo de documento: {tipo.nombre}')
                )

        # Obtener o crear usuario admin para documentos
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@cortesec.com',
                'first_name': 'Administrador',
                'last_name': 'Sistema',
                'is_staff': True,
                'is_superuser': True
            }
        )

        # Crear documentos básicos
        documentos = [
            {
                'titulo': 'Manual de Usuario - Introducción',
                'descripcion': 'Introducción general al sistema CorteSec',
                'contenido': '''
                # Manual de Usuario CorteSec
                
                ## Introducción
                
                CorteSec es un sistema integral de gestión empresarial que incluye:
                
                - Gestión de recursos humanos
                - Procesamiento de nómina
                - Contabilidad y finanzas
                - Control de inventarios
                - Sistema de préstamos
                - Generación de reportes
                
                ## Requisitos del Sistema
                
                - Navegador web moderno (Chrome, Firefox, Edge)
                - Conexión a internet
                - Credenciales de acceso válidas
                
                ## Soporte
                
                Para soporte técnico, contacte al administrador del sistema.
                ''',
                'tipo_documento': 'Manual de Usuario',
                'version': '1.0',
                'activo': True
            },
            {
                'titulo': 'Manual Técnico - Instalación',
                'descripcion': 'Guía de instalación y configuración técnica',
                'contenido': '''
                # Manual Técnico - Instalación
                
                ## Requisitos del Servidor
                
                - Python 3.8+
                - Django 4.0+
                - PostgreSQL 12+
                - Redis (opcional)
                
                ## Instalación
                
                1. Clonar el repositorio
                2. Instalar dependencias
                3. Configurar base de datos
                4. Ejecutar migraciones
                5. Crear superusuario
                
                ## Configuración
                
                Configurar variables de entorno en archivo .env
                ''',
                'tipo_documento': 'Manual Técnico',
                'version': '1.0',
                'activo': True
            },
            {
                'titulo': 'Política de Seguridad',
                'descripcion': 'Políticas de seguridad del sistema',
                'contenido': '''
                # Política de Seguridad
                
                ## Acceso al Sistema
                
                - Uso de credenciales únicas por usuario
                - Cambio de contraseñas cada 90 días
                - Bloqueo automático tras 3 intentos fallidos
                
                ## Confidencialidad
                
                - No compartir credenciales de acceso
                - Cerrar sesión al finalizar el trabajo
                - No acceder desde equipos públicos
                
                ## Respaldo de Información
                
                - Backup automático diario
                - Retención de 30 días
                - Almacenamiento seguro
                ''',
                'tipo_documento': 'Política',
                'version': '1.0',
                'activo': True
            },
        ]

        for doc_data in documentos:
            tipo_nombre = doc_data.pop('tipo_documento')
            doc_data['tipo_documento'] = tipos_creados[tipo_nombre]
            doc_data['autor'] = admin_user
            
            documento, created = Documento.objects.get_or_create(
                titulo=doc_data['titulo'],
                defaults=doc_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado documento: {documento.titulo}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe documento: {documento.titulo}')
                )

        self.stdout.write(
            self.style.SUCCESS('Documentación básica inicializada correctamente')
        )
