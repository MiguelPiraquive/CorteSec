# 📁 Estructura del Módulo Payroll - CorteSec

## 🏗️ Arquitectura Organizada

```
payroll/
├── 📂 models/                    # Modelos de datos (Django ORM)
│   ├── __init__.py              # Exports centralizados
│   ├── core.py                  # (Pendiente) Modelos existentes refactorizados
│   ├── structural.py            # ✅ CentroCosto, DistribucionCostoNomina
│   ├── time_attendance.py       # ✅ TipoNovedad, NovedadCalendario
│   ├── accounting.py            # ✅ EntidadExterna, AsientoNomina
│   ├── concepts.py              # (Fase 2) ConceptoLaboral con fórmulas
│   ├── legal.py                 # (Fase 3) EmbargoJudicial, TablaRetencionFuente
│   ├── hse.py                   # (Fase 4) CertificadoEmpleado, EntregaDotacion
│   └── provisions.py            # (Fase 4) ConsolidadoPrestaciones
│
├── 📂 services/                  # Lógica de negocio
│   ├── __init__.py
│   ├── dian_client.py           # Cliente para integración DIAN
│   ├── xml_generator.py         # Generador XML UBL 2.1
│   ├── pdf_generator.py         # Generador de PDFs (desprendibles)
│   ├── notifications.py         # Servicio de notificaciones
│   ├── payroll_engine.py        # (Fase 2) Motor de cálculo dinámico
│   ├── formula_evaluator.py    # (Fase 2) Evaluador de fórmulas seguro
│   ├── pila_generator.py        # (Fase 3) Generador archivo PILA
│   ├── bank_dispersions.py      # (Fase 5) Archivos planos bancos
│   └── accounting_integrator.py # (Fase 5) Generador asientos contables
│
├── 📂 interfaces/                # Adaptadores externos (Patrón Adapter)
│   ├── __init__.py
│   ├── notifications.py         # (Fase 7) Twilio, SendGrid, WhatsApp
│   └── banking.py               # (Fase 5) Bancolombia, Davivienda
│
├── 📂 api/                       # Capa REST (Django Rest Framework)
│   ├── __init__.py
│   ├── urls.py                  # ✅ Rutas API
│   ├── views.py                 # ✅ ViewSets existentes
│   ├── serializers.py           # ✅ Serializers existentes
│   ├── serializers_direct.py    # ✅ Serializers directos
│   └── filters.py               # (Pendiente) Filtros django-filter
│
├── 📂 management/                # Comandos Django manage.py
│   └── commands/
│       ├── poblar_catalogos_nomina.py
│       ├── poblar_tipos_deduccion.py
│       └── migrate_to_new_structure.py  # (Pendiente Fase 1)
│
├── 📂 migrations/                # Migraciones Django
│   ├── 0001_initial.py
│   ├── 0002_conceptolaboral_...
│   └── 0003_fase1_estructurales.py  # (Pendiente)
│
├── 📂 docs/                      # Documentación
│   ├── FASE_1_FUNDACIONAL_COMPLETADA.md  # ✅ Fase 1 completa
│   ├── ANALISIS_NOMINA.md
│   ├── IMPLEMENTACION_FASE1.md
│   ├── ARQUITECTURA_DEFINITIVA_NOMINAS.py
│   ├── ARQUITECTURA_V3_COMPLETADA.md
│   ├── COMPARACION_ARQUITECTURAS.txt
│   └── ...
│
├── 📂 _old_architecture/         # Código legacy (backup)
│   ├── admin_old.py
│   ├── models_backup_v2.py
│   └── ...
│
├── 📄 __init__.py               # Package principal
├── 📄 admin.py                  # Django Admin
├── 📄 apps.py                   # Configuración app Django
├── 📄 constants.py              # ✅ Constantes legales 2026
├── 📄 forms.py                  # Formularios Django
├── 📄 models.py                 # Modelos existentes (legacy)
├── 📄 signals.py                # Señales Django
├── 📄 tasks.py                  # Tareas Celery
├── 📄 tests.py                  # Tests unitarios
├── 📄 urls.py                   # URLs Django
├── 📄 views.py                  # Vistas Django
├── 📄 reportes_views.py         # Vistas de reportes
├── 📄 validators.py             # (Pendiente) Validadores negocio
└── 📄 utils.py                  # (Pendiente) Utilidades
```

---

## 🎯 **Separación de Responsabilidades**

### **models/** - Capa de Datos
- **Qué:** Definición de estructura de datos (Django Models)
- **Responsabilidad:** Validaciones básicas, relaciones, constraints
- **No debe:** Contener lógica de negocio compleja

### **services/** - Capa de Negocio
- **Qué:** Lógica de cálculo, procesamiento, integraciones
- **Responsabilidad:** Orquestación, cálculos complejos, reglas de negocio
- **Ejemplo:** PayrollEngine.procesar_nomina()

### **interfaces/** - Capa de Integración
- **Qué:** Adaptadores para servicios externos
- **Responsabilidad:** Comunicación con APIs terceros (Twilio, Bancos, DIAN)
- **Patrón:** Adapter Pattern (intercambiable)

### **api/** - Capa de Presentación REST
- **Qué:** Endpoints HTTP (Django Rest Framework)
- **Responsabilidad:** Serialización, validación de requests, autenticación
- **No debe:** Contener lógica de negocio (delegar a services)

---

## 📊 **Estado de Implementación**

| Fase | Módulo | Estado | Archivos |
|------|--------|--------|----------|
| **Fase 1** | Modelos Estructurales | ✅ COMPLETO | structural.py, time_attendance.py, accounting.py |
| Fase 2 | Motor de Cálculo | ⏳ Pendiente | payroll_engine.py, formula_evaluator.py |
| Fase 3 | Legal y Fiscal | ⏳ Pendiente | legal.py, pila_generator.py |
| Fase 4 | HSE y Provisiones | ⏳ Pendiente | hse.py, provisions.py |
| Fase 5 | Integración Contable | ⏳ Pendiente | accounting_integrator.py, bank_dispersions.py |
| Fase 6 | DIAN Mejorado | ⏳ Pendiente | dian_xml_enhanced.py |
| Fase 7 | Notificaciones | ⏳ Pendiente | interfaces/notifications.py |

---

## 🔧 **Convenciones de Código**

### Nombres de Archivos
- **Modelos:** `nombre_plural.py` (ej: `structural.py`, `legal.py`)
- **Services:** `nombre_servicio.py` (ej: `payroll_engine.py`)
- **Interfaces:** `tipo_interface.py` (ej: `notifications.py`, `banking.py`)

### Imports
```python
# ✅ CORRECTO
from payroll.models import CentroCosto
from payroll.services.payroll_engine import PayrollEngine
from payroll.constants import SMMLV_2026

# ❌ INCORRECTO
from payroll.models.structural import CentroCosto  # No exponer internos
```

### Estructura de Clases
```python
# Services
class PayrollEngine:
    """Docstring con propósito"""
    
    def __init__(self, nomina):
        self.nomina = nomina
    
    def procesar(self):
        """Método público"""
        pass
    
    def _calcular_interno(self):
        """Método privado (prefijo _)"""
        pass
```

---

## 🧪 **Testing**

### Estructura de Tests
```
tests/
├── test_models/
│   ├── test_structural.py
│   ├── test_time_attendance.py
│   └── test_accounting.py
├── test_services/
│   ├── test_payroll_engine.py
│   └── test_pila_generator.py
└── test_api/
    └── test_payroll_views.py
```

### Cobertura Mínima
- **Modelos:** 80%
- **Services:** 90%
- **API Views:** 70%

---

## 📚 **Documentación**

### Docstrings Obligatorios
```python
def calcular_retencion_fuente(ingreso: Decimal, deducciones: Decimal) -> Decimal:
    """
    Calcula retención en la fuente según Procedimiento 1 (Decreto 1625/2016).
    
    Args:
        ingreso: Ingreso bruto mensual
        deducciones: Deducciones de ley (salud + pensión)
    
    Returns:
        Valor de retención en pesos
        
    Raises:
        ValidationError: Si ingreso es negativo
        
    Example:
        >>> calcular_retencion_fuente(Decimal('5000000'), Decimal('400000'))
        Decimal('250000.00')
    """
```

---

## 🚀 **Próximos Pasos**

1. ✅ **Fase 1 Completada** - Modelos fundacionales
2. ⏳ **Migración de datos** - Script para datos históricos
3. ⏳ **Fase 2** - Motor de cálculo dinámico
4. ⏳ **Tests Unitarios** - Cobertura 80%+
5. ⏳ **API REST** - Actualizar serializers y views
6. ⏳ **Documentación API** - Swagger/OpenAPI

---

## 📝 **Notas Importantes**

- **No editar** `models.py` directamente (legacy)
- **Usar** modelos de `models/` para nuevas funcionalidades
- **Migrar gradualmente** código antiguo a nueva estructura
- **Mantener** `_old_architecture/` hasta validar estabilidad

---

**Versión:** 1.0.0-fase1  
**Fecha:** 2026-01-07  
**Autor:** Sistema CorteSec
