"""
Management Command: Auditoría Completa de Permisos
===================================================

Realiza una auditoría exhaustiva del sistema de roles y permisos,
generando reportes detallados en formato JSON y texto.

Uso:
    python manage.py audit_permisos
    python manage.py audit_permisos --formato json
    python manage.py audit_permisos --exportar auditoria.json
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Count, Q, Prefetch
import sys
import os

# Agregar el directorio del proyecto al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from roles.models import Rol, AsignacionRol, TipoRol, AuditoriaRol
from permisos.models import Permiso, PermisoDirecto, ModuloSistema, TipoPermiso
import json
from datetime import datetime, timedelta
from collections import defaultdict

User = get_user_model()


class Command(BaseCommand):
    help = 'Realiza una auditoría completa del sistema de permisos y roles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--formato',
            type=str,
            default='texto',
            choices=['texto', 'json'],
            help='Formato de salida (texto o json)'
        )
        parser.add_argument(
            '--exportar',
            type=str,
            help='Archivo donde exportar el reporte JSON'
        )
        parser.add_argument(
            '--detallado',
            action='store_true',
            help='Incluir detalles exhaustivos'
        )

    def handle(self, *args, **options):
        self.formato = options['formato']
        self.detallado = options['detallado']
        self.exportar = options.get('exportar')

        self.stdout.write(self.style.SUCCESS('\n' + '='*80))
        self.stdout.write(self.style.SUCCESS('AUDITORÍA COMPLETA DEL SISTEMA DE PERMISOS'))
        self.stdout.write(self.style.SUCCESS('='*80 + '\n'))
        self.stdout.write(f"Fecha: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        # Estructura para almacenar resultados
        self.reporte = {
            'fecha_auditoria': timezone.now().isoformat(),
            'resumen_general': {},
            'roles': {},
            'usuarios': {},
            'permisos': {},
            'asignaciones': {},
            'problemas': [],
            'recomendaciones': []
        }

        try:
            # Ejecutar auditoría
            self.auditar_resumen_general()
            self.auditar_roles()
            self.auditar_permisos()
            self.auditar_usuarios()
            self.auditar_asignaciones()
            self.auditar_permisos_directos()
            self.detectar_problemas()
            self.generar_recomendaciones()

            # Exportar si se solicita
            if self.exportar:
                self.exportar_reporte()

            # Mostrar resumen final
            self.mostrar_resumen_final()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\nError durante la auditoría: {str(e)}'))
            raise CommandError(f'Error durante la auditoría: {str(e)}')

    def auditar_resumen_general(self):
        """Genera resumen general del sistema"""
        self.stdout.write(self.style.HTTP_INFO('\n1. RESUMEN GENERAL'))
        self.stdout.write('-' * 80)

        # Contadores básicos
        total_usuarios = User.objects.count()
        total_usuarios_activos = User.objects.filter(is_active=True).count()
        total_roles = Rol.objects.count()
        total_roles_activos = Rol.objects.filter(activo=True).count()
        total_permisos = Permiso.objects.count()
        total_permisos_activos = Permiso.objects.filter(activo=True).count()
        total_asignaciones = AsignacionRol.objects.count()
        total_asignaciones_activas = AsignacionRol.objects.filter(activa=True).count()
        total_permisos_directos = PermisoDirecto.objects.filter(activo=True).count()

        # Usuarios con/sin roles
        usuarios_con_roles = User.objects.filter(
            asignaciones_rol__activa=True
        ).distinct().count()
        usuarios_sin_roles = total_usuarios_activos - usuarios_con_roles

        # Superusuarios
        superusuarios = User.objects.filter(is_superuser=True, is_active=True).count()

        resumen = {
            'total_usuarios': total_usuarios,
            'usuarios_activos': total_usuarios_activos,
            'usuarios_con_roles': usuarios_con_roles,
            'usuarios_sin_roles': usuarios_sin_roles,
            'superusuarios': superusuarios,
            'total_roles': total_roles,
            'roles_activos': total_roles_activos,
            'total_permisos': total_permisos,
            'permisos_activos': total_permisos_activos,
            'total_asignaciones': total_asignaciones,
            'asignaciones_activas': total_asignaciones_activas,
            'permisos_directos_activos': total_permisos_directos,
        }

        self.reporte['resumen_general'] = resumen

        # Mostrar en consola
        self.stdout.write(f"\n  👥 USUARIOS:")
        self.stdout.write(f"     Total: {total_usuarios}")
        self.stdout.write(f"     Activos: {total_usuarios_activos}")
        self.stdout.write(f"     Con roles asignados: {usuarios_con_roles}")
        self.stdout.write(self.style.WARNING(f"     Sin roles: {usuarios_sin_roles}"))
        self.stdout.write(self.style.NOTICE(f"     Superusuarios: {superusuarios}"))

        self.stdout.write(f"\n  🎭 ROLES:")
        self.stdout.write(f"     Total: {total_roles}")
        self.stdout.write(f"     Activos: {total_roles_activos}")
        self.stdout.write(f"     Inactivos: {total_roles - total_roles_activos}")

        self.stdout.write(f"\n  🔐 PERMISOS:")
        self.stdout.write(f"     Total: {total_permisos}")
        self.stdout.write(f"     Activos: {total_permisos_activos}")
        self.stdout.write(f"     Permisos directos activos: {total_permisos_directos}")

        self.stdout.write(f"\n  📋 ASIGNACIONES:")
        self.stdout.write(f"     Total: {total_asignaciones}")
        self.stdout.write(f"     Activas: {total_asignaciones_activas}")

    def auditar_roles(self):
        """Audita todos los roles del sistema"""
        self.stdout.write(self.style.HTTP_INFO('\n\n2. AUDITORÍA DE ROLES'))
        self.stdout.write('-' * 80)

        roles = Rol.objects.annotate(
            num_permisos=Count('permisos', filter=Q(permisos__activo=True)),
            num_usuarios=Count('asignaciones', filter=Q(asignaciones__activa=True))
        ).select_related('tipo_rol').order_by('-num_usuarios')

        roles_data = []
        roles_sin_permisos = []
        roles_sin_usuarios = []

        for rol in roles:
            rol_info = {
                'id': str(rol.id),
                'nombre': rol.nombre,
                'codigo': rol.codigo,
                'tipo': rol.tipo_rol.nombre if rol.tipo_rol else 'Sin tipo',
                'activo': rol.activo,
                'es_sistema': rol.es_sistema,
                'nivel_jerarquico': rol.nivel_jerarquico,
                'num_permisos': rol.num_permisos,
                'num_usuarios': rol.num_usuarios,
                'vigente': rol.esta_vigente(),
            }

            roles_data.append(rol_info)

            # Detectar problemas
            if rol.num_permisos == 0 and rol.activo:
                roles_sin_permisos.append(rol.nombre)
            if rol.num_usuarios == 0 and rol.activo and not rol.es_sistema:
                roles_sin_usuarios.append(rol.nombre)

        self.reporte['roles'] = {
            'total': len(roles),
            'detalle': roles_data,
            'sin_permisos': roles_sin_permisos,
            'sin_usuarios': roles_sin_usuarios,
        }

        # Mostrar tabla de roles
        self.stdout.write(f"\n  Total de roles: {len(roles)}\n")
        self.stdout.write(f"  {'Rol':<30} {'Tipo':<20} {'Permisos':<10} {'Usuarios':<10} {'Estado':<10}")
        self.stdout.write(f"  {'-'*30} {'-'*20} {'-'*10} {'-'*10} {'-'*10}")

        for rol_info in roles_data[:20]:  # Mostrar top 20
            estado = '✓ Activo' if rol_info['activo'] else '✗ Inactivo'
            estilo = self.style.SUCCESS if rol_info['activo'] else self.style.WARNING

            nombre_corto = rol_info['nombre'][:28] + '..' if len(rol_info['nombre']) > 30 else rol_info['nombre']
            tipo_corto = rol_info['tipo'][:18] + '..' if len(rol_info['tipo']) > 20 else rol_info['tipo']

            self.stdout.write(
                estilo(f"  {nombre_corto:<30} {tipo_corto:<20} {rol_info['num_permisos']:<10} {rol_info['num_usuarios']:<10} {estado:<10}")
            )

        if len(roles) > 20:
            self.stdout.write(f"\n  ... y {len(roles) - 20} roles más")

        # Advertencias
        if roles_sin_permisos:
            self.stdout.write(self.style.WARNING(f"\n  ⚠️  Roles activos SIN permisos asignados: {len(roles_sin_permisos)}"))
            for rol in roles_sin_permisos[:5]:
                self.stdout.write(f"     - {rol}")

        if roles_sin_usuarios:
            self.stdout.write(self.style.NOTICE(f"\n  ℹ️  Roles activos SIN usuarios asignados: {len(roles_sin_usuarios)}"))
            for rol in roles_sin_usuarios[:5]:
                self.stdout.write(f"     - {rol}")

    def auditar_permisos(self):
        """Audita todos los permisos del sistema"""
        self.stdout.write(self.style.HTTP_INFO('\n\n3. AUDITORÍA DE PERMISOS'))
        self.stdout.write('-' * 80)

        permisos = Permiso.objects.annotate(
            num_roles=Count('roles_asignados', distinct=True),
            num_directos=Count('asignaciones_directas', filter=Q(asignaciones_directas__activo=True))
        ).select_related('modulo', 'tipo_permiso').order_by('modulo__nombre', 'nombre')

        permisos_por_modulo = defaultdict(list)
        permisos_sin_asignar = []
        permisos_criticos = []

        for permiso in permisos:
            modulo = permiso.modulo.nombre if permiso.modulo else 'Sin módulo'

            permiso_info = {
                'codigo': permiso.codigo,
                'nombre': permiso.nombre,
                'modulo': modulo,
                'tipo': permiso.tipo_permiso.nombre if permiso.tipo_permiso else 'Sin tipo',
                'activo': permiso.activo,
                'num_roles': permiso.num_roles,
                'num_directos': permiso.num_directos,
                'es_critico': permiso.tipo_permiso.es_critico if permiso.tipo_permiso else False,
            }

            permisos_por_modulo[modulo].append(permiso_info)

            # Detectar problemas
            if permiso.num_roles == 0 and permiso.num_directos == 0 and permiso.activo:
                permisos_sin_asignar.append(permiso.codigo)

            if permiso.tipo_permiso and permiso.tipo_permiso.es_critico:
                permisos_criticos.append({
                    'codigo': permiso.codigo,
                    'num_roles': permiso.num_roles,
                    'num_directos': permiso.num_directos
                })

        self.reporte['permisos'] = {
            'total': permisos.count(),
            'activos': permisos.filter(activo=True).count(),
            'por_modulo': dict(permisos_por_modulo),
            'sin_asignar': permisos_sin_asignar,
            'criticos': permisos_criticos,
        }

        # Mostrar resumen por módulo
        self.stdout.write(f"\n  Permisos por módulo:\n")
        for modulo, perms in sorted(permisos_por_modulo.items()):
            total = len(perms)
            activos = sum(1 for p in perms if p['activo'])
            asignados = sum(1 for p in perms if p['num_roles'] > 0 or p['num_directos'] > 0)

            self.stdout.write(f"  📦 {modulo}:")
            self.stdout.write(f"     Total: {total} | Activos: {activos} | Asignados: {asignados}")

        # Permisos críticos
        if permisos_criticos:
            self.stdout.write(self.style.WARNING(f"\n  🔴 PERMISOS CRÍTICOS: {len(permisos_criticos)}"))
            for perm in permisos_criticos[:10]:
                self.stdout.write(
                    f"     - {perm['codigo']}: {perm['num_roles']} roles, {perm['num_directos']} directos"
                )

        # Permisos sin asignar
        if permisos_sin_asignar:
            self.stdout.write(self.style.NOTICE(f"\n  ℹ️  Permisos SIN asignar: {len(permisos_sin_asignar)}"))
            for perm in permisos_sin_asignar[:5]:
                self.stdout.write(f"     - {perm}")

    def auditar_usuarios(self):
        """Audita usuarios y sus asignaciones"""
        self.stdout.write(self.style.HTTP_INFO('\n\n4. AUDITORÍA DE USUARIOS'))
        self.stdout.write('-' * 80)

        usuarios = User.objects.filter(is_active=True).annotate(
            num_roles=Count('asignaciones_rol', filter=Q(asignaciones_rol__activa=True)),
            num_permisos_directos=Count('permisos_directos', filter=Q(permisos_directos__activo=True))
        ).order_by('-num_roles')

        usuarios_data = []
        usuarios_sin_proteccion = []
        usuarios_superusuarios = []

        for usuario in usuarios:
            usuario_info = {
                'id': usuario.id,
                'username': usuario.username,
                'email': usuario.email,
                'is_superuser': usuario.is_superuser,
                'num_roles': usuario.num_roles,
                'num_permisos_directos': usuario.num_permisos_directos,
                'organizacion': getattr(usuario, 'organization', None) or getattr(usuario, 'organizacion', None),
            }

            usuarios_data.append(usuario_info)

            # Detectar problemas
            if usuario.num_roles == 0 and usuario.num_permisos_directos == 0 and not usuario.is_superuser:
                usuarios_sin_proteccion.append(usuario.username)

            if usuario.is_superuser:
                usuarios_superusuarios.append({
                    'username': usuario.username,
                    'email': usuario.email
                })

        self.reporte['usuarios'] = {
            'total_activos': len(usuarios),
            'sin_roles_ni_permisos': len(usuarios_sin_proteccion),
            'superusuarios': usuarios_superusuarios,
            'detalle': usuarios_data if self.detallado else [],
        }

        # Distribución de usuarios por número de roles
        distribucion_roles = defaultdict(int)
        for u in usuarios_data:
            distribucion_roles[u['num_roles']] += 1

        self.stdout.write(f"\n  Distribución de usuarios por número de roles:")
        for num_roles, count in sorted(distribucion_roles.items()):
            self.stdout.write(f"     {num_roles} rol(es): {count} usuarios")

        # Usuarios sin protección
        if usuarios_sin_proteccion:
            self.stdout.write(self.style.ERROR(
                f"\n  ❌ USUARIOS SIN ROLES NI PERMISOS DIRECTOS: {len(usuarios_sin_proteccion)}"
            ))
            for username in usuarios_sin_proteccion[:10]:
                self.stdout.write(f"     - {username}")
            if len(usuarios_sin_proteccion) > 10:
                self.stdout.write(f"     ... y {len(usuarios_sin_proteccion) - 10} más")

        # Superusuarios
        self.stdout.write(self.style.WARNING(f"\n  🔐 SUPERUSUARIOS: {len(usuarios_superusuarios)}"))
        for su in usuarios_superusuarios:
            self.stdout.write(f"     - {su['username']} ({su['email']})")

    def auditar_asignaciones(self):
        """Audita asignaciones de roles"""
        self.stdout.write(self.style.HTTP_INFO('\n\n5. AUDITORÍA DE ASIGNACIONES'))
        self.stdout.write('-' * 80)

        asignaciones = AsignacionRol.objects.select_related(
            'usuario', 'rol', 'asignado_por'
        ).order_by('-fecha_asignacion')

        total = asignaciones.count()
        activas = asignaciones.filter(activa=True).count()
        inactivas = total - activas

        # Asignaciones por estado
        asignaciones_vigentes = 0
        asignaciones_expiradas = 0
        asignaciones_futuras = 0

        now = timezone.now()
        for asig in asignaciones.filter(activa=True):
            if asig.esta_vigente():
                asignaciones_vigentes += 1
            elif asig.fecha_fin and asig.fecha_fin < now:
                asignaciones_expiradas += 1
            elif asig.fecha_inicio and asig.fecha_inicio > now:
                asignaciones_futuras += 1

        # Últimas asignaciones
        ultimas_asignaciones = []
        for asig in asignaciones[:10]:
            ultimas_asignaciones.append({
                'usuario': asig.usuario.username,
                'rol': asig.rol.nombre,
                'fecha': asig.fecha_asignacion.isoformat(),
                'asignado_por': asig.asignado_por.username if asig.asignado_por else 'Sistema',
                'activa': asig.activa,
            })

        self.reporte['asignaciones'] = {
            'total': total,
            'activas': activas,
            'inactivas': inactivas,
            'vigentes': asignaciones_vigentes,
            'expiradas': asignaciones_expiradas,
            'futuras': asignaciones_futuras,
            'ultimas': ultimas_asignaciones,
        }

        self.stdout.write(f"\n  Total de asignaciones: {total}")
        self.stdout.write(f"     Activas: {activas}")
        self.stdout.write(f"     Inactivas: {inactivas}")
        self.stdout.write(f"     Vigentes (con validación temporal): {asignaciones_vigentes}")

        if asignaciones_expiradas > 0:
            self.stdout.write(self.style.WARNING(f"     ⚠️  Expiradas (activas pero fuera de vigencia): {asignaciones_expiradas}"))

        if asignaciones_futuras > 0:
            self.stdout.write(self.style.NOTICE(f"     ℹ️  Futuras (aún no inician): {asignaciones_futuras}"))

        # Últimas asignaciones
        self.stdout.write(f"\n  Últimas 10 asignaciones:")
        for asig in ultimas_asignaciones:
            estado = '✓' if asig['activa'] else '✗'
            self.stdout.write(
                f"     {estado} {asig['usuario']} → {asig['rol']} (por {asig['asignado_por']})"
            )

    def auditar_permisos_directos(self):
        """Audita permisos directos a usuarios"""
        self.stdout.write(self.style.HTTP_INFO('\n\n6. AUDITORÍA DE PERMISOS DIRECTOS'))
        self.stdout.write('-' * 80)

        permisos_directos = PermisoDirecto.objects.select_related(
            'usuario', 'permiso', 'asignado_por'
        ).filter(activo=True)

        total = permisos_directos.count()

        # Agrupar por usuario
        por_usuario = defaultdict(int)
        for pd in permisos_directos:
            por_usuario[pd.usuario.username] += 1

        # Usuarios con más permisos directos
        top_usuarios = sorted(por_usuario.items(), key=lambda x: x[1], reverse=True)[:10]

        self.reporte['permisos_directos'] = {
            'total': total,
            'usuarios_afectados': len(por_usuario),
            'top_usuarios': [{'username': u, 'count': c} for u, c in top_usuarios],
        }

        self.stdout.write(f"\n  Total de permisos directos activos: {total}")
        self.stdout.write(f"  Usuarios con permisos directos: {len(por_usuario)}")

        if top_usuarios:
            self.stdout.write(f"\n  Top 10 usuarios con más permisos directos:")
            for username, count in top_usuarios:
                self.stdout.write(f"     - {username}: {count} permisos")

    def detectar_problemas(self):
        """Detecta problemas y anomalías en el sistema"""
        self.stdout.write(self.style.HTTP_INFO('\n\n7. DETECCIÓN DE PROBLEMAS'))
        self.stdout.write('-' * 80)

        problemas = []

        # Problema 1: Usuarios sin protección
        usuarios_sin_proteccion = self.reporte['usuarios']['sin_roles_ni_permisos']
        if usuarios_sin_proteccion > 0:
            problemas.append({
                'severidad': 'ALTA',
                'categoria': 'Usuarios',
                'descripcion': f'{usuarios_sin_proteccion} usuarios activos sin roles ni permisos directos',
                'impacto': 'Usuarios sin capacidad de acceso a funcionalidades',
                'accion': 'Asignar roles apropiados a estos usuarios'
            })

        # Problema 2: Roles sin permisos
        roles_sin_permisos = len(self.reporte['roles']['sin_permisos'])
        if roles_sin_permisos > 0:
            problemas.append({
                'severidad': 'MEDIA',
                'categoria': 'Roles',
                'descripcion': f'{roles_sin_permisos} roles activos sin permisos asignados',
                'impacto': 'Roles inútiles que no otorgan acceso a nada',
                'accion': 'Asignar permisos o desactivar estos roles'
            })

        # Problema 3: Permisos sin asignar
        permisos_sin_asignar = len(self.reporte['permisos']['sin_asignar'])
        if permisos_sin_asignar > 0:
            problemas.append({
                'severidad': 'BAJA',
                'categoria': 'Permisos',
                'descripcion': f'{permisos_sin_asignar} permisos activos sin asignar a ningún rol',
                'impacto': 'Permisos definidos pero no utilizados',
                'accion': 'Asignar a roles o desactivar si no son necesarios'
            })

        # Problema 4: Asignaciones expiradas
        asignaciones_expiradas = self.reporte['asignaciones']['expiradas']
        if asignaciones_expiradas > 0:
            problemas.append({
                'severidad': 'MEDIA',
                'categoria': 'Asignaciones',
                'descripcion': f'{asignaciones_expiradas} asignaciones marcadas como activas pero fuera de vigencia',
                'impacto': 'Usuarios con roles que deberían estar inactivos',
                'accion': 'Ejecutar tarea de limpieza de asignaciones expiradas'
            })

        # Problema 5: Muchos superusuarios
        num_superusuarios = len(self.reporte['usuarios']['superusuarios'])
        if num_superusuarios > 3:
            problemas.append({
                'severidad': 'ALTA',
                'categoria': 'Seguridad',
                'descripcion': f'{num_superusuarios} superusuarios en el sistema',
                'impacto': 'Riesgo de seguridad: demasiados usuarios con acceso total',
                'accion': 'Revisar y reducir el número de superusuarios a lo estrictamente necesario'
            })

        self.reporte['problemas'] = problemas

        # Mostrar problemas
        if problemas:
            for i, problema in enumerate(problemas, 1):
                if problema['severidad'] == 'ALTA':
                    estilo = self.style.ERROR
                    icono = '❌'
                elif problema['severidad'] == 'MEDIA':
                    estilo = self.style.WARNING
                    icono = '⚠️'
                else:
                    estilo = self.style.NOTICE
                    icono = 'ℹ️'

                self.stdout.write(estilo(f"\n  {icono} Problema #{i} - Severidad {problema['severidad']}"))
                self.stdout.write(f"     Categoría: {problema['categoria']}")
                self.stdout.write(f"     Descripción: {problema['descripcion']}")
                self.stdout.write(f"     Impacto: {problema['impacto']}")
                self.stdout.write(f"     Acción sugerida: {problema['accion']}")
        else:
            self.stdout.write(self.style.SUCCESS("\n  ✅ No se detectaron problemas críticos"))

    def generar_recomendaciones(self):
        """Genera recomendaciones basadas en la auditoría"""
        self.stdout.write(self.style.HTTP_INFO('\n\n8. RECOMENDACIONES'))
        self.stdout.write('-' * 80)

        recomendaciones = []

        # Basado en problemas detectados
        if self.reporte['usuarios']['sin_roles_ni_permisos'] > 0:
            recomendaciones.append({
                'prioridad': 'ALTA',
                'titulo': 'Asignar roles a usuarios',
                'descripcion': 'Hay usuarios activos sin roles asignados. Revisar y asignar roles apropiados.',
                'comando': 'python manage.py asignar_roles_masivo'
            })

        if len(self.reporte['roles']['sin_permisos']) > 5:
            recomendaciones.append({
                'prioridad': 'MEDIA',
                'titulo': 'Limpiar roles sin permisos',
                'descripcion': 'Desactivar o eliminar roles que no tienen permisos asignados.',
                'comando': 'python manage.py limpiar_roles_vacios'
            })

        if self.reporte['asignaciones']['expiradas'] > 0:
            recomendaciones.append({
                'prioridad': 'ALTA',
                'titulo': 'Limpiar asignaciones expiradas',
                'descripcion': 'Desactivar asignaciones que están fuera de su periodo de vigencia.',
                'comando': 'python manage.py limpiar_asignaciones_expiradas'
            })

        # Recomendaciones generales
        recomendaciones.append({
            'prioridad': 'MEDIA',
            'titulo': 'Configurar tarea periódica de auditoría',
            'descripcion': 'Ejecutar esta auditoría semanalmente usando Celery Beat.',
            'comando': 'Configurar en settings.py: CELERYBEAT_SCHEDULE'
        })

        recomendaciones.append({
            'prioridad': 'BAJA',
            'titulo': 'Revisar permisos críticos',
            'descripcion': f'Hay {len(self.reporte["permisos"]["criticos"])} permisos críticos. Auditar quién tiene acceso.',
            'comando': 'python manage.py audit_permisos_criticos'
        })

        self.reporte['recomendaciones'] = recomendaciones

        # Mostrar recomendaciones
        for i, rec in enumerate(recomendaciones, 1):
            if rec['prioridad'] == 'ALTA':
                estilo = self.style.ERROR
            elif rec['prioridad'] == 'MEDIA':
                estilo = self.style.WARNING
            else:
                estilo = self.style.NOTICE

            self.stdout.write(estilo(f"\n  {i}. [{rec['prioridad']}] {rec['titulo']}"))
            self.stdout.write(f"     {rec['descripcion']}")
            self.stdout.write(f"     Comando: {rec['comando']}")

    def exportar_reporte(self):
        """Exporta el reporte a archivo JSON"""
        try:
            with open(self.exportar, 'w', encoding='utf-8') as f:
                json.dump(self.reporte, f, indent=2, ensure_ascii=False)

            self.stdout.write(self.style.SUCCESS(f"\n\n✅ Reporte exportado exitosamente a: {self.exportar}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n\n❌ Error al exportar reporte: {str(e)}"))

    def mostrar_resumen_final(self):
        """Muestra resumen final de la auditoría"""
        self.stdout.write(self.style.SUCCESS('\n\n' + '='*80))
        self.stdout.write(self.style.SUCCESS('RESUMEN FINAL DE AUDITORÍA'))
        self.stdout.write(self.style.SUCCESS('='*80))

        problemas_altos = sum(1 for p in self.reporte['problemas'] if p['severidad'] == 'ALTA')
        problemas_medios = sum(1 for p in self.reporte['problemas'] if p['severidad'] == 'MEDIA')
        problemas_bajos = sum(1 for p in self.reporte['problemas'] if p['severidad'] == 'BAJA')

        self.stdout.write(f"\n  📊 Total de problemas detectados: {len(self.reporte['problemas'])}")
        if problemas_altos > 0:
            self.stdout.write(self.style.ERROR(f"     ❌ Severidad ALTA: {problemas_altos}"))
        if problemas_medios > 0:
            self.stdout.write(self.style.WARNING(f"     ⚠️  Severidad MEDIA: {problemas_medios}"))
        if problemas_bajos > 0:
            self.stdout.write(self.style.NOTICE(f"     ℹ️  Severidad BAJA: {problemas_bajos}"))

        self.stdout.write(f"\n  💡 Recomendaciones generadas: {len(self.reporte['recomendaciones'])}")

        # Estado general del sistema
        cobertura_usuarios = (
            self.reporte['resumen_general']['usuarios_con_roles'] /
            self.reporte['resumen_general']['usuarios_activos'] * 100
        ) if self.reporte['resumen_general']['usuarios_activos'] > 0 else 0

        self.stdout.write(f"\n  📈 Cobertura de usuarios con roles: {cobertura_usuarios:.1f}%")

        if problemas_altos == 0 and problemas_medios == 0:
            self.stdout.write(self.style.SUCCESS("\n  ✅ ESTADO DEL SISTEMA: SALUDABLE"))
        elif problemas_altos > 0:
            self.stdout.write(self.style.ERROR("\n  ❌ ESTADO DEL SISTEMA: REQUIERE ATENCIÓN INMEDIATA"))
        else:
            self.stdout.write(self.style.WARNING("\n  ⚠️  ESTADO DEL SISTEMA: REQUIERE MEJORAS"))

        self.stdout.write('\n' + '='*80 + '\n')
