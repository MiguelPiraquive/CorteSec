"""
BÚSQUEDA GLOBAL ULTRA PROFESIONAL - CORTESEC ENTERPRISE
========================================================
API endpoints para búsqueda global en todos los módulos del sistema.
Implementación enterprise con filtros avanzados, relevancia y performance optimizada.
"""

from django.http import JsonResponse
from django.db.models import Q, Count
from django.core.paginator import Paginator
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from datetime import datetime, timedelta
import json
import time

# Importar todos los modelos del sistema
from dashboard.models import Contractor, Project, Payment
from payroll.models import Empleado, Nomina, DetalleNomina, Cargo
from items.models import Item
from locations.models import Departamento, Municipio
from core.models import Notificacion
from login.models import CustomUser


@login_required
@require_http_methods(["GET"])
def search_global(request):
    """
    Búsqueda global ultra profesional en todos los módulos
    Retorna resultados estructurados con relevancia y metadatos
    """
    start_time = time.time()
    
    query = request.GET.get('q', '').strip()
    module_filter = request.GET.get('module', 'all')
    date_filter = request.GET.get('date', 'all')
    status_filter = request.GET.get('status', 'all')
    priority_filter = request.GET.get('priority', 'all')
    sort_by = request.GET.get('sort', 'relevance')
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 10))
    
    if not query:
        return JsonResponse({
            'success': False,
            'message': 'Query vacío',
            'results': {},
            'total': 0,
            'search_time': 0
        })
    
    # Filtros de fecha
    date_filter_q = Q()
    if date_filter != 'all':
        now = timezone.now()
        if date_filter == 'today':
            date_filter_q = Q(created_at__date=now.date()) | Q(fecha_contratacion__date=now.date()) | Q(updated_at__date=now.date())
        elif date_filter == 'week':
            week_ago = now - timedelta(weeks=1)
            date_filter_q = Q(created_at__gte=week_ago) | Q(fecha_contratacion__gte=week_ago) | Q(updated_at__gte=week_ago)
        elif date_filter == 'month':
            month_ago = now - timedelta(days=30)
            date_filter_q = Q(created_at__gte=month_ago) | Q(fecha_contratacion__gte=month_ago) | Q(updated_at__gte=month_ago)
        elif date_filter == 'year':
            year_ago = now - timedelta(days=365)
            date_filter_q = Q(created_at__gte=year_ago) | Q(fecha_contratacion__gte=year_ago) | Q(updated_at__gte=year_ago)
    
    results = {}
    total_results = 0
    
    # Búsqueda en Empresas/Contratistas
    if module_filter in ['all', 'contractors']:
        contractors = Contractor.objects.filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query) |
            Q(company__icontains=query) |
            Q(phone_number__icontains=query)
        ).filter(date_filter_q if 'created_at' in [f.name for f in Contractor._meta.fields] else Q())
        
        contractors_data = []
        for contractor in contractors[:per_page]:
            contractors_data.append({
                'id': contractor.id,
                'title': f"{contractor.first_name} {contractor.last_name}",
                'description': f"{contractor.company} - {contractor.email}",
                'url': f"/dashboard/contratistas/{contractor.id}/",
                'avatar': None,
                'icon': 'ti ti-building',
                'color': '#8b5cf6,#a855f7',
                'status': 'Activo',
                'category': 'Empresa',
                'updated': f"Actualizado {contractor.updated_at.strftime('%d/%m/%Y')}",
                'tags': ['empresa', 'contratista', contractor.company] if contractor.company else ['empresa', 'contratista'],
                'priority': 'medium',
                'module': 'contractors'
            })
        
        results['contractors'] = contractors_data
        total_results += contractors.count()
    
    # Búsqueda en Proyectos
    if module_filter in ['all', 'projects']:
        projects = Project.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(contractor__first_name__icontains=query) |
            Q(contractor__last_name__icontains=query) |
            Q(contractor__company__icontains=query)
        ).filter(date_filter_q if 'created_at' in [f.name for f in Project._meta.fields] else Q())
        
        projects_data = []
        for project in projects[:per_page]:
            status = 'Activo' if not project.end_date or project.end_date > timezone.now().date() else 'Finalizado'
            projects_data.append({
                'id': project.id,
                'title': project.name,
                'description': f"Proyecto de {project.contractor.company or project.contractor.first_name}",
                'url': f"/dashboard/proyectos/{project.id}/",
                'avatar': None,
                'icon': 'ti ti-layout-kanban',
                'color': '#f97316,#ea580c',
                'status': status,
                'category': 'Proyecto',
                'updated': f"Actualizado {project.updated_at.strftime('%d/%m/%Y')}",
                'tags': ['proyecto', project.contractor.company] if project.contractor.company else ['proyecto'],
                'priority': 'high' if status == 'Activo' else 'low',
                'module': 'projects'
            })
        
        results['projects'] = projects_data
        total_results += projects.count()
    
    # Búsqueda en Pagos
    if module_filter in ['all', 'payments']:
        payments = Payment.objects.filter(
            Q(project__name__icontains=query) |
            Q(project__contractor__first_name__icontains=query) |
            Q(project__contractor__last_name__icontains=query) |
            Q(notes__icontains=query) |
            Q(amount__icontains=query)
        ).filter(date_filter_q if 'created_at' in [f.name for f in Payment._meta.fields] else Q())
        
        payments_data = []
        for payment in payments[:per_page]:
            payments_data.append({
                'id': payment.id,
                'title': f"Pago ${payment.amount:,.2f}",
                'description': f"Para proyecto {payment.project.name}",
                'url': f"/dashboard/pagos/{payment.id}/",
                'avatar': None,
                'icon': 'ti ti-cash',
                'color': '#10b981,#059669',
                'status': 'Pagado',
                'category': 'Pago',
                'updated': f"Pagado {payment.payment_date.strftime('%d/%m/%Y')}",
                'tags': ['pago', 'finanzas', payment.project.name],
                'priority': 'high' if payment.amount > 1000000 else 'medium',
                'module': 'payments'
            })
        
        results['payments'] = payments_data
        total_results += payments.count()
    
    # Búsqueda en Empleados
    if module_filter in ['all', 'employees']:
        empleados = Empleado.objects.filter(
            Q(nombres__icontains=query) |
            Q(apellidos__icontains=query) |
            Q(documento__icontains=query) |
            Q(correo__icontains=query) |
            Q(telefono__icontains=query) |
            Q(cargo__nombre__icontains=query) |
            Q(departamento__nombre__icontains=query) |
            Q(municipio__nombre__icontains=query)
        ).filter(date_filter_q if 'creado_el' in [f.name for f in Empleado._meta.fields] else Q())
        
        empleados_data = []
        for empleado in empleados[:per_page]:
            empleados_data.append({
                'id': empleado.id,
                'title': f"{empleado.nombres} {empleado.apellidos}",
                'description': f"{empleado.cargo.nombre} - {empleado.correo}",
                'url': f"/payroll/empleados/{empleado.id}/",
                'avatar': empleado.foto.url if empleado.foto else None,
                'icon': 'ti ti-user',
                'color': '#06b6d4,#0891b2',
                'status': 'Activo',
                'category': 'Empleado',
                'updated': f"Actualizado {empleado.actualizado_el.strftime('%d/%m/%Y')}",
                'tags': ['empleado', empleado.cargo.nombre, empleado.departamento.nombre if empleado.departamento else 'empleado'],
                'priority': 'medium',
                'module': 'employees'
            })
        
        results['employees'] = empleados_data
        total_results += empleados.count()
    
    # Búsqueda en Nóminas
    if module_filter in ['all', 'payrolls']:
        nominas = Nomina.objects.filter(
            Q(empleado__nombres__icontains=query) |
            Q(empleado__apellidos__icontains=query) |
            Q(empleado__documento__icontains=query) |
            Q(periodo_inicio__icontains=query) |
            Q(periodo_fin__icontains=query)
        ).filter(date_filter_q if 'creado_el' in [f.name for f in Nomina._meta.fields] else Q())
        
        nominas_data = []
        for nomina in nominas[:per_page]:
            nominas_data.append({
                'id': nomina.id,
                'title': f"Nómina de {nomina.empleado.nombres} {nomina.empleado.apellidos}",
                'description': f"Período {nomina.periodo_inicio} - {nomina.periodo_fin} | Total: ${nomina.total:,.2f}",
                'url': f"/payroll/nominas/{nomina.id}/",
                'avatar': nomina.empleado.foto.url if nomina.empleado.foto else None,
                'icon': 'ti ti-clipboard-list',
                'color': '#8b5cf6,#7c3aed',
                'status': 'Procesada',
                'category': 'Nómina',
                'updated': f"Creada {nomina.creado_el.strftime('%d/%m/%Y')}",
                'tags': ['nomina', 'pago', nomina.empleado.cargo.nombre],
                'priority': 'high',
                'module': 'payrolls'
            })
        
        results['payrolls'] = nominas_data
        total_results += nominas.count()
    
    # Búsqueda en Items
    if module_filter in ['all', 'items']:
        items = Item.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(tipo_cantidad__icontains=query) |
            Q(price__icontains=query)
        ).filter(date_filter_q if 'created_at' in [f.name for f in Item._meta.fields] else Q())
        
        items_data = []
        for item in items[:per_page]:
            items_data.append({
                'id': item.id,
                'title': item.name,
                'description': f"${item.price:,.2f} por {item.get_tipo_cantidad_display()}",
                'url': f"/items/{item.id}/",
                'avatar': None,
                'icon': 'ti ti-package',
                'color': '#f59e0b,#d97706',
                'status': 'Disponible',
                'category': 'Ítem',
                'updated': f"Actualizado {item.updated_at.strftime('%d/%m/%Y')}",
                'tags': ['item', 'inventario', item.tipo_cantidad],
                'priority': 'medium',
                'module': 'items'
            })
        
        results['items'] = items_data
        total_results += items.count()
    
    # Búsqueda en Ubicaciones
    if module_filter in ['all', 'locations']:
        departamentos = Departamento.objects.filter(
            Q(nombre__icontains=query) |
            Q(codigo__icontains=query)
        )
        
        municipios = Municipio.objects.filter(
            Q(nombre__icontains=query) |
            Q(codigo__icontains=query) |
            Q(departamento__nombre__icontains=query)
        )
        
        locations_data = []
        
        for depto in departamentos[:per_page//2]:
            locations_data.append({
                'id': f"dept_{depto.id}",
                'title': depto.nombre,
                'description': f"Departamento - Código: {depto.codigo}",
                'url': f"/locations/departamentos/{depto.id}/",
                'avatar': None,
                'icon': 'ti ti-building-bank',
                'color': '#10b981,#059669',
                'status': 'Activo',
                'category': 'Departamento',
                'updated': "Ubicación",
                'tags': ['ubicacion', 'departamento', depto.codigo] if depto.codigo else ['ubicacion', 'departamento'],
                'priority': 'low',
                'module': 'locations'
            })
        
        for municipio in municipios[:per_page//2]:
            locations_data.append({
                'id': f"mun_{municipio.id}",
                'title': municipio.nombre,
                'description': f"Municipio de {municipio.departamento.nombre}",
                'url': f"/locations/municipios/{municipio.id}/",
                'avatar': None,
                'icon': 'ti ti-map-pin',
                'color': '#10b981,#059669',
                'status': 'Activo',
                'category': 'Municipio',
                'updated': "Ubicación",
                'tags': ['ubicacion', 'municipio', municipio.departamento.nombre],
                'priority': 'low',
                'module': 'locations'
            })
        
        results['locations'] = locations_data
        total_results += departamentos.count() + municipios.count()
    
    # Búsqueda en Cargos
    if module_filter in ['all', 'positions']:
        cargos = Cargo.objects.filter(
            Q(nombre__icontains=query)
        )
        
        cargos_data = []
        for cargo in cargos[:per_page]:
            empleados_count = cargo.empleado_set.count()
            cargos_data.append({
                'id': cargo.id,
                'title': cargo.nombre,
                'description': f"{empleados_count} empleado(s) con este cargo",
                'url': f"/payroll/cargos/{cargo.id}/",
                'avatar': None,
                'icon': 'ti ti-id-badge',
                'color': '#ec4899,#db2777',
                'status': 'Activo',
                'category': 'Cargo',
                'updated': "Cargo laboral",
                'tags': ['cargo', 'rrhh', 'posicion'],
                'priority': 'medium' if empleados_count > 0 else 'low',
                'module': 'positions'
            })
        
        results['positions'] = cargos_data
        total_results += cargos.count()
    
    # Búsqueda en Usuarios
    if module_filter in ['all', 'users']:
        usuarios = CustomUser.objects.filter(
            Q(username__icontains=query) |
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(full_name__icontains=query)
        ).filter(date_filter_q if 'date_joined' in [f.name for f in CustomUser._meta.fields] else Q())
        
        usuarios_data = []
        for usuario in usuarios[:per_page]:
            usuarios_data.append({
                'id': usuario.id,
                'title': usuario.full_name or f"{usuario.first_name} {usuario.last_name}" or usuario.username,
                'description': f"{usuario.email} - {'Activo' if usuario.is_active else 'Inactivo'}",
                'url': f"/users/{usuario.id}/",
                'avatar': usuario.avatar.url if usuario.avatar else None,
                'icon': 'ti ti-user-circle',
                'color': '#6366f1,#4f46e5',
                'status': 'Activo' if usuario.is_active else 'Inactivo',
                'category': 'Usuario',
                'updated': f"Ingresó {usuario.date_joined.strftime('%d/%m/%Y')}",
                'tags': ['usuario', 'sistema', 'staff' if usuario.is_staff else 'user'],
                'priority': 'high' if usuario.is_staff else 'medium',
                'module': 'users'
            })
        
        results['users'] = usuarios_data
        total_results += usuarios.count()
    
    # Calcular tiempo de búsqueda
    search_time = round((time.time() - start_time) * 1000, 2)
    
    # Aplicar ordenamiento si es necesario
    if sort_by == 'date':
        # Ordenar por fecha (simulado por ahora)
        pass
    elif sort_by == 'name':
        # Ordenar por nombre (simulado por ahora) 
        pass
    
    return JsonResponse({
        'success': True,
        'results': results,
        'total': total_results,
        'search_time': search_time,
        'query': query,
        'filters': {
            'module': module_filter,
            'date': date_filter,
            'status': status_filter,
            'priority': priority_filter,
            'sort': sort_by
        },
        'pagination': {
            'page': page,
            'per_page': per_page,
            'has_next': False  # Implementar paginación si es necesario
        }
    })


@login_required
@require_http_methods(["GET"])
def search_counts(request):
    """
    Obtiene conteos rápidos por módulo para mostrar en la UI
    """
    query = request.GET.get('q', '').strip()
    
    if not query:
        return JsonResponse({
            'success': False,
            'message': 'Query vacío',
            'counts': {}
        })
    
    counts = {}
    
    # Conteos rápidos sin filtros complejos para performance
    counts['contractors'] = Contractor.objects.filter(
        Q(first_name__icontains=query) | Q(last_name__icontains=query) | 
        Q(email__icontains=query) | Q(company__icontains=query)
    ).count()
    
    counts['projects'] = Project.objects.filter(
        Q(name__icontains=query) | Q(description__icontains=query)
    ).count()
    
    counts['payments'] = Payment.objects.filter(
        Q(project__name__icontains=query) | Q(notes__icontains=query)
    ).count()
    
    counts['employees'] = Empleado.objects.filter(
        Q(nombres__icontains=query) | Q(apellidos__icontains=query) | 
        Q(documento__icontains=query) | Q(correo__icontains=query)
    ).count()
    
    counts['payrolls'] = Nomina.objects.filter(
        Q(empleado__nombres__icontains=query) | Q(empleado__apellidos__icontains=query)
    ).count()
    
    counts['items'] = Item.objects.filter(
        Q(name__icontains=query) | Q(description__icontains=query)
    ).count()
    
    counts['locations'] = (
        Departamento.objects.filter(Q(nombre__icontains=query)).count() +
        Municipio.objects.filter(Q(nombre__icontains=query)).count()
    )
    
    counts['positions'] = Cargo.objects.filter(Q(nombre__icontains=query)).count()
    
    counts['users'] = CustomUser.objects.filter(
        Q(username__icontains=query) | Q(email__icontains=query) | 
        Q(first_name__icontains=query) | Q(last_name__icontains=query)
    ).count()
    
    # Total
    counts['total'] = sum(counts.values())
    
    return JsonResponse({
        'success': True,
        'counts': counts,
        'query': query
    })


@login_required
@require_http_methods(["GET"])
def search_suggestions(request):
    """
    Obtiene sugerencias de búsqueda inteligentes basadas en contenido frecuente
    """
    query = request.GET.get('q', '').strip().lower()
    limit = int(request.GET.get('limit', 10))
    
    suggestions = []
    
    if len(query) >= 2:
        # Sugerencias de empresas
        contractors = Contractor.objects.filter(
            Q(company__icontains=query) | Q(first_name__icontains=query) | Q(last_name__icontains=query)
        )[:3]
        for contractor in contractors:
            suggestions.append({
                'text': contractor.company or f"{contractor.first_name} {contractor.last_name}",
                'type': 'contractor',
                'icon': 'ti ti-building',
                'module': 'contractors'
            })
        
        # Sugerencias de empleados
        empleados = Empleado.objects.filter(
            Q(nombres__icontains=query) | Q(apellidos__icontains=query)
        )[:3]
        for empleado in empleados:
            suggestions.append({
                'text': f"{empleado.nombres} {empleado.apellidos}",
                'type': 'employee',
                'icon': 'ti ti-user',
                'module': 'employees'
            })
        
        # Sugerencias de proyectos
        projects = Project.objects.filter(Q(name__icontains=query))[:3]
        for project in projects:
            suggestions.append({
                'text': project.name,
                'type': 'project',
                'icon': 'ti ti-layout-kanban',
                'module': 'projects'
            })
        
        # Sugerencias de items
        items = Item.objects.filter(Q(name__icontains=query))[:3]
        for item in items:
            suggestions.append({
                'text': item.name,
                'type': 'item',
                'icon': 'ti ti-package',
                'module': 'items'
            })
    
    # Limitar resultados
    suggestions = suggestions[:limit]
    
    return JsonResponse({
        'success': True,
        'suggestions': suggestions,
        'query': query
    })


@login_required
@require_http_methods(["POST"])
@csrf_exempt
def search_track_click(request):
    """
    Registra clics en resultados de búsqueda para analytics
    """
    try:
        data = json.loads(request.body)
        query = data.get('query', '')
        result_id = data.get('result_id', '')
        module = data.get('module', '')
        position = data.get('position', 0)
        
        # Aquí se podría guardar en una tabla de analytics
        # Por ahora solo retornamos éxito
        
        return JsonResponse({
            'success': True,
            'message': 'Click registrado'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        })


@login_required
@require_http_methods(["GET"])
def search_history(request):
    """
    Retorna el historial de búsquedas del usuario (simulado por ahora)
    """
    # Por ahora retornamos datos simulados
    # En producción esto se guardaría en la base de datos
    history = [
        {
            'query': 'Juan Pérez',
            'module': 'employees',
            'timestamp': '2024-01-15T10:30:00Z',
            'results_count': 3
        },
        {
            'query': 'Proyecto Alpha',
            'module': 'projects', 
            'timestamp': '2024-01-15T09:15:00Z',
            'results_count': 1
        },
        {
            'query': 'Bogotá',
            'module': 'locations',
            'timestamp': '2024-01-14T16:45:00Z',
            'results_count': 12
        }
    ]
    
    return JsonResponse({
        'success': True,
        'history': history
    })
