from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.core.paginator import Paginator
from django.db.models import Q, Count
from django.views.decorators.http import require_http_methods
from django.template.loader import render_to_string
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db import transaction
from django.core.serializers.json import DjangoJSONEncoder
import json
import logging

from .models import (
    Rol, AsignacionRol, TipoRol, EstadoAsignacion, PlantillaRol,
    MetaRol, RolCondicional, AuditoriaRol, ConfiguracionRol, HistorialAsignacion
)
from .forms import (
    RolForm, AsignacionRolForm, RolFilterForm, BusquedaAsignacionForm, MetaRolForm, RolCondicionalForm, 
    AuditoriaRolFilterForm, ConfiguracionRolForm, AsignacionMasivaRolForm, ImportarRolesForm
)
from .utils import (
    RoleValidator, RoleHierarchyManager, invalidar_cache_roles,
    obtener_roles_usuario_con_jerarquia, validar_asignacion_rol, crear_auditoria_rol
)

User = get_user_model()
logger = logging.getLogger(__name__)


# ============ VISTAS PRINCIPALES DE ROLES ============

@login_required
def lista_roles(request):
    """Vista para listar roles con búsqueda y paginación avanzada"""
    search_query = request.GET.get('search', '')
    activo_filter = request.GET.get('activo', '')
    tipo_filter = request.GET.get('tipo', '')
    categoria_filter = request.GET.get('categoria', '')
    nivel_filter = request.GET.get('nivel', '')
    
    roles = Rol.objects.select_related('tipo_rol', 'rol_padre').prefetch_related('roles_hijo')
    
    # Filtro de búsqueda
    if search_query:
        roles = roles.filter(
            Q(nombre__icontains=search_query) |
            Q(codigo__icontains=search_query) |
            Q(descripcion__icontains=search_query) |
            Q(categoria__icontains=search_query)
        )
    
    # Filtro por estado activo
    if activo_filter in ['true', 'false']:
        activo_bool = activo_filter == 'true'
        roles = roles.filter(activo=activo_bool)
    
    # Filtro por tipo
    if tipo_filter:
        roles = roles.filter(tipo_rol_id=tipo_filter)
    
    # Filtro por categoría
    if categoria_filter:
        roles = roles.filter(categoria__icontains=categoria_filter)
    
    # Filtro por nivel jerárquico
    if nivel_filter:
        try:
            nivel = int(nivel_filter)
            roles = roles.filter(nivel_jerarquico=nivel)
        except ValueError:
            pass
    
    roles = roles.order_by('nivel_jerarquico', 'nombre')
    
    # Paginación con tamaño dinámico
    page_size = request.GET.get('page_size', '10')
    try:
        page_size = int(page_size)
        if page_size not in [5, 10, 25, 50]:
            page_size = 10
    except ValueError:
        page_size = 10
        
    paginator = Paginator(roles, page_size)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        # Respuesta AJAX
        html = render_to_string('roles/partials/tabla_roles.html', {
            'page_obj': page_obj,
            'search_query': search_query,
            'activo_filter': activo_filter,
            'tipo_filter': tipo_filter,
            'categoria_filter': categoria_filter,
            'nivel_filter': nivel_filter,
        })
        return JsonResponse({
            'html': html,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'current_page': page_obj.number,
            'total_pages': page_obj.paginator.num_pages,
            'total_items': paginator.count,
        })
    
    # Obtener datos para filtros
    tipos_rol = TipoRol.objects.filter(activo=True)
    categorias = Rol.objects.values_list('categoria', flat=True).distinct().exclude(categoria__isnull=True).exclude(categoria='')
    niveles = Rol.objects.values_list('nivel_jerarquico', flat=True).distinct().order_by('nivel_jerarquico')
    
    # Preparar datos para React
    roles_data = []
    for rol in roles:
        rol_dict = {
            'id': rol.id,
            'nombre': rol.nombre,
            'codigo': rol.codigo,
            'descripcion': rol.descripcion,
            'categoria': rol.categoria,
            'nivel_jerarquico': rol.nivel_jerarquico,
            'activo': rol.activo,
            'tipo_rol': {
                'id': rol.tipo_rol.id,
                'nombre': rol.tipo_rol.nombre
            } if rol.tipo_rol else None,
            'rol_padre': {
                'id': rol.rol_padre.id,
                'nombre': rol.rol_padre.nombre
            } if rol.rol_padre else None,
            'created_at': rol.fecha_creacion.isoformat() if hasattr(rol, 'fecha_creacion') else '',
        }
        roles_data.append(rol_dict)

    # Props para React
    from django.urls import reverse
    react_props = {
        'initialData': roles_data,
        'deleteUrl': reverse('roles:eliminar', args=[0]),
        'editUrl': reverse('roles:editar', args=[0]),
        'createUrl': reverse('roles:crear'),
        'dashboardUrl': reverse('roles:dashboard'),
        'jerarquiaUrl': reverse('roles:jerarquia'),
        'asignacionesUrl': reverse('roles:lista_asignaciones'),
        'auditoriaUrl': reverse('roles:auditoria'),
    }

    context = {
        'page_obj': page_obj,
        'search_query': search_query,
        'activo_filter': activo_filter,
        'tipo_filter': tipo_filter,
        'categoria_filter': categoria_filter,
        'nivel_filter': nivel_filter,
        'tipos_rol': tipos_rol,
        'categorias': categorias,
        'niveles': niveles,
        'title': 'Gestión de Roles',
        'roles': roles,
        'page_size': page_size,
        'react_props': json.dumps(react_props, cls=DjangoJSONEncoder)
    }
    return render(request, 'roles/lista.html', context)


@login_required
def crear_rol(request):
    """Vista para crear un nuevo rol"""
    if request.method == 'POST':
        form = RolForm(request.POST)
        if form.is_valid():
            try:
                with transaction.atomic():
                    rol = form.save(commit=False)
                    rol.creado_por = request.user
                    rol.modificado_por = request.user
                    rol.save()
                    
                    # Crear auditoría
                    crear_auditoria_rol(
                        rol=rol,
                        accion='crear_rol',
                        usuario_ejecutor=request.user,
                        detalles_nuevo={
                            'nombre': rol.nombre,
                            'codigo': rol.codigo,
                            'activo': rol.activo
                        },
                        contexto={
                            'ip_address': request.META.get('REMOTE_ADDR'),
                            'user_agent': request.META.get('HTTP_USER_AGENT')
                        }
                    )
                    
                    # Invalidar cache
                    invalidar_cache_roles(rol_id=rol.id)
                    
                    messages.success(request, f'Rol "{rol.nombre}" creado exitosamente.')
                    
                    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                        return JsonResponse({
                            'success': True,
                            'message': f'Rol "{rol.nombre}" creado exitosamente.',
                            'redirect': '/roles/',
                            'rol_id': rol.id
                        })
                    
                    return redirect('roles:lista')
            except Exception as e:
                messages.error(request, f'Error al crear el rol: {str(e)}')
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    return JsonResponse({
                        'success': False,
                        'message': f'Error al crear el rol: {str(e)}'
                    })
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = RolForm()
    
    context = {
        'form': form,
        'title': 'Crear Rol',
        'action': 'Crear'
    }
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        html = render_to_string('roles/formulario.html', context, request=request)
        return JsonResponse({'html': html})
    
    return render(request, 'roles/formulario.html', context)


@login_required
def editar_rol(request, pk):
    """Vista para editar un rol existente"""
    rol = get_object_or_404(Rol, pk=pk)
    estado_anterior = {
        'nombre': rol.nombre,
        'codigo': rol.codigo,
        'activo': rol.activo,
        'rol_padre_id': rol.rol_padre.id if rol.rol_padre else None
    }
    
    if request.method == 'POST':
        form = RolForm(request.POST, instance=rol)
        if form.is_valid():
            try:
                with transaction.atomic():
                    rol = form.save(commit=False)
                    rol.modificado_por = request.user
                    rol.save()
                    
                    # Crear auditoría
                    crear_auditoria_rol(
                        rol=rol,
                        accion='modificar_rol',
                        usuario_ejecutor=request.user,
                        detalles_anterior=estado_anterior,
                        detalles_nuevo={
                            'nombre': rol.nombre,
                            'codigo': rol.codigo,
                            'activo': rol.activo,
                            'rol_padre_id': rol.rol_padre.id if rol.rol_padre else None
                        },
                        contexto={
                            'ip_address': request.META.get('REMOTE_ADDR'),
                            'user_agent': request.META.get('HTTP_USER_AGENT')
                        }
                    )
                    
                    # Invalidar cache
                    invalidar_cache_roles(rol_id=rol.id)
                    
                    messages.success(request, f'Rol "{rol.nombre}" actualizado exitosamente.')
                    
                    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                        return JsonResponse({
                            'success': True,
                            'message': f'Rol "{rol.nombre}" actualizado exitosamente.',
                            'redirect': '/roles/'
                        })
                    
                    return redirect('roles:lista')
            except Exception as e:
                messages.error(request, f'Error al actualizar el rol: {str(e)}')
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    return JsonResponse({
                        'success': False,
                        'message': f'Error al actualizar el rol: {str(e)}'
                    })
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = RolForm(instance=rol)
    
    context = {
        'form': form,
        'rol': rol,
        'title': f'Editar Rol: {rol.nombre}',
        'action': 'Actualizar'
    }
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        html = render_to_string('roles/formulario.html', context, request=request)
        return JsonResponse({'html': html})
    
    return render(request, 'roles/formulario.html', context)


@login_required
def detalle_rol(request, pk):
    """Vista para ver los detalles completos de un rol"""
    rol = get_object_or_404(Rol.objects.select_related(
        'tipo_rol', 'rol_padre', 'creado_por', 'modificado_por'
    ).prefetch_related('roles_hijo'), pk=pk)
    
    # Obtener información de jerarquía
    jerarquia = RoleHierarchyManager.obtener_jerarquia_completa(rol)
    
    # Obtener asignaciones activas
    asignaciones_activas = AsignacionRol.objects.filter(
        rol=rol, activa=True
    ).select_related('usuario', 'estado').order_by('-fecha_asignacion')[:10]
    
    # Obtener auditoría reciente
    auditoria_reciente = AuditoriaRol.objects.filter(
        rol=rol
    ).select_related('usuario_ejecutor', 'usuario_afectado').order_by('-timestamp')[:5]
    
    # Estadísticas del rol
    estadisticas = {
        'total_asignaciones': AsignacionRol.objects.filter(rol=rol).count(),
        'asignaciones_activas': AsignacionRol.objects.filter(rol=rol, activa=True).count(),
        'usuarios_unicos': AsignacionRol.objects.filter(rol=rol).values('usuario').distinct().count(),
        'descendientes': len(jerarquia['descendientes']),
        'nivel_jerarquico': rol.nivel_jerarquico
    }
    
    context = {
        'rol': rol,
        'jerarquia': jerarquia,
        'asignaciones_activas': asignaciones_activas,
        'auditoria_reciente': auditoria_reciente,
        'estadisticas': estadisticas,
        'title': f'Detalle del Rol: {rol.nombre}',
    }
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        html = render_to_string('roles/detalle.html', context, request=request)
        return JsonResponse({'html': html})
    
    return render(request, 'roles/detalle.html', context)


@login_required
@login_required
def eliminar_rol(request, pk):
    """Vista para eliminar un rol (con validaciones)"""
    rol = get_object_or_404(Rol, pk=pk)
    
    if request.method == 'POST':
        try:
            # Validar si se puede eliminar
            if rol.es_sistema:
                raise ValidationError("No se puede eliminar un rol del sistema")
            
            if rol.roles_hijo.exists():
                raise ValidationError("No se puede eliminar un rol que tiene roles hijo")
            
            if AsignacionRol.objects.filter(rol=rol, activa=True).exists():
                raise ValidationError("No se puede eliminar un rol que tiene asignaciones activas")
            
            with transaction.atomic():
                nombre_rol = rol.nombre
                
                # Crear auditoría antes de eliminar
                crear_auditoria_rol(
                    rol=rol,
                    accion='eliminar_rol',
                    usuario_ejecutor=request.user,
                    detalles_anterior={
                        'nombre': rol.nombre,
                        'codigo': rol.codigo,
                        'activo': rol.activo
                    },
                    contexto={
                        'ip_address': request.META.get('REMOTE_ADDR'),
                        'user_agent': request.META.get('HTTP_USER_AGENT')
                    }
                )
                
                rol.delete()
                
                # Invalidar cache
                invalidar_cache_roles(rol_id=pk)
                
                messages.success(request, f'Rol "{nombre_rol}" eliminado exitosamente.')
                
                # Respuesta para AJAX
                if request.headers.get('x-requested-with') == 'XMLHttpRequest' or request.content_type == 'application/json':
                    return JsonResponse({
                        'success': True,
                        'message': f'Rol "{nombre_rol}" eliminado exitosamente.'
                    })
            
        except ValidationError as e:
            messages.error(request, str(e))
            if request.headers.get('x-requested-with') == 'XMLHttpRequest' or request.content_type == 'application/json':
                return JsonResponse({
                    'success': False,
                    'error': str(e)
                })
        except Exception as e:
            messages.error(request, f'Error al eliminar el rol: {str(e)}')
            if request.headers.get('x-requested-with') == 'XMLHttpRequest' or request.content_type == 'application/json':
                return JsonResponse({
                    'success': False,
                    'error': f'Error al eliminar el rol: {str(e)}'
                })
        
        return redirect('roles:lista')
    
    # GET request - mostrar página de confirmación
    return render(request, 'roles/confirmar_eliminar.html', {'object': rol})


@login_required
@require_http_methods(["POST"])
def toggle_activo_rol(request, pk):
    """Vista para alternar el estado activo de un rol"""
    rol = get_object_or_404(Rol, pk=pk)
    estado_anterior = rol.activo
    
    try:
        with transaction.atomic():
            rol.activo = not rol.activo
            rol.modificado_por = request.user
            rol.save(update_fields=['activo', 'fecha_modificacion', 'modificado_por'])
            
            # Crear auditoría
            accion = 'activar_rol' if rol.activo else 'desactivar_rol'
            crear_auditoria_rol(
                rol=rol,
                accion=accion,
                usuario_ejecutor=request.user,
                detalles_anterior={'activo': estado_anterior},
                detalles_nuevo={'activo': rol.activo},
                contexto={
                    'ip_address': request.META.get('REMOTE_ADDR'),
                    'user_agent': request.META.get('HTTP_USER_AGENT')
                }
            )
            
            # Invalidar cache
            invalidar_cache_roles(rol_id=rol.id)
            
            estado = "activado" if rol.activo else "desactivado"
            message = f'Rol "{rol.nombre}" {estado} exitosamente.'
            messages.success(request, message)
            
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': message,
                    'activo': rol.activo
                })
    except Exception as e:
        messages.error(request, f'Error al cambiar estado del rol: {str(e)}')
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': f'Error al cambiar estado del rol: {str(e)}'
            })
    
    return redirect('roles:lista')


# ============ VISTAS DE ASIGNACIONES ============

@login_required
def lista_asignaciones(request):
    """Vista para listar asignaciones de roles"""
    form = BusquedaAsignacionForm(request.GET)
    asignaciones = AsignacionRol.objects.select_related(
        'usuario', 'rol', 'estado', 'creado_por'
    ).order_by('-fecha_asignacion')
    
    if form.is_valid():
        if form.cleaned_data.get('usuario'):
            asignaciones = asignaciones.filter(
                usuario__username__icontains=form.cleaned_data['usuario']
            )
        if form.cleaned_data.get('rol'):
            asignaciones = asignaciones.filter(rol=form.cleaned_data['rol'])
        if form.cleaned_data.get('estado'):
            asignaciones = asignaciones.filter(estado=form.cleaned_data['estado'])
        if form.cleaned_data.get('activa') in ['true', 'false']:
            activa = form.cleaned_data['activa'] == 'true'
            asignaciones = asignaciones.filter(activa=activa)
        if form.cleaned_data.get('fecha_desde'):
            asignaciones = asignaciones.filter(fecha_asignacion__gte=form.cleaned_data['fecha_desde'])
        if form.cleaned_data.get('fecha_hasta'):
            asignaciones = asignaciones.filter(fecha_asignacion__lte=form.cleaned_data['fecha_hasta'])
    
    # Paginación
    paginator = Paginator(asignaciones, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'form': form,
        'page_obj': page_obj,
        'title': 'Asignaciones de Roles'
    }
    return render(request, 'roles/asignaciones/lista.html', context)


@login_required
def crear_asignacion(request):
    """Vista para crear una nueva asignación de rol"""
    if request.method == 'POST':
        form = AsignacionRolForm(request.POST)
        if form.is_valid():
            try:
                # Validar asignación
                errores = validar_asignacion_rol(
                    form.cleaned_data['usuario'],
                    form.cleaned_data['rol'],
                    form.cleaned_data.get('fecha_inicio'),
                    form.cleaned_data.get('fecha_fin')
                )
                
                if errores:
                    for error in errores:
                        form.add_error(None, error)
                    raise ValidationError("Errores de validación")
                
                with transaction.atomic():
                    asignacion = form.save(commit=False)
                    asignacion.creado_por = request.user
                    asignacion.modificado_por = request.user
                    asignacion.save()
                    
                    # Actualizar estadísticas del rol
                    asignacion.rol.actualizar_estadisticas()
                    
                    # Invalidar cache
                    invalidar_cache_roles(usuario_id=asignacion.usuario.id, rol_id=asignacion.rol.id)
                    
                    messages.success(request, f'Rol "{asignacion.rol.nombre}" asignado a {asignacion.usuario.username} exitosamente.')
                    return redirect('roles:lista_asignaciones')
                    
            except ValidationError:
                pass  # Los errores ya se agregaron al form
            except Exception as e:
                messages.error(request, f'Error al crear la asignación: {str(e)}')
    else:
        form = AsignacionRolForm()
    
    context = {
        'form': form,
        'title': 'Asignar Rol',
        'action': 'Asignar'
    }
    return render(request, 'roles/asignaciones/formulario.html', context)


@login_required
def asignacion_masiva(request):
    """Vista para asignación masiva de roles"""
    if request.method == 'POST':
        form = AsignacionMasivaRolForm(request.POST)
        if form.is_valid():
            try:
                # Procesar usuarios
                usuarios_input = form.cleaned_data['usuarios']
                usuarios = []
                
                for user_input in usuarios_input:
                    try:
                        # Intentar buscar por ID, username o email
                        if user_input.isdigit():
                            user = User.objects.get(id=int(user_input))
                        elif '@' in user_input:
                            user = User.objects.get(email=user_input)
                        else:
                            user = User.objects.get(username=user_input)
                        usuarios.append(user)
                    except User.DoesNotExist:
                        messages.warning(request, f'Usuario "{user_input}" no encontrado')
                
                if not usuarios:
                    messages.error(request, 'No se encontraron usuarios válidos')
                    return render(request, 'roles/asignaciones/masiva.html', {'form': form})
                
                # Procesar asignaciones
                roles = form.cleaned_data['roles']
                resultados = {'exitosas': 0, 'fallidas': 0, 'errores': []}
                
                with transaction.atomic():
                    for usuario in usuarios:
                        for rol in roles:
                            try:
                                # Validar asignación
                                errores = validar_asignacion_rol(
                                    usuario, rol,
                                    form.cleaned_data.get('fecha_inicio'),
                                    form.cleaned_data.get('fecha_fin')
                                )
                                
                                if errores:
                                    resultados['errores'].extend([
                                        f'{usuario.username} -> {rol.nombre}: {error}' 
                                        for error in errores
                                    ])
                                    resultados['fallidas'] += 1
                                    continue
                                
                                # Crear asignación
                                AsignacionRol.objects.create(
                                    usuario=usuario,
                                    rol=rol,
                                    fecha_inicio=form.cleaned_data.get('fecha_inicio'),
                                    fecha_fin=form.cleaned_data.get('fecha_fin'),
                                    justificacion=form.cleaned_data['justificacion'],
                                    creado_por=request.user,
                                    modificado_por=request.user
                                )
                                
                                resultados['exitosas'] += 1
                                
                                # Invalidar cache
                                invalidar_cache_roles(usuario_id=usuario.id, rol_id=rol.id)
                                
                            except Exception as e:
                                resultados['errores'].append(f'{usuario.username} -> {rol.nombre}: {str(e)}')
                                resultados['fallidas'] += 1
                
                # Mostrar resultados
                if resultados['exitosas'] > 0:
                    messages.success(request, f'{resultados["exitosas"]} asignaciones creadas exitosamente')
                
                if resultados['fallidas'] > 0:
                    messages.warning(request, f'{resultados["fallidas"]} asignaciones fallaron')
                    for error in resultados['errores'][:10]:  # Mostrar máximo 10 errores
                        messages.error(request, error)
                
                return redirect('roles:lista_asignaciones')
                
            except Exception as e:
                messages.error(request, f'Error en asignación masiva: {str(e)}')
    else:
        form = AsignacionMasivaRolForm()
    
    context = {
        'form': form,
        'title': 'Asignación Masiva de Roles'
    }
    return render(request, 'roles/asignaciones/masiva.html', context)


# ============ VISTAS DE JERARQUÍA ============

@login_required
def jerarquia_roles(request):
    """Vista para mostrar la jerarquía de roles"""
    roles_raiz = Rol.objects.filter(rol_padre__isnull=True, activo=True).prefetch_related('roles_hijo')
    
    def build_tree(rol):
        return {
            'rol': rol,
            'hijos': [build_tree(hijo) for hijo in rol.roles_hijo.filter(activo=True)]
        }
    
    jerarquia = [build_tree(rol) for rol in roles_raiz]
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'jerarquia': _serialize_hierarchy(jerarquia)
        })
    
    context = {
        'jerarquia': jerarquia,
        'title': 'Jerarquía de Roles'
    }
    return render(request, 'roles/jerarquia.html', context)


def _serialize_hierarchy(jerarquia):
    """Serializa la jerarquía para JSON"""
    result = []
    for item in jerarquia:
        result.append({
            'id': item['rol'].id,
            'nombre': item['rol'].nombre,
            'codigo': item['rol'].codigo,
            'nivel': item['rol'].nivel_jerarquico,
            'activo': item['rol'].activo,
            'hijos': _serialize_hierarchy(item['hijos'])
        })
    return result


# ============ VISTAS DE AUDITORÍA ============

@login_required
def auditoria_roles(request):
    """Vista para auditoría de roles"""
    form = AuditoriaRolFilterForm(request.GET)
    auditoria = AuditoriaRol.objects.select_related(
        'rol', 'usuario_ejecutor', 'usuario_afectado'
    ).order_by('-timestamp')
    
    if form.is_valid():
        if form.cleaned_data.get('rol'):
            auditoria = auditoria.filter(rol=form.cleaned_data['rol'])
        if form.cleaned_data.get('usuario_afectado'):
            auditoria = auditoria.filter(
                usuario_afectado__username__icontains=form.cleaned_data['usuario_afectado']
            )
        if form.cleaned_data.get('usuario_ejecutor'):
            auditoria = auditoria.filter(
                usuario_ejecutor__username__icontains=form.cleaned_data['usuario_ejecutor']
            )
        if form.cleaned_data.get('accion'):
            auditoria = auditoria.filter(accion=form.cleaned_data['accion'])
        if form.cleaned_data.get('fecha_desde'):
            auditoria = auditoria.filter(timestamp__gte=form.cleaned_data['fecha_desde'])
        if form.cleaned_data.get('fecha_hasta'):
            auditoria = auditoria.filter(timestamp__lte=form.cleaned_data['fecha_hasta'])
    
    # Paginación
    paginator = Paginator(auditoria, 25)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'form': form,
        'page_obj': page_obj,
        'title': 'Auditoría de Roles'
    }
    return render(request, 'roles/auditoria/lista.html', context)


# ============ API Views ============

@login_required
def api_roles(request):
    """API para obtener roles (para select2, etc.)"""
    search = request.GET.get('search', '')
    activos_solo = request.GET.get('activos_solo', 'true') == 'true'
    
    roles = Rol.objects.all()
    
    if activos_solo:
        roles = roles.filter(activo=True)
    
    if search:
        roles = roles.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search)
        )
    
    roles_data = []
    for rol in roles[:20]:  # Limitar a 20 resultados
        roles_data.append({
            'id': rol.id,
            'text': f"{rol.nombre} ({rol.codigo})",
            'nombre': rol.nombre,
            'codigo': rol.codigo,
            'descripcion': rol.descripcion,
            'activo': rol.activo,
            'nivel': rol.nivel_jerarquico,
            'asignaciones_activas': rol.asignaciones_activas
        })
    
    return JsonResponse({
        'results': roles_data,
        'pagination': {'more': roles.count() > 20}
    })


@login_required
def api_usuarios_rol(request, pk):
    """API para obtener usuarios con un rol específico"""
    rol = get_object_or_404(Rol, pk=pk)
    asignaciones = AsignacionRol.objects.filter(
        rol=rol, activa=True
    ).select_related('usuario').order_by('usuario__username')
    
    usuarios_data = []
    for asignacion in asignaciones:
        usuarios_data.append({
            'id': asignacion.usuario.id,
            'username': asignacion.usuario.username,
            'email': asignacion.usuario.email,
            'full_name': asignacion.usuario.get_full_name(),
            'fecha_asignacion': asignacion.fecha_asignacion.isoformat(),
            'asignacion_id': asignacion.id
        })
    
    return JsonResponse({
        'usuarios': usuarios_data,
        'total': len(usuarios_data),
        'rol': {
            'id': rol.id,
            'nombre': rol.nombre,
            'codigo': rol.codigo
        }
    })


@login_required
def dashboard_roles(request):
    """Dashboard principal de roles con estadísticas"""
    # Estadísticas generales
    estadisticas = {
        'total_roles': Rol.objects.count(),
        'roles_activos': Rol.objects.filter(activo=True).count(),
        'total_asignaciones': AsignacionRol.objects.count(),
        'asignaciones_activas': AsignacionRol.objects.filter(activa=True).count(),
        'usuarios_con_roles': AsignacionRol.objects.filter(activa=True).values('usuario').distinct().count(),
        'roles_populares': Rol.objects.annotate(
            total_asignaciones=Count('asignaciones')
        ).order_by('-total_asignaciones')[:5]
    }
    
    # Asignaciones recientes
    asignaciones_recientes = AsignacionRol.objects.select_related(
        'usuario', 'rol', 'creado_por'
    ).order_by('-fecha_asignacion')[:10]
    
    # Auditoría reciente
    auditoria_reciente = AuditoriaRol.objects.select_related(
        'rol', 'usuario_ejecutor'
    ).order_by('-timestamp')[:10]
    
    context = {
        'estadisticas': estadisticas,
        'asignaciones_recientes': asignaciones_recientes,
        'auditoria_reciente': auditoria_reciente,
        'title': 'Dashboard de Roles'
    }
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'estadisticas': estadisticas,
            'asignaciones_recientes': [
                {
                    'usuario': a.usuario.username,
                    'rol': a.rol.nombre,
                    'fecha': a.fecha_asignacion.isoformat()
                } for a in asignaciones_recientes
            ]
        })
    
    return render(request, 'roles/dashboard.html', context)


# ============ VISTAS DE UTILIDAD ============

@login_required
def exportar_roles(request):
    """Vista para exportar roles"""
    formato = request.GET.get('formato', 'json')
    
    roles = Rol.objects.select_related('tipo_rol', 'rol_padre').prefetch_related('roles_hijo')
    
    if formato == 'json':
        data = []
        for rol in roles:
            data.append({
                'id': rol.id,
                'nombre': rol.nombre,
                'codigo': rol.codigo,
                'descripcion': rol.descripcion,
                'activo': rol.activo,
                'nivel_jerarquico': rol.nivel_jerarquico,
                'tipo_rol': rol.tipo_rol.nombre if rol.tipo_rol else None,
                'rol_padre': rol.rol_padre.codigo if rol.rol_padre else None,
                'fecha_creacion': rol.fecha_creacion.isoformat()
            })
        
        response = JsonResponse(data, safe=False)
        response['Content-Disposition'] = 'attachment; filename="roles.json"'
        return response
    
    # Otros formatos se pueden implementar aquí
    return JsonResponse({'error': 'Formato no soportado'}, status=400)


@login_required
def validar_codigo_rol(request):
    """Vista AJAX para validar código de rol único"""
    codigo = request.GET.get('codigo', '').strip().upper()
    rol_id = request.GET.get('rol_id')
    
    if not codigo:
        return JsonResponse({'valido': False, 'mensaje': 'Código requerido'})
    
    query = Rol.objects.filter(codigo=codigo)
    if rol_id:
        query = query.exclude(id=rol_id)
    
    existe = query.exists()
    
    return JsonResponse({
        'valido': not existe,
        'mensaje': 'Código ya existe' if existe else 'Código disponible'
    })


@login_required
def mover_rol_jerarquia(request, pk):
    """Vista para mover un rol en la jerarquía"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método no permitido'})
    
    rol = get_object_or_404(Rol, pk=pk)
    nuevo_padre_id = request.POST.get('nuevo_padre_id')
    
    try:
        nuevo_padre = None
        if nuevo_padre_id:
            nuevo_padre = get_object_or_404(Rol, pk=nuevo_padre_id)
        
        # Validar jerarquía
        errores = RoleValidator.validar_jerarquia_rol(rol, nuevo_padre)
        if errores:
            return JsonResponse({
                'success': False,
                'message': ', '.join(errores)
            })
        
        with transaction.atomic():
            estado_anterior = {
                'rol_padre_id': rol.rol_padre.id if rol.rol_padre else None,
                'nivel_jerarquico': rol.nivel_jerarquico
            }
            
            # Mover rol
            success = RoleHierarchyManager.mover_rol_en_jerarquia(
                rol, nuevo_padre, request.user
            )
            
            if success:
                invalidar_cache_roles(rol_id=rol.id)
                
                return JsonResponse({
                    'success': True,
                    'message': f'Rol "{rol.nombre}" movido exitosamente',
                    'nuevo_nivel': rol.nivel_jerarquico
                })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error al mover rol: {str(e)}'
        })
    
    return JsonResponse({
        'success': False,
        'message': 'Error desconocido'
    })
