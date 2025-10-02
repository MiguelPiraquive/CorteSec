from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from documentacion.models import TipoDocumento, Documento


class TipoDocumentoModelTest(TestCase):
    def test_tipo_documento_creation(self):
        """Test de creación de tipo de documento"""
        tipo = TipoDocumento.objects.create(
            nombre='Manual de Usuario',
            descripcion='Manuales para usuarios del sistema',
            extension_permitida='.pdf',
            tamaño_maximo=5242880,  # 5MB
            activo=True
        )
        self.assertEqual(tipo.nombre, 'Manual de Usuario')
        self.assertTrue(tipo.activo)

    def test_tipo_documento_str_method(self):
        """Test del método __str__ del tipo de documento"""
        tipo = TipoDocumento.objects.create(
            nombre='Manual de Usuario',
            descripcion='Manuales para usuarios del sistema',
            activo=True
        )
        self.assertEqual(str(tipo), 'Manual de Usuario')


class DocumentoModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.tipo_documento = TipoDocumento.objects.create(
            nombre='Manual de Usuario',
            descripcion='Manuales para usuarios del sistema',
            activo=True
        )

    def test_documento_creation(self):
        """Test de creación de documento"""
        documento = Documento.objects.create(
            titulo='Manual de Nómina',
            descripcion='Manual completo del módulo de nómina',
            tipo_documento=self.tipo_documento,
            autor=self.user,
            version='1.0',
            activo=True
        )
        self.assertEqual(documento.titulo, 'Manual de Nómina')
        self.assertEqual(documento.autor, self.user)
        self.assertEqual(documento.version, '1.0')

    def test_documento_str_method(self):
        """Test del método __str__ del documento"""
        documento = Documento.objects.create(
            titulo='Manual de Nómina',
            descripcion='Manual completo del módulo de nómina',
            tipo_documento=self.tipo_documento,
            autor=self.user,
            version='1.0',
            activo=True
        )
        self.assertEqual(str(documento), 'Manual de Nómina v1.0')


class DocumentacionViewsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.tipo_documento = TipoDocumento.objects.create(
            nombre='Manual de Usuario',
            descripcion='Manuales para usuarios del sistema',
            activo=True
        )

    def test_documentacion_index_view(self):
        """Test de la vista principal de documentación"""
        response = self.client.get(reverse('documentacion:index'))
        self.assertEqual(response.status_code, 200)

    def test_documento_detail_view(self):
        """Test de la vista de detalle de documento"""
        documento = Documento.objects.create(
            titulo='Manual de Nómina',
            descripcion='Manual completo del módulo de nómina',
            tipo_documento=self.tipo_documento,
            autor=self.user,
            version='1.0',
            activo=True
        )
        response = self.client.get(
            reverse('documentacion:detalle', kwargs={'documento_id': documento.id})
        )
        self.assertEqual(response.status_code, 200)

    def test_crear_documento_requires_login(self):
        """Test que crear documento requiere login"""
        response = self.client.get(reverse('documentacion:crear'))
        self.assertEqual(response.status_code, 302)  # Redirect to login

    def test_crear_documento_with_login(self):
        """Test de crear documento con usuario logueado"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('documentacion:crear'))
        self.assertEqual(response.status_code, 200)
