# locations/api_views.py
"""
API VIEWS DE UBICACIONES - APP LOCATIONS
=========================================

ViewSets REST para gestión de departamentos y municipios.
Compatible con React Frontend.
"""

from rest_framework import viewsets, filters, status
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from .models import Departamento, Municipio
from .serializers import (
    DepartamentoSerializer,
    MunicipioSerializer,
    DepartamentoSimpleSerializer,
    MunicipioSimpleSerializer
)
from core.mixins import MultiTenantViewSetMixin

import pandas as pd


class ImportLocationsExcelAPI(APIView):
    """Importa departamentos y municipios desde un archivo Excel.

    Espera un archivo subido en el campo 'excel' o 'archivo'.
    Columnas soportadas (flexible, detecta por nombre):
      - codigo_departamento (opcional)
      - nombre_departamento (obligatoria para crear depto)
      - codigo_municipio (opcional)
      - nombre_municipio (opcional)

    Crea departamentos primero y luego municipios ligados al departamento por nombre.
    Respeta la organización del usuario si existe.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        f = request.FILES.get('excel') or request.FILES.get('archivo')
        if not f:
            return Response({'error': 'No se encontró archivo. Usa el campo "excel".'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.read_excel(f)
        except Exception as e:
            return Response({'error': f'Archivo inválido: {e}'}, status=status.HTTP_400_BAD_REQUEST)

        # Normalizar nombres de columnas
        cols = {str(c).strip().lower(): c for c in df.columns}
        def get_col(*names):
            for n in names:
                if n in cols:
                    return cols[n]
            return None

        col_dep_nombre = get_col('nombre_departamento', 'departamento', 'depto', 'departamento_nombre')
        col_dep_codigo = get_col('codigo_departamento', 'cod_departamento', 'codigo_depto', 'depto_codigo')
        col_mun_nombre = get_col('nombre_municipio', 'municipio', 'municipio_nombre')
        col_mun_codigo = get_col('codigo_municipio', 'cod_municipio', 'municipio_codigo')

        if not col_dep_nombre and not col_mun_nombre:
            return Response({'error': 'El archivo debe contener al menos columnas de departamento o municipio.'}, status=status.HTTP_400_BAD_REQUEST)

        created_deptos = 0
        created_mpios = 0
        updated = 0
        skipped = 0
        errores = []

        # Helper to get organization filter
        org = getattr(request.user, 'organization', None)

        for idx, row in df.iterrows():
            try:
                dep_nombre = str(row[col_dep_nombre]).strip() if col_dep_nombre and not pd.isna(row[col_dep_nombre]) else None
                dep_codigo = str(row[col_dep_codigo]).strip() if col_dep_codigo and not pd.isna(row[col_dep_codigo]) else ''
                mun_nombre = str(row[col_mun_nombre]).strip() if col_mun_nombre and not pd.isna(row[col_mun_nombre]) else None
                mun_codigo = str(row[col_mun_codigo]).strip() if col_mun_codigo and not pd.isna(row[col_mun_codigo]) else ''

                dep_obj = None
                if dep_nombre:
                    qs = Departamento.objects.filter(nombre=dep_nombre)
                    if org:
                        qs = qs.filter(organizacion=org)
                    dep_obj = qs.first()
                    if not dep_obj:
                        dep_obj = Departamento.objects.create(
                            nombre=dep_nombre,
                            codigo=dep_codigo or None,
                            organizacion=org if org else None,
                        )
                        created_deptos += 1

                if mun_nombre and dep_obj:
                    qs_m = Municipio.objects.filter(nombre=mun_nombre, departamento=dep_obj)
                    if org:
                        qs_m = qs_m.filter(organizacion=org)
                    if qs_m.exists():
                        skipped += 1
                    else:
                        Municipio.objects.create(
                            nombre=mun_nombre,
                            codigo=mun_codigo or None,
                            departamento=dep_obj,
                            organizacion=org if org else None,
                        )
                        created_mpios += 1
                elif mun_nombre and not dep_obj:
                    errores.append(f'Fila {idx+2}: municipio "{mun_nombre}" sin departamento asociado')
                elif not dep_nombre and not mun_nombre:
                    skipped += 1

            except Exception as e:
                errores.append(f'Fila {idx+2}: {e}')

        return Response({
            'message': 'Importación completada',
            'created': created_deptos + created_mpios,
            'departamentos_creados': created_deptos,
            'municipios_creados': created_mpios,
            'updated': updated,
            'skipped': skipped,
            'errores': errores,
        })


class DepartamentoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de departamentos"""
    
    serializer_class = DepartamentoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['codigo', 'region']
    search_fields = ['nombre', 'codigo', 'capital']
    ordering_fields = ['nombre', 'codigo', 'created_at']
    ordering = ['nombre']
    
    def get_queryset(self):
        """Filtrar por organización del usuario"""
        queryset = Departamento.objects.annotate(
            municipios_count=Count('municipios')
        )
        
        # Filtrar por organización si el usuario tiene una
        if hasattr(self.request.user, 'organization') and self.request.user.organizacion:
            queryset = queryset.filter(
                Q(organizacion=self.request.user.organizacion) |
                Q(organizacion__isnull=True)  # Permitir departamentos sin organización (datos maestros)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        """Asignar organización al crear"""
        if hasattr(self.request.user, 'organization'):
            serializer.save(organizacion=self.request.user.organizacion)
        else:
            serializer.save()
    
    @action(detail=False, methods=['get'])
    def simple(self, request):
        """Lista simplificada de departamentos"""
        departamentos = self.get_queryset()
        serializer = DepartamentoSimpleSerializer(departamentos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def municipios(self, request, pk=None):
        """Obtener municipios de un departamento"""
        departamento = self.get_object()
        municipios = departamento.municipios.all().order_by('nombre')
        serializer = MunicipioSimpleSerializer(municipios, many=True)
        return Response(serializer.data)


class MunicipioViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de municipios"""
    
    serializer_class = MunicipioSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['departamento', 'codigo']
    search_fields = ['nombre', 'codigo', 'departamento__nombre']
    ordering_fields = ['nombre', 'departamento__nombre', 'created_at']
    ordering = ['departamento__nombre', 'nombre']
    
    def get_queryset(self):
        """Filtrar por organización del usuario"""
        queryset = Municipio.objects.select_related('departamento')
        
        # Filtrar por organización si el usuario tiene una
        if hasattr(self.request.user, 'organization') and self.request.user.organizacion:
            queryset = queryset.filter(
                Q(organizacion=self.request.user.organizacion) |
                Q(organizacion__isnull=True)  # Permitir municipios sin organización (datos maestros)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        """Asignar organización al crear"""
        if hasattr(self.request.user, 'organization'):
            serializer.save(organizacion=self.request.user.organizacion)
        else:
            serializer.save()
    
    @action(detail=False, methods=['get'])
    def simple(self, request):
        """Lista simplificada de municipios"""
        municipios = self.get_queryset()
        serializer = MunicipioSimpleSerializer(municipios, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def por_departamento(self, request):
        """Municipios filtrados por departamento"""
        departamento_id = request.query_params.get('departamento_id')
        if not departamento_id:
            return Response({'error': 'departamento_id es requerido'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        municipios = self.get_queryset().filter(departamento_id=departamento_id)
        serializer = MunicipioSimpleSerializer(municipios, many=True)
        return Response(serializer.data)
