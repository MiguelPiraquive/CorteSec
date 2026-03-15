"""
Comando para crear los permisos que el frontend necesita.
=========================================================

Crea los ModuloSistema y Permisos con codigos dot-notation
(ej: empleados.view, cargos.add) que el frontend espera
para el sistema RBAC.

Uso: python manage.py init_frontend_permisos
"""

from django.core.management.base import BaseCommand
from permisos.models import ModuloSistema, TipoPermiso, Permiso


# Definicion de modulos y sus permisos CRUD
# Formato: (modulo_codigo, modulo_nombre, descripcion, color, orden, acciones)
# acciones: lista de tuplas (accion, tipo_permiso_codigo)
MODULOS_PERMISOS = [
    # === RECURSOS HUMANOS ===
    {
        'codigo': 'empleados',
        'nombre': 'Empleados',
        'descripcion': 'Gestion de empleados del sistema',
        'color': '#10b981',
        'orden': 10,
        'acciones': [
            ('view', 'READ', 'Ver empleados'),
            ('add', 'WRITE', 'Crear empleados'),
            ('change', 'WRITE', 'Modificar empleados'),
            ('delete', 'DELETE', 'Eliminar empleados'),
        ],
    },
    {
        'codigo': 'cargos',
        'nombre': 'Cargos',
        'descripcion': 'Gestion de cargos y posiciones',
        'color': '#6366f1',
        'orden': 11,
        'acciones': [
            ('view', 'READ', 'Ver cargos'),
            ('add', 'WRITE', 'Crear cargos'),
            ('change', 'WRITE', 'Modificar cargos'),
            ('delete', 'DELETE', 'Eliminar cargos'),
        ],
    },
    {
        'codigo': 'tipos_contrato',
        'nombre': 'Tipos de Contrato',
        'descripcion': 'Gestion de tipos de contrato',
        'color': '#8b5cf6',
        'orden': 12,
        'acciones': [
            ('view', 'READ', 'Ver tipos de contrato'),
            ('add', 'WRITE', 'Crear tipos de contrato'),
            ('change', 'WRITE', 'Modificar tipos de contrato'),
            ('delete', 'DELETE', 'Eliminar tipos de contrato'),
        ],
    },
    {
        'codigo': 'contratos',
        'nombre': 'Contratos',
        'descripcion': 'Gestion de contratos laborales',
        'color': '#0ea5e9',
        'orden': 13,
        'acciones': [
            ('view', 'READ', 'Ver contratos'),
            ('add', 'WRITE', 'Crear contratos'),
            ('change', 'WRITE', 'Modificar contratos'),
            ('delete', 'DELETE', 'Eliminar contratos'),
        ],
    },

    # === NOMINA ===
    {
        'codigo': 'nomina',
        'nombre': 'Nomina',
        'descripcion': 'Gestion de nomina y pagos',
        'color': '#f59e0b',
        'orden': 20,
        'acciones': [
            ('view', 'READ', 'Ver nomina'),
            ('add', 'WRITE', 'Crear nomina'),
            ('change', 'WRITE', 'Modificar nomina'),
            ('delete', 'DELETE', 'Eliminar nomina'),
            ('calcular', 'WRITE', 'Calcular nomina'),
            ('aprobar', 'WRITE', 'Aprobar nomina'),
            ('pagar', 'WRITE', 'Pagar nomina'),
            ('anular', 'WRITE', 'Anular nomina'),
        ],
    },
    {
        'codigo': 'conceptos_laborales',
        'nombre': 'Conceptos Laborales',
        'descripcion': 'Gestion de conceptos laborales',
        'color': '#f97316',
        'orden': 21,
        'acciones': [
            ('view', 'READ', 'Ver conceptos laborales'),
            ('add', 'WRITE', 'Crear conceptos laborales'),
            ('change', 'WRITE', 'Modificar conceptos laborales'),
            ('delete', 'DELETE', 'Eliminar conceptos laborales'),
        ],
    },
    {
        'codigo': 'parametros_legales',
        'nombre': 'Parametros Legales',
        'descripcion': 'Gestion de parametros legales del sistema',
        'color': '#ef4444',
        'orden': 22,
        'acciones': [
            ('view', 'READ', 'Ver parametros legales'),
            ('add', 'WRITE', 'Crear parametros legales'),
            ('change', 'WRITE', 'Modificar parametros legales'),
            ('delete', 'DELETE', 'Eliminar parametros legales'),
        ],
    },

    # === OPERACIONES ===
    {
        'codigo': 'proyectos',
        'nombre': 'Proyectos',
        'descripcion': 'Gestion de proyectos',
        'color': '#8b5cf6',
        'orden': 15,
        'acciones': [
            ('view', 'READ', 'Ver proyectos'),
            ('add', 'WRITE', 'Crear proyectos'),
            ('change', 'WRITE', 'Modificar proyectos'),
            ('delete', 'DELETE', 'Eliminar proyectos'),
        ],
    },
    # === UBICACIONES ===
    {
        'codigo': 'departamentos',
        'nombre': 'Departamentos',
        'descripcion': 'Gestion de departamentos geograficos',
        'color': '#14b8a6',
        'orden': 30,
        'acciones': [
            ('view', 'READ', 'Ver departamentos'),
            ('add', 'WRITE', 'Crear departamentos'),
            ('change', 'WRITE', 'Modificar departamentos'),
            ('delete', 'DELETE', 'Eliminar departamentos'),
        ],
    },
    {
        'codigo': 'municipios',
        'nombre': 'Municipios',
        'descripcion': 'Gestion de municipios',
        'color': '#06b6d4',
        'orden': 31,
        'acciones': [
            ('view', 'READ', 'Ver municipios'),
            ('add', 'WRITE', 'Crear municipios'),
            ('change', 'WRITE', 'Modificar municipios'),
            ('delete', 'DELETE', 'Eliminar municipios'),
        ],
    },

    # === FINANZAS ===
    {
        'codigo': 'prestamos',
        'nombre': 'Prestamos',
        'descripcion': 'Gestion de prestamos',
        'color': '#22c55e',
        'orden': 40,
        'acciones': [
            ('view', 'READ', 'Ver prestamos'),
            ('add', 'WRITE', 'Crear prestamos'),
            ('change', 'WRITE', 'Modificar prestamos'),
            ('delete', 'DELETE', 'Eliminar prestamos'),
        ],
    },
    {
        'codigo': 'tipos_prestamo',
        'nombre': 'Tipos de Prestamo',
        'descripcion': 'Gestion de tipos de prestamo',
        'color': '#84cc16',
        'orden': 41,
        'acciones': [
            ('view', 'READ', 'Ver tipos de prestamo'),
            ('add', 'WRITE', 'Crear tipos de prestamo'),
            ('change', 'WRITE', 'Modificar tipos de prestamo'),
            ('delete', 'DELETE', 'Eliminar tipos de prestamo'),
        ],
    },
    {
        'codigo': 'contabilidad',
        'nombre': 'Contabilidad',
        'descripcion': 'Modulo de contabilidad y finanzas',
        'color': '#059669',
        'orden': 42,
        'acciones': [
            ('view', 'READ', 'Ver contabilidad'),
            ('add', 'WRITE', 'Crear registros contables'),
            ('change', 'WRITE', 'Modificar registros contables'),
            ('delete', 'DELETE', 'Eliminar registros contables'),
        ],
    },
    {
        'codigo': 'items',
        'nombre': 'Items',
        'descripcion': 'Gestion de items y productos',
        'color': '#f97316',
        'orden': 43,
        'acciones': [
            ('view', 'READ', 'Ver items'),
            ('add', 'WRITE', 'Crear items'),
            ('change', 'WRITE', 'Modificar items'),
            ('delete', 'DELETE', 'Eliminar items'),
        ],
    },

    # === CONTROL DE ACCESO ===
    {
        'codigo': 'usuarios',
        'nombre': 'Usuarios',
        'descripcion': 'Gestion de usuarios del sistema',
        'color': '#3b82f6',
        'orden': 50,
        'acciones': [
            ('view', 'READ', 'Ver usuarios'),
            ('add', 'WRITE', 'Crear usuarios'),
            ('change', 'WRITE', 'Modificar usuarios'),
            ('delete', 'DELETE', 'Eliminar usuarios'),
            ('admin', 'WRITE', 'Exportar y administrar usuarios'),
        ],
    },
    {
        'codigo': 'roles',
        'nombre': 'Roles',
        'descripcion': 'Gestion de roles del sistema',
        'color': '#ef4444',
        'orden': 51,
        'acciones': [
            ('view', 'READ', 'Ver roles'),
            ('add', 'WRITE', 'Crear roles'),
            ('change', 'WRITE', 'Modificar roles'),
            ('delete', 'DELETE', 'Eliminar roles'),
        ],
    },
    {
        'codigo': 'permisos',
        'nombre': 'Permisos',
        'descripcion': 'Gestion de permisos del sistema',
        'color': '#8b5cf6',
        'orden': 52,
        'acciones': [
            ('view', 'READ', 'Ver permisos'),
            ('add', 'WRITE', 'Crear permisos'),
            ('change', 'WRITE', 'Modificar permisos'),
            ('delete', 'DELETE', 'Eliminar permisos'),
            ('manage_modulos', 'WRITE', 'Gestionar modulos del sistema'),
            ('manage_condiciones', 'WRITE', 'Gestionar condiciones de permisos'),
            ('manage_directos', 'WRITE', 'Gestionar permisos directos'),
            ('view_auditoria', 'READ', 'Ver auditoria de permisos'),
        ],
    },
    {
        'codigo': 'auditoria',
        'nombre': 'Auditoria',
        'descripcion': 'Modulo de auditoria del sistema',
        'color': '#64748b',
        'orden': 53,
        'acciones': [
            ('view', 'READ', 'Ver auditoria'),
        ],
    },

    # === CONFIGURACION ===
    {
        'codigo': 'configuracion',
        'nombre': 'Configuracion',
        'descripcion': 'Configuracion general del sistema',
        'color': '#7c3aed',
        'orden': 60,
        'acciones': [
            ('view', 'READ', 'Ver configuracion'),
            ('change', 'WRITE', 'Modificar configuracion'),
        ],
    },

    # === CORE ===
    {
        'codigo': 'organizaciones',
        'nombre': 'Organizaciones',
        'descripcion': 'Gestion de organizaciones',
        'color': '#475569',
        'orden': 70,
        'acciones': [
            ('view', 'READ', 'Ver organizaciones'),
            ('add', 'WRITE', 'Crear organizaciones'),
            ('change', 'WRITE', 'Modificar organizaciones'),
            ('delete', 'DELETE', 'Eliminar organizaciones'),
        ],
    },
    {
        'codigo': 'perfil',
        'nombre': 'Perfil',
        'descripcion': 'Perfil de usuario',
        'color': '#0ea5e9',
        'orden': 71,
        'acciones': [
            ('view', 'READ', 'Ver perfil'),
            ('change', 'WRITE', 'Modificar perfil'),
            ('admin', 'WRITE', 'Administrar todos los perfiles'),
        ],
    },

    # === AYUDA ===
    {
        'codigo': 'ayuda',
        'nombre': 'Centro de Ayuda',
        'descripcion': 'Centro de ayuda y soporte',
        'color': '#06b6d4',
        'orden': 80,
        'acciones': [
            ('view', 'READ', 'Ver centro de ayuda'),
            ('add', 'WRITE', 'Crear tickets de soporte'),
        ],
    },

    # === DASHBOARD ===
    {
        'codigo': 'dashboard',
        'nombre': 'Dashboard',
        'descripcion': 'Panel principal del sistema',
        'color': '#3b82f6',
        'orden': 1,
        'acciones': [
            ('view', 'READ', 'Ver dashboard'),
        ],
    },

    # === DOCUMENTACION ===
    {
        'codigo': 'documentacion',
        'nombre': 'Documentacion',
        'descripcion': 'Gestion de documentacion del sistema',
        'color': '#64748b',
        'orden': 85,
        'acciones': [
            ('view', 'READ', 'Ver documentacion'),
            ('add', 'WRITE', 'Crear documentacion'),
            ('change', 'WRITE', 'Modificar documentacion'),
            ('delete', 'DELETE', 'Eliminar documentacion'),
        ],
    },
]


class Command(BaseCommand):
    help = 'Crea los permisos con codigos dot-notation que el frontend necesita'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forzar la recreacion de permisos existentes',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        self.stdout.write('Inicializando permisos para frontend...\n')

        # Verificar que existan los TipoPermiso necesarios
        tipos_requeridos = {'READ', 'WRITE', 'DELETE'}
        tipos_existentes = set(TipoPermiso.objects.values_list('codigo', flat=True))
        tipos_faltantes = tipos_requeridos - tipos_existentes

        if tipos_faltantes:
            self.stdout.write(
                self.style.WARNING(
                    f'Creando TipoPermiso faltantes: {tipos_faltantes}'
                )
            )
            tipo_defaults = {
                'READ': {
                    'nombre': 'Solo Lectura',
                    'descripcion': 'Permisos de solo lectura',
                    'categoria': 'crud',
                },
                'WRITE': {
                    'nombre': 'Escritura',
                    'descripcion': 'Permisos de escritura y modificacion',
                    'categoria': 'crud',
                },
                'DELETE': {
                    'nombre': 'Eliminacion',
                    'descripcion': 'Permisos de eliminacion',
                    'categoria': 'crud',
                },
            }
            for codigo in tipos_faltantes:
                TipoPermiso.objects.get_or_create(
                    codigo=codigo,
                    defaults=tipo_defaults.get(codigo, {
                        'nombre': codigo,
                        'descripcion': f'Tipo {codigo}',
                        'categoria': 'crud',
                    })
                )

        # Cache de TipoPermiso
        tipos_cache = {}
        for tp in TipoPermiso.objects.all():
            tipos_cache[tp.codigo] = tp

        total_modulos = 0
        total_permisos = 0
        modulos_creados = 0
        permisos_creados = 0

        for modulo_def in MODULOS_PERMISOS:
            total_modulos += 1
            codigo_modulo = modulo_def['codigo']

            # Crear o obtener ModuloSistema
            modulo, mod_created = ModuloSistema.objects.get_or_create(
                codigo=codigo_modulo,
                defaults={
                    'nombre': modulo_def['nombre'],
                    'descripcion': modulo_def['descripcion'],
                    'color': modulo_def['color'],
                    'orden': modulo_def['orden'],
                    'activo': True,
                }
            )

            if mod_created:
                modulos_creados += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  + Modulo: {modulo.nombre}')
                )
            else:
                self.stdout.write(f'  = Modulo ya existe: {modulo.nombre}')

            # Crear permisos para este modulo
            for accion, tipo_codigo, desc in modulo_def['acciones']:
                total_permisos += 1
                permiso_codigo = f'{codigo_modulo}.{accion}'
                permiso_nombre = f'{modulo_def["nombre"]} - {accion.upper()}'

                tipo_permiso = tipos_cache.get(tipo_codigo)
                if not tipo_permiso:
                    self.stdout.write(
                        self.style.ERROR(
                            f'    TipoPermiso "{tipo_codigo}" no encontrado, '
                            f'saltando permiso {permiso_codigo}'
                        )
                    )
                    continue

                permiso, perm_created = Permiso.objects.get_or_create(
                    codigo=permiso_codigo,
                    defaults={
                        'nombre': permiso_nombre,
                        'descripcion': desc,
                        'modulo': modulo,
                        'tipo_permiso': tipo_permiso,
                        'ambito': 'modulo',
                        'activo': True,
                        'es_sistema': True,
                    }
                )

                if perm_created:
                    permisos_creados += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'    + Permiso: {permiso_codigo}')
                    )
                elif force:
                    # Actualizar si force
                    permiso.nombre = permiso_nombre
                    permiso.descripcion = desc
                    permiso.modulo = modulo
                    permiso.tipo_permiso = tipo_permiso
                    permiso.activo = True
                    permiso.save()
                    self.stdout.write(f'    ~ Permiso actualizado: {permiso_codigo}')

        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(
            self.style.SUCCESS(
                f'Modulos: {modulos_creados} creados / {total_modulos} total'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'Permisos: {permisos_creados} creados / {total_permisos} total'
            )
        )
        self.stdout.write(self.style.SUCCESS('Inicializacion completada.'))
