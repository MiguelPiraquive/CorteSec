from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from core.models import Organizacion
from documentacion.models import CategoriaDocumento, Documento

User = get_user_model()


class CategoriaDocumentoModelTest(TestCase):
    def test_categoria_documento_creation(self):
        """Test de creación de categoría de documento"""
        categoria = CategoriaDocumento.objects.create(
            nombre='Manual de Usuario',
            descripcion='Manuales para usuarios del sistema',
            activa=True
        )
        self.assertEqual(categoria.nombre, 'Manual de Usuario')
        self.assertTrue(categoria.activa)

    def test_categoria_documento_str_method(self):
        """Test del método __str__ de la categoría"""
        categoria = CategoriaDocumento.objects.create(
            nombre='Manual de Usuario',
            descripcion='Manuales para usuarios del sistema',
            activa=True
        )
        self.assertEqual(str(categoria), 'Manual de Usuario')


class DocumentoModelTest(TestCase):
    def setUp(self):
        self.organization = Organizacion.objects.create(
            nombre='Org Test',
            codigo='ORGTEST'
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            organization=self.organization
        )
        self.categoria = CategoriaDocumento.objects.create(
            nombre='Manual de Usuario',
            descripcion='Manuales para usuarios del sistema',
            activa=True,
            organization=self.organization
        )

    def test_documento_creation(self):
        """Test de creación de documento"""
        documento = Documento.objects.create(
            titulo='Manual de Nómina',
            descripcion='Manual completo del módulo de nómina',
            categoria=self.categoria,
            tipo='manual',
            archivo=SimpleUploadedFile('manual.pdf', b'test', content_type='application/pdf'),
            creado_por=self.user,
            version='1.0',
            activo=True,
            organization=self.organization
        )
        self.assertEqual(documento.titulo, 'Manual de Nómina')
        self.assertEqual(documento.creado_por, self.user)
        self.assertEqual(documento.version, '1.0')

    def test_documento_str_method(self):
        """Test del método __str__ del documento"""
        documento = Documento.objects.create(
            titulo='Manual de Nómina',
            descripcion='Manual completo del módulo de nómina',
            categoria=self.categoria,
            tipo='manual',
            archivo=SimpleUploadedFile('manual.pdf', b'test', content_type='application/pdf'),
            creado_por=self.user,
            version='1.0',
            activo=True,
            organization=self.organization
        )
        self.assertEqual(str(documento), 'Manual de Nómina (v1.0)')


class DocumentacionViewsTest(TestCase):
    def setUp(self):
        self.organization = Organizacion.objects.create(
            nombre='Org Test',
            codigo='ORGTEST'
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            organization=self.organization
        )
        self.categoria = CategoriaDocumento.objects.create(
            nombre='Manual de Usuario',
            descripcion='Manuales para usuarios del sistema',
            activa=True,
            organization=self.organization
        )

    def test_documentacion_index_view(self):
        """Test de la vista principal de documentación"""
        self.client.force_login(self.user)
        response = self.client.get(reverse('documentacion:index'))
        self.assertEqual(response.status_code, 200)

    def test_documento_detail_view(self):
        """Test de la vista de detalle de documento"""
        documento = Documento.objects.create(
            titulo='Manual de Nómina',
            descripcion='Manual completo del módulo de nómina',
            categoria=self.categoria,
            tipo='manual',
            archivo=SimpleUploadedFile('manual.pdf', b'test', content_type='application/pdf'),
            creado_por=self.user,
            version='1.0',
            activo=True,
            organization=self.organization
        )
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('documentacion:descargar', kwargs={'documento_id': documento.id})
        )
        self.assertIn(response.status_code, [200, 302])

    def test_crear_documento_requires_login(self):
        """Test que el manual requiere login"""
        response = self.client.get(reverse('documentacion:manual'))
        self.assertEqual(response.status_code, 302)  # Redirect to login

    def test_crear_documento_with_login(self):
        """Test de acceso al manual con usuario logueado"""
        self.client.force_login(self.user)
        response = self.client.get(reverse('documentacion:manual'))
        self.assertEqual(response.status_code, 200)
