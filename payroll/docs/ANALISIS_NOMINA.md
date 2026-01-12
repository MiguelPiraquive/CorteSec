# 📊 ANÁLISIS EXHAUSTIVO: NÓMINA ACTUAL vs NÓMINA REQUERIDA
## Sistema CorteSec - Módulo de Nómina

---

## 🔍 ESTADO ACTUAL

### ✅ LO QUE YA TIENES:

#### 1. **MODELO: Empleado** (payroll/models.py)
```
✓ Tipo de documento: NO (solo campo 'documento')
✓ Número de documento: SÍ
✓ Nombre completo: SÍ (nombres + apellidos)
✓ Dirección: SÍ
✓ Teléfono: SÍ
✓ Correo: SÍ
✓ Ciudad: SÍ (departamento + municipio)
✓ Cargo: SÍ (FK a Cargo)
✗ Área/dependencia: NO
✗ Tipo de trabajador: NO
✓ Fecha de ingreso: NO (solo fecha de creación)
✓ Estado (activo/retirado): SÍ (campo 'activo')
```

#### 2. **MODELO: Cargo** (cargos/models.py)
```
✓ Salario base mínimo: SÍ
✓ Salario base máximo: SÍ
✓ Nivel jerárquico: SÍ
✗ Información de contrato: NO
```

#### 3. **MODELO: Nomina** (payroll/models.py)
```
ESTRUCTURA ACTUAL:
- empleado (FK)
- periodo_inicio
- periodo_fin
- seguridad (Decimal) ← Solo un monto genérico
- prestamos (Decimal) ← Solo un monto genérico  
- restaurante (Decimal) ← Solo un monto genérico
- DetalleNomina (item + cantidad)

PROBLEMAS:
❌ No separa tipos de salario
❌ No maneja horas extras
❌ No separa auxilios
❌ No calcula aportes patronales
❌ No tiene deducciones granulares
❌ No tiene información de contrato
❌ No calcula días trabajados/incapacidad
❌ No tiene estructura para DIAN
```

#### 4. **MÓDULOS RELACIONADOS:**
```
✓ prestamos/: Sistema completo de préstamos (puede integrarse)
✓ contabilidad/: Plan de cuentas y comprobantes
✓ items/: Gestión de items (usado actualmente para producción)
✓ cargos/: Estructura de cargos con salarios
```

---

## 🎯 LO QUE NECESITAS (Según tu solicitud)

### 📦 MÓDULO 1: DATOS DEL EMPLEADO
```
FALTANTE:
- tipo_documento (CC, CE, TI, PA, etc.)
- area_dependencia
- tipo_trabajador (Dependiente, Aprendiz, Pensionado)
- fecha_ingreso (laboral, no de creación del registro)
- estado (activo/retirado/suspendido/vacaciones)
```

### 📄 MÓDULO 2: CONTRATO (¡NO EXISTE!)
```
DEBE CREARSE NUEVO MODELO: Contrato
- tipo_contrato (Indefinido, Fijo, Obra/Labor)
- tipo_salario (Ordinario, Integral)
- salario_base
- jornada (Diurna, Nocturna, Mixta)
- tiene_auxilio_transporte (Boolean)
- nivel_riesgo_arl (1-5)
- fecha_inicio_contrato
- fecha_fin_contrato (nullable)
- empleado (FK)
```

### 📅 MÓDULO 3: PERIODO DE NÓMINA (¡NO EXISTE!)
```
DEBE CREARSE NUEVO MODELO: PeriodoNomina
- tipo (Mensual, Quincenal)
- fecha_inicio
- fecha_fin
- fecha_pago
- dias_trabajados
- dias_incapacidad
- dias_licencia
- dias_vacaciones
- estado (Abierto, Cerrado, Pagado)
```

### 💰 MÓDULO 4: DEVENGADOS (¡ESTRUCTURA INADECUADA!)
```
DEBE REESTRUCTURARSE COMPLETAMENTE:

A. Salario Base:
   - salario_basico
   - pago_dias
   - pago_horas

B. Horas Extras (NUEVO):
   - hora_extra_diurna
   - hora_extra_nocturna
   - hora_extra_dominical
   - hora_extra_festiva
   - recargo_nocturno
   - recargo_dominical_festivo

C. Auxilios (NUEVO):
   - auxilio_transporte
   - auxilio_alimentacion
   - auxilio_conectividad

D. Ingresos Variables (NUEVO):
   - bonificaciones_salariales
   - bonificaciones_no_salariales
   - comisiones
   - viaticos

E. Prestaciones (NUEVO):
   - prima
   - cesantias
   - intereses_cesantias
   - vacaciones
```

### 📉 MÓDULO 5: DEDUCCIONES (¡INADECUADO!)
```
ACTUAL: Solo "seguridad", "prestamos", "restaurante" como montos totales

DEBE SER:

A. Seguridad Social:
   - deduccion_salud (4%)
   - deduccion_pension (4%)

B. Retenciones:
   - retencion_fuente (calculado)

C. Otros Descuentos:
   - libranzas
   - prestamos (FK a Prestamo)
   - embargos
   - fondo_empleados
   - cooperativas
   - restaurante (el que ya tienes)
```

### 🏥 MÓDULO 6: APORTES PATRONALES (¡NO EXISTE!)
```
DEBE CREARSE:

A. Seguridad Social Empresa:
   - aporte_salud_empresa (8.5%)
   - aporte_pension_empresa (12%)
   - aporte_arl (según riesgo)

B. Parafiscales:
   - aporte_caja_compensacion (4%)
   - aporte_icbf (3%)
   - aporte_sena (2%)

NOTA: No se descuenta del empleado, pero es obligatorio reportar
```

### 🧮 MÓDULO 7: TOTALES (¡INADECUADO!)
```
ACTUAL: Solo property 'total' = produccion - deducciones

DEBE SER:
- total_devengados (suma todos los devengados)
- total_deducciones (suma todas las deducciones)
- neto_pagar (devengados - deducciones)
- total_aportes_empresa (suma aportes patronales)
- costo_total_empleado (neto + aportes empresa)
```

### 🧾 MÓDULO 8: NÓMINA ELECTRÓNICA DIAN (¡NO EXISTE!)
```
DEBE CREARSE NUEVO MODELO: NominaElectronica

- nomina (FK)
- numero_documento_electronico
- cune (Código Único de Nómina Electrónica)
- fecha_generacion
- xml_contenido (TextField o FileField)
- firma_digital
- estado_dian (Aceptado, Rechazado, Pendiente)
- respuesta_dian (JSON con respuesta)
```

---

## 🚨 PROBLEMAS CRÍTICOS DETECTADOS

### 1. **ARQUITECTURA INADECUADA**
```
❌ DetalleNomina usa "Item" para producción
   - Item es para inventario, no para conceptos de nómina
   - No permite separar tipos de devengados/deducciones
   - No tiene metadata necesaria (horas, porcentajes, etc.)
```

### 2. **FALTA INFORMACIÓN CONTRACTUAL**
```
❌ No hay modelo Contrato
❌ No se sabe tipo de contrato del empleado
❌ No se sabe tipo de salario (ordinario vs integral)
❌ No se sabe nivel de riesgo ARL
```

### 3. **CÁLCULOS NO CONFORMES CON LEY COLOMBIANA**
```
❌ No calcula seguridad social correctamente (4% salud, 4% pensión)
❌ No calcula aportes patronales
❌ No calcula parafiscales
❌ No maneja salario integral vs ordinario
❌ No calcula horas extras según legislación
```

### 4. **NO HAY TRAZABILIDAD**
```
❌ No guarda histórico de contratos
❌ No guarda histórico de salarios
❌ No hay auditoría de cambios en nómina
```

### 5. **NO CUMPLE REQUISITOS DIAN**
```
❌ No genera nómina electrónica
❌ No genera CUNE
❌ No genera XML
❌ No guarda firma digital
❌ No separa conceptos según lo requiere DIAN
```

---

## 📋 PROPUESTA DE NUEVOS MODELOS

### Modelo 1: TipoDocumento (Catálogo)
```python
- codigo (CC, CE, TI, PA, etc.)
- nombre
- descripcion
```

### Modelo 2: TipoTrabajador (Catálogo)
```python
- codigo (DEP, APR, PEN)
- nombre (Dependiente, Aprendiz, Pensionado)
```

### Modelo 3: TipoContrato (Catálogo)
```python
- codigo
- nombre (Indefinido, Fijo, Obra)
```

### Modelo 4: Contrato
```python
- empleado (FK)
- tipo_contrato (FK)
- tipo_salario (Ordinario/Integral)
- salario_base
- jornada
- auxilio_transporte (Boolean)
- nivel_riesgo_arl
- fecha_inicio
- fecha_fin
- estado (Activo/Terminado)
```

### Modelo 5: PeriodoNomina
```python
- organization (FK)
- nombre
- tipo (Mensual/Quincenal)
- fecha_inicio
- fecha_fin
- fecha_pago
- estado (Abierto/Cerrado/Pagado)
```

### Modelo 6: Nomina (REESTRUCTURAR)
```python
- periodo (FK a PeriodoNomina)
- empleado (FK)
- contrato (FK)
- dias_trabajados
- dias_incapacidad
- dias_licencia
- dias_vacaciones

# Devengados
- salario_base
- horas_extras_diurnas
- horas_extras_nocturnas
- (... todos los conceptos separados)

# Deducciones
- deduccion_salud
- deduccion_pension
- retencion_fuente
- (... todas las deducciones separadas)

# Aportes Patronales
- aporte_salud_empresa
- aporte_pension_empresa
- aporte_arl
- aporte_caja
- aporte_icbf
- aporte_sena

# Totales
- total_devengados
- total_deducciones
- neto_pagar
- total_aportes_empresa
- costo_total
```

### Modelo 7: DetalleDevengado (NUEVO)
```python
- nomina (FK)
- tipo_devengado (FK a catálogo)
- concepto
- cantidad (horas, días, unidades)
- valor_unitario
- valor_total
- es_salarial (Boolean)
```

### Modelo 8: DetalleDeduccion (NUEVO)
```python
- nomina (FK)
- tipo_deduccion (FK a catálogo)
- concepto
- valor
- porcentaje (si aplica)
- prestamo (FK nullable)
```

### Modelo 9: NominaElectronica
```python
- nomina (FK)
- numero_documento
- cune
- fecha_generacion
- xml_file (FileField)
- estado_dian
- respuesta_dian (JSON)
```

---

## 🔗 INTEGRACIONES EXISTENTES A MANTENER

### 1. **Préstamos**
```
✓ Sistema de préstamos ya existe
✓ Puede usarse para deducciones
✓ Debe referenciarse en DetalleDeduccion
```

### 2. **Contabilidad**
```
✓ Cada nómina debe generar comprobante contable
✓ Usar PlanCuentas para cuentas contables
✓ Generar MovimientoContable automático
```

### 3. **Items** (ELIMINAR O REDISEÑAR)
```
? Actualmente usa Items para "producción"
? No es correcto mezclar inventario con nómina
? Opción 1: Crear ConceptoNomina separado
? Opción 2: Mantener Items solo si es producción real (destajo)
```

---

## 📊 RESUMEN EJECUTIVO

### LO QUE TIENES:
- ✅ Empleados básicos
- ✅ Cargos con salarios
- ✅ Nómina simplificada (periodo + deducciones básicas)
- ✅ Préstamos (separado)
- ✅ Contabilidad (separado)

### LO QUE FALTA:
- ❌ Información contractual (8 campos críticos)
- ❌ Periodo de nómina estructurado
- ❌ Devengados granulares (25+ conceptos)
- ❌ Deducciones granulares (10+ conceptos)
- ❌ Aportes patronales (6 conceptos)
- ❌ Nómina electrónica DIAN
- ❌ Cálculos automáticos según ley colombiana
- ❌ Auditoría y trazabilidad

### COMPLEJIDAD:
```
Cambio Arquitectónico: ALTO
- Requiere nuevos modelos
- Requiere migraciones complejas
- Requiere lógica de cálculo nueva
- Requiere integración DIAN

Impacto en Frontend: ALTO
- Nuevas vistas de contrato
- Nueva vista de periodo
- Nueva vista de nómina (más compleja)
- Reportes y liquidaciones

Tiempo Estimado: 40-60 horas
```

---

## ❓ DECISIONES QUE DEBEMOS TOMAR

### 1. **¿Qué hacer con DetalleNomina actual?**
   - A) Eliminarlo y crear estructura nueva
   - B) Mantenerlo solo para "producción/destajo"
   - C) Migrarlo a nuevo sistema

### 2. **¿Qué hacer con datos existentes?**
   - A) Migrar nóminas existentes
   - B) Archivar y empezar limpio
   - C) Mantener ambos sistemas

### 3. **¿Implementación?**
   - A) Todo de una vez (más rápido pero riesgoso)
   - B) Por fases (más seguro pero más lento)
   - C) Sistema paralelo (más trabajo pero sin downtime)

### 4. **¿Nivel de automatización?**
   - A) Cálculo 100% automático
   - B) Cálculo sugerido + revisión manual
   - C) Ingreso manual con validaciones

### 5. **¿Integración DIAN?**
   - A) Completa desde día 1
   - B) Preparar estructura, integrar después
   - C) Solo estructura, sin integración

---

## ✅ MI RECOMENDACIÓN

**ENFOQUE PROPUESTO:**

1. **FASE 1: Estructura Base (Semana 1-2)**
   - Crear modelos de catálogos
   - Crear modelo Contrato
   - Crear modelo PeriodoNomina
   - Migrar datos de Empleado (agregar campos)

2. **FASE 2: Nómina Nueva (Semana 2-3)**
   - Crear nueva estructura de Nómina
   - Implementar cálculos automáticos
   - Mantener DetalleNomina para producción/destajo
   - Crear DetalleDevengado y DetalleDeduccion

3. **FASE 3: Integraciones (Semana 3-4)**
   - Integrar con Préstamos
   - Integrar con Contabilidad
   - Auditoría y logs

4. **FASE 4: DIAN (Semana 4-5)**
   - Crear modelo NominaElectronica
   - Preparar generación XML
   - Preparar firma digital
   - Dejar integración real para después

---

## 🎯 PREGUNTA FINAL

**¿Estás de acuerdo con:**

1. ✅ Reestructurar completamente el módulo de nómina
2. ✅ Crear 8-10 modelos nuevos
3. ✅ Implementar cálculos automáticos según ley colombiana
4. ✅ Preparar estructura para DIAN (XML después)
5. ✅ Mantener items/producción separado de nómina formal
6. ✅ Implementación por fases (4-5 semanas)

**¿Comenzamos?** 🚀
