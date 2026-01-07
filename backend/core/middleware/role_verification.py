"""
Middleware para verificar vigencia y horarios de roles en cada request
"""
from django.utils import timezone
from django.contrib import messages
from django.shortcuts import redirect
import datetime


class RoleVerificationMiddleware:
    """
    Middleware que verifica en cada request:
    - Vigencia de roles (fecha_inicio_vigencia, fecha_fin_vigencia)
    - Restricción de horarios (hora_inicio, hora_fin, dias_semana)
    - Desactiva asignaciones expiradas automáticamente
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Rutas que no requieren verificación de roles
        self.excluded_paths = [
            '/api/auth/',
            '/login/',
            '/logout/',
            '/admin/',
            '/static/',
            '/media/',
        ]
    
    def __call__(self, request):
        # Verificar roles solo si el usuario está autenticado
        if request.user.is_authenticated and not self.is_excluded_path(request.path):
            self.verificar_roles_usuario(request)
        
        response = self.get_response(request)
        return response
    
    def is_excluded_path(self, path):
        """Verifica si la ruta está excluida de verificación"""
        return any(path.startswith(excluded) for excluded in self.excluded_paths)
    
    def verificar_roles_usuario(self, request):
        """Verifica todos los roles asignados al usuario"""
        from roles.models import AsignacionRol, EstadoAsignacion
        
        try:
            # Obtener asignaciones activas del usuario
            asignaciones = AsignacionRol.objects.filter(
                usuario=request.user,
                activa=True,
                organization=request.user.organization
            ).select_related('rol', 'estado')
            
            ahora = timezone.now()
            hoy = ahora.date()
            
            for asignacion in asignaciones:
                rol = asignacion.rol
                desactivar = False
                razon = ""
                
                # 1. Verificar vigencia del ROL
                if rol.fecha_fin_vigencia and hoy > rol.fecha_fin_vigencia:
                    desactivar = True
                    razon = f"El rol '{rol.nombre}' ha expirado"
                
                elif rol.fecha_inicio_vigencia and hoy < rol.fecha_inicio_vigencia:
                    desactivar = True
                    razon = f"El rol '{rol.nombre}' aún no está vigente"
                
                # 2. Verificar vigencia de la ASIGNACIÓN
                elif asignacion.fecha_fin and ahora > asignacion.fecha_fin:
                    desactivar = True
                    razon = f"Tu asignación del rol '{rol.nombre}' ha expirado"
                
                elif asignacion.fecha_inicio and ahora < asignacion.fecha_inicio:
                    desactivar = True
                    razon = f"Tu asignación del rol '{rol.nombre}' aún no está vigente"
                
                # 3. Verificar restricción de horarios
                elif rol.tiene_restriccion_horario:
                    if not self.verificar_horario(rol, ahora):
                        # No desactivar permanentemente, solo advertir
                        messages.warning(
                            request,
                            f"El rol '{rol.nombre}' no está disponible en este horario. "
                            f"Horario permitido: {rol.hora_inicio.strftime('%H:%M')} - "
                            f"{rol.hora_fin.strftime('%H:%M')}"
                        )
                        # Opcional: bloquear acceso completamente
                        # desactivar = True
                        # razon = f"Fuera del horario permitido para '{rol.nombre}'"
                
                # Desactivar asignación si es necesario
                if desactivar:
                    self.desactivar_asignacion(asignacion, razon)
                    messages.error(request, razon)
        
        except Exception as e:
            # No bloquear la aplicación por errores en verificación
            print(f"Error en RoleVerificationMiddleware: {e}")
    
    def verificar_horario(self, rol, ahora):
        """Verifica si el rol puede acceder en el horario actual"""
        if not rol.tiene_restriccion_horario:
            return True
        
        # Verificar día de la semana (1=Lunes, 7=Domingo)
        dia_semana = str(ahora.weekday() + 1)
        if dia_semana not in rol.dias_semana:
            return False
        
        # Verificar horario
        hora_actual = ahora.time()
        
        # Manejar horarios que cruzan medianoche (ej: 22:00 - 06:00)
        if rol.hora_inicio <= rol.hora_fin:
            # Horario normal (ej: 08:00 - 17:00)
            return rol.hora_inicio <= hora_actual <= rol.hora_fin
        else:
            # Horario que cruza medianoche (ej: 22:00 - 06:00)
            return hora_actual >= rol.hora_inicio or hora_actual <= rol.hora_fin
    
    def desactivar_asignacion(self, asignacion, razon):
        """Desactiva una asignación y registra la razón"""
        from roles.models import EstadoAsignacion
        
        try:
            # Cambiar estado a INACTIVA
            estado_inactiva = EstadoAsignacion.objects.get(
                nombre='INACTIVA',
                organization=asignacion.organization
            )
            
            asignacion.estado = estado_inactiva
            asignacion.activa = False
            
            # Agregar observación
            observacion_nueva = f"\n[{timezone.now()}] Desactivado automáticamente: {razon}"
            if asignacion.observaciones:
                asignacion.observaciones += observacion_nueva
            else:
                asignacion.observaciones = observacion_nueva
            
            asignacion.save()
            
            # Actualizar estadísticas del rol
            asignacion.rol.actualizar_estadisticas()
            
        except EstadoAsignacion.DoesNotExist:
            # Si no existe el estado INACTIVA, solo desactivar
            asignacion.activa = False
            asignacion.save()
