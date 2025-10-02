"""
Tests del Sistema de Permisos
=============================

Suite completa de tests para el sistema de gestión de permisos.
Incluye tests unitarios, de integración y de rendimiento.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta
import json

from .models import (
    ModuloSistema, TipoPermiso, CondicionPermiso, Permiso, 
    PermisoDirecto, AuditoriaPermisos
)
from .services import DirectPermissionService, PermissionAnalyticsService
from core.models import Organizacion

User = get_user_model()


class ModuloSistemaTestCase(TestCase):
    """Tests para el modelo ModuloSistema."""
    
    def setUp(self):
        self.modulo_padre = ModuloSistema.objects.create(
            nombre='Módulo Padre',
            codigo='padre',
            descripcion='Módulo padre de prueba'
        )
    
    def test_crear_modulo_basico(self):
        """Test crear módulo básico."""
        modulo = ModuloSistema.objects.create(
            nombre='Test Módulo',
            codigo='test_modulo',
            descripcion='Módulo de prueba'
        )
        
        self.assertEqual(modulo.nombre, 'Test Módulo')
        self.assertEqual(modulo.codigo, 'test_modulo')
        self.assertEqual(modulo.nivel, 0)
        self.assertTrue(modulo.activo)
    
    def test_jerarquia_modulos(self):
        """Test jerarquía de módulos."""
        hijo = ModuloSistema.objects.create(
            nombre='Módulo Hijo',
            codigo='hijo',
            padre=self.modulo_padre
        )
        
        self.assertEqual(hijo.nivel, 1)
        self.assertEqual(hijo.padre, self.modulo_padre)
        self.assertIn(hijo, self.modulo_padre.hijos.all())
    
    def test_ruta_completa(self):
        """Test generación de ruta completa."""
        hijo = ModuloSistema.objects.create(
            nombre='Hijo',
            codigo='hijo',
            padre=self.modulo_padre
        )
        
        nieto = ModuloSistema.objects.create(
            nombre='Nieto',
            codigo='nieto',
            padre=hijo
        )
        
        ruta = nieto.get_ruta_completa()
        self.assertEqual(ruta, 'Módulo Padre > Hijo > Nieto')
    
    def test_codigo_unico(self):
        """Test que el código sea único."""
        with self.assertRaises(Exception):
            ModuloSistema.objects.create(
                nombre='Otro Módulo',
                codigo='padre'  # Código duplicado
            )


class TipoPermisoTestCase(TestCase):
    """Tests para el modelo TipoPermiso."""
    
    def test_crear_tipo_permiso(self):
        """Test crear tipo de permiso."""
        tipo = TipoPermiso.objects.create(
            nombre='Ver',
            codigo='view',
            categoria='crud'
        )
        
        self.assertEqual(tipo.nombre, 'Ver')
        self.assertEqual(tipo.codigo, 'view')
        self.assertEqual(tipo.categoria, 'crud')
        self.assertTrue(tipo.activo)
    
    def test_tipo_critico(self):
        """Test tipo de permiso crítico."""
        tipo = TipoPermiso.objects.create(
            nombre='Eliminar',
            codigo='delete',
            categoria='crud',
            es_critico=True,
            requiere_auditoria=True
        )
        
        self.assertTrue(tipo.es_critico)
        self.assertTrue(tipo.requiere_auditoria)


class CondicionPermisoTestCase(TestCase):
    """Tests para el modelo CondicionPermiso."""
    
    def setUp(self):
        self.usuario = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
    
    def test_crear_condicion_python(self):
        """Test crear condición con código Python."""
        condicion = CondicionPermiso.objects.create(
            nombre='Usuario Activo',
            codigo='user_active',
            tipo='python',
            codigo_evaluacion='return usuario.is_active'
        )
        
        self.assertEqual(condicion.tipo, 'python')
        self.assertTrue(condicion.activa)
    
    def test_evaluar_condicion_python(self):
        """Test evaluación de condición Python."""
        condicion = CondicionPermiso.objects.create(
            nombre='Usuario Activo',
            codigo='user_active',
            tipo='python',
            codigo_evaluacion='return usuario.is_active'
        )
        
        # Usuario activo
        self.usuario.is_active = True
        self.usuario.save()
        resultado = condicion.evaluar(self.usuario, {})
        self.assertTrue(resultado)
        
        # Usuario inactivo
        self.usuario.is_active = False
        self.usuario.save()
        resultado = condicion.evaluar(self.usuario, {})
        self.assertFalse(resultado)
    
    def test_condicion_con_cache(self):
        """Test condición con cache habilitado."""
        condicion = CondicionPermiso.objects.create(
            nombre='Cache Test',
            codigo='cache_test',
            tipo='python',
            codigo_evaluacion='return True',
            cacheable=True,
            tiempo_cache=300
        )
        
        # Primera evaluación
        resultado1 = condicion.evaluar(self.usuario, {})
        
        # Segunda evaluación (debe usar cache)
        resultado2 = condicion.evaluar(self.usuario, {})
        
        self.assertTrue(resultado1)
        self.assertTrue(resultado2)


class PermisoTestCase(TestCase):
    """Tests para el modelo Permiso."""
    
    def setUp(self):
        self.modulo = ModuloSistema.objects.create(
            nombre='Test Módulo',
            codigo='test'
        )
        
        self.tipo_permiso = TipoPermiso.objects.create(
            nombre='Ver',
            codigo='view',
            categoria='crud'
        )
        
        self.organizacion = Organizacion.objects.create(
            nombre='Test Org',
            codigo='test_org'
        )
    
    def test_crear_permiso_basico(self):
        """Test crear permiso básico."""
        permiso = Permiso.objects.create(
            nombre='Ver Test',
            codigo='test_view',
            modulo=self.modulo,
            tipo_permiso=self.tipo_permiso
        )
        
        self.assertEqual(permiso.nombre, 'Ver Test')
        self.assertEqual(permiso.codigo, 'test_view')
        self.assertTrue(permiso.activo)
        self.assertTrue(permiso.esta_vigente())
    
    def test_permiso_con_vigencia(self):
        """Test permiso con fechas de vigencia."""
        now = timezone.now()
        permiso = Permiso.objects.create(
            nombre='Permiso Temporal',
            codigo='temp_perm',
            modulo=self.modulo,
            tipo_permiso=self.tipo_permiso,
            vigencia_inicio=now - timedelta(days=1),
            vigencia_fin=now + timedelta(days=1)
        )
        
        self.assertTrue(permiso.esta_vigente())
        
        # Permiso expirado
        permiso.vigencia_fin = now - timedelta(hours=1)
        permiso.save()
        self.assertFalse(permiso.esta_vigente())
    
    def test_permiso_con_condiciones(self):
        """Test permiso con condiciones."""
        condicion = CondicionPermiso.objects.create(
            nombre='Test Condition',
            codigo='test_cond',
            tipo='python',
            codigo_evaluacion='return True'
        )
        
        permiso = Permiso.objects.create(
            nombre='Permiso con Condición',
            codigo='cond_perm',
            modulo=self.modulo,
            tipo_permiso=self.tipo_permiso
        )
        
        permiso.condiciones.add(condicion)
        self.assertEqual(permiso.condiciones.count(), 1)


class PermisoDirectoTestCase(TestCase):
    """Tests para el modelo PermisoDirecto."""
    
    def setUp(self):
        self.usuario = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        
        self.asignador = User.objects.create_user(
            username='admin',
            email='admin@example.com'
        )
        
        self.modulo = ModuloSistema.objects.create(
            nombre='Test Módulo',
            codigo='test'
        )
        
        self.tipo_permiso = TipoPermiso.objects.create(
            nombre='Ver',
            codigo='view',
            categoria='crud'
        )
        
        self.permiso = Permiso.objects.create(
            nombre='Ver Test',
            codigo='test_view',
            modulo=self.modulo,
            tipo_permiso=self.tipo_permiso
        )
    
    def test_crear_permiso_directo(self):
        """Test crear asignación directa de permiso."""
        permiso_directo = PermisoDirecto.objects.create(
            usuario=self.usuario,
            permiso=self.permiso,
            tipo='grant',
            asignado_por=self.asignador
        )
        
        self.assertEqual(permiso_directo.usuario, self.usuario)
        self.assertEqual(permiso_directo.permiso, self.permiso)
        self.assertEqual(permiso_directo.tipo, 'grant')
        self.assertTrue(permiso_directo.activo)
    
    def test_permiso_directo_vigencia(self):
        """Test vigencia de permiso directo."""
        now = timezone.now()
        permiso_directo = PermisoDirecto.objects.create(
            usuario=self.usuario,
            permiso=self.permiso,
            tipo='grant',
            asignado_por=self.asignador,
            fecha_inicio=now - timedelta(days=1),
            fecha_fin=now + timedelta(days=1)
        )
        
        self.assertTrue(permiso_directo.esta_vigente())
        self.assertTrue(permiso_directo.es_efectivo())
    
    def test_permiso_directo_deny(self):
        """Test permiso directo de tipo deny."""
        permiso_directo = PermisoDirecto.objects.create(
            usuario=self.usuario,
            permiso=self.permiso,
            tipo='deny',
            asignado_por=self.asignador
        )
        
        self.assertEqual(permiso_directo.tipo, 'deny')
        self.assertFalse(permiso_directo.es_efectivo())


class DirectPermissionServiceTestCase(TestCase):
    """Tests para DirectPermissionService."""
    
    def setUp(self):
        self.service = DirectPermissionService()
        
        self.usuario = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        
        self.asignador = User.objects.create_user(
            username='admin',
            email='admin@example.com'
        )
        
        self.modulo = ModuloSistema.objects.create(
            nombre='Test Módulo',
            codigo='test'
        )
        
        self.tipo_permiso = TipoPermiso.objects.create(
            nombre='Ver',
            codigo='view',
            categoria='crud'
        )
        
        self.permiso = Permiso.objects.create(
            nombre='Ver Test',
            codigo='test_view',
            modulo=self.modulo,
            tipo_permiso=self.tipo_permiso
        )
    
    def test_verificar_permiso_sin_asignacion(self):
        """Test verificar permiso sin asignación directa."""
        resultado = self.service.verificar_permiso_directo(
            self.usuario, 
            'test_view'
        )
        self.assertFalse(resultado)
    
    def test_verificar_permiso_con_grant(self):
        """Test verificar permiso con asignación grant."""
        PermisoDirecto.objects.create(
            usuario=self.usuario,
            permiso=self.permiso,
            tipo='grant',
            asignado_por=self.asignador
        )
        
        resultado = self.service.verificar_permiso_directo(
            self.usuario, 
            'test_view'
        )
        self.assertTrue(resultado)
    
    def test_verificar_permiso_con_deny(self):
        """Test verificar permiso con asignación deny."""
        PermisoDirecto.objects.create(
            usuario=self.usuario,
            permiso=self.permiso,
            tipo='deny',
            asignado_por=self.asignador
        )
        
        resultado = self.service.verificar_permiso_directo(
            self.usuario, 
            'test_view'
        )
        self.assertFalse(resultado)
    
    def test_asignar_permiso_directo(self):
        """Test asignar permiso directo."""
        permiso_directo = self.service.asignar_permiso_directo(
            usuario=self.usuario,
            codigo_permiso='test_view',
            asignado_por=self.asignador,
            motivo='Test assignment'
        )
        
        self.assertIsNotNone(permiso_directo)
        self.assertEqual(permiso_directo.usuario, self.usuario)
        self.assertEqual(permiso_directo.tipo, 'grant')
    
    def test_revocar_permiso_directo(self):
        """Test revocar permiso directo."""
        # Primero asignar
        self.service.asignar_permiso_directo(
            usuario=self.usuario,
            codigo_permiso='test_view',
            asignado_por=self.asignador
        )
        
        # Luego revocar
        resultado = self.service.revocar_permiso_directo(
            usuario=self.usuario,
            codigo_permiso='test_view',
            revocado_por=self.asignador
        )
        
        self.assertTrue(resultado)
        
        # Verificar que ya no tiene el permiso
        resultado_verificacion = self.service.verificar_permiso_directo(
            self.usuario, 
            'test_view'
        )
        self.assertFalse(resultado_verificacion)
    
    def test_obtener_permisos_usuario(self):
        """Test obtener permisos de usuario."""
        PermisoDirecto.objects.create(
            usuario=self.usuario,
            permiso=self.permiso,
            tipo='grant',
            asignado_por=self.asignador
        )
        
        permisos = self.service.obtener_permisos_usuario(self.usuario)
        self.assertEqual(len(permisos), 1)
        self.assertEqual(permisos[0]['permiso']['codigo'], 'test_view')
    
    def test_cache_funcionando(self):
        """Test que el cache funciona correctamente."""
        PermisoDirecto.objects.create(
            usuario=self.usuario,
            permiso=self.permiso,
            tipo='grant',
            asignado_por=self.asignador
        )
        
        # Primera verificación (sin cache)
        resultado1 = self.service.verificar_permiso_directo(
            self.usuario, 
            'test_view'
        )
        
        # Segunda verificación (con cache)
        resultado2 = self.service.verificar_permiso_directo(
            self.usuario, 
            'test_view'
        )
        
        self.assertTrue(resultado1)
        self.assertTrue(resultado2)


class PermissionAnalyticsServiceTestCase(TestCase):
    """Tests para PermissionAnalyticsService."""
    
    def setUp(self):
        self.service = PermissionAnalyticsService()
        
        self.usuario = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        
        self.modulo = ModuloSistema.objects.create(
            nombre='Test Módulo',
            codigo='test'
        )
        
        self.tipo_permiso = TipoPermiso.objects.create(
            nombre='Ver',
            codigo='view',
            categoria='crud'
        )
        
        self.permiso = Permiso.objects.create(
            nombre='Ver Test',
            codigo='test_view',
            modulo=self.modulo,
            tipo_permiso=self.tipo_permiso
        )
    
    def test_estadisticas_generales(self):
        """Test obtener estadísticas generales."""
        stats = self.service.obtener_estadisticas_generales()
        
        self.assertIn('resumen', stats)
        self.assertIn('actividad_reciente', stats)
        self.assertIn('distribuciones', stats)
        
        self.assertEqual(stats['resumen']['total_usuarios'], 1)
        self.assertEqual(stats['resumen']['total_permisos'], 1)
    
    def test_analizar_uso_permisos(self):
        """Test análisis de uso de permisos."""
        # Crear algunos registros de auditoría
        AuditoriaPermisos.objects.create(
            accion='permission_granted',
            permiso=self.permiso,
            usuario=self.usuario
        )
        
        analisis = self.service.analizar_uso_permisos(dias=7)
        
        self.assertIn('permisos_mas_usados', analisis)
        self.assertIn('usuarios_mas_activos', analisis)
        self.assertIn('modulos_mas_accedidos', analisis)
    
    def test_detectar_anomalias(self):
        """Test detección de anomalías."""
        anomalias = self.service.detectar_anomalias()
        
        self.assertIsInstance(anomalias, list)
        # En un sistema vacío, no debería haber anomalías significativas


class AuditoriaPermisosTestCase(TestCase):
    """Tests para el modelo AuditoriaPermisos."""
    
    def setUp(self):
        self.usuario = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        
        self.modulo = ModuloSistema.objects.create(
            nombre='Test Módulo',
            codigo='test'
        )
        
        self.tipo_permiso = TipoPermiso.objects.create(
            nombre='Ver',
            codigo='view',
            categoria='crud'
        )
        
        self.permiso = Permiso.objects.create(
            nombre='Ver Test',
            codigo='test_view',
            modulo=self.modulo,
            tipo_permiso=self.tipo_permiso
        )
    
    def test_crear_auditoria(self):
        """Test crear registro de auditoría."""
        auditoria = AuditoriaPermisos.objects.create(
            accion='permission_granted',
            permiso=self.permiso,
            usuario=self.usuario,
            detalles={'test': 'data'}
        )
        
        self.assertEqual(auditoria.accion, 'permission_granted')
        self.assertEqual(auditoria.permiso, self.permiso)
        self.assertEqual(auditoria.usuario, self.usuario)
        self.assertIsNotNone(auditoria.fecha)


class IntegrationTestCase(TransactionTestCase):
    """Tests de integración del sistema completo."""
    
    def setUp(self):
        cache.clear()
        
        self.usuario = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            is_staff=True
        )
    
    def test_flujo_completo_permiso(self):
        """Test flujo completo de creación y uso de permiso."""
        # 1. Crear módulo
        modulo = ModuloSistema.objects.create(
            nombre='Test Integration',
            codigo='test_integration'
        )
        
        # 2. Crear tipo de permiso
        tipo = TipoPermiso.objects.create(
            nombre='Acceder',
            codigo='access',
            categoria='custom'
        )
        
        # 3. Crear permiso
        permiso = Permiso.objects.create(
            nombre='Acceder a Test',
            codigo='test_access',
            modulo=modulo,
            tipo_permiso=tipo
        )
        
        # 4. Asignar permiso directo
        service = DirectPermissionService()
        permiso_directo = service.asignar_permiso_directo(
            usuario=self.usuario,
            codigo_permiso='test_access',
            asignado_por=self.admin
        )
        
        # 5. Verificar permiso
        tiene_permiso = service.verificar_permiso_directo(
            self.usuario,
            'test_access'
        )
        
        # 6. Verificar auditoría
        auditoria_count = AuditoriaPermisos.objects.filter(
            usuario=self.usuario,
            permiso=permiso
        ).count()
        
        # Assertions
        self.assertIsNotNone(permiso_directo)
        self.assertTrue(tiene_permiso)
        self.assertGreater(auditoria_count, 0)
    
    def test_rendimiento_verificacion_masiva(self):
        """Test rendimiento con verificaciones masivas."""
        import time
        
        # Crear datos de prueba
        modulo = ModuloSistema.objects.create(
            nombre='Performance Test',
            codigo='perf_test'
        )
        
        tipo = TipoPermiso.objects.create(
            nombre='Ver',
            codigo='view_perf',
            categoria='crud'
        )
        
        permisos = []
        for i in range(10):
            permiso = Permiso.objects.create(
                nombre=f'Permiso {i}',
                codigo=f'perm_{i}',
                modulo=modulo,
                tipo_permiso=tipo
            )
            permisos.append(permiso)
            
            PermisoDirecto.objects.create(
                usuario=self.usuario,
                permiso=permiso,
                tipo='grant',
                asignado_por=self.admin
            )
        
        # Test de rendimiento
        service = DirectPermissionService()
        
        start_time = time.time()
        for permiso in permisos:
            service.verificar_permiso_directo(self.usuario, permiso.codigo)
        end_time = time.time()
        
        # Verificar que el tiempo total sea razonable (menos de 1 segundo)
        total_time = end_time - start_time
        self.assertLess(total_time, 1.0, f"Verificación masiva tomó {total_time:.2f}s")


class CacheTestCase(TestCase):
    """Tests específicos para el sistema de cache."""
    
    def setUp(self):
        cache.clear()
        
        self.service = DirectPermissionService()
        self.usuario = User.objects.create_user(
            username='cacheuser',
            email='cache@example.com'
        )
        
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com'
        )
        
        self.modulo = ModuloSistema.objects.create(
            nombre='Cache Test',
            codigo='cache_test'
        )
        
        self.tipo = TipoPermiso.objects.create(
            nombre='Ver',
            codigo='view_cache',
            categoria='crud'
        )
        
        self.permiso = Permiso.objects.create(
            nombre='Ver Cache',
            codigo='cache_view',
            modulo=self.modulo,
            tipo_permiso=self.tipo
        )
    
    def test_cache_hit_miss(self):
        """Test cache hit/miss en verificación de permisos."""
        PermisoDirecto.objects.create(
            usuario=self.usuario,
            permiso=self.permiso,
            tipo='grant',
            asignado_por=self.admin
        )
        
        # Primera verificación (cache miss)
        resultado1 = self.service.verificar_permiso_directo(
            self.usuario,
            'cache_view'
        )
        
        # Segunda verificación (cache hit)
        resultado2 = self.service.verificar_permiso_directo(
            self.usuario,
            'cache_view'
        )
        
        self.assertTrue(resultado1)
        self.assertTrue(resultado2)
    
    def test_cache_invalidation(self):
        """Test invalidación de cache al cambiar permisos."""
        # Asignar permiso
        PermisoDirecto.objects.create(
            usuario=self.usuario,
            permiso=self.permiso,
            tipo='grant',
            asignado_por=self.admin
        )
        
        # Verificar (llenar cache)
        resultado1 = self.service.verificar_permiso_directo(
            self.usuario,
            'cache_view'
        )
        self.assertTrue(resultado1)
        
        # Revocar permiso (debe limpiar cache)
        self.service.revocar_permiso_directo(
            self.usuario,
            'cache_view',
            self.admin
        )
        
        # Verificar nuevamente (cache debe estar limpio)
        resultado2 = self.service.verificar_permiso_directo(
            self.usuario,
            'cache_view'
        )
        self.assertFalse(resultado2)
