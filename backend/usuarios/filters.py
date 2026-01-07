"""
Filtros de Usuarios - CorteSec
Filtros avanzados para búsqueda y filtrado de usuarios
"""

from django_filters import rest_framework as filters
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()


class UserFilter(filters.FilterSet):
    """Filtro completo para usuarios"""
    
    # Búsqueda general
    search = filters.CharFilter(method='filter_search', label='Búsqueda general')
    
    # Filtros de estado
    is_active = filters.BooleanFilter(field_name='is_active', label='Usuario activo')
    is_staff = filters.BooleanFilter(field_name='is_staff', label='Es staff')
    email_verified = filters.BooleanFilter(field_name='email_verified', label='Email verificado')
    
    # Filtros de fecha
    fecha_registro_desde = filters.DateFilter(field_name='date_joined', lookup_expr='gte', label='Registrado desde')
    fecha_registro_hasta = filters.DateFilter(field_name='date_joined', lookup_expr='lte', label='Registrado hasta')
    
    # Filtros de texto
    email = filters.CharFilter(lookup_expr='icontains', label='Email')
    username = filters.CharFilter(lookup_expr='icontains', label='Usuario')
    full_name = filters.CharFilter(lookup_expr='icontains', label='Nombre completo')
    first_name = filters.CharFilter(lookup_expr='icontains', label='Nombre')
    last_name = filters.CharFilter(lookup_expr='icontains', label='Apellido')
    
    # Ordenamiento
    ordering = filters.OrderingFilter(
        fields=(
            ('date_joined', 'date_joined'),
            ('username', 'username'),
            ('first_name', 'first_name'),
            ('last_name', 'last_name'),
            ('email', 'email'),
            ('last_login', 'last_login'),
        ),
        field_labels={
            'date_joined': 'Fecha de registro',
            'username': 'Usuario',
            'first_name': 'Nombre',
            'last_name': 'Apellido',
            'email': 'Email',
            'last_login': 'Último acceso',
        }
    )
    
    class Meta:
        model = User
        fields = [
            'search', 'is_active', 'is_staff', 'email_verified',
            'fecha_registro_desde', 'fecha_registro_hasta',
            'email', 'username', 'full_name', 'first_name', 'last_name'
        ]
    
    def filter_search(self, queryset, name, value):
        """
        Búsqueda general en múltiples campos
        Busca en: username, nombre, apellido, email, full_name
        """
        if not value:
            return queryset
        
        return queryset.filter(
            Q(username__icontains=value) |
            Q(first_name__icontains=value) |
            Q(last_name__icontains=value) |
            Q(full_name__icontains=value) |
            Q(email__icontains=value)
        ).distinct()
