"""
Management Command: Reporte de Permisos de Usuario
==================================================

Genera un reporte detallado de todos los permisos efectivos de un usuario.
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from roles.models import AsignacionRol
from permisos.models import PermisoDirecto
from collections import defaultdict
import json

User = get_user_model()


class Command(BaseCommand):
    help = 'Genera reporte detallado de permisos de un usuario'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username del usuario')
        parser.add_argument(
            '--formato',
            type=str,
            default='texto',
            choices=['texto', 'json'],
            help='Formato de salida'
        )
        parser.add_argument(
            '--exportar',
            type=str,
            help='Archivo donde exportar el reporte'
        )

    def handle(self, *args, **options):
        username = options['username']
        formato = options['formato']
        exportar = options.get('exportar')

        try:
            usuario = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'Usuario "{username}" no encontrado')

        self.stdout.write(self.style.SUCCESS(f'\n=== REPORTE DE PERMISOS: {username} ===\n'))

        # Información básica del usuario
        self.stdout.write(f'👤 Usuario: {usuario.username}')
        self.stdout.write(f'📧 Email: {usuario.email}')
        self.stdout.write(f'✓ Activo: {"Sí" if usuario.is_active else "No"}')
        self.stdout.write(f'🔑 Superusuario: {"Sí" if usuario.is_superuser else "No"}')

        organizacion = getattr(usuario, 'organization', None) or getattr(usuario, 'organizacion', None)
        if organizacion:
            self.stdout.write(f'🏢 Organización: {organizacion}')

        # Si es superusuario, tiene acceso total
        if usuario.is_superuser:
            self.stdout.write(self.style.WARNING('\n⚠️  Este usuario es SUPERUSUARIO y tiene acceso TOTAL al sistema\n'))
            return

        # 1. Roles asignados
        self.stdout.write(self.style.HTTP_INFO('\n1. ROLES ASIGNADOS'))
        self.stdout.write('-' * 80)

        asignaciones = AsignacionRol.objects.filter(
            usuario=usuario,
            activa=True
        ).select_related('rol').prefetch_related('rol__permisos')

        if not asignaciones.exists():
            self.stdout.write('  No tiene roles asignados')
        else:
            for asig in asignaciones:
                self.stdout.write(f'\n  🎭 Rol: {asig.rol.nombre}')
                self.stdout.write(f'     Código: {asig.rol.codigo}')
                self.stdout.write(f'     Vigente: {"Sí" if asig.esta_vigente() else "No"}')
                if asig.fecha_fin:
                    self.stdout.write(f'     Expira: {asig.fecha_fin.strftime("%Y-%m-%d")}')

                permisos_rol = asig.rol.permisos.filter(activo=True)
                if permisos_rol.exists():
                    self.stdout.write(f'     Permisos en este rol: {permisos_rol.count()}')

        # 2. Permisos a través de roles
        self.stdout.write(self.style.HTTP_INFO('\n2. PERMISOS VÍA ROLES'))
        self.stdout.write('-' * 80)

        permisos_por_rol = defaultdict(list)
        permisos_totales_rol = set()

        for asig in asignaciones:
            if asig.esta_vigente():
                for permiso in asig.rol.permisos.filter(activo=True):
                    permisos_por_rol[asig.rol.nombre].append({
                        'codigo': permiso.codigo,
                        'nombre': permiso.nombre,
                        'modulo': permiso.modulo.nombre if permiso.modulo else 'N/A'
                    })
                    permisos_totales_rol.add(permiso.codigo)

        if not permisos_totales_rol:
            self.stdout.write('  No tiene permisos vía roles')
        else:
            # Agrupar por módulo
            permisos_por_modulo = defaultdict(list)
            for rol_nombre, permisos in permisos_por_rol.items():
                for perm in permisos:
                    permisos_por_modulo[perm['modulo']].append({
                        'codigo': perm['codigo'],
                        'nombre': perm['nombre'],
                        'via_rol': rol_nombre
                    })

            for modulo, permisos in sorted(permisos_por_modulo.items()):
                self.stdout.write(f'\n  📦 Módulo: {modulo}')
                for perm in permisos:
                    self.stdout.write(f'     • {perm["codigo"]}: {perm["nombre"]} (vía {perm["via_rol"]})')

        # 3. Permisos directos
        self.stdout.write(self.style.HTTP_INFO('\n3. PERMISOS DIRECTOS'))
        self.stdout.write('-' * 80)

        permisos_directos = PermisoDirecto.objects.filter(
            usuario=usuario,
            activo=True
        ).select_related('permiso', 'permiso__modulo')

        if not permisos_directos.exists():
            self.stdout.write('  No tiene permisos directos')
        else:
            for pd in permisos_directos:
                tipo_emoji = '✓' if pd.tipo == 'grant' else '✗'
                vigente = '(vigente)' if pd.esta_vigente() else '(expirado)'

                self.stdout.write(
                    f'\n  {tipo_emoji} {pd.permiso.codigo}: {pd.permiso.nombre} {vigente}'
                )
                self.stdout.write(f'     Tipo: {pd.get_tipo_display()}')
                self.stdout.write(f'     Módulo: {pd.permiso.modulo.nombre if pd.permiso.modulo else "N/A"}')
                if pd.fecha_fin:
                    self.stdout.write(f'     Expira: {pd.fecha_fin.strftime("%Y-%m-%d")}')
                if pd.motivo:
                    self.stdout.write(f'     Motivo: {pd.motivo}')

        # 4. Resumen
        self.stdout.write(self.style.HTTP_INFO('\n4. RESUMEN'))
        self.stdout.write('-' * 80)

        total_permisos = len(permisos_totales_rol) + permisos_directos.count()

        self.stdout.write(f'\n  Total de roles activos: {asignaciones.count()}')
        self.stdout.write(f'  Total de permisos vía roles: {len(permisos_totales_rol)}')
        self.stdout.write(f'  Total de permisos directos: {permisos_directos.count()}')
        self.stdout.write(f'  Total de permisos únicos: {total_permisos}')

        # Verificar si el usuario tiene suficientes permisos
        if total_permisos == 0:
            self.stdout.write(self.style.ERROR(
                '\n  ❌ ADVERTENCIA: Este usuario NO tiene ningún permiso asignado'
            ))
            self.stdout.write('     El usuario no puede acceder a ninguna funcionalidad del sistema\n')
        else:
            self.stdout.write(self.style.SUCCESS(
                '\n  ✅ El usuario tiene permisos configurados correctamente\n'
            ))

        # Exportar si se solicita
        if exportar:
            reporte = {
                'usuario': {
                    'username': usuario.username,
                    'email': usuario.email,
                    'activo': usuario.is_active,
                    'superusuario': usuario.is_superuser,
                },
                'roles': [
                    {
                        'nombre': asig.rol.nombre,
                        'codigo': asig.rol.codigo,
                        'vigente': asig.esta_vigente(),
                    } for asig in asignaciones
                ],
                'permisos_via_roles': list(permisos_totales_rol),
                'permisos_directos': [
                    {
                        'codigo': pd.permiso.codigo,
                        'tipo': pd.tipo,
                        'vigente': pd.esta_vigente(),
                    } for pd in permisos_directos
                ],
                'resumen': {
                    'total_roles': asignaciones.count(),
                    'total_permisos_rol': len(permisos_totales_rol),
                    'total_permisos_directos': permisos_directos.count(),
                    'total_permisos_unicos': total_permisos,
                }
            }

            with open(exportar, 'w', encoding='utf-8') as f:
                json.dump(reporte, f, indent=2, ensure_ascii=False)

            self.stdout.write(self.style.SUCCESS(f'✅ Reporte exportado a: {exportar}'))
