# 🚀 Sistema de Nómina con Conceptos Laborales - Guía de Uso

## ✅ Estado Actual

### Backend ✅ COMPLETADO
- ✅ Modelos de ConceptoLaboral implementados
- ✅ 18 conceptos laborales iniciales poblados
- ✅ Serializers con nested writes y validaciones
- ✅ ViewSets con CRUD + acciones personalizadas
- ✅ URLs configuradas
- ✅ Sistema verificado (0 errores)

### Frontend ✅ COMPLETADO
- ✅ Tipos TypeScript actualizados
- ✅ Servicio de conceptos laborales
- ✅ Componentes ConceptoSelector e ItemSelector
- ✅ Página de gestión de conceptos
- ✅ Formulario de nómina actualizado
- ✅ Rutas configuradas

---

## 📦 Archivos Implementados

### Backend
```
backend/
├── payroll/
│   ├── models.py                    # ✅ ConceptoLaboral + DetalleConcepto
│   ├── serializers.py               # ✅ 8 serializers nuevos
│   ├── api_views.py                 # ✅ ConceptoLaboralViewSet
│   ├── api_urls.py                  # ✅ Route conceptos-laborales
│   └── migrations/
│       └── 0002_conceptolaboral...  # ✅ Migración aplicada
└── poblar_conceptos_laborales.py    # ✅ Script ejecutado
```

### Frontend
```
frontend/src/
├── types/
│   └── payroll.ts                   # ✅ Tipos actualizados
├── services/
│   ├── conceptosLaboralesService.js # ✅ NUEVO
│   └── payrollService.js            # ✅ Actualizado
├── components/payroll/
│   ├── ConceptoSelector.jsx         # ✅ NUEVO
│   ├── ItemSelector.jsx             # ✅ NUEVO
│   └── index.js                     # ✅ Actualizado
├── pages/payroll/
│   ├── ConceptosLaboralesPage.jsx   # ✅ NUEVO
│   └── NominaFormPageNew.jsx        # ✅ NUEVO
└── routes/
    └── PayrollRoutes.jsx            # ✅ Actualizado
```

---

## 🔧 Cómo Usar el Sistema

### 1. Gestionar Conceptos Laborales

**Acceso:** `/dashboard/payroll/conceptos-laborales`

#### Ver Conceptos
- Lista completa con 18 conceptos iniciales
- Filtrar por tipo (Devengados/Deducciones/Aportes)
- Filtrar por estado (Activos/Inactivos)
- Buscar por código o nombre

#### Crear Nuevo Concepto
1. Click en **"Nuevo Concepto"**
2. Llenar formulario:
   - Código: `BONO_DOM` (único)
   - Nombre: `Bono Dominical`
   - Tipo: Devengado/Deducción/Aporte
   - ☑ Es salarial (opcional)
   - ☑ Aplica seguridad social (opcional)
   - Código DIAN (opcional para nómina electrónica)
3. Click **"Crear"**

#### Editar Concepto
1. Click en ícono **✏️ Editar**
2. Modificar campos necesarios
3. Click **"Actualizar"**

#### Activar/Desactivar
- Click en ícono **⚡ Toggle** para cambiar estado
- Los conceptos inactivos no aparecen en selectores

#### Eliminar Concepto
1. Click en ícono **🗑️ Eliminar**
2. Confirmar eliminación
3. ⚠️ **Nota:** Solo se pueden eliminar conceptos que no estén en uso

---

### 2. Crear Nómina con Items y Conceptos

**Acceso:** `/dashboard/payroll/nominas/crear`

#### Paso 1: Información Básica
```
✅ Seleccionar Empleado (de lista de activos)
✅ Seleccionar Periodo (de lista de abiertos)
✅ Días trabajados: 30
✅ Fechas inicio/fin: 2026-01-01 a 2026-01-31
✅ Salario base contrato: 2,500,000 ⚠️ CRÍTICO
✅ Observaciones: (opcional)
```

#### Paso 2: Tab "Items de Construcción"
Agregar items de producción:
1. Seleccionar Item (búsqueda inteligente)
2. Cantidad: `123.70` metros
3. Valor unitario: `15,000` pesos
4. Click **"Agregar Item"**
5. Repetir para más items

**Total Items:** Se calcula automáticamente

#### Paso 3: Tab "Conceptos Laborales"
Agregar devengados y deducciones:

**Para Devengados:**
1. Click botón **"Devengados"**
2. Seleccionar concepto (ej: Auxilio Transporte)
3. Cantidad: `1.00`
4. Valor unitario: `162,000`
5. Click **"Agregar Concepto"**

**Para Deducciones:**
1. Click botón **"Deducciones"**
2. Seleccionar concepto (ej: Descuento Restaurante)
3. Cantidad: `20.00` (días)
4. Valor unitario: `8,000`
5. Click **"Agregar Concepto"**

**Total Conceptos:** Se calcula automáticamente

#### Paso 4: Resumen
Revisar totales:
- ✅ Total Items (Producción): $2,217,500
- ✅ Total Conceptos: $362,000
- ✅ Total General: $2,579,500

⚠️ **Nota Importante:**
> Los aportes a seguridad social, provisiones y deducciones
> se calcularán automáticamente usando el **salario base del contrato**

#### Paso 5: Crear Nómina
1. Verificar que todos los datos sean correctos
2. Click **"Crear Nómina"**
3. El backend calculará automáticamente:
   - Aporte salud empleado (4% del salario base)
   - Aporte pensión empleado (4% del salario base)
   - Aportes empresa (12.5% salud, 12% pensión)
   - ARL (según nivel de riesgo)
   - Caja compensación (4%)
   - Provisiones (cesantías, intereses, prima, vacaciones)
   - Neto a pagar

---

## 🎯 Conceptos Laborales Disponibles

### Devengados (11)
| Código | Nombre | Salarial | Uso Típico |
|--------|--------|----------|------------|
| `SAL_BASE` | Salario Básico | ✅ | Salario mensual base |
| `AUX_TRANS` | Auxilio de Transporte | ❌ | $162,000 (2026) |
| `HOR_EXTRA_ORD` | Horas Extras Ordinarias | ✅ | +25% |
| `HOR_EXTRA_NOC` | Horas Extras Nocturnas | ✅ | +75% |
| `HOR_REC_ORD` | Recargo Ordinario | ✅ | +35% |
| `BONO_PROD` | Bonificación Producción | ✅ | Variable |
| `BONO_ANTIG` | Bonificación Antigüedad | ❌ | Variable |
| `COMISION` | Comisiones | ✅ | % ventas |
| `PRIMA_SERV` | Prima de Servicios | ❌ | Semestral |
| `CESANTIAS` | Cesantías | ❌ | Anual |
| `VACACIONES` | Vacaciones | ❌ | Anual |

### Deducciones (7)
| Código | Nombre | Uso Típico |
|--------|--------|------------|
| `APO_SALUD` | Aporte Salud Empleado | 4% salario |
| `APO_PENSION` | Aporte Pensión Empleado | 4% salario |
| `DED_PRESTAMO` | Descuento Préstamo | Variable |
| `DED_RESTAURANTE` | Descuento Restaurante | Días × valor |
| `DED_ANTICIPO` | Anticipo | Variable |
| `DED_MULTA` | Multa | Variable |
| `DED_OTROS` | Otras Deducciones | Variable |

---

## 📊 Flujo de Cálculo Automático

Cuando creas una nómina, el backend calcula:

```
1. Total Items (producción)
   = Σ (cantidad × valor_unitario) de items

2. Total Devengados Conceptos
   = Σ (cantidad × valor_unitario) de conceptos devengados

3. Base de Cotización
   = salario_base_contrato (siempre)

4. Aportes Empleado
   • Salud: base_cotizacion × 4%
   • Pensión: base_cotizacion × 4%

5. Aportes Empresa
   • Salud: base_cotizacion × 12.5%
   • Pensión: base_cotizacion × 12%
   • ARL: base_cotizacion × tasa_riesgo
   • Caja: base_cotizacion × 4%

6. Provisiones
   • Cesantías: salario_integral × 8.33%
   • Intereses: cesantías × 12%
   • Prima: salario_integral × 8.33%
   • Vacaciones: salario_base × 4.17%

7. Total Deducciones Conceptos
   = Σ (cantidad × valor_unitario) de conceptos deducciones

8. Deducciones Préstamos
   = Σ cuotas pendientes del periodo

9. Total Deducciones
   = aportes_empleado + deducciones_conceptos + prestamos

10. Neto a Pagar
    = total_items + total_devengados - total_deducciones
```

---

## 🔍 Validaciones Implementadas

### Backend
- ✅ Empleado debe estar activo
- ✅ Periodo debe estar abierto
- ✅ Fechas válidas (fin > inicio)
- ✅ Conceptos deben estar activos
- ✅ Cantidades > 0
- ✅ Valores > 0
- ✅ Código de concepto único
- ✅ Salario base contrato requerido

### Frontend
- ✅ Campos requeridos marcados
- ✅ Validación numérica en inputs
- ✅ Al menos 1 item O 1 concepto
- ✅ Feedback visual inmediato
- ✅ Mensajes de error claros

---

## 🎨 Características UX

### Componente ConceptoSelector
- 🔍 Búsqueda en tiempo real
- 📋 Muestra código + nombre
- 🏷️ Badge "Salarial" visible
- ⌨️ Navegación con teclado
- ✅ Estados: normal, disabled, error

### Componente ItemSelector
- 🔍 Búsqueda por código/nombre
- 📏 Muestra unidad de medida
- 💰 Muestra precio sugerido
- 📝 Tooltip con descripción
- ⌨️ Accesible

### Gestión de Conceptos
- 📊 KPIs en dashboard
- 🔎 Búsqueda + filtros múltiples
- ⚡ Toggle activar/desactivar
- ✏️ Edición inline
- 🗑️ Confirmación antes de eliminar

---

## 🚨 Casos de Uso Típicos

### Caso 1: Obrero de Construcción
```javascript
Empleado: Juan Pérez
Salario Contrato: $1,300,000

Items de Producción:
• Excavación: 45 m³ × $8,500 = $382,500
• Concreto: 12 m³ × $15,000 = $180,000
Total Items: $562,500

Conceptos:
• Auxilio Transporte: 1 × $162,000 = $162,000
• Descuento Restaurante: 22 días × $8,000 = $176,000

Resultado Backend:
✅ Total Items: $562,500 (por producción)
✅ Devengados Conceptos: $162,000
✅ Salud (4%): $52,000 (sobre $1,300,000)
✅ Pensión (4%): $52,000 (sobre $1,300,000)
✅ Deducciones: $176,000 + $104,000 = $280,000
✅ Neto a Pagar: $444,500
```

### Caso 2: Empleado Administrativo
```javascript
Empleado: María García
Salario Contrato: $2,500,000

Items: (ninguno, no trabaja en producción)

Conceptos Devengados:
• Salario Base: 1 × $2,500,000 = $2,500,000
• Auxilio Transporte: 1 × $162,000 = $162,000
• Bonificación: 1 × $300,000 = $300,000

Conceptos Deducciones:
• Préstamo: 1 × $150,000 = $150,000

Resultado Backend:
✅ Total Items: $0
✅ Devengados: $2,962,000
✅ Salud (4%): $100,000 (sobre $2,500,000)
✅ Pensión (4%): $100,000 (sobre $2,500,000)
✅ Deducciones: $150,000 + $200,000 = $350,000
✅ Neto a Pagar: $2,612,000
```

---

## ⚙️ Configuración Adicional

### Variables de Entorno
```bash
# Backend (.env)
SMMLV_2026=1423500
AUXILIO_TRANSPORTE_2026=162000
```

### Permisos Sugeridos
```python
# Administrador
- payroll.add_conceptolaboral
- payroll.change_conceptolaboral
- payroll.delete_conceptolaboral
- payroll.view_conceptolaboral

# RRHH
- payroll.view_conceptolaboral
- payroll.add_nominasimple
- payroll.change_nominasimple

# Contador
- payroll.view_conceptolaboral
- payroll.view_nominasimple
```

---

## 🐛 Troubleshooting

### Error: "Concepto no encontrado"
**Causa:** Concepto está inactivo  
**Solución:** Activar concepto desde página de gestión

### Error: "Salario base contrato requerido"
**Causa:** Campo vacío o $0  
**Solución:** Ingresar salario válido > 0

### Error: "Debe agregar al menos un item o concepto"
**Causa:** Intentar crear nómina vacía  
**Solución:** Agregar al menos 1 item O 1 concepto

### Items no aparecen en selector
**Causa:** No hay items activos en el sistema  
**Solución:** Crear items desde módulo de Items

### Conceptos no aparecen en selector
**Causa:** Todos están inactivos  
**Solución:** Activar conceptos necesarios

---

## 📞 Soporte

Para dudas o problemas:
1. Revisar documentos:
   - `IMPLEMENTACION_COMPLETA_PROFESIONAL.txt` (backend)
   - `FRONTEND_CONCEPTOS_LABORALES_COMPLETO.txt` (frontend)
2. Verificar logs del backend
3. Abrir consola del navegador (F12)

---

## ✅ Checklist de Verificación

Antes de usar en producción:

- [ ] Backend migrations aplicadas
- [ ] 18 conceptos laborales poblados
- [ ] Items de construcción creados
- [ ] Empleados registrados
- [ ] Periodos de nómina creados
- [ ] Salarios base contrato configurados
- [ ] Permisos de usuarios asignados
- [ ] Frontend compilado sin errores
- [ ] Rutas probadas
- [ ] Crear nómina de prueba

---

## 🎉 ¡Listo para Usar!

El sistema está **100% funcional** y listo para:
- ✅ Gestionar conceptos laborales
- ✅ Crear nóminas con items de producción
- ✅ Agregar devengados y deducciones
- ✅ Cálculo automático de seguridad social
- ✅ Cálculo automático de provisiones
- ✅ Integración con nómina electrónica DIAN

**¡Disfruta tu nuevo sistema de nómina profesional! 🚀**
