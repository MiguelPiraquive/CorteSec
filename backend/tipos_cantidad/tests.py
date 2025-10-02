"""
Tests para la app tipos_cantidad
"""

from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from .models import TipoCantidad
from .forms import TipoCantidadForm, TipoCantidadFiltroForm

User = get_user_model()


class TipoCantidadModelTests(TestCase):
    """Tests para el modelo TipoCantidad"""
    
    def setUp(self):
        self.tipo_cantidad = TipoCantidad.objects.create(
            codigo='m2',
            descripcion='Metro cuadrado',
            simbolo='m²',
            orden=1
        )
    
    def test_string_representation(self):
        """Test de la representación en string del modelo"""
        self.assertEqual(str(self.tipo_cantidad), 'm2 - Metro cuadrado')
    
    def test_descripcion_completa_con_simbolo(self):
        """Test de la propiedad descripcion_completa con símbolo"""
        expected = 'Metro cuadrado (m²)'
        self.assertEqual(self.tipo_cantidad.descripcion_completa, expected)
    
    def test_descripcion_completa_sin_simbolo(self):
        """Test de la propiedad descripcion_completa sin símbolo"""
        tipo_sin_simbolo = TipoCantidad.objects.create(
            codigo='hrs',
            descripcion='Horas',
            orden=2
        )
        self.assertEqual(tipo_sin_simbolo.descripcion_completa, 'Horas')
    
    def test_codigo_en_minusculas(self):
        """Test que el código se guarda en minúsculas"""
        tipo = TipoCantidad.objects.create(
            codigo='KG',
            descripcion='Kilogramos'
        )
        self.assertEqual(tipo.codigo, 'kg')
    
    def test_puede_eliminarse_normal(self):
        """Test que un tipo normal puede eliminarse"""
        self.assertTrue(self.tipo_cantidad.puede_eliminarse())
    
    def test_no_puede_eliminarse_sistema(self):
        """Test que un tipo del sistema no puede eliminarse"""
        tipo_sistema = TipoCantidad.objects.create(
            codigo='und',
            descripcion='Unidad',
            es_sistema=True
        )
        self.assertFalse(tipo_sistema.puede_eliminarse())


class TipoCantidadFormTests(TestCase):
    """Tests para el formulario TipoCantidadForm"""
    
    def test_form_valido(self):
        """Test de formulario válido"""
        form_data = {
            'codigo': 'm3',
            'descripcion': 'Metro cúbico',
            'simbolo': 'm³',
            'orden': 5,
            'activo': True
        }
        form = TipoCantidadForm(data=form_data)
        self.assertTrue(form.is_valid())
    
    def test_codigo_con_espacios_invalido(self):
        """Test que código con espacios es inválido"""
        form_data = {
            'codigo': 'm 2',
            'descripcion': 'Metro cuadrado',
            'orden': 1,
            'activo': True
        }
        form = TipoCantidadForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('codigo', form.errors)
    
    def test_codigo_caracteres_especiales_invalido(self):
        """Test que código con caracteres especiales es inválido"""
        form_data = {
            'codigo': 'm@2',
            'descripcion': 'Metro cuadrado',
            'orden': 1,
            'activo': True
        }
        form = TipoCantidadForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('codigo', form.errors)
    
    def test_simbolo_muy_largo_invalido(self):
        """Test que símbolo muy largo es inválido"""
        form_data = {
            'codigo': 'm2',
            'descripcion': 'Metro cuadrado',
            'simbolo': 'simbolo_muy_largo',
            'orden': 1,
            'activo': True
        }
        form = TipoCantidadForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('simbolo', form.errors)
    
    def test_orden_negativo_invalido(self):
        """Test que orden negativo es inválido"""
        form_data = {
            'codigo': 'm2',
            'descripcion': 'Metro cuadrado',
            'orden': -1,
            'activo': True
        }
        form = TipoCantidadForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('orden', form.errors)


class TipoCantidadFiltroFormTests(TestCase):
    """Tests para el formulario de filtros"""
    
    def test_filtro_form_vacio_valido(self):
        """Test que formulario de filtro vacío es válido"""
        form = TipoCantidadFiltroForm(data={})
        self.assertTrue(form.is_valid())
    
    def test_filtro_form_con_datos_valido(self):
        """Test que formulario de filtro con datos es válido"""
        form_data = {
            'search': 'metro',
            'estado': 'activos',
            'orden_por': 'codigo'
        }
        form = TipoCantidadFiltroForm(data=form_data)
        self.assertTrue(form.is_valid())


class TipoCantidadViewTests(TestCase):
    """Tests para las vistas de tipos de cantidad"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.login(username='testuser', password='testpass123')
        
        self.tipo_cantidad = TipoCantidad.objects.create(
            codigo='m2',
            descripcion='Metro cuadrado',
            simbolo='m²'
        )
    
    def test_lista_tipos_cantidad_view(self):
        """Test de la vista de lista"""
        url = reverse('tipos_cantidad:lista')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Metro cuadrado')
    
    def test_crear_tipo_cantidad_get(self):
        """Test GET de la vista crear"""
        url = reverse('tipos_cantidad:crear')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Crear Tipo de Cantidad')
    
    def test_crear_tipo_cantidad_post_valido(self):
        """Test POST válido de la vista crear"""
        url = reverse('tipos_cantidad:crear')
        form_data = {
            'codigo': 'm3',
            'descripcion': 'Metro cúbico',
            'simbolo': 'm³',
            'orden': 1,
            'activo': True
        }
        response = self.client.post(url, data=form_data)
        self.assertEqual(response.status_code, 302)  # Redirect
        self.assertTrue(TipoCantidad.objects.filter(codigo='m3').exists())
    
    def test_editar_tipo_cantidad_get(self):
        """Test GET de la vista editar"""
        url = reverse('tipos_cantidad:editar', kwargs={'pk': self.tipo_cantidad.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Metro cuadrado')
    
    def test_editar_tipo_cantidad_post_valido(self):
        """Test POST válido de la vista editar"""
        url = reverse('tipos_cantidad:editar', kwargs={'pk': self.tipo_cantidad.pk})
        form_data = {
            'codigo': 'm2',
            'descripcion': 'Metro cuadrado actualizado',
            'simbolo': 'm²',
            'orden': 1,
            'activo': True
        }
        response = self.client.post(url, data=form_data)
        self.assertEqual(response.status_code, 302)  # Redirect
        
        # Verificar que se actualizó
        self.tipo_cantidad.refresh_from_db()
        self.assertEqual(self.tipo_cantidad.descripcion, 'Metro cuadrado actualizado')
    
    def test_eliminar_tipo_cantidad_get(self):
        """Test GET de la vista eliminar"""
        url = reverse('tipos_cantidad:eliminar', kwargs={'pk': self.tipo_cantidad.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Metro cuadrado')
    
    def test_eliminar_tipo_cantidad_post(self):
        """Test POST de la vista eliminar"""
        url = reverse('tipos_cantidad:eliminar', kwargs={'pk': self.tipo_cantidad.pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, 302)  # Redirect
        self.assertFalse(TipoCantidad.objects.filter(pk=self.tipo_cantidad.pk).exists())
    
    def test_toggle_activo_tipo_cantidad(self):
        """Test de la vista toggle activo"""
        self.assertTrue(self.tipo_cantidad.activo)
        
        url = reverse('tipos_cantidad:toggle_activo', kwargs={'pk': self.tipo_cantidad.pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, 302)  # Redirect
        
        # Verificar que cambió el estado
        self.tipo_cantidad.refresh_from_db()
        self.assertFalse(self.tipo_cantidad.activo)
    
    def test_vista_sin_autenticacion(self):
        """Test que las vistas requieren autenticación"""
        self.client.logout()
        
        urls = [
            reverse('tipos_cantidad:lista'),
            reverse('tipos_cantidad:crear'),
            reverse('tipos_cantidad:editar', kwargs={'pk': self.tipo_cantidad.pk}),
            reverse('tipos_cantidad:eliminar', kwargs={'pk': self.tipo_cantidad.pk}),
        ]
        
        for url in urls:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 302)  # Redirect to login
