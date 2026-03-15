"""
Management Command: Inicializar Permisos en Roles

Este comando asigna permisos a roles según la matriz definida.
Limpia asignaciones previas y aplica la configuración estándar.

Uso:
    python manage.py init_permisos_roles
    python manage.py init_permisos_roles --dry-run  # Simular sin aplicar cambios
"""

from django.core.management.base import BaseCommand
from django.db.models import Q, Count
from roles.models import Rol, TipoRol
from permisos.models import Permiso, ModuloSistema


class Command(BaseCommand):
    help = 'Inicializa permisos en roles segun matriz definida'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la asignacion sin hacer cambios reales'
        )
        parser.add_argument(
            '--limpiar',
            action='store_true',
            help='Limpia todos los permisos antes de asignar'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limpiar = options['limpiar']

        self.stdout.write("\n" + "="*80)
        self.stdout.write(self.style.SUCCESS("INICIALIZACION DE PERMISOS POR ROL".center(80)))
        self.stdout.write("="*80 + "\n")

        if dry_run:
            self.stdout.write(self.style.WARNING("MODO DRY-RUN: No se aplicaran cambios\n"))

        # Matriz de permisos
        matriz = self.get_matriz_permisos()

        # Procesar cada rol
        for codigo_rol, config in matriz.items():
            self.procesar_rol(codigo_rol, config, dry_run, limpiar)

        # Resumen final
        self.mostrar_resumen()

        self.stdout.write("\n" + "="*80)
        self.stdout.write(self.style.SUCCESS("PROCESO COMPLETADO".center(80)))
        self.stdout.write("="*80 + "\n")

    def get_matriz_permisos(self):
        """
        Define la matriz de permisos por rol

        Estructura:
        {
            'CODIGO_ROL': {
                'nombre': 'Nombre del Rol',
                'descripcion': 'Descripcion',
                'tipo': 'todos|modulos|excluir',
                'modulos': ['modulo1', 'modulo2'],  # Para tipo='modulos'
                'excluir_modulos': ['modulo1'],      # Para tipo='excluir'
                'acciones': ['create', 'read', ...]  # Para tipo='modulos'
                'excluir_acciones': ['delete'],      # Acciones a excluir
            }
        }
        """

        return {
            # SUPER ADMINISTRADOR RBAC - Todos los permisos
            'SUPER_ADMIN_RBAC': {
                'nombre': 'Super Administrador RBAC',
                'descripcion': 'Control total del sistema',
                'tipo': 'todos',
            },

            # ADMINISTRADOR - Todos excepto gestión de roles/permisos
            'ADMIN': {
                'nombre': 'Administrador',
                'descripcion': 'Gestor del sistema',
                'tipo': 'excluir',
                'excluir_modulos': [],  # Por ahora todos, pero solo lectura en roles
                'permisos_especiales': {
                    'roles': ['read', 'list'],  # Solo lectura en roles y permisos
                    'permisos': ['read', 'list'],
                }
            },

            # CONTADOR - Módulos financieros
            'CONTADOR': {
                'nombre': 'Contador',
                'descripcion': 'Gestion financiera y contable',
                'tipo': 'modulos',
                'modulos': [
                    'contabilidad', 'nomina', 'prestamos', 'reportes',
                    'dashboard', 'items', 'configuracion'
                ],
                'excluir_acciones': {
                    'contabilidad': ['delete'],  # No puede eliminar registros contables
                    'nomina': ['create', 'update', 'delete'],  # Solo lectura en nómina
                }
            },

            # CONTADOR RBAC - Como Contador + configuración contable
            'CONTADOR_RBAC': {
                'nombre': 'Contador RBAC',
                'descripcion': 'Contador con acceso a configuracion',
                'tipo': 'modulos',
                'modulos': [
                    'contabilidad', 'nomina', 'prestamos', 'reportes',
                    'dashboard', 'items', 'configuracion', 'parametros_legales'
                ],
                'excluir_acciones': {
                    'contabilidad': ['delete'],
                    'nomina': ['create', 'update', 'delete'],
                }
            },

            # SUPERVISOR NÓMINA - Gestión de nómina completa
            'SUPERVISOR_NOMINA_RBAC': {
                'nombre': 'Supervisor Nomina RBAC',
                'descripcion': 'Gestion completa de nomina',
                'tipo': 'modulos',
                'modulos': [
                    'nomina', 'empleados', 'contratos', 'tipos_contrato',
                    'cargos', 'conceptos_laborales', 'parametros_legales', 'dashboard'
                ],
                'excluir_acciones': {
                    'empleados': ['delete'],  # No eliminar empleados
                }
            },

            # SUPERVISOR - Lectura amplia + edición limitada
            'SUPERVISOR': {
                'nombre': 'Supervisor',
                'descripcion': 'Supervisor de operaciones',
                'tipo': 'modulos',
                'modulos': [
                    'dashboard', 'empleados', 'cargos', 'contratos', 'nomina',
                    'reportes', 'items', 'ubicaciones', 'prestamos', 'departamentos',
                    'municipios'
                ],
                'acciones': ['read', 'list', 'export'],  # Solo lectura y exportación
                'acciones_especiales': {
                    'empleados': ['read', 'update', 'list'],  # Puede editar empleados
                }
            },

            # EMPLEADO - Solo su información
            'EMPLEADO': {
                'nombre': 'Empleado',
                'descripcion': 'Usuario basico del sistema',
                'tipo': 'modulos',
                'modulos': [
                    'perfil', 'dashboard', 'ayuda'
                ],
                'acciones': ['read', 'list', 'update'],  # Lectura y edición básica
                'permisos_personales': True,  # Solo sus propios datos
            },

            # EMPLEADO RBAC - Igual que empleado
            'EMPLEADO_RBAC': {
                'nombre': 'Empleado RBAC',
                'descripcion': 'Usuario basico RBAC',
                'tipo': 'igual_a',
                'igual_a': 'EMPLEADO'
            },

            # GERENTE - Lectura completa + reportes
            'GERENTE': {
                'nombre': 'Gerente',
                'descripcion': 'Gestion ejecutiva',
                'tipo': 'modulos',
                'modulos': [
                    'dashboard', 'reportes', 'nomina', 'contabilidad', 'prestamos',
                    'empleados', 'contratos', 'core', 'cargos', 'items'
                ],
                'acciones': ['read', 'list', 'export', 'generate', 'stats'],
                'acciones_especiales': {
                    'reportes': ['create', 'read', 'list', 'export', 'generate'],
                }
            },

            # ADMINISTRADOR RBAC - Solo roles y permisos
            'ADMIN_RBAC': {
                'nombre': 'Administrador RBAC',
                'descripcion': 'Gestion de roles y permisos',
                'tipo': 'modulos',
                'modulos': [
                    'roles', 'permisos', 'tipos_rol', 'usuarios'  # Usuarios solo para asignar roles
                ],
                'excluir_acciones': {
                    'usuarios': ['create', 'delete'],  # Solo lectura/actualización de usuarios
                }
            },
        }

    def procesar_rol(self, codigo_rol, config, dry_run=False, limpiar=False):
        """Procesa un rol y asigna sus permisos"""

        self.stdout.write(f"\n{'-'*80}")
        self.stdout.write(f"Procesando rol: {config.get('nombre', codigo_rol)}")
        self.stdout.write(f"{'-'*80}\n")

        try:
            # Buscar el rol
            rol = Rol.objects.filter(
                Q(codigo__iexact=codigo_rol) |
                Q(nombre__iexact=config.get('nombre'))
            ).first()

            if not rol:
                self.stdout.write(self.style.WARNING(
                    f"  WARN: Rol '{codigo_rol}' no encontrado, se omite"
                ))
                return

            self.stdout.write(f"  OK: Encontrado rol '{rol.nombre}' (ID: {rol.id})")

            # Si es igual_a, copiar permisos de otro rol
            if config.get('tipo') == 'igual_a':
                rol_origen = Rol.objects.filter(codigo__iexact=config['igual_a']).first()
                if rol_origen:
                    permisos = rol_origen.permisos.all()
                    if not dry_run:
                        if limpiar:
                            rol.permisos.clear()
                        rol.permisos.add(*permisos)
                    self.stdout.write(self.style.SUCCESS(
                        f"  OK: {'Simulado copiar' if dry_run else 'Copiados'} permisos de '{rol_origen.nombre}' ({permisos.count()} permisos)"
                    ))
                return

            # Limpiar permisos actuales si se solicita
            if limpiar and not dry_run:
                rol.permisos.clear()
                self.stdout.write("  OK: Permisos actuales limpiados")

            # Obtener permisos según tipo
            permisos = self.obtener_permisos_para_rol(config)

            if not dry_run:
                # Asignar permisos
                rol.permisos.add(*permisos)

            self.stdout.write(self.style.SUCCESS(
                f"  OK: {'Simulado' if dry_run else 'Asignados'} {permisos.count()} permisos"
            ))

            # Mostrar algunos ejemplos
            if permisos.exists():
                ejemplos = permisos[:5]
                self.stdout.write("\n  Ejemplos de permisos asignados:")
                for p in ejemplos:
                    self.stdout.write(f"    - {p.codigo}: {p.nombre}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f"  ERROR: al procesar rol '{codigo_rol}': {e}"
            ))
            import traceback
            traceback.print_exc()

    def obtener_permisos_para_rol(self, config):
        """Obtiene los permisos según la configuración del rol"""

        tipo = config.get('tipo')

        # TIPO: Todos los permisos
        if tipo == 'todos':
            return Permiso.objects.filter(activo=True)

        # TIPO: Por módulos
        elif tipo == 'modulos':
            modulos_codigos = config.get('modulos', [])
            acciones = config.get('acciones', None)  # Si es None, todas las acciones

            # Obtener permisos de los módulos especificados
            modulos = ModuloSistema.objects.filter(codigo__in=modulos_codigos)
            permisos = Permiso.objects.filter(modulo__in=modulos, activo=True)

            # Filtrar por acciones si está especificado
            if acciones:
                q_filters = Q()
                for accion in acciones:
                    q_filters |= Q(codigo__icontains=f':{accion}')
                permisos = permisos.filter(q_filters)

            # Excluir acciones específicas por módulo
            excluir_acciones = config.get('excluir_acciones', {})
            for modulo_codigo, acciones_excluir in excluir_acciones.items():
                for accion in acciones_excluir:
                    permisos = permisos.exclude(
                        modulo__codigo=modulo_codigo,
                        codigo__icontains=f':{accion}'
                    )

            # Agregar acciones especiales por módulo
            acciones_especiales = config.get('acciones_especiales', {})
            for modulo_codigo, acciones in acciones_especiales.items():
                modulo = ModuloSistema.objects.filter(codigo=modulo_codigo).first()
                if modulo:
                    q_filters = Q()
                    for accion in acciones:
                        q_filters |= Q(codigo__icontains=f':{accion}')
                    permisos_especiales = Permiso.objects.filter(
                        modulo=modulo,
                        activo=True
                    ).filter(q_filters)
                    permisos = permisos | permisos_especiales

            return permisos.distinct()

        # TIPO: Todos excepto algunos módulos
        elif tipo == 'excluir':
            excluir_modulos = config.get('excluir_modulos', [])
            permisos = Permiso.objects.filter(activo=True)

            if excluir_modulos:
                modulos_excluir = ModuloSistema.objects.filter(codigo__in=excluir_modulos)
                permisos = permisos.exclude(modulo__in=modulos_excluir)

            # Agregar permisos especiales
            permisos_especiales_config = config.get('permisos_especiales', {})
            for modulo_codigo, acciones in permisos_especiales_config.items():
                modulo = ModuloSistema.objects.filter(codigo=modulo_codigo).first()
                if modulo:
                    q_filters = Q()
                    for accion in acciones:
                        q_filters |= Q(codigo__icontains=f':{accion}')
                    permisos_especiales = Permiso.objects.filter(
                        modulo=modulo,
                        activo=True
                    ).filter(q_filters)
                    permisos = permisos | permisos_especiales

            return permisos.distinct()

        else:
            return Permiso.objects.none()

    def mostrar_resumen(self):
        """Muestra un resumen de la asignación"""

        self.stdout.write("\n" + "="*80)
        self.stdout.write("RESUMEN DE ASIGNACIONES".center(80))
        self.stdout.write("="*80 + "\n")

        roles = Rol.objects.annotate(
            num_permisos=Count('permisos'),
            num_usuarios=Count('asignaciones', filter=Q(asignaciones__activa=True))
        ).filter(activo=True).order_by('-num_permisos')

        total_permisos = Permiso.objects.filter(activo=True).count()

        self.stdout.write(f"{'Rol':<30} {'Permisos':>10} {'Usuarios':>10} {'Cobertura':>12}")
        self.stdout.write("-" * 80)

        for rol in roles:
            cobertura = (rol.num_permisos / total_permisos * 100) if total_permisos > 0 else 0
            self.stdout.write(
                f"{rol.nombre[:29]:<30} "
                f"{rol.num_permisos:>10} "
                f"{rol.num_usuarios:>10} "
                f"{cobertura:>11.1f}%"
            )

        self.stdout.write("\n" + f"Total de permisos en sistema: {total_permisos}")
