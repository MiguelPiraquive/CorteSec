# 📋 MÓDULO NÓMINA ELECTRÓNICA DIAN

## 🎯 Propósito

Este módulo contiene **ÚNICAMENTE** la funcionalidad relacionada con la **Nómina Electrónica DIAN** según la Resolución 000013/2021.

**NO CONFUNDIR CON:**
- `payroll/` → Nómina Simple (gestión interna RRHH, cálculo de producción)
- `nomina_electronica/` → Nómina Electrónica (documento tributario electrónico DIAN)

---

## 📦 Estructura del Módulo

```
nomina_electronica/
├── __init__.py              ← Documentación del módulo
├── models.py                ← Modelos de datos DIAN
├── dian_client.py           ← Cliente HTTP API DIAN
├── xml_generator.py         ← Generador XML UBL 2.1
├── firma_digital.py         ← Firma digital XMLDSIG (.p12)
├── notifications.py         ← Webhooks y notificaciones
└── README.md                ← Esta documentación
```

---

## 📊 Modelos Incluidos

### 1. NominaElectronica
Documento tributario electrónico (DTE) de nómina para envío a DIAN.

**Campos clave:**
- `numero_documento`: NE-2026-000001
- `cune`: Código Único de Nómina Electrónica
- `xml_contenido`: XML UBL 2.1 generado
- `estado`: borrador → validado → enviado → aceptado/rechazado

**Estados:**
- `borrador`: Creado pero no validado
- `validado`: XML generado correctamente
- `enviado`: Enviado a DIAN (esperando respuesta)
- `aceptado`: ✅ Aceptado por DIAN (documento válido)
- `rechazado`: ❌ Rechazado por DIAN (errores)
- `anulado`: Anulado manualmente

### 2. DetalleItemNominaElectronica
Items de producción en formato DIAN (con `codigo_dian`).

### 3. DetalleConceptoNominaElectronica
Conceptos laborales en formato DIAN (devengados/deducciones).

### 4. ConfiguracionNominaElectronica
Configuración técnica DIAN:
- Datos del empleador (NIT, razón social)
- Numeración autorizada (resolución DIAN)
- Certificado digital (.p12)
- Identificador de software
- URLs API DIAN (pruebas/producción)

### 5. WebhookConfig
Configuración de webhooks para notificaciones de eventos.

### 6. WebhookLog
Logs de disparos de webhooks (auditoría).

### 7. NominaAjuste
Notas de ajuste a nóminas electrónicas previamente enviadas.

**Tipos de ajuste:**
- `REEMPLAZAR`: Reemplaza completamente la nómina
- `ELIMINAR`: Anula la nómina
- `ADICIONAR`: Agrega conceptos omitidos
- `CORREGIR`: Corrige valores específicos

### 8. DetalleAjuste
Detalles de conceptos ajustados.

---

## 🔧 Servicios Incluidos

### 1. `dian_client.py` - Cliente API DIAN
Cliente HTTP para comunicación con API REST de la DIAN.

**Métodos:**
- `enviar_nomina()`: Envía documento electrónico
- `consultar_estado()`: Consulta estado por CUNE
- `obtener_cune()`: Obtiene CUNE generado
- `validar_numeracion()`: Valida rango autorizado

### 2. `xml_generator.py` - Generador XML
Genera XML UBL 2.1 según XSD oficial de la DIAN.

**Métodos:**
- `generar_xml_nomina()`: Genera XML de nómina
- `generar_xml_ajuste()`: Genera XML de nota de ajuste
- `validar_xml()`: Valida contra XSD oficial
- `agregar_devengados()`: Agrega sección de devengados
- `agregar_deducciones()`: Agrega sección de deducciones

### 3. `firma_digital.py` - Firma Digital
Implementa firma digital XMLDSIG según estándar W3C.

**Métodos:**
- `firmar_xml()`: Firma XML con certificado .p12
- `validar_firma()`: Valida firma digital
- `cargar_certificado()`: Carga certificado desde archivo
- `obtener_certificado()`: Obtiene certificado activo

### 4. `notifications.py` - Webhooks
Sistema de notificaciones de eventos DIAN.

**Eventos soportados:**
- `nomina.creada`: Nómina creada (estado borrador)
- `nomina.validada`: XML generado correctamente
- `nomina.enviada`: Enviada a DIAN
- `nomina.aceptada`: ✅ Aceptada por DIAN
- `nomina.rechazada`: ❌ Rechazada por DIAN
- `ajuste.creado`: Ajuste creado
- `ajuste.enviado`: Ajuste enviado
- `ajuste.aceptado`: Ajuste aceptado

---

## 🚀 Flujo de Uso

### Crear y Enviar Nómina Electrónica

```python
from nomina_electronica.models import NominaElectronica, ConfiguracionNominaElectronica
from nomina_electronica.xml_generator import DIANXMLGenerator
from nomina_electronica.firma_digital import FirmaDigital
from nomina_electronica.dian_client import DIANClient

# 1. Crear nómina electrónica
nomina = NominaElectronica.objects.create(
    organization=organization,
    empleado=empleado,
    periodo=periodo,
    total_devengado=1500000,
    total_deducido=400000,
    neto_pagar=1100000
)

# 2. Generar XML UBL 2.1
config = ConfiguracionNominaElectronica.objects.get(organization=organization, activa=True)
generator = DIANXMLGenerator(config)
xml_content = generator.generar_xml_nomina(nomina)

# 3. Firmar XML con certificado digital
firma = FirmaDigital(config)
xml_firmado = firma.firmar_xml(xml_content)

# 4. Enviar a DIAN
client = DIANClient(config)
respuesta = client.enviar_nomina(xml_firmado)

# 5. Actualizar estado
if respuesta['exito']:
    nomina.estado = 'aceptado'
    nomina.cune = respuesta['cune']
    nomina.mensaje_respuesta_dian = respuesta['mensaje']
    nomina.save()
```

### Crear Nota de Ajuste

```python
from nomina_electronica.models import NominaAjuste, DetalleAjuste

# 1. Crear ajuste
ajuste = NominaAjuste.objects.create(
    organization=organization,
    nomina_original=nomina_electronica,
    tipo_ajuste=NominaAjuste.TIPO_CORREGIR,
    motivo_ajuste="Corrección de valor de auxilio de transporte",
    total_devengado_ajustado=1550000,  # Valor corregido
    total_deducido_ajustado=400000,
    neto_ajustado=1150000
)

# 2. Agregar detalles de conceptos ajustados
DetalleAjuste.objects.create(
    organization=organization,
    ajuste=ajuste,
    concepto=concepto_aux_transporte,
    valor_original=150000,
    valor_ajustado=200000  # Valor corregido
)

# 3. Generar y enviar XML de ajuste (similar a nómina)
```

---

## 📚 Normatividad

### Resolución 000013/2021 DIAN
- **Art. 1**: Obligación de nómina electrónica
- **Art. 2**: Estructura del documento (XML UBL 2.1)
- **Art. 3**: Firma digital XMLDSIG
- **Art. 4**: Envío a DIAN (API REST)
- **Art. 5**: Notas de ajuste
- **Art. 6**: Validaciones técnicas

### Catálogos DIAN
- **Devengados**: SAL, AUX, BNF, COM, PRI, VAC, etc.
- **Deducciones**: APO, DED, LIB, SAN, etc.

### URLs Oficiales
- **Pruebas**: https://vpfe-hab.dian.gov.co/
- **Producción**: https://vpfe.dian.gov.co/

---

## ⚠️ Diferencias con Nómina Simple

| Aspecto | Nómina Simple | Nómina Electrónica |
|---------|---------------|-------------------|
| **Propósito** | Gestión interna RRHH | Documento tributario DIAN |
| **Formato** | Base de datos (Django) | XML UBL 2.1 |
| **Numeración** | Consecutivo interno (NOM-2026-000001) | Resolución DIAN (NE-2026-000001) |
| **Firma** | No requiere | Firma digital XMLDSIG |
| **Envío** | No aplica | API DIAN obligatoria |
| **Estados** | Borrador, Aprobada | Borrador → Enviada → Aceptada/Rechazada |
| **CUNE** | No aplica | Código Único DIAN |
| **Validación** | Interna | DIAN + XSD |

---

## 🔐 Seguridad

### Certificado Digital
- Formato: `.p12` o `.pfx`
- Emisor: CA autorizada por DIAN
- Validez: Verificar vencimiento
- Password: Almacenar de forma segura (variables de entorno)

### API DIAN
- Autenticación: Token OAuth 2.0
- HTTPS: Todas las comunicaciones cifradas
- Rate Limiting: Respetar límites de DIAN
- Logs: Registrar todas las transacciones

---

## 📞 Soporte

**Documentación DIAN:**
- [Portal Nómina Electrónica](https://www.dian.gov.co/nomina)
- [Especificaciones Técnicas](https://www.dian.gov.co/nomina/docs/)

**Contacto CorteSec:**
- Email: soporte@cortesec.com
- Slack: #nomina-electronica

---

## 🛠️ Desarrollo

### Ambiente de Pruebas
1. Obtener certificado de pruebas DIAN
2. Configurar `ConfiguracionNominaElectronica` con ambiente='pruebas'
3. Usar URLs de pruebas DIAN
4. Validar XMLs con XSD oficial

### Pasar a Producción
1. Obtener certificado producción (CA autorizada)
2. Solicitar resolución de numeración DIAN
3. Configurar ambiente='produccion'
4. Cambiar a URLs producción DIAN
5. Activar envío automático

---

**Autor**: Sistema CorteSec  
**Fecha**: Enero 2026  
**Versión**: 2.0.0 (Separado de payroll)  
**Estado**: ⏸️ Desactivado (uso futuro)
