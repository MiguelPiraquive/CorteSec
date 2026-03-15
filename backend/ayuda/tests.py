from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from core.models import Organizacion
from ayuda.models import CategoriaAyuda, ArticuloAyuda, SolicitudSoporte

User = get_user_model()


class CategoriaAyudaModelTest(TestCase):
    def test_categoria_creation(self):
        """Test de creación de categoría de ayuda"""
        categoria = CategoriaAyuda.objects.create(
            nombre='Configuración',
            descripcion='Ayuda sobre configuración del sistema',
            icono='fas fa-cog',
            orden=1,
            activa=True
        )
        self.assertEqual(categoria.nombre, 'Configuración')
        self.assertTrue(categoria.activa)

    def test_categoria_str_method(self):
        """Test del método __str__ de la categoría"""
        categoria = CategoriaAyuda.objects.create(
            nombre='Configuración',
            descripcion='Ayuda sobre configuración del sistema',
            activa=True
        )
        self.assertEqual(str(categoria), 'Configuración')


class ArticuloAyudaModelTest(TestCase):
    def setUp(self):
        self.organization = Organizacion.objects.create(
            nombre='Org Test Articulos',
            codigo='ORGART'
        )
        self.categoria = CategoriaAyuda.objects.create(
            nombre='Configuración',
            descripcion='Ayuda sobre configuración del sistema',
            activa=True,
            organization=self.organization
        )

    def test_articulo_creation(self):
        """Test de creación de artículo de ayuda"""
        articulo = ArticuloAyuda.objects.create(
            titulo='Cómo configurar usuarios',
            contenido='Contenido del artículo de ayuda',
            categoria=self.categoria,
            autor=User.objects.create_user(username='autor', email='autor@example.com'),
            orden=1,
            activo=True
        )
        self.assertEqual(articulo.titulo, 'Cómo configurar usuarios')
        self.assertEqual(articulo.categoria, self.categoria)

    def test_articulo_str_method(self):
        """Test del método __str__ del artículo"""
        articulo = ArticuloAyuda.objects.create(
            titulo='Cómo configurar usuarios',
            contenido='Contenido del artículo de ayuda',
            categoria=self.categoria,
            autor=User.objects.create_user(username='autor2', email='autor2@example.com'),
            activo=True
        )
        self.assertEqual(str(articulo), 'Cómo configurar usuarios')


class SolicitudSoporteModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_consulta_creation(self):
        """Test de creación de consulta de ayuda"""
        consulta = SolicitudSoporte.objects.create(
            usuario=self.user,
            asunto='Problema con login',
            descripcion='No puedo acceder al sistema',
            prioridad='media',
            estado='abierta'
        )
        self.assertEqual(consulta.asunto, 'Problema con login')
        self.assertEqual(consulta.usuario, self.user)
        self.assertEqual(consulta.estado, 'abierta')

    def test_consulta_str_method(self):
        """Test del método __str__ de la consulta"""
        consulta = SolicitudSoporte.objects.create(
            usuario=self.user,
            asunto='Problema con login',
            descripcion='No puedo acceder al sistema',
            prioridad='media',
            estado='abierta'
        )
        expected_str = f"{consulta.asunto} - {self.user.username}"
        self.assertEqual(str(consulta), expected_str)


class AyudaViewsTest(TestCase):
    def setUp(self):
        self.organization = Organizacion.objects.create(
            nombre='Org Test Ayuda',
            codigo='ORGAYUDA'
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            organization=self.organization
        )
        self.categoria = CategoriaAyuda.objects.create(
            nombre='Configuración',
            descripcion='Ayuda sobre configuración del sistema',
            activa=True,
            organization=self.organization
        )

    def test_ayuda_index_view(self):
        """Test de listado de categorías de ayuda (API)"""
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('ayuda_api:categorias-ayuda-list'),
            HTTP_X_TENANT_CODIGO=self.organization.codigo
        )
        self.assertEqual(response.status_code, 200)

    def test_ayuda_categoria_view(self):
        """Test de detalle de categoría (API)"""
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('ayuda_api:categorias-ayuda-detail', kwargs={'pk': self.categoria.id}),
            HTTP_X_TENANT_CODIGO=self.organization.codigo
        )
        self.assertEqual(response.status_code, 200)

    def test_consulta_ayuda_requires_login(self):
        """Test que crear solicitud requiere login"""
        response = self.client.get(
            reverse('ayuda_api:solicitudes-soporte-list'),
            HTTP_X_TENANT_CODIGO=self.organization.codigo
        )
        self.assertEqual(response.status_code, 401)

    def test_consulta_ayuda_with_login(self):
        """Test de crear solicitud con usuario logueado"""
        self.client.force_login(self.user)

        form_data = {
            'asunto': 'Problema test',
            'descripcion': 'Mensaje de prueba',
            'prioridad': 'media'
        }
        response = self.client.post(
            reverse('ayuda_api:solicitudes-soporte-list'),
            form_data,
            HTTP_X_TENANT_CODIGO=self.organization.codigo
        )
        self.assertIn(response.status_code, [200, 201])
