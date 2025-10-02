"""
Tests para la app de roles
"""

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.exceptions import ValidationError
from roles.models import TipoRol, Rol, AsignacionRol, EstadoAsignacion
from roles.utils import validar_asignacion_rol, RoleValidator
from roles.forms import RolForm, AsignacionRolForm
import json

User = get_user_model()


class RolModelTest(TestCase):
    """Tests para el modelo Rol"""
    
    def setUp(self):
        self.tipo_rol = TipoRol.objects.create(
            nombre='Test',
            descripcion='Tipo de prueba'
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123'
        )

    def test_crear_rol_basico(self):
        """Test crear rol básico"""
        rol = Rol.objects.create(
            nombre='Rol Test',
            codigo='TEST_ROL',
            descripcion='Rol de prueba',
            tipo_rol=self.tipo_rol,
            creado_por=self.user
        )
        
        self.assertEqual(rol.nombre, 'Rol Test')
        self.assertEqual(rol.codigo, 'TEST_ROL')
        self.assertEqual(rol.nivel_jerarquico, 0)
        self.assertTrue(rol.activo)
        self.assertFalse(rol.es_sistema)

    def test_jerarquia_roles(self):
        """Test jerarquía de roles"""
        # Crear rol padre
        rol_padre = Rol.objects.create(
            nombre='Padre',
            codigo='PADRE',
            tipo_rol=self.tipo_rol,
            creado_por=self.user
        )
        
        # Crear rol hijo
        rol_hijo = Rol.objects.create(
            nombre='Hijo',
            codigo='HIJO',
            tipo_rol=self.tipo_rol,
            rol_padre=rol_padre,
            creado_por=self.user
        )
        
        self.assertEqual(rol_padre.nivel_jerarquico, 0)
        self.assertEqual(rol_hijo.nivel_jerarquico, 1)
        self.assertEqual(rol_hijo.rol_padre, rol_padre)

    def test_validacion_jerarquia_circular(self):
        """Test validación de jerarquía circular"""
        rol1 = Rol.objects.create(
            nombre='Rol 1',
            codigo='ROL1',
            tipo_rol=self.tipo_rol,
            creado_por=self.user
        )
        
        rol2 = Rol.objects.create(
            nombre='Rol 2',
            codigo='ROL2',
            tipo_rol=self.tipo_rol,
            rol_padre=rol1,
            creado_por=self.user
        )
        
        # Intentar hacer circular (rol1 -> rol2 -> rol1)
        errores = RoleValidator.validar_jerarquia_rol(rol1, rol2)
        self.assertTrue(len(errores) > 0)

    def test_rol_vigente(self):
        """Test vigencia de rol"""
        from datetime import date, timedelta
        
        # Rol vigente
        rol = Rol.objects.create(
            nombre='Rol Vigente',
            codigo='VIGENTE',
            tipo_rol=self.tipo_rol,
            fecha_inicio_vigencia=date.today() - timedelta(days=1),
            fecha_fin_vigencia=date.today() + timedelta(days=1),
            creado_por=self.user
        )
        
        self.assertTrue(rol.esta_vigente())
        
        # Rol no vigente (futuro)
        rol_futuro = Rol.objects.create(
            nombre='Rol Futuro',
            codigo='FUTURO',
            tipo_rol=self.tipo_rol,
            fecha_inicio_vigencia=date.today() + timedelta(days=1),
            creado_por=self.user
        )
        
        self.assertFalse(rol_futuro.esta_vigente())


class AsignacionRolModelTest(TestCase):
    """Tests para el modelo AsignacionRol"""
    
    def setUp(self):
        self.tipo_rol = TipoRol.objects.create(
            nombre='Test',
            descripcion='Tipo de prueba'
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123'
        )
        
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='adminpass123'
        )
        
        self.rol = Rol.objects.create(
            nombre='Rol Test',
            codigo='TEST_ROL',
            tipo_rol=self.tipo_rol,
            creado_por=self.admin_user
        )
        
        self.estado = EstadoAsignacion.objects.create(
            nombre='ACTIVA',
            descripcion='Asignación activa'
        )

    def test_crear_asignacion(self):
        """Test crear asignación de rol"""
        asignacion = AsignacionRol.objects.create(
            usuario=self.user,
            rol=self.rol,
            estado=self.estado,
            asignado_por=self.admin_user,
            justificacion='Asignación de prueba'
        )
        
        self.assertEqual(asignacion.usuario, self.user)
        self.assertEqual(asignacion.rol, self.rol)
        self.assertTrue(asignacion.activa)
        self.assertTrue(asignacion.esta_vigente())

    def test_validar_asignacion_duplicada(self):
        """Test validación de asignación duplicada"""
        # Crear primera asignación
        AsignacionRol.objects.create(
            usuario=self.user,
            rol=self.rol,
            estado=self.estado,
            asignado_por=self.admin_user
        )
        
        # Validar segunda asignación (debe fallar)
        errores = validar_asignacion_rol(self.user, self.rol)
        self.assertTrue(len(errores) > 0)


class RolFormTest(TestCase):
    """Tests para formularios de roles"""
    
    def setUp(self):
        self.tipo_rol = TipoRol.objects.create(
            nombre='Test',
            descripcion='Tipo de prueba'
        )

    def test_rol_form_valido(self):
        """Test formulario de rol válido"""
        form_data = {
            'nombre': 'Rol Test',
            'codigo': 'TEST_ROL',
            'descripcion': 'Descripción de prueba',
            'tipo_rol': self.tipo_rol.id,
            'activo': True
        }
        
        form = RolForm(data=form_data)
        self.assertTrue(form.is_valid())

    def test_rol_form_codigo_duplicado(self):
        """Test formulario con código duplicado"""
        # Crear rol existente
        Rol.objects.create(
            nombre='Rol Existente',
            codigo='EXISTENTE',
            tipo_rol=self.tipo_rol
        )
        
        # Intentar crear otro con mismo código
        form_data = {
            'nombre': 'Rol Nuevo',
            'codigo': 'EXISTENTE',
            'tipo_rol': self.tipo_rol.id,
            'activo': True
        }
        
        form = RolForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('codigo', form.errors)


class RolViewTest(TestCase):
    """Tests para vistas de roles"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123'
        )
        
        self.tipo_rol = TipoRol.objects.create(
            nombre='Test',
            descripcion='Tipo de prueba'
        )
        
        self.rol = Rol.objects.create(
            nombre='Rol Test',
            codigo='TEST_ROL',
            tipo_rol=self.tipo_rol,
            creado_por=self.user
        )

    def test_lista_roles_requerido_login(self):
        """Test que la lista de roles requiere login"""
        response = self.client.get(reverse('roles:lista'))
        self.assertEqual(response.status_code, 302)  # Redirect a login

    def test_lista_roles_logueado(self):
        """Test lista de roles para usuario logueado"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('roles:lista'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Rol Test')

    def test_crear_rol_get(self):
        """Test GET para crear rol"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('roles:crear'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'form')

    def test_crear_rol_post_valido(self):
        """Test POST válido para crear rol"""
        self.client.login(username='testuser', password='testpass123')
        
        form_data = {
            'nombre': 'Nuevo Rol',
            'codigo': 'NUEVO_ROL',
            'descripcion': 'Descripción del nuevo rol',
            'tipo_rol': self.tipo_rol.id,
            'activo': True
        }
        
        response = self.client.post(reverse('roles:crear'), form_data)
        
        # Debería redirigir después de crear
        self.assertEqual(response.status_code, 302)
        
        # Verificar que se creó el rol
        self.assertTrue(Rol.objects.filter(codigo='NUEVO_ROL').exists())

    def test_detalle_rol(self):
        """Test vista de detalle de rol"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('roles:detalle', args=[self.rol.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.rol.nombre)

    def test_api_roles(self):
        """Test API de roles"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('roles:api'))
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.content)
        self.assertIn('results', data)

    def test_dashboard_roles(self):
        """Test dashboard de roles"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('roles:dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'estadisticas')


class UtilsTest(TestCase):
    """Tests para utilidades de roles"""
    
    def setUp(self):
        self.tipo_rol = TipoRol.objects.create(
            nombre='Test',
            descripcion='Tipo de prueba'
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123'
        )
        
        self.rol = Rol.objects.create(
            nombre='Rol Test',
            codigo='TEST_ROL',
            tipo_rol=self.tipo_rol,
            creado_por=self.user
        )

    def test_validar_asignacion_rol_inactivo(self):
        """Test validación de asignación con rol inactivo"""
        self.rol.activo = False
        self.rol.save()
        
        errores = validar_asignacion_rol(self.user, self.rol)
        self.assertTrue(len(errores) > 0)
        self.assertIn('activo', str(errores))

    def test_role_validator_jerarquia(self):
        """Test validador de jerarquía"""
        rol_padre = Rol.objects.create(
            nombre='Padre',
            codigo='PADRE',
            tipo_rol=self.tipo_rol,
            creado_por=self.user
        )
        
        # Validar asignación válida
        errores = RoleValidator.validar_jerarquia_rol(self.rol, rol_padre)
        self.assertEqual(len(errores), 0)
        
        # Validar asignación inválida (rol como su propio padre)
        errores = RoleValidator.validar_jerarquia_rol(self.rol, self.rol)
        self.assertTrue(len(errores) > 0)


class IntegrationTest(TestCase):
    """Tests de integración"""
    
    def setUp(self):
        self.client = Client()
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='adminpass123',
            is_staff=True
        )
        
        self.regular_user = User.objects.create_user(
            username='user',
            email='user@test.com',
            password='userpass123'
        )
        
        # Inicializar datos básicos
        from roles.utils import inicializar_estados_asignacion, crear_tipos_rol_default
        inicializar_estados_asignacion()
        crear_tipos_rol_default()

    def test_flujo_completo_roles(self):
        """Test del flujo completo de roles"""
        self.client.login(username='admin', password='adminpass123')
        
        # 1. Crear tipo de rol
        tipo_rol = TipoRol.objects.create(
            nombre='Administrativo',
            descripcion='Roles administrativos'
        )
        
        # 2. Crear rol
        form_data = {
            'nombre': 'Administrador',
            'codigo': 'ADMIN',
            'descripcion': 'Administrador del sistema',
            'tipo_rol': tipo_rol.id,
            'activo': True,
            'prioridad': 90
        }
        
        response = self.client.post(reverse('roles:crear'), form_data)
        self.assertEqual(response.status_code, 302)
        
        rol = Rol.objects.get(codigo='ADMIN')
        self.assertEqual(rol.nombre, 'Administrador')
        
        # 3. Crear asignación
        estado_activa = EstadoAsignacion.objects.get(nombre='ACTIVA')
        
        asignacion = AsignacionRol.objects.create(
            usuario=self.regular_user,
            rol=rol,
            estado=estado_activa,
            asignado_por=self.admin_user,
            justificacion='Asignación de prueba'
        )
        
        self.assertTrue(asignacion.esta_vigente())
        
        # 4. Verificar estadísticas
        response = self.client.get(reverse('roles:dashboard'))
        self.assertEqual(response.status_code, 200)
        
        # 5. Verificar API
        response = self.client.get(reverse('roles:api'))
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.content)
        self.assertTrue(len(data['results']) > 0)

    def test_flujo_jerarquia(self):
        """Test del flujo de jerarquía de roles"""
        self.client.login(username='admin', password='adminpass123')
        
        tipo_rol = TipoRol.objects.get(nombre='Administrativo')
        
        # Crear roles con jerarquía
        rol_padre = Rol.objects.create(
            nombre='Director',
            codigo='DIRECTOR',
            tipo_rol=tipo_rol,
            creado_por=self.admin_user
        )
        
        rol_hijo = Rol.objects.create(
            nombre='Gerente',
            codigo='GERENTE',
            tipo_rol=tipo_rol,
            rol_padre=rol_padre,
            creado_por=self.admin_user
        )
        
        # Verificar jerarquía
        self.assertEqual(rol_padre.nivel_jerarquico, 0)
        self.assertEqual(rol_hijo.nivel_jerarquico, 1)
        
        # Test vista de jerarquía
        response = self.client.get(reverse('roles:jerarquia'))
        self.assertEqual(response.status_code, 200)
