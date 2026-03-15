"""
ASOGAN - Servicio de Permisos de Roles
Lógica de negocio específica para la gestión de permisos en roles
"""

from django.db import transaction
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import Rol, AuditoriaRol
from permisos.models import Permiso, ModuloSistema
import logging

logger = logging.getLogger('roles')


class RolPermisosService:
    """Servicio específico para gestión de permisos en roles"""
    
    CACHE_TTL = 3600  # 1 hora
    
    @classmethod
    def asignar_permisos(cls, rol, permisos_ids, usuario_modificador=None, motivo=''):
        """
        Asigna múltiples permisos a un rol
        """
        resultado = {
            'asignados': [],
            'ya_existentes': [],
            'errores': []
        }
        
        with transaction.atomic():
            # Obtener permisos existentes
            permisos_existentes = set(rol.permisos.values_list('id', flat=True))
            
            for permiso_id in permisos_ids:
                try:
                    permiso = Permiso.objects.get(id=permiso_id, activo=True)
                    
                    if permiso.id in permisos_existentes:
                        resultado['ya_existentes'].append({
                            'permiso_id': str(permiso.id),
                            'codigo': permiso.codigo,
                            'nombre': permiso.nombre,
                            'modulo': permiso.modulo.nombre
                        })
                    else:
                        # Agregar el permiso usando ManyToMany
                        rol.permisos.add(permiso)
                        resultado['asignados'].append({
                            'permiso_id': str(permiso.id),
                            'codigo': permiso.codigo,
                            'nombre': permiso.nombre,
                            'modulo': permiso.modulo.nombre
                        })
                
                except Permiso.DoesNotExist:
                    resultado['errores'].append({
                        'permiso_id': str(permiso_id),
                        'error': 'Permiso no encontrado o inactivo'
                    })
                    continue
            
            # Crear auditoría
            if usuario_modificador:
                cls._crear_auditoria_permisos(
                    rol, 'ASIGNACION', usuario_modificador, 
                    f"Asignados {len(resultado['asignados'])} permisos. {motivo}"
                )
            
            # Limpiar cache del rol
            rol.limpiar_cache_permisos()
        
        return resultado
    
    @classmethod
    def revocar_permisos(cls, rol, permisos_ids, usuario_modificador=None, motivo=''):
        """
        Revoca múltiples permisos de un rol
        """
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
                        # Remover el permiso usando ManyToMany
                        rol.permisos.remove(permiso)
                        resultado['revocados'].append({
                            'permiso_id': str(permiso.id),
                            'codigo': permiso.codigo,
                            'nombre': permiso.nombre,
                            'modulo': permiso.modulo.nombre
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
            
            # Crear auditoría
            if usuario_modificador:
                cls._crear_auditoria_permisos(
                    rol, 'REVOCACION', usuario_modificador,
                    f"Revocados {len(resultado['revocados'])} permisos. {motivo}"
                )
            
            # Limpiar cache del rol
            rol.limpiar_cache_permisos()
        
        return resultado
    
    @classmethod
    def sincronizar_permisos(cls, rol, permisos_ids, usuario_modificador=None, motivo=''):
        """
        Sincroniza los permisos del rol con la lista proporcionada
        """
        with transaction.atomic():
            # Obtener permisos actuales para auditoría
            permisos_anteriores = list(rol.permisos.all())
            
            # Limpiar todos los permisos actuales
            rol.permisos.clear()
            
            # Agregar los nuevos permisos
            permisos = Permiso.objects.filter(id__in=permisos_ids, activo=True)
            rol.permisos.add(*permisos)
            
            # Crear auditoría
            if usuario_modificador:
                cls._crear_auditoria_permisos(
                    rol, 'SINCRONIZACION', usuario_modificador,
                    f"Sincronizados {permisos.count()} permisos. Anteriores: {len(permisos_anteriores)}. {motivo}"
                )
            
            # Limpiar cache
            rol.limpiar_cache_permisos()
            
            return {
                'total_asignados': permisos.count(),
                'permisos_anteriores': len(permisos_anteriores),
                'permisos': [
                    {
                        'permiso_id': str(p.id),
                        'codigo': p.codigo,
                        'nombre': p.nombre,
                        'modulo': p.modulo.nombre
                    } for p in permisos
                ]
            }
    
    @classmethod
    def obtener_permisos_rol(cls, rol, incluir_heredados=True, agrupar_por_modulo=True):
        """
        Obtiene los permisos de un rol con opciones de formato
        """
        if incluir_heredados:
            permisos = rol.get_permisos_efectivos()
        else:
            permisos = rol.permisos.filter(activo=True).select_related('modulo', 'tipo_permiso')
        
        if agrupar_por_modulo:
            return cls._agrupar_permisos_por_modulo(permisos)
        else:
            return [
                {
                    'id': str(p.id),
                    'codigo': p.codigo,
                    'nombre': p.nombre,
                    'descripcion': p.descripcion,
                    'modulo': p.modulo.codigo,
                    'modulo_nombre': p.modulo.nombre,
                    'tipo_permiso': p.tipo_permiso.nombre,
                    'ambito': p.ambito
                } for p in permisos
            ]
    
    @classmethod
    def obtener_permisos_disponibles(cls, agrupar_por_modulo=True):
        """
        Obtiene todos los permisos disponibles del sistema
        """
        permisos = Permiso.objects.filter(
            activo=True
        ).select_related('modulo', 'tipo_permiso').order_by('modulo__nombre', 'nombre')
        
        if agrupar_por_modulo:
            return cls._agrupar_permisos_por_modulo(permisos)
        else:
            return [
                {
                    'id': str(p.id),
                    'codigo': p.codigo,
                    'nombre': p.nombre,
                    'descripcion': p.descripcion,
                    'modulo': p.modulo.codigo,
                    'modulo_nombre': p.modulo.nombre,
                    'tipo_permiso': p.tipo_permiso.nombre,
                    'ambito': p.ambito
                } for p in permisos
            ]
    
    @classmethod
    def comparar_permisos_roles(cls, rol1, rol2):
        """
        Compara permisos entre dos roles
        """
        permisos_rol1 = set(p.id for p in rol1.get_permisos_efectivos())
        permisos_rol2 = set(p.id for p in rol2.get_permisos_efectivos())
        
        return {
            'solo_rol1': list(permisos_rol1 - permisos_rol2),
            'solo_rol2': list(permisos_rol2 - permisos_rol1),
            'comunes': list(permisos_rol1 & permisos_rol2),
            'total_rol1': len(permisos_rol1),
            'total_rol2': len(permisos_rol2),
            'similitud_porcentaje': len(permisos_rol1 & permisos_rol2) / max(len(permisos_rol1 | permisos_rol2), 1) * 100
        }
    
    @classmethod
    def copiar_permisos_entre_roles(cls, rol_origen, rol_destino, usuario_modificador=None, motivo=''):
        """
        Copia todos los permisos de un rol a otro
        """
        permisos_origen = list(rol_origen.permisos.all())
        permisos_ids = [p.id for p in permisos_origen]
        
        return cls.sincronizar_permisos(
            rol_destino, 
            permisos_ids, 
            usuario_modificador,
            f"Copiado desde rol '{rol_origen.nombre}'. {motivo}"
        )
    
    @classmethod
    def obtener_estadisticas_permisos(cls, rol):
        """
        Obtiene estadísticas de permisos del rol
        """
        permisos_directos = rol.permisos.count()
        permisos_efectivos = len(rol.get_permisos_efectivos())
        permisos_por_modulo = rol.get_permisos_por_modulo()
        
        return {
            'permisos_directos': permisos_directos,
            'permisos_efectivos': permisos_efectivos,
            'permisos_heredados': permisos_efectivos - permisos_directos,
            'modulos_con_permisos': len(permisos_por_modulo),
            'distribucion_por_modulo': {
                modulo: len(permisos) for modulo, permisos in permisos_por_modulo.items()
            }
        }
    
    @classmethod
    def _agrupar_permisos_por_modulo(cls, permisos):
        """
        Agrupa permisos por módulo
        """
        modulos = {}
        
        for permiso in permisos:
            modulo_nombre = permiso.modulo.nombre
            if modulo_nombre not in modulos:
                modulos[modulo_nombre] = {
                    'modulo_id': str(permiso.modulo.id),
                    'modulo_nombre': modulo_nombre,
                    'modulo_codigo': permiso.modulo.codigo,
                    'modulo_icono': permiso.modulo.icono,
                    'permisos': []
                }
            
            modulos[modulo_nombre]['permisos'].append({
                'id': str(permiso.id),
                'codigo': permiso.codigo,
                'nombre': permiso.nombre,
                'descripcion': permiso.descripcion,
                'tipo_permiso': permiso.tipo_permiso.nombre,
                'ambito': permiso.ambito,
                'modulo': permiso.modulo.codigo,
                'modulo_nombre': modulo_nombre
            })
        
        return list(modulos.values())
    
    @classmethod
    def _crear_auditoria_permisos(cls, rol, accion, usuario, detalle):
        """
        Crea registro de auditoría para cambios de permisos
        """
        try:
            AuditoriaRol.objects.create(
                rol=rol,
                usuario_responsable=usuario,
                accion=accion,
                detalle=detalle,
                contexto_adicional={
                    'tipo_operacion': 'permisos',
                    'timestamp': timezone.now().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error creando auditoría de permisos: {e}")


# Instancia del servicio
rol_permisos_service = RolPermisosService()