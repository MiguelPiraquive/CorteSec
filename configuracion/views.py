from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin
from django.contrib import messages
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy, reverse
from django.http import JsonResponse, HttpResponseRedirect
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError
from django.db import transaction, models
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.conf import settings

import json
import logging

from .models import (
    ConfiguracionGeneral, 
    ParametroSistema, 
    ConfiguracionModulo, 
    LogConfiguracion
)
from .forms import (
    ConfiguracionGeneralForm, 
    ParametroSistemaForm, 
    ConfiguracionModuloForm
)

User = get_user_model()
logger = logging.getLogger(__name__)


# ===========================================
# DASHBOARD PRINCIPAL
# ===========================================

@login_required
def dashboard_view(request):
    """Dashboard principal de configuración"""
    # Obtener configuración general
    config_general = ConfiguracionGeneral.get_config()
    
    # Estadísticas de parámetros
    total_parametros = ParametroSistema.objects.count()
    parametros_activos = ParametroSistema.objects.filter(activo=True).count()
    parametros_sistema = ParametroSistema.objects.filter(es_sistema=True).count()
    
    # Estadísticas de módulos
    total_modulos = ConfiguracionModulo.objects.count()
    modulos_activos = ConfiguracionModulo.objects.filter(activo=True).count()
    modulos_inactivos = total_modulos - modulos_activos
    
    # Estadísticas de logs
    logs_hoy = LogConfiguracion.objects.filter(
        fecha_creacion__date=timezone.now().date()
    ).count()
    total_logs = LogConfiguracion.objects.count()
    logs_errores = LogConfiguracion.objects.filter(nivel='error').count()
    logs_warnings = LogConfiguracion.objects.filter(nivel='warning').count()
    
    # Logs recientes
    logs_recientes = LogConfiguracion.objects.select_related('usuario').order_by('-fecha_creacion')[:5]
    
    # Módulos con sus estados
    modulos = ConfiguracionModulo.objects.all().order_by('orden_menu', 'modulo')
    
    # Última copia de seguridad
    ultimo_backup = config_general.ultima_copia_seguridad if hasattr(config_general, 'ultima_copia_seguridad') else None
    
    context = {
        'config_general': config_general,
        'total_parametros': total_parametros,
        'parametros_activos': parametros_activos,
        'parametros_sistema': parametros_sistema,
        'total_modulos': total_modulos,
        'modulos_activos': modulos_activos,
        'modulos_inactivos': modulos_inactivos,
        'logs_hoy': logs_hoy,
        'total_logs': total_logs,
        'logs_errores': logs_errores,
        'logs_warnings': logs_warnings,
        'logs_recientes': logs_recientes,
        'modulos': modulos,
        'ultimo_backup': ultimo_backup,
    }
    
    return render(request, 'configuracion/dashboard.html', context)


# ===========================================
# VIEWS DE CONFIGURACIÓN GENERAL
# ===========================================

@method_decorator(login_required, name='dispatch')
@method_decorator(permission_required('configuracion.view_configuraciongeneral', raise_exception=True), name='dispatch')
class ConfiguracionGeneralView(UpdateView):
    """Vista para configuración general del sistema (Singleton)"""
    model = ConfiguracionGeneral
    form_class = ConfiguracionGeneralForm
    template_name = 'configuracion/general/form.html'
    success_url = reverse_lazy('configuracion:general')
    
    def get_object(self, queryset=None):
        """Obtiene o crea la configuración general"""
        return ConfiguracionGeneral.get_config()
    
    def form_valid(self, form):
        """Procesa el formulario válido"""
        form.instance.modificado_por = self.request.user
        
        # Log del cambio
        self._log_cambios(form)
        
        messages.success(
            self.request, 
            'Configuración general actualizada exitosamente.'
        )
        return super().form_valid(form)
    
    def _log_cambios(self, form):
        """Registra los cambios en el log"""
        if form.has_changed():
            for field in form.changed_data:
                LogConfiguracion.objects.create(
                    tipo_cambio='general',
                    item_modificado=field,
                    valor_anterior=str(form.initial.get(field, '')),
                    valor_nuevo=str(form.cleaned_data[field]),
                    descripcion=f'Cambio en configuración general: {field}',
                    usuario=self.request.user,
                    ip_address=self.request.META.get('REMOTE_ADDR')
                )


# ===========================================
# VIEWS DE PARÁMETROS DEL SISTEMA
# ===========================================

class ParametrosSistemaListView(LoginRequiredMixin, ListView):
    """Lista de parámetros del sistema"""
    model = ParametroSistema
    template_name = 'configuracion/parametros/list.html'
    context_object_name = 'parametros'
    paginate_by = 20
    
    def get_queryset(self):
        queryset = ParametroSistema.objects.all()
        
        # Filtros
        search = self.request.GET.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(codigo__icontains=search) |
                models.Q(nombre__icontains=search) |
                models.Q(descripcion__icontains=search)
            )
        
        tipo = self.request.GET.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo_valor=tipo)
        
        activo = self.request.GET.get('activo')
        if activo is not None:
            queryset = queryset.filter(activo=activo == 'true')
        
        return queryset.order_by('codigo')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Estadísticas
        total_parametros = ParametroSistema.objects.count()
        parametros_activos = ParametroSistema.objects.filter(activo=True).count()
        parametros_inactivos = total_parametros - parametros_activos
        parametros_sistema = ParametroSistema.objects.filter(es_sistema=True).count()
        parametros_personalizados = total_parametros - parametros_sistema
        
        # Distribución por tipo
        tipos_stats = {}
        for tipo_key, tipo_label in ParametroSistema.TIPO_VALOR_CHOICES:
            tipos_stats[tipo_key] = {
                'label': tipo_label,
                'count': ParametroSistema.objects.filter(tipo_valor=tipo_key).count()
            }
        
        # Logs recientes de parámetros
        logs_recientes = LogConfiguracion.objects.filter(
            tipo_cambio='parametro'
        ).select_related('usuario').order_by('-fecha_creacion')[:5]
        
        context.update({
            'tipos_valor': ParametroSistema.TIPO_VALOR_CHOICES,
            'search': self.request.GET.get('search', ''),
            'selected_tipo': self.request.GET.get('tipo', ''),
            'selected_activo': self.request.GET.get('activo', ''),
            # Estadísticas
            'total_parametros': total_parametros,
            'parametros_activos': parametros_activos,
            'parametros_inactivos': parametros_inactivos,
            'parametros_sistema': parametros_sistema,
            'parametros_personalizados': parametros_personalizados,
            'tipos_stats': tipos_stats,
            'logs_recientes': logs_recientes,
        })
        
        return context


class ParametroSistemaCreateView(LoginRequiredMixin, PermissionRequiredMixin, CreateView):
    """Crear nuevo parámetro del sistema"""
    model = ParametroSistema
    form_class = ParametroSistemaForm
    template_name = 'configuracion/parametros/form.html'
    success_url = reverse_lazy('configuracion:parametros_list')
    permission_required = 'configuracion.add_parametrosistema'
    
    def form_valid(self, form):
        # Log del cambio
        LogConfiguracion.objects.create(
            tipo_cambio='parametro',
            item_modificado=form.cleaned_data['codigo'],
            valor_anterior='',
            valor_nuevo=form.cleaned_data['valor'],
            descripcion=f'Nuevo parámetro creado: {form.cleaned_data["codigo"]}',
            usuario=self.request.user,
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
        
        messages.success(
            self.request, 
            f'Parámetro "{form.cleaned_data["codigo"]}" creado exitosamente.'
        )
        return super().form_valid(form)


class ParametroSistemaUpdateView(LoginRequiredMixin, PermissionRequiredMixin, UpdateView):
    """Actualizar parámetro del sistema"""
    model = ParametroSistema
    form_class = ParametroSistemaForm
    template_name = 'configuracion/parametros/form.html'
    success_url = reverse_lazy('configuracion:parametros_list')
    permission_required = 'configuracion.change_parametrosistema'
    
    def form_valid(self, form):
        if form.has_changed():
            # Log del cambio
            LogConfiguracion.objects.create(
                tipo_cambio='parametro',
                item_modificado=form.instance.codigo,
                valor_anterior=str(form.initial.get('valor', '')),
                valor_nuevo=str(form.cleaned_data['valor']),
                descripcion=f'Parámetro modificado: {form.instance.codigo}',
                usuario=self.request.user,
                ip_address=self.request.META.get('REMOTE_ADDR')
            )
        
        messages.success(
            self.request, 
            f'Parámetro "{form.instance.codigo}" actualizado exitosamente.'
        )
        return super().form_valid(form)


class ParametroSistemaDetailView(LoginRequiredMixin, DetailView):
    """Detalle de parámetro del sistema"""
    model = ParametroSistema
    template_name = 'configuracion/parametros/detail.html'
    context_object_name = 'parametro'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Historial de cambios del parámetro
        historial = LogConfiguracion.objects.filter(
            tipo_cambio='parametro',
            item_modificado=self.object.codigo
        ).select_related('usuario').order_by('-fecha_creacion')[:10]
        
        # Ejemplos de uso según el tipo
        ejemplos_uso = self._get_ejemplos_uso(self.object.tipo_valor)
        
        # Información del valor
        valor_info = self._get_valor_info(self.object)
        
        context.update({
            'historial': historial,
            'ejemplos_uso': ejemplos_uso,
            'valor_info': valor_info,
        })
        
        return context
    
    def _get_ejemplos_uso(self, tipo_valor):
        """Obtiene ejemplos de uso según el tipo de valor"""
        ejemplos = {
            'string': [
                'Nombre de la empresa',
                'Mensaje de bienvenida',
                'URL del sitio web'
            ],
            'integer': [
                'Días de gracia para pagos',
                'Número máximo de intentos',
                'Tiempo de sesión en minutos'
            ],
            'float': [
                'Tasa de IVA por defecto',
                'Porcentaje de descuento',
                'Factor de conversión'
            ],
            'boolean': [
                'Habilitar notificaciones',
                'Permitir registro de usuarios',
                'Modo mantenimiento'
            ],
            'json': [
                'Configuración de API',
                'Estructura de permisos',
                'Datos de integración'
            ]
        }
        return ejemplos.get(tipo_valor, [])
    
    def _get_valor_info(self, parametro):
        """Obtiene información del valor actual"""
        info = {
            'tipo': parametro.get_tipo_valor_display(),
            'longitud': len(str(parametro.valor)) if parametro.valor else 0,
            'es_vacio': not parametro.valor,
            'es_json_valido': False,
            'estructura_json': None
        }
        
        if parametro.tipo_valor == 'json' and parametro.valor:
            try:
                json_data = json.loads(parametro.valor)
                info['es_json_valido'] = True
                info['estructura_json'] = self._get_json_structure(json_data)
            except json.JSONDecodeError:
                info['es_json_valido'] = False
        
        return info
    
    def _get_json_structure(self, data, prefix=""):
        """Obtiene la estructura de un JSON"""
        if isinstance(data, dict):
            return [f"{prefix}{key}: {type(value).__name__}" for key, value in data.items()]
        elif isinstance(data, list):
            return [f"{prefix}[{i}]: {type(item).__name__}" for i, item in enumerate(data[:3])]
        else:
            return [f"{prefix}: {type(data).__name__}"]


class ParametroSistemaDeleteView(LoginRequiredMixin, PermissionRequiredMixin, DeleteView):
    """Eliminar parámetro del sistema"""
    model = ParametroSistema
    template_name = 'configuracion/parametros/confirm_delete.html'
    success_url = reverse_lazy('configuracion:parametros_list')
    permission_required = 'configuracion.delete_parametrosistema'
    
    def delete(self, request, *args, **kwargs):
        self.object = self.get_object()
        
        # Verificar si es del sistema
        if self.object.es_sistema:
            messages.error(
                request, 
                'No se puede eliminar un parámetro del sistema.'
            )
            return redirect('configuracion:parametros_list')
        
        # Log del cambio
        LogConfiguracion.objects.create(
            tipo_cambio='parametro',
            item_modificado=self.object.codigo,
            valor_anterior=str(self.object.valor),
            valor_nuevo='[ELIMINADO]',
            descripcion=f'Parámetro eliminado: {self.object.codigo}',
            usuario=request.user,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        messages.success(
            request, 
            f'Parámetro "{self.object.codigo}" eliminado exitosamente.'
        )
        return super().delete(request, *args, **kwargs)


# ===========================================
# VIEWS DE CONFIGURACIÓN DE MÓDULOS
# ===========================================

class ConfiguracionModulosListView(LoginRequiredMixin, ListView):
    """Lista de configuración de módulos"""
    model = ConfiguracionModulo
    template_name = 'configuracion/modulos/list.html'
    context_object_name = 'modulos'
    
    def get_queryset(self):
        return ConfiguracionModulo.objects.all().order_by('orden_menu', 'modulo')


class ConfiguracionModuloUpdateView(LoginRequiredMixin, PermissionRequiredMixin, UpdateView):
    """Actualizar configuración de módulo"""
    model = ConfiguracionModulo
    form_class = ConfiguracionModuloForm
    template_name = 'configuracion/modulos/form.html'
    success_url = reverse_lazy('configuracion:modulos_list')
    permission_required = 'configuracion.change_configuracionmodulo'
    
    def form_valid(self, form):
        if form.has_changed():
            # Log del cambio
            LogConfiguracion.objects.create(
                tipo_cambio='modulo',
                item_modificado=form.instance.modulo,
                valor_anterior='[Configuración anterior]',
                valor_nuevo='[Configuración actualizada]',
                descripcion=f'Configuración de módulo actualizada: {form.instance.modulo}',
                usuario=self.request.user,
                ip_address=self.request.META.get('REMOTE_ADDR')
            )
        
        messages.success(
            self.request, 
            f'Configuración del módulo "{form.instance.modulo}" actualizada exitosamente.'
        )
        return super().form_valid(form)


# ===========================================
# VIEWS DE LOGS Y AUDITORÍA
# ===========================================

class LogsConfiguracionListView(LoginRequiredMixin, ListView):
    """Lista de logs de configuración"""
    model = LogConfiguracion
    template_name = 'configuracion/logs/list.html'
    context_object_name = 'logs'
    paginate_by = 50
    
    def get_queryset(self):
        queryset = LogConfiguracion.objects.all()
        
        # Filtros
        tipo = self.request.GET.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo_cambio=tipo)
        
        usuario = self.request.GET.get('usuario')
        if usuario:
            queryset = queryset.filter(usuario_id=usuario)
        
        fecha_desde = self.request.GET.get('fecha_desde')
        if fecha_desde:
            queryset = queryset.filter(fecha_cambio__date__gte=fecha_desde)
        
        fecha_hasta = self.request.GET.get('fecha_hasta')
        if fecha_hasta:
            queryset = queryset.filter(fecha_cambio__date__lte=fecha_hasta)
        
        return queryset.order_by('-fecha_cambio')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['tipos_cambio'] = LogConfiguracion.TIPO_CAMBIO_CHOICES
        context['usuarios'] = User.objects.filter(
            logconfiguracion__isnull=False
        ).distinct()
        return context


# ===========================================
# VIEWS API Y AJAX
# ===========================================

@login_required
@csrf_exempt
@require_http_methods(["POST"])
def toggle_modulo_activo(request, modulo_id):
    """Activa/desactiva un módulo via AJAX"""
    try:
        modulo = get_object_or_404(ConfiguracionModulo, id=modulo_id)
        modulo.activo = not modulo.activo
        modulo.save()
        
        # Log del cambio
        LogConfiguracion.objects.create(
            tipo_cambio='modulo',
            item_modificado=modulo.modulo,
            valor_anterior=str(not modulo.activo),
            valor_nuevo=str(modulo.activo),
            descripcion=f'Módulo {"activado" if modulo.activo else "desactivado"}: {modulo.modulo}',
            usuario=request.user,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return JsonResponse({
            'success': True,
            'activo': modulo.activo,
            'message': f'Módulo {"activado" if modulo.activo else "desactivado"} exitosamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def actualizar_orden_modulos(request):
    """Actualiza el orden de los módulos via AJAX"""
    try:
        data = json.loads(request.body)
        modulos_orden = data.get('modulos', [])
        
        with transaction.atomic():
            for item in modulos_orden:
                modulo_id = item.get('id')
                nuevo_orden = item.get('orden')
                
                ConfiguracionModulo.objects.filter(id=modulo_id).update(
                    orden_menu=nuevo_orden
                )
        
        # Log del cambio
        LogConfiguracion.objects.create(
            tipo_cambio='modulo',
            item_modificado='orden_menu',
            valor_anterior='[Orden anterior]',
            valor_nuevo='[Nuevo orden]',
            descripcion='Orden de módulos actualizado',
            usuario=request.user,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Orden de módulos actualizado exitosamente.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })


@login_required
def get_parametro_valor(request, codigo):
    """Obtiene el valor de un parámetro via AJAX"""
    try:
        parametro = get_object_or_404(ParametroSistema, codigo=codigo, activo=True)
        return JsonResponse({
            'success': True,
            'valor': parametro.get_valor_tipado(),
            'tipo': parametro.tipo_valor
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })


@login_required
def dashboard_configuracion(request):
    """Dashboard principal de configuración"""
    context = {
        'config_general': ConfiguracionGeneral.get_config(),
        'total_parametros': ParametroSistema.objects.count(),
        'parametros_activos': ParametroSistema.objects.filter(activo=True).count(),
        'total_modulos': ConfiguracionModulo.objects.count(),
        'modulos_activos': ConfiguracionModulo.objects.filter(activo=True).count(),
        'cambios_recientes': LogConfiguracion.objects.all()[:10],
        'usuarios_recientes': User.objects.filter(
            logconfiguracion__isnull=False
        ).distinct()[:5],
    }
    return render(request, 'configuracion/dashboard.html', context)


@login_required
def configuracion_backup(request):
    """Exporta la configuración completa del sistema"""
    try:
        config_data = {
            'configuracion_general': {},
            'parametros_sistema': [],
            'configuracion_modulos': [],
            'fecha_exportacion': timezone.now().isoformat(),
        }
        
        # Configuración general
        config_general = ConfiguracionGeneral.get_config()
        for field in config_general._meta.fields:
            if field.name not in ['id', 'fecha_modificacion', 'modificado_por']:
                value = getattr(config_general, field.name)
                if value is not None:
                    config_data['configuracion_general'][field.name] = str(value)
        
        # Parámetros del sistema
        for parametro in ParametroSistema.objects.all():
            config_data['parametros_sistema'].append({
                'codigo': parametro.codigo,
                'nombre': parametro.nombre,
                'descripcion': parametro.descripcion,
                'tipo_valor': parametro.tipo_valor,
                'valor': parametro.valor,
                'valor_defecto': parametro.valor_defecto,
                'es_sistema': parametro.es_sistema,
                'activo': parametro.activo,
            })
        
        # Configuración de módulos
        for modulo in ConfiguracionModulo.objects.all():
            config_data['configuracion_modulos'].append({
                'modulo': modulo.modulo,
                'activo': modulo.activo,
                'version': modulo.version,
                'configuracion_json': modulo.configuracion_json,
                'orden_menu': modulo.orden_menu,
                'icono': modulo.icono,
                'color': modulo.color,
            })
        
        # Log del backup
        LogConfiguracion.objects.create(
            tipo_cambio='general',
            item_modificado='backup',
            descripcion='Backup de configuración exportado',
            usuario=request.user,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        response = JsonResponse(config_data, json_dumps_params={'indent': 2})
        response['Content-Disposition'] = f'attachment; filename="config_backup_{timezone.now().strftime("%Y%m%d_%H%M%S")}.json"'
        return response
        
    except Exception as e:
        logger.error(f"Error en backup de configuración: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Error generando el backup de configuración'
        })


# ===========================================
# VIEWS DE GESTIÓN AVANZADA
# ===========================================

@login_required
@permission_required('configuracion.view_configuraciongeneral', raise_exception=True)
def configuracion_avanzada(request):
    """Vista de configuración avanzada del sistema"""
    context = {
        'configuracion_servidor': {
            'debug': getattr(settings, 'DEBUG', False),
            'allowed_hosts': getattr(settings, 'ALLOWED_HOSTS', []),
            'timezone': getattr(settings, 'TIME_ZONE', 'UTC'),
            'language': getattr(settings, 'LANGUAGE_CODE', 'es'),
        },
        'estadisticas_sistema': {
            'usuarios_total': User.objects.count(),
            'usuarios_activos': User.objects.filter(is_active=True).count(),
            'configuraciones_total': LogConfiguracion.objects.count(),
            'ultimo_cambio': LogConfiguracion.objects.first(),
        }
    }
    return render(request, 'configuracion/avanzada.html', context)


# ===========================================
# VIEWS DE GESTIÓN DE MÓDULOS
# ===========================================

@login_required
@permission_required('configuracion.view_configuracionmodulo', raise_exception=True)
def modulos_list_view(request):
    """Vista de lista de módulos del sistema"""
    modulos = ConfiguracionModulo.objects.all().order_by('orden_menu', 'modulo')
    
    # Estadísticas
    total_modulos = modulos.count()
    modulos_activos = modulos.filter(activo=True).count()
    modulos_inactivos = total_modulos - modulos_activos
    
    # Convertir a formato JSON para JavaScript
    modulos_json = []
    for modulo in modulos:
        modulos_json.append({
            'id': modulo.id,
            'modulo': modulo.modulo,
            'icono': modulo.icono or 'fas fa-cube',
            'activo': modulo.activo,
            'orden_menu': modulo.orden_menu,
            'version': modulo.version,
            'color': modulo.color,
        })
    
    context = {
        'modulos': json.dumps(modulos_json),
        'total_modulos': total_modulos,
        'modulos_activos': modulos_activos,
        'modulos_inactivos': modulos_inactivos,
    }
    
    return render(request, 'configuracion/modulos/list.html', context)


@csrf_exempt
@require_http_methods(["POST"])
@login_required
@permission_required('configuracion.change_configuracionmodulo', raise_exception=True)
def modulo_toggle_view(request, modulo_id):
    """Toggle del estado activo/inactivo de un módulo"""
    try:
        modulo = get_object_or_404(ConfiguracionModulo, id=modulo_id)
        
        # Cambiar estado
        modulo.activo = not modulo.activo
        modulo.save()
        
        # Log del cambio
        LogConfiguracion.objects.create(
            tipo_cambio='modulo',
            item_modificado=modulo.modulo,
            valor_anterior=str(not modulo.activo),
            valor_nuevo=str(modulo.activo),
            descripcion=f'Módulo {"activado" if modulo.activo else "desactivado"}: {modulo.modulo}',
            usuario=request.user,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return JsonResponse({
            'success': True,
            'activo': modulo.activo
        })
        
    except Exception as e:
        logger.error(f"Error al cambiar estado del módulo {modulo_id}: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Error interno del servidor'
        })


@csrf_exempt
@require_http_methods(["PUT"])
@login_required
@permission_required('configuracion.change_configuracionmodulo', raise_exception=True)
def modulo_update_view(request, modulo_id):
    """Actualizar configuración de un módulo"""
    try:
        modulo = get_object_or_404(ConfiguracionModulo, id=modulo_id)
        data = json.loads(request.body)
        
        # Campos actualizables
        campos_actualizables = ['modulo', 'icono', 'orden_menu', 'color', 'version']
        cambios = []
        
        for campo in campos_actualizables:
            if campo in data:
                valor_anterior = getattr(modulo, campo)
                valor_nuevo = data[campo]
                
                if valor_anterior != valor_nuevo:
                    setattr(modulo, campo, valor_nuevo)
                    cambios.append(f"{campo}: {valor_anterior} -> {valor_nuevo}")
        
        if cambios:
            modulo.save()
            
            # Log del cambio
            LogConfiguracion.objects.create(
                tipo_cambio='modulo',
                item_modificado=modulo.nombre,
                valor_anterior=', '.join(cambios),
                valor_nuevo='Configuración actualizada',
                descripcion=f'Módulo modificado: {modulo.nombre}',
                usuario=request.user,
                ip_address=request.META.get('REMOTE_ADDR')
            )
        
        return JsonResponse({
            'success': True,
            'message': 'Módulo actualizado correctamente'
        })
        
    except Exception as e:
        logger.error(f"Error al actualizar módulo {modulo_id}: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Error interno del servidor'
        })


# ===========================================
# VIEWS DE GESTIÓN DE LOGS
# ===========================================

@login_required
@permission_required('configuracion.view_logconfiguracion', raise_exception=True)
def logs_list_view(request):
    """Vista de lista de logs del sistema"""
    logs = LogConfiguracion.objects.select_related('usuario').order_by('-fecha_creacion')
    
    # Estadísticas
    total_logs = logs.count()
    logs_hoy = logs.filter(fecha_creacion__date=timezone.now().date()).count()
    logs_errores = logs.filter(nivel='error').count()
    logs_warnings = logs.filter(nivel='warning').count()
    
    # Convertir a formato JSON para JavaScript (primeros 100 logs)
    logs_json = []
    for log in logs[:100]:
        logs_json.append({
            'id': log.id,
            'nivel': getattr(log, 'nivel', 'info'),
            'modulo': log.tipo_cambio,
            'accion': log.item_modificado,
            'descripcion': log.descripcion,
            'fecha_creacion': log.fecha_creacion.isoformat(),
            'usuario': log.usuario.get_full_name() if log.usuario else 'Sistema',
            'ip_address': log.ip_address,
            'datos_adicionales': {
                'valor_anterior': log.valor_anterior,
                'valor_nuevo': log.valor_nuevo,
                'tipo_cambio': log.tipo_cambio,
            }
        })
    
    context = {
        'logs': json.dumps(logs_json),
        'total_logs': total_logs,
        'logs_hoy': logs_hoy,
        'logs_errores': logs_errores,
        'logs_warnings': logs_warnings,
    }
    
    return render(request, 'configuracion/logs/list.html', context)


@login_required
@permission_required('configuracion.view_logconfiguracion', raise_exception=True)
def logs_api_view(request):
    """API para actualizar logs en tiempo real"""
    try:
        logs = LogConfiguracion.objects.select_related('usuario').order_by('-fecha_creacion')[:50]
        
        logs_json = []
        for log in logs:
            logs_json.append({
                'id': log.id,
                'nivel': getattr(log, 'nivel', 'info'),
                'modulo': log.tipo_cambio,
                'accion': log.item_modificado,
                'descripcion': log.descripcion,
                'fecha_creacion': log.fecha_creacion.isoformat(),
                'usuario': log.usuario.get_full_name() if log.usuario else 'Sistema',
                'ip_address': log.ip_address,
                'datos_adicionales': {
                    'valor_anterior': log.valor_anterior,
                    'valor_nuevo': log.valor_nuevo,
                    'tipo_cambio': log.tipo_cambio,
                }
            })
        
        return JsonResponse({
            'success': True,
            'logs': logs_json
        })
        
    except Exception as e:
        logger.error(f"Error al obtener logs: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Error interno del servidor'
        })


@csrf_exempt
@require_http_methods(["POST"])
@login_required
@permission_required('configuracion.delete_logconfiguracion', raise_exception=True)
def logs_clear_view(request):
    """Limpiar todos los logs del sistema"""
    try:
        count = LogConfiguracion.objects.count()
        LogConfiguracion.objects.all().delete()
        
        # Crear log de la limpieza
        LogConfiguracion.objects.create(
            tipo_cambio='sistema',
            item_modificado='logs',
            valor_anterior=str(count),
            valor_nuevo='0',
            descripcion=f'Logs limpiados: {count} registros eliminados',
            usuario=request.user,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return JsonResponse({
            'success': True,
            'message': f'{count} logs eliminados correctamente'
        })
        
    except Exception as e:
        logger.error(f"Error al limpiar logs: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Error interno del servidor'
        })


@csrf_exempt
@require_http_methods(["POST"])
@login_required
@permission_required('configuracion.view_logconfiguracion', raise_exception=True)
def logs_export_view(request):
    """Exportar logs filtrados a CSV"""
    try:
        from django.http import HttpResponse
        import csv
        
        # Obtener filtros del request
        data = json.loads(request.body) if request.body else {}
        level = data.get('level', 'all')
        module = data.get('module', '')
        date = data.get('date', '')
        search = data.get('search', '')
        
        # Aplicar filtros
        logs = LogConfiguracion.objects.select_related('usuario').all()
        
        if level != 'all':
            logs = logs.filter(nivel=level)
        
        if module:
            logs = logs.filter(tipo_cambio=module)
        
        if date:
            logs = logs.filter(fecha_creacion__date=date)
        
        if search:
            logs = logs.filter(
                models.Q(descripcion__icontains=search) |
                models.Q(item_modificado__icontains=search)
            )
        
        # Crear respuesta CSV
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="logs_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Fecha', 'Nivel', 'Módulo', 'Acción', 'Descripción', 'Usuario', 'IP', 'Valor Anterior', 'Valor Nuevo'])
        
        for log in logs.order_by('-fecha_creacion'):
            writer.writerow([
                log.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S'),
                getattr(log, 'nivel', 'info'),
                log.tipo_cambio,
                log.item_modificado,
                log.descripcion,
                log.usuario.get_full_name() if log.usuario else 'Sistema',
                log.ip_address or 'N/A',
                log.valor_anterior or 'N/A',
                log.valor_nuevo or 'N/A',
            ])
        
        return response
        
    except Exception as e:
        logger.error(f"Error al exportar logs: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Error interno del servidor'
        })


# ===========================================
# VIEWS DE PRUEBAS Y UTILIDADES
# ===========================================

@csrf_exempt
@require_http_methods(["POST"])
@login_required
@permission_required('configuracion.change_configuraciongeneral', raise_exception=True)
def test_email_view(request):
    """Probar configuración de email"""
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        config = ConfiguracionGeneral.get_config()
        
        # Configurar SMTP temporal si está configurado en el modelo
        if hasattr(config, 'smtp_servidor') and config.smtp_servidor:
            # Aquí se podría configurar dinámicamente el SMTP
            pass
        
        # Enviar email de prueba
        send_mail(
            subject='Prueba de Configuración de Email',
            message='Este es un email de prueba enviado desde el sistema de configuración.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[request.user.email],
            fail_silently=False,
        )
        
        # Log del evento
        LogConfiguracion.objects.create(
            tipo_cambio='sistema',
            item_modificado='email_test',
            valor_anterior='',
            valor_nuevo=request.user.email,
            descripcion=f'Email de prueba enviado a {request.user.email}',
            usuario=request.user,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Email de prueba enviado correctamente'
        })
        
    except Exception as e:
        logger.error(f"Error al enviar email de prueba: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Error al enviar email: {str(e)}'
        })
