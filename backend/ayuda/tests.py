from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from ayuda.models import CategoriaAyuda, ArticuloAyuda, ConsultaAyuda


class CategoriaAyudaModelTest(TestCase):
    def test_categoria_creation(self):
        """Test de creación de categoría de ayuda"""
        categoria = CategoriaAyuda.objects.create(
            nombre='Configuración',
            descripcion='Ayuda sobre configuración del sistema',
            icono='fas fa-cog',
            orden=1,
            activo=True
        )
        self.assertEqual(categoria.nombre, 'Configuración')
        self.assertTrue(categoria.activo)

    def test_categoria_str_method(self):
        """Test del método __str__ de la categoría"""
        categoria = CategoriaAyuda.objects.create(
            nombre='Configuración',
            descripcion='Ayuda sobre configuración del sistema',
            activo=True
        )
        self.assertEqual(str(categoria), 'Configuración')


class ArticuloAyudaModelTest(TestCase):
    def setUp(self):
        self.categoria = CategoriaAyuda.objects.create(
            nombre='Configuración',
            descripcion='Ayuda sobre configuración del sistema',
            activo=True
        )

    def test_articulo_creation(self):
        """Test de creación de artículo de ayuda"""
        articulo = ArticuloAyuda.objects.create(
            titulo='Cómo configurar usuarios',
            contenido='Contenido del artículo de ayuda',
            categoria=self.categoria,
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
            activo=True
        )
        self.assertEqual(str(articulo), 'Cómo configurar usuarios')


class ConsultaAyudaModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_consulta_creation(self):
        """Test de creación de consulta de ayuda"""
        consulta = ConsultaAyuda.objects.create(
            usuario=self.user,
            asunto='Problema con login',
            mensaje='No puedo acceder al sistema',
            tipo='consulta',
            estado='pendiente'
        )
        self.assertEqual(consulta.asunto, 'Problema con login')
        self.assertEqual(consulta.usuario, self.user)
        self.assertEqual(consulta.estado, 'pendiente')

    def test_consulta_str_method(self):
        """Test del método __str__ de la consulta"""
        consulta = ConsultaAyuda.objects.create(
            usuario=self.user,
            asunto='Problema con login',
            mensaje='No puedo acceder al sistema',
            tipo='consulta',
            estado='pendiente'
        )
        expected_str = f"{consulta.asunto} - {self.user.username}"
        self.assertEqual(str(consulta), expected_str)


class AyudaViewsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.categoria = CategoriaAyuda.objects.create(
            nombre='Configuración',
            descripcion='Ayuda sobre configuración del sistema',
            activo=True
        )

    def test_ayuda_index_view(self):
        """Test de la vista principal de ayuda"""
        response = self.client.get(reverse('ayuda:index'))
        self.assertEqual(response.status_code, 200)

    def test_ayuda_categoria_view(self):
        """Test de la vista de categoría"""
        response = self.client.get(
            reverse('ayuda:categoria', kwargs={'categoria_id': self.categoria.id})
        )
        self.assertEqual(response.status_code, 200)

    def test_consulta_ayuda_requires_login(self):
        """Test que crear consulta requiere login"""
        response = self.client.get(reverse('ayuda:nueva_consulta'))
        self.assertEqual(response.status_code, 302)  # Redirect to login

    def test_consulta_ayuda_with_login(self):
        """Test de crear consulta con usuario logueado"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('ayuda:nueva_consulta'))
        self.assertEqual(response.status_code, 200)

        # Test POST request
        form_data = {
            'asunto': 'Problema test',
            'mensaje': 'Mensaje de prueba',
            'tipo': 'consulta'
        }
        response = self.client.post(reverse('ayuda:nueva_consulta'), form_data)
        self.assertEqual(response.status_code, 302)  # Redirect after success
