# ✅ FASE 1: MODELOS FUNDACIONALES - COMPLETADA

## 📦 Archivos Creados

### 1. **Constants** (`payroll/constants.py`)
**Líneas:** 400+  
**Contenido:** Todas las constantes legales colombianas 2026
- ✅ SMMLV, Auxilio Transporte, UVT
- ✅ Tasas Seguridad Social (Salud, Pensión, ARL, FSP)
- ✅ Tasas Parafiscales (SENA, ICBF, Caja Compensación)
- ✅ Tasas Provisiones (Cesantías, Prima, Vacaciones)
- ✅ Tabla Retención en la Fuente 2026 (7 tramos UVT)
- ✅ Recargos Horas Extras (HED, HEN, HEDF, etc.)
- ✅ Embargos (límites legales)
- ✅ FIC (Fondo Industria Construcción)
- ✅ Fechas Dotación Obligatoria
- ✅ Marcas PILA (ING, RET, IGE, LMA, VAC, etc.)
- ✅ Helpers: `calcular_fsp_adicional()`, `calcular_retencion_fuente_procedimiento1()`, `es_fecha_entrega_dotacion()`

**Referencias Legales:** Ley 100/1993, Ley 1122/2007, Decreto 1625/2016, CST, Res. 2388/2016

---

### 2. **Modelos Estructurales** (`payroll/models/structural.py`)
**Líneas:** 600+

#### **Modelo `CentroCosto`**
**Propósito:** Jerarquía N-niveles para costos por obra/fase

**Campos Clave:**
- `codigo` (único): Ej: PRO-001, OBR-A, FAS-CIM
- `parent` (FK self): Para árbol jerárquico
- `nivel`: Profundidad en jerarquía (0=raíz)
- `ruta_completa`: Path completo (ej: PRO-001/OBR-A/FAS-CIM)
- `presupuesto_mano_obra`: Presupuesto total
- `costo_acumulado_mano_obra`: Costo real (actualizado automáticamente)
- `estado`: PLN, ACT, SUS, CER, LIQ
- `director_obra`: Usuario responsable

**Métodos:**
- `porcentaje_ejecucion`: % consumido del presupuesto
- `saldo_presupuestal`: Saldo disponible
- `get_ancestros()`: Lista de padres hasta raíz
- `get_descendientes()`: QuerySet recursivo de hijos
- `actualizar_costo_acumulado()`: Propaga costos a padres
- `puede_asignar_mano_obra()`: Validación estado

**Validaciones:**
- ✅ No puede ser su propio padre
- ✅ Fechas coherentes
- ✅ Auto-cálculo de nivel y ruta

---

#### **Modelo `DistribucionCostoNomina`**
**Propósito:** Distribuir costo de nómina entre múltiples centros de costo

**Campos Clave:**
- `nomina_simple` / `nomina_electronica` (FK)
- `centro_costo` (FK)
- `porcentaje_tiempo`: 0.01-100.00%
- `dias_trabajados`: Días en ese centro

**Valores Calculados Automáticamente:**
- `valor_devengados`
- `valor_salud_empleador`, `valor_pension_empleador`, `valor_arl`
- `valor_sena`, `valor_icbf`, `valor_caja_compensacion`
- `valor_cesantias`, `valor_intereses_cesantias`, `valor_prima`, `valor_vacaciones`
- `valor_total_imputado` (suma total)

**Lógica:**
```python
factor = porcentaje_tiempo / 100
valor_devengados = nomina.total_items * factor
# ... (idem para todos los conceptos)
```

**Efectos:**
- ✅ Actualiza `centro_costo.costo_acumulado_mano_obra` automáticamente
- ✅ Propaga recursivamente a centros padres

**Validaciones:**
- ✅ Debe tener una nómina (simple o electrónica)
- ✅ No puede tener ambas simultáneamente
- ✅ Centro de costo debe estar activo

---

### 3. **Modelos Time & Attendance** (`payroll/models/time_attendance.py`)
**Líneas:** 500+

#### **Modelo `TipoNovedad`**
**Propósito:** Catálogo de novedades (incapacidades, licencias, etc.)

**Campos Clave:**
- `codigo`: Ej: INC_GEN, LIC_MAT, VAC
- `efecto_pago`: COM (completo), PAR (parcial), EPS, ARL, NOP (sin pago)
- `porcentaje_pago_empleador` / `porcentaje_pago_eps`
- `dias_carencia_empleador`: Días iniciales que paga empresa (ej: 2 días incapacidad)

**Flags de Afectación:**
- `afecta_ibc_salud`, `afecta_ibc_pension`, `afecta_ibc_arl`
- `afecta_parafiscales`, `afecta_provisiones`
- `suspende_auxilio_transporte`

**Integración PILA:**
- `marca_pila`: X, IGE, LMA, LPA, VAC, SLN, VCT

**Ejemplo Configuración:**
```python
Incapacidad General:
  efecto_pago: PAR
  porcentaje_pago_empleador: 100% (días 1-2)
  porcentaje_pago_eps: 66.67% (día 3+)
  dias_carencia_empleador: 2
  marca_pila: IGE
```

---

#### **Modelo `NovedadCalendario`**
**Propósito:** Registrar ausencias/licencias de empleados

**Campos Clave:**
- `empleado` (FK)
- `tipo_novedad` (FK)
- `fecha_inicio` / `fecha_fin`
- `dias_calendario` (calculado auto)
- `dias_habiles` (excluyendo domingos)
- `centro_costo` (opcional, para estadísticas)

**Documentación:**
- `documento_soporte` (FileField): Incapacidad médica, certificado
- `numero_documento`: Número del soporte
- `entidad_emisora`: EPS, ARL, etc.

**Valores Calculados:**
- `valor_pagado_empleador`
- `valor_pagado_eps_arl` (a cobrar)

**Estados:**
- REG → APR → PRO (procesada en nómina)
- REC (rechazada), ANU (anulada)

**Métodos:**
- `aprobar(usuario)`, `rechazar(usuario, motivo)`, `anular(usuario, motivo)`
- `calcular_valores_pago(salario_diario)`
- `dias_afectan_nomina`: Días que cuentan como trabajados
- `dias_restan_nomina`: Días que se descuentan

**Método Estático:**
```python
NovedadCalendario.calcular_dias_trabajados_periodo(empleado, fecha_inicio, fecha_fin)
→ Retorna días efectivos trabajados descontando novedades
```

**Validaciones:**
- ✅ Fecha fin >= fecha inicio
- ✅ No solapamiento con otras novedades
- ✅ Documento soporte obligatorio si tipo lo requiere

---

### 4. **Modelos Contabilidad** (`payroll/models/accounting.py`)
**Líneas:** 550+

#### **Modelo `EntidadExterna`**
**Propósito:** Terceros relacionados con nómina (EPS, AFP, ARL, Bancos, etc.)

**Tipos:**
- EPS, AFP, ARL, CCF (Caja Compensación)
- BAN (Banco), COO (Cooperativa), JUZ (Juzgado)
- GOB (ICBF, SENA), OTR (Otra)

**Campos Clave:**
- `codigo`: Código interno (EPS001, AFP002)
- `razon_social`, `nombre_comercial`
- `nit` + `digito_verificacion` (validado automáticamente)
- `codigo_superintendencia`, `codigo_pila`
- Contacto: dirección, teléfono, email, sitio_web
- Bancarios: `banco`, `tipo_cuenta`, `numero_cuenta`
- `aplica_para_pila`: Si se reporta en planilla

**Métodos:**
- `_calcular_digito_verificacion()`: Algoritmo DIAN estándar
- `nit_completo`: Retorna "NIT-DV"
- Properties: `es_eps`, `es_afp`, `es_arl`, `es_ccf`

**Validaciones:**
- ✅ Dígito de verificación correcto

---

#### **Modelo `AsientoNomina`**
**Propósito:** Asiento contable generado desde nómina cerrada

**Campos Clave:**
- `nomina_simple` / `nomina_electronica` (OneToOne)
- `numero_comprobante`: NOM-2026-000001
- `fecha_asiento`
- `total_debitos`, `total_creditos`
- `diferencia` (debe ser 0.00)
- `cuadrado`: True si débitos == créditos
- `estado`: BOR, CON (contabilizado), ANU (anulado)

**Integración:**
- `comprobante_contable` (FK): Link a módulo contabilidad si existe

**Métodos:**
- `generar_numero_comprobante()`: NOM-YYYY-NNNNNN
- `contabilizar(usuario)`: Marca como contabilizado (valida cuadre)
- `anular(usuario, motivo)`: Anula el asiento

**Validaciones:**
- ✅ Debe tener una nómina asociada
- ✅ Solo puede tener una nómina (simple o electrónica)
- ✅ Auto-cálculo de diferencia y cuadre

---

#### **Modelo `DetalleAsientoNomina`**
**Propósito:** Líneas individuales del asiento (débitos/créditos)

**Campos Clave:**
- `asiento` (FK)
- `cuenta` (FK PlanCuentas): Cuenta del PUC
- `centro_costo` (FK opcional): Para análisis de costos
- `entidad_externa` (FK opcional): Tercero (EPS, AFP)
- `naturaleza`: DB (débito) o CR (crédito)
- `valor`: Monto del movimiento
- `descripcion`: Detalle del movimiento
- `orden`: Orden de presentación

**Properties:**
- `es_debito`, `es_credito`

---

### 5. **Exports** (`payroll/models/__init__.py`)
**Propósito:** Centralizar imports

**Expone:**
- CentroCosto, DistribucionCostoNomina
- TipoNovedad, NovedadCalendario
- EntidadExterna, AsientoNomina, DetalleAsientoNomina

---

## 🎯 CARACTERÍSTICAS IMPLEMENTADAS

### ✅ **Arquitectura Modular**
- Separación clara de responsabilidades
- Modelos desacoplados por dominio
- Fácil mantenimiento y escalabilidad

### ✅ **Jerarquía de Centros de Costo**
- N niveles (sin límite)
- Auto-cálculo de nivel y ruta
- Propagación de costos a padres
- Validaciones de integridad

### ✅ **Distribución Proporcional de Costos**
- Cálculo automático según porcentaje
- Incluye cargas patronales completas
- Actualización automática de centros de costo
- Trazabilidad por obra

### ✅ **Gestión Completa de Ausentismos**
- Catálogo flexible de tipos de novedad
- Configuración granular de efectos
- Cálculo automático de días
- Integración PILA
- Workflow de aprobación

### ✅ **Integración Contable**
- Generación automática de asientos
- Validación de cuadre contable
- Discriminación por centro de costo
- Link con terceros
- Estados y trazabilidad

### ✅ **Cumplimiento Legal**
- Constantes actualizadas 2026
- Referencias legales documentadas
- Algoritmos oficiales (DV NIT, FSP, Retención)
- Marcas PILA estándar

---

## 📊 MÉTRICAS

| Componente | Líneas | Modelos | Métodos | Validaciones |
|------------|--------|---------|---------|--------------|
| constants.py | 400+ | - | 3 helpers | - |
| structural.py | 600+ | 2 | 15+ | 5 |
| time_attendance.py | 500+ | 2 | 10+ | 4 |
| accounting.py | 550+ | 3 | 8+ | 3 |
| **TOTAL** | **2050+** | **7** | **36+** | **12** |

---

## 🔗 RELACIONES ENTRE MODELOS

```
CentroCosto (self-referencing)
    ↓
DistribucionCostoNomina → NominaSimple / NominaElectronica
    ↓
AsientoNomina → DetalleAsientoNomina → PlanCuentas (contabilidad)
                                    ↓
                                EntidadExterna

TipoNovedad → NovedadCalendario → Empleado
                              ↓
                          CentroCosto
```

---

## ✅ PRÓXIMOS PASOS (FASE 2)

1. **Actualizar `payroll/models.py` existente:**
   - Agregar FKs opcionales a CentroCosto en Empleado
   - Agregar método `calcular_dias_trabajados()` usando NovedadCalendario
   - Actualizar `procesar_completo()` para usar nuevo sistema

2. **Crear migraciones:**
   ```bash
   python manage.py makemigrations payroll
   python manage.py migrate payroll
   ```

3. **Poblar datos iniciales:**
   - Script para crear TiposNovedad estándar
   - Script para crear EntidadesExternas base (ICBF, SENA)
   - Script para migrar datos históricos

4. **Tests unitarios:**
   - Test jerarquía CentroCosto
   - Test distribución proporcional
   - Test cálculo días con novedades
   - Test generación asiento contable

---

## 📝 NOTAS TÉCNICAS

### **Compatibilidad con Sistema Existente**
- ✅ No rompe modelos actuales (NominaBase, NominaSimple, etc.)
- ✅ Todos los FK nuevos son `null=True, blank=True` inicialmente
- ✅ Se puede implementar gradualmente

### **Performance**
- ✅ Índices en todas las FK críticas
- ✅ Queries optimizadas con `select_related` implícito
- ✅ Cálculos en BD donde sea posible

### **Seguridad**
- ✅ TenantAwareModel en todos los modelos
- ✅ Validaciones a nivel de modelo (clean)
- ✅ Protección de datos con CASCADE/PROTECT apropiados

### **Documentación**
- ✅ Docstrings completos en todos los modelos
- ✅ Help text en todos los campos
- ✅ Referencias legales en constants.py
- ✅ Ejemplos de uso en comentarios

---

## 🚀 **FASE 1 COMPLETADA AL 100%**

**Status:** ✅ LISTO PARA REVISIÓN Y MIGRACIÓN

**Fecha:** 2026-01-07  
**Autor:** Sistema CorteSec  
**Versión:** 1.0.0-fase1
