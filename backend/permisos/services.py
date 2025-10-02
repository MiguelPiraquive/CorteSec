"""
Servicios de Gestión de Permisos
================================

Servicios específicos para la gestión de permisos directos con funcionalidades avanzadas.
Incluye evaluación, cache, auditoría y análisis de permisos.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q, Count, Prefetch
from django.core.exceptions import ValidationError
import logging
import hashlib
import json
from datetime import timedelta, datetime
from typing import Dict, List, Optional, Any

from .models import (
    Permiso, PermisoDirecto, CondicionPermiso, ModuloSistema, 
    TipoPermiso, AuditoriaPermisos
)

User = get_user_model()
logger = logging.getLogger('permissions')


class DirectPermissionService:
    """
    Servicio para gestión de permisos directos.
    
    Características:
    - Evaluación de permisos directos únicamente
    - Cache para rendimiento
    - Evaluación de condiciones dinámicas
    - Auditoría completa
    """
    
    CACHE_TIMEOUT = 300  # 5 minutos
    CACHE_PREFIX = 'direct_perm'
    
    def __init__(self):
        self.cache_enabled = True
    
    def _get_cache_key(self, prefix: str, *args) -> str:
        """Genera clave de cache."""
        key_data = f"{prefix}_{'-'.join(map(str, args))}"
        return hashlib.md5(key_data.encode()).hexdigest()[:16]
    
    def verificar_permiso_directo(self, usuario: User, codigo_permiso: str, contexto: Dict = None) -> bool:
        """
        Verifica si un usuario tiene un permiso directo específico.
        
        Args:
            usuario: Usuario a verificar
            codigo_permiso: Código del permiso
            contexto: Contexto adicional para evaluación
        
        Returns:
            bool: True si tiene el permiso directo
        """
        if contexto is None:
            contexto = {}
            
        # Verificar cache primero
        cache_key = self._get_cache_key(
            'verify', usuario.id, codigo_permiso, 
            hashlib.md5(json.dumps(contexto, sort_keys=True).encode()).hexdigest()[:8]
        )
        
        if self.cache_enabled:
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
        
        try:
            permiso = Permiso.objects.select_related('tipo_permiso', 'modulo').get(
                codigo=codigo_permiso, activo=True
            )
            
            # Verificar si el permiso está vigente
            if not permiso.esta_vigente():
                self._cache_result(cache_key, False)
                return False
            
            # Verificar permisos directos únicamente
            permiso_directo = PermisoDirecto.objects.select_related('permiso').filter(
                usuario=usuario,
                permiso=permiso,
                activo=True
            ).first()
            
            if not permiso_directo:
                self._cache_result(cache_key, False)
                return False
            
            # Verificar vigencia de la asignación directa
            if not permiso_directo.esta_vigente():
                self._cache_result(cache_key, False)
                return False
            
            # Verificar tipo de permiso (grant/deny)
            if permiso_directo.tipo == 'deny':
                self._cache_result(cache_key, False)
                self._crear_auditoria(usuario, permiso, 'permission_denied', {
                    'motivo': 'Permiso denegado explícitamente',
                    'tipo_permiso_directo': 'deny'
                })
                return False
            
            # Evaluar condiciones si existen
            if permiso.condiciones.exists():
                condiciones_resultado = self._evaluar_condiciones(permiso, usuario, contexto)
                if not condiciones_resultado:
                    self._cache_result(cache_key, False)
                    return False
            
            # Crear auditoría de acceso exitoso
            self._crear_auditoria(usuario, permiso, 'permission_granted', {
                'tipo_verificacion': 'directo',
                'contexto': contexto
            })
            
            self._cache_result(cache_key, True)
            return True
            
        except Permiso.DoesNotExist:
            logger.warning(f"Permiso no encontrado: {codigo_permiso}")
            self._cache_result(cache_key, False)
            return False
        except Exception as e:
            logger.error(f"Error al verificar permiso directo: {e}")
            self._cache_result(cache_key, False)
            return False
    
    def _evaluar_condiciones(self, permiso: Permiso, usuario: User, contexto: Dict) -> bool:
        """Evalúa las condiciones de un permiso."""
        for condicion in permiso.condiciones.filter(activa=True):
            try:
                if not condicion.evaluar(usuario, contexto):
                    self._crear_auditoria(usuario, permiso, 'condition_failed', {
                        'condicion': condicion.codigo,
                        'contexto': contexto
                    })
                    return False
            except Exception as e:
                logger.error(f"Error evaluando condición {condicion.codigo}: {e}")
                return False
        return True
    
    def _cache_result(self, cache_key: str, result: bool):
        """Guarda resultado en cache."""
        if self.cache_enabled:
            cache.set(cache_key, result, self.CACHE_TIMEOUT)
    
    def _crear_auditoria(self, usuario: User, permiso: Permiso, accion: str, detalles: Dict):
        """Crea registro de auditoría."""
        try:
            AuditoriaPermisos.objects.create(
                accion=accion,
                permiso=permiso,
                usuario=usuario,
                detalles=detalles
            )
        except Exception as e:
            logger.error(f"Error creando auditoría: {e}")
    
    def obtener_permisos_usuario(self, usuario: User, incluir_inactivos: bool = False) -> List[Dict]:
        """
        Obtiene todos los permisos directos de un usuario.
        
        Args:
            usuario: Usuario a consultar
            incluir_inactivos: Si incluir permisos inactivos
        
        Returns:
            List[Dict]: Lista de permisos con información detallada
        """
        query = PermisoDirecto.objects.select_related(
            'permiso__modulo', 'permiso__tipo_permiso', 'asignado_por'
        ).filter(usuario=usuario)
        
        if not incluir_inactivos:
            query = query.filter(activo=True)
        
        permisos = []
        for permiso_directo in query:
            permisos.append({
                'id': permiso_directo.id,
                'permiso': {
                    'codigo': permiso_directo.permiso.codigo,
                    'nombre': permiso_directo.permiso.nombre,
                    'modulo': permiso_directo.permiso.modulo.nombre,
                    'tipo': permiso_directo.permiso.tipo_permiso.nombre
                },
                'tipo': permiso_directo.tipo,
                'vigente': permiso_directo.esta_vigente(),
                'efectivo': permiso_directo.es_efectivo(),
                'fecha_inicio': permiso_directo.fecha_inicio,
                'fecha_fin': permiso_directo.fecha_fin,
                'asignado_por': permiso_directo.asignado_por.username,
                'motivo': permiso_directo.motivo
            })
        
        return permisos
    
    def asignar_permiso_directo(
        self, 
        usuario: User, 
        codigo_permiso: str, 
        asignado_por: User,
        tipo: str = 'grant',
        fecha_inicio: datetime = None,
        fecha_fin: datetime = None,
        motivo: str = None
    ) -> PermisoDirecto:
        """
        Asigna un permiso directo a un usuario.
        
        Args:
            usuario: Usuario destinatario
            codigo_permiso: Código del permiso
            asignado_por: Usuario que asigna
            tipo: Tipo de asignación (grant/deny)
            fecha_inicio: Fecha de inicio (opcional)
            fecha_fin: Fecha de fin (opcional)
            motivo: Motivo de la asignación
        
        Returns:
            PermisoDirecto: Instancia creada
        """
        try:
            permiso = Permiso.objects.get(codigo=codigo_permiso, activo=True)
            
            # Verificar si ya existe una asignación activa
            existing = PermisoDirecto.objects.filter(
                usuario=usuario,
                permiso=permiso,
                activo=True
            ).first()
            
            if existing:
                raise ValidationError(f"Ya existe una asignación activa para este permiso")
            
            # Crear la asignación
            permiso_directo = PermisoDirecto.objects.create(
                usuario=usuario,
                permiso=permiso,
                tipo=tipo,
                fecha_inicio=fecha_inicio or timezone.now(),
                fecha_fin=fecha_fin,
                asignado_por=asignado_por,
                motivo=motivo or f'Asignación {tipo} de permiso directo'
            )
            
            # Limpiar cache del usuario
            self._limpiar_cache_usuario(usuario)
            
            # Crear auditoría
            self._crear_auditoria(usuario, permiso, 'direct_assignment', {
                'tipo': tipo,
                'asignado_por': asignado_por.id,
                'motivo': motivo
            })
            
            return permiso_directo
            
        except Permiso.DoesNotExist:
            raise ValidationError(f"Permiso no encontrado: {codigo_permiso}")
    
    def revocar_permiso_directo(
        self, 
        usuario: User, 
        codigo_permiso: str, 
        revocado_por: User,
        motivo: str = None
    ) -> bool:
        """
        Revoca un permiso directo de un usuario.
        
        Args:
            usuario: Usuario afectado
            codigo_permiso: Código del permiso
            revocado_por: Usuario que revoca
            motivo: Motivo de la revocación
        
        Returns:
            bool: True si se revocó exitosamente
        """
        try:
            permiso = Permiso.objects.get(codigo=codigo_permiso, activo=True)
            
            permiso_directo = PermisoDirecto.objects.filter(
                usuario=usuario,
                permiso=permiso,
                activo=True
            ).first()
            
            if not permiso_directo:
                return False
            
            permiso_directo.activo = False
            permiso_directo.save(update_fields=['activo'])
            
            # Limpiar cache del usuario
            self._limpiar_cache_usuario(usuario)
            
            # Crear auditoría
            self._crear_auditoria(usuario, permiso, 'direct_revocation', {
                'revocado_por': revocado_por.id,
                'motivo': motivo or 'Revocación de permiso directo'
            })
            
            return True
            
        except Permiso.DoesNotExist:
            return False
    
    def _limpiar_cache_usuario(self, usuario: User):
        """Limpia el cache específico de un usuario."""
        pattern = f"*user_{usuario.id}_*"
        try:
            cache.delete_pattern(pattern)
        except AttributeError:
            # Fallback si delete_pattern no está disponible
            keys_to_delete = []
            for key in cache._cache.keys():
                if f"user_{usuario.id}_" in str(key):
                    keys_to_delete.append(key)
            for key in keys_to_delete:
                cache.delete(key)
    
    def obtener_estadisticas_usuario(self, usuario: User) -> Dict:
        """
        Obtiene estadísticas de permisos de un usuario.
        
        Args:
            usuario: Usuario a analizar
        
        Returns:
            Dict: Estadísticas detalladas
        """
        permisos_directos = PermisoDirecto.objects.filter(usuario=usuario)
        
        stats = {
            'total_permisos_directos': permisos_directos.count(),
            'permisos_activos': permisos_directos.filter(activo=True).count(),
            'permisos_vigentes': permisos_directos.filter(
                activo=True,
                fecha_inicio__lte=timezone.now()
            ).filter(
                Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=timezone.now())
            ).count(),
            'permisos_grant': permisos_directos.filter(tipo='grant', activo=True).count(),
            'permisos_deny': permisos_directos.filter(tipo='deny', activo=True).count(),
            'modulos_con_permisos': permisos_directos.filter(
                activo=True
            ).values('permiso__modulo__nombre').distinct().count(),
            'tipos_permiso': permisos_directos.filter(
                activo=True
            ).values('permiso__tipo_permiso__nombre').distinct().count(),
            'ultimo_acceso': AuditoriaPermisos.objects.filter(
                usuario=usuario,
                accion='permission_granted'
            ).order_by('-fecha').first()
        }
        
        return stats


class PermissionAnalyticsService:
    """Servicio para análisis y reportes de permisos."""
    
    def obtener_estadisticas_generales(self) -> Dict:
        """Obtiene estadísticas generales del sistema."""
        from core.models import Organizacion
        
        now = timezone.now()
        last_week = now - timedelta(days=7)
        last_month = now - timedelta(days=30)
        
        stats = {
            'resumen': {
                'total_usuarios': User.objects.count(),
                'usuarios_activos': User.objects.filter(is_active=True).count(),
                'total_permisos': Permiso.objects.count(),
                'permisos_activos': Permiso.objects.filter(activo=True).count(),
                'permisos_directos_activos': PermisoDirecto.objects.filter(activo=True).count(),
                'organizaciones': Organizacion.objects.count(),
                'modulos': ModuloSistema.objects.count()
            },
            'actividad_reciente': {
                'auditorias_semana': AuditoriaPermisos.objects.filter(fecha__gte=last_week).count(),
                'auditorias_mes': AuditoriaPermisos.objects.filter(fecha__gte=last_month).count(),
                'nuevos_permisos_directos_semana': PermisoDirecto.objects.filter(
                    created_at__gte=last_week
                ).count()
            },
            'distribuciones': {
                'permisos_por_tipo': dict(
                    Permiso.objects.filter(activo=True).values('tipo_permiso__nombre').annotate(
                        count=Count('id')
                    ).values_list('tipo_permiso__nombre', 'count')
                ),
                'permisos_por_modulo': dict(
                    Permiso.objects.filter(activo=True).values('modulo__nombre').annotate(
                        count=Count('id')
                    ).values_list('modulo__nombre', 'count')
                ),
                'usuarios_con_permisos_directos': PermisoDirecto.objects.filter(
                    activo=True
                ).values('usuario').distinct().count()
            }
        }
        
        return stats
    
    def analizar_uso_permisos(self, dias: int = 30) -> Dict:
        """Analiza el uso de permisos en un período."""
        desde = timezone.now() - timedelta(days=dias)
        
        # Permisos más utilizados
        permisos_usados = AuditoriaPermisos.objects.filter(
            fecha__gte=desde,
            accion='permission_granted'
        ).values('permiso__codigo', 'permiso__nombre').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Usuarios más activos
        usuarios_activos = AuditoriaPermisos.objects.filter(
            fecha__gte=desde
        ).values('usuario__username').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Módulos más accedidos
        modulos_accedidos = AuditoriaPermisos.objects.filter(
            fecha__gte=desde,
            accion='permission_granted'
        ).values('permiso__modulo__nombre').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        return {
            'periodo_dias': dias,
            'permisos_mas_usados': list(permisos_usados),
            'usuarios_mas_activos': list(usuarios_activos),
            'modulos_mas_accedidos': list(modulos_accedidos),
            'total_verificaciones': AuditoriaPermisos.objects.filter(
                fecha__gte=desde
            ).count()
        }
    
    def detectar_anomalias(self) -> List[Dict]:
        """Detecta posibles anomalías en el uso de permisos."""
        anomalias = []
        now = timezone.now()
        
        # Usuarios con muchos permisos directos
        usuarios_muchos_permisos = User.objects.annotate(
            total_permisos=Count('permisodirecto', filter=Q(permisodirecto__activo=True))
        ).filter(total_permisos__gt=50)
        
        for usuario in usuarios_muchos_permisos:
            anomalias.append({
                'tipo': 'muchos_permisos_directos',
                'usuario': usuario.username,
                'total_permisos': usuario.total_permisos,
                'severidad': 'media'
            })
        
        # Permisos sin uso reciente
        permisos_sin_uso = Permiso.objects.filter(
            activo=True
        ).exclude(
            auditoriapermisos__fecha__gte=now - timedelta(days=90)
        )
        
        for permiso in permisos_sin_uso[:10]:
            anomalias.append({
                'tipo': 'permiso_sin_uso',
                'permiso': permiso.codigo,
                'ultimo_uso': None,
                'severidad': 'baja'
            })
        
        # Denegaciones frecuentes
        denegaciones_frecuentes = AuditoriaPermisos.objects.filter(
            fecha__gte=now - timedelta(days=7),
            accion='permission_denied'
        ).values('permiso__codigo').annotate(
            count=Count('id')
        ).filter(count__gt=10)
        
        for denegacion in denegaciones_frecuentes:
            anomalias.append({
                'tipo': 'denegaciones_frecuentes',
                'permiso': denegacion['permiso__codigo'],
                'count': denegacion['count'],
                'severidad': 'alta'
            })
        
        return anomalias


# Instancia global del servicio
permission_service = DirectPermissionService()
analytics_service = PermissionAnalyticsService()
