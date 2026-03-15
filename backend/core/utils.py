"""
Utilidades centralizadas del sistema CorteSec
==============================================
"""
import uuid


def get_active_project_for_request(request):
    """
    Obtiene el proyecto activo del usuario para filtrar datos.
    
    Prioridad:
    1. Query param ?proyecto=UUID (explicit override)
    2. ActiveProject model (mode='single' + project set)
    3. None (sin filtro = todos los proyectos)
    
    Valida que el proyecto pertenezca a la organización del usuario.
    """
    from dashboard.models import ActiveProject, Project

    proyecto_id = request.query_params.get('proyecto')
    if proyecto_id:
        try:
            uuid.UUID(str(proyecto_id))  # Validate UUID format
            project = Project.objects.get(pk=proyecto_id)
            # Validate org ownership
            user_org = getattr(request.user, 'organization', None)
            if user_org and hasattr(project, 'organization') and project.organization != user_org:
                return None
            return project
        except (Project.DoesNotExist, ValueError, AttributeError):
            return None

    try:
        ap = ActiveProject.objects.select_related('project').get(user=request.user)
        if ap.mode == 'single' and ap.project:
            return ap.project
    except ActiveProject.DoesNotExist:
        pass
    return None
