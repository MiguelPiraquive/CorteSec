"""
CorteSec - Servicios de Roles
Logica de negocio para el sistema de roles
"""

from django.db import transaction
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from .models import Rol, AsignacionRol, HistorialAsignacion, AuditoriaRol
from permisos.models import Permiso

User = get_user_model()


class RolService:
    """Servicio para operaciones de roles"""

    CACHE_TTL = 3600  # 1 hora

    @classmethod
    def asignar_permisos_rol(cls, rol, permisos_ids, usuario_asignador=None, motivo=''):
        """Asigna multiples permisos a un rol usando ManyToMany"""
        resultado = {
            'asignados': [],
            'ya_existentes': [],
            'errores': []
        }

        with transaction.atomic():
            permisos_existentes = set(rol.permisos.values_list('id', flat=True))

            for permiso_id in permisos_ids:
                try:
                    permiso = Permiso.objects.get(id=permiso_id, activo=True)

                    if permiso.id in permisos_existentes:
                        resultado['ya_existentes'].append({
                            'permiso_id': str(permiso.id),
                            'codigo': permiso.codigo,
                            'nombre': permiso.nombre
                        })
                    else:
                        rol.permisos.add(permiso)
                        resultado['asignados'].append({
                            'permiso_id': str(permiso.id),
                            'codigo': permiso.codigo,
                            'nombre': permiso.nombre
                        })

                except Permiso.DoesNotExist:
                    resultado['errores'].append({
                        'permiso_id': str(permiso_id),
                        'error': 'Permiso no encontrado o inactivo'
                    })
                    continue

            rol.limpiar_cache_permisos()

        return resultado

    @classmethod
    def revocar_permisos_rol(cls, rol, permisos_ids, usuario_revocador=None, motivo=''):
        """Revoca multiples permisos de un rol usando ManyToMany"""
        resultado = {
            'revocados': [],
            'no_encontrados': [],
            'errores': []
        }

        with transaction.atomic():
            permisos_rol = set(rol.permisos.values_list('id', flat=True))

            for permiso_id in permisos_ids:
                try:
                    permiso = Permiso.objects.get(id=permiso_id)

                    if permiso.id in permisos_rol:
                        rol.permisos.remove(permiso)
                        resultado['revocados'].append({
                            'permiso_id': str(permiso.id),
                            'codigo': permiso.codigo,
                            'nombre': permiso.nombre
                        })
                    else:
                        resultado['no_encontrados'].append({
                            'permiso_id': str(permiso_id),
                            'error': 'Permiso no asignado al rol'
                        })

                except Permiso.DoesNotExist:
                    resultado['errores'].append({
                        'permiso_id': str(permiso_id),
                        'error': 'Permiso no encontrado'
                    })

            rol.limpiar_cache_permisos()

        return resultado

    @classmethod
    def sincronizar_permisos_rol(cls, rol, permisos_ids, usuario_modificador=None):
        """Sincroniza los permisos del rol con la lista proporcionada"""
        with transaction.atomic():
            rol.permisos.clear()
            permisos = Permiso.objects.filter(id__in=permisos_ids, activo=True)
            rol.permisos.add(*permisos)
            rol.limpiar_cache_permisos()

            return {
                'total_asignados': permisos.count(),
                'permisos': [
                    {
                        'permiso_id': str(p.id),
                        'codigo': p.codigo,
                        'nombre': p.nombre
                    } for p in permisos
                ]
            }

    @classmethod
    def asignar_rol_usuario(cls, usuario, rol, usuario_asignador, motivo='', fecha_fin=None):
        """Asigna un rol a un usuario"""
        if AsignacionRol.objects.filter(
            usuario=usuario,
            rol=rol,
            activa=True
        ).exists():
            raise ValidationError("El usuario ya tiene este rol asignado activamente")

        with transaction.atomic():
            asignacion = AsignacionRol.objects.create(
                usuario=usuario,
                rol=rol,
                asignado_por=usuario_asignador,
                justificacion=motivo,
                fecha_fin=fecha_fin
            )

            cls._limpiar_cache_usuario(usuario)

            return asignacion

    @classmethod
    def obtener_permisos_usuario(cls, usuario):
        """Obtiene todos los permisos efectivos de un usuario a traves de sus roles"""
        cache_key = f"permisos_usuario_roles_{usuario.id}"
        permisos = cache.get(cache_key)

        if permisos is None:
            permisos = set()
            ahora = timezone.now()

            asignaciones = AsignacionRol.objects.filter(
                usuario=usuario,
                activa=True
            ).select_related('rol')

            for asignacion in asignaciones:
                if not asignacion.esta_vigente():
                    continue
                rol = asignacion.rol
                if not rol.activo:
                    continue
                codigos_rol = rol.permisos.filter(activo=True).values_list('codigo', flat=True)
                permisos.update(codigos_rol)

            permisos = list(permisos)
            cache.set(cache_key, permisos, cls.CACHE_TTL)

        return permisos

    @classmethod
    def verificar_permiso_usuario(cls, usuario, permiso_codigo):
        """Verifica si un usuario tiene un permiso especifico a traves de sus roles"""
        permisos = cls.obtener_permisos_usuario(usuario)
        return permiso_codigo in permisos

    @classmethod
    def obtener_estadisticas(cls):
        """Obtiene estadisticas del sistema de roles"""
        from django.db.models import Count, Q

        ahora = timezone.now()
        inicio_mes = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        estadisticas = {
            'total_roles': Rol.objects.count(),
            'roles_activos': Rol.objects.filter(activo=True).count(),
            'roles_sistema': Rol.objects.filter(es_sistema=True).count(),
            'usuarios_con_roles': AsignacionRol.objects.filter(
                activa=True
            ).values('usuario').distinct().count(),
            'asignaciones_mes_actual': AsignacionRol.objects.filter(
                fecha_inicio__gte=inicio_mes
            ).count(),
            'roles_mas_asignados': list(
                Rol.objects.annotate(
                    asignaciones_count=Count(
                        'asignaciones',
                        filter=Q(asignaciones__activa=True)
                    )
                ).order_by('-asignaciones_count').values(
                    'nombre', 'codigo', 'asignaciones_count'
                )[:5]
            )
        }

        return estadisticas

    @classmethod
    def _limpiar_cache_usuario(cls, usuario):
        """Limpia el cache de permisos de un usuario especifico"""
        cache_key = f"permisos_usuario_roles_{usuario.id}"
        cache.delete(cache_key)

    @classmethod
    def _limpiar_cache_usuarios_rol(cls, rol):
        """Limpia el cache de todos los usuarios que tienen un rol especifico"""
        usuarios_ids = AsignacionRol.objects.filter(
            rol=rol,
            activa=True
        ).values_list('usuario_id', flat=True)

        for usuario_id in usuarios_ids:
            cache_key = f"permisos_usuario_roles_{usuario_id}"
            cache.delete(cache_key)


# Instancia del servicio
rol_service = RolService()
