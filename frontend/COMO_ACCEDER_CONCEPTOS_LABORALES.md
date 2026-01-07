# 🗺️ Rutas del Sistema - Conceptos Laborales

## ✅ CONFIGURACIÓN COMPLETADA

### Menú Sidebar
En el menú lateral, bajo **"Nómina Electrónica"**, ahora verás:

```
📂 Nómina Electrónica
   ├─ 📋 Nóminas Electrónicas
   ├─ 💰 Conceptos Laborales        ← NUEVO
   ├─ 👤 Portal Empleado
   ├─ 📊 Analytics
   ├─ 👥 Empleados
   ├─ 📄 Contratos
   ├─ 📅 Periodos
   ├─ ⚙️ Configuración
   ├─ 🔗 Webhooks
   └─ 📈 Reportes
```

---

## 🔗 URLs de Acceso

### 1. Gestión de Conceptos Laborales
**URL:** `http://localhost:5173/dashboard/nomina-electronica/conceptos-laborales`

**Funcionalidades:**
- Ver lista de 18 conceptos laborales
- Crear nuevo concepto
- Editar concepto existente
- Activar/Desactivar concepto
- Eliminar concepto
- Filtrar por tipo (Devengados/Deducciones)
- Buscar por código o nombre

---

### 2. Crear Nueva Nómina (Actualizada)
**URL:** `http://localhost:5173/dashboard/nomina-electronica/nominas/crear`

**Características:**
- Tab 1: Items de Construcción
- Tab 2: Conceptos Laborales
- Cálculos automáticos
- Validaciones completas

---

### 3. Lista de Nóminas Electrónicas
**URL:** `http://localhost:5173/dashboard/nomina-electronica/nominas`

---

## 🚀 Cómo Probar

### Paso 1: Iniciar Frontend
```bash
cd frontend
npm run dev
```

### Paso 2: Acceder al Sistema
1. Abrir navegador: `http://localhost:5173`
2. Login con tu usuario
3. Ir al sidebar → **"Nómina Electrónica"**
4. Click en **"Conceptos Laborales"** 💰

### Paso 3: Ver Conceptos
Deberías ver una página con:
- ✅ KPIs: Total, Devengados, Deducciones, Activos
- ✅ Barra de búsqueda
- ✅ Filtros por tipo y estado
- ✅ Tabla con 18 conceptos laborales
- ✅ Botón "Nuevo Concepto"

---

## 🎯 Conceptos Pre-Configurados

Al entrar verás estos 18 conceptos:

### 💚 Devengados (11):
1. SAL_BASE - Salario Básico
2. AUX_TRANS - Auxilio de Transporte
3. HOR_EXTRA_ORD - Horas Extras Ordinarias
4. HOR_EXTRA_NOC - Horas Extras Nocturnas
5. HOR_REC_ORD - Horas Recargo Ordinario
6. BONO_PROD - Bonificación por Producción
7. BONO_ANTIG - Bonificación por Antigüedad
8. COMISION - Comisiones
9. PRIMA_SERV - Prima de Servicios
10. CESANTIAS - Cesantías
11. VACACIONES - Vacaciones

### 🔴 Deducciones (7):
1. APO_SALUD - Aporte Salud Empleado
2. APO_PENSION - Aporte Pensión Empleado
3. DED_PRESTAMO - Descuento Préstamo
4. DED_RESTAURANTE - Descuento Restaurante
5. DED_ANTICIPO - Anticipo
6. DED_MULTA - Multa
7. DED_OTROS - Otras Deducciones

---

## 🎨 Qué Deberías Ver

### Página de Conceptos Laborales:
```
╔══════════════════════════════════════════════════════╗
║        CONCEPTOS LABORALES                            ║
║  Gestión de devengados, deducciones y aportes        ║
║                                      [Nuevo Concepto] ║
╠══════════════════════════════════════════════════════╣
║                                                       ║
║  [Total: 18]  [Devengados: 11]  [Deducciones: 7]    ║
║                                                       ║
║  [🔍 Buscar...] [Tipo] [Estado]                      ║
║                                                       ║
║  ┌─────────────────────────────────────────────────┐ ║
║  │ Código    │ Nombre              │ Tipo │ Estado │ ║
║  ├─────────────────────────────────────────────────┤ ║
║  │ SAL_BASE  │ Salario Básico      │ DEV  │ Activo│ ║
║  │ AUX_TRANS │ Auxilio Transporte  │ DEV  │ Activo│ ║
║  │ APO_SALUD │ Aporte Salud        │ DED  │ Activo│ ║
║  │ ...       │ ...                 │ ...  │ ...   │ ║
║  └─────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════╝
```

---

## 🐛 Troubleshooting

### No veo "Conceptos Laborales" en el menú
**Solución:**
1. Recargar la página (F5)
2. Limpiar caché del navegador (Ctrl+Shift+R)
3. Verificar que el frontend esté corriendo

### La página no carga
**Verificar:**
1. Backend corriendo: `http://localhost:8000`
2. Frontend corriendo: `http://localhost:5173`
3. Console del navegador (F12) para errores

### No aparecen conceptos
**Causa:** Backend no está corriendo o no tiene conceptos poblados

**Solución:**
```bash
cd backend
python poblar_conceptos_laborales.py
```

---

## 📱 Capturas de Pantalla Esperadas

### 1. Menú Sidebar
```
Deberías ver en el menú:
📂 Nómina Electrónica
   ├─ Nóminas Electrónicas
   ├─ 💰 Conceptos Laborales  ← ESTE ES NUEVO
   └─ ...
```

### 2. Página de Conceptos
- ✅ Header con título y botón "Nuevo Concepto"
- ✅ 4 tarjetas de estadísticas
- ✅ Barra de búsqueda y filtros
- ✅ Tabla con 18 filas de conceptos
- ✅ Botones de acción en cada fila

### 3. Modal de Crear Concepto
- ✅ Formulario con campos: código, nombre, tipo, etc.
- ✅ Checkboxes: Es salarial, Aplica SS, Activo
- ✅ Botones: Cancelar, Crear

---

## ✅ Checklist de Verificación

Después de recargar el navegador, verifica:

- [ ] Veo "Conceptos Laborales" en el sidebar
- [ ] Click en "Conceptos Laborales" me lleva a la página
- [ ] Veo 4 tarjetas con estadísticas (18, 11, 7, 18)
- [ ] Veo tabla con 18 conceptos laborales
- [ ] Puedo buscar conceptos
- [ ] Puedo filtrar por tipo
- [ ] Puedo crear nuevo concepto
- [ ] Puedo editar concepto existente
- [ ] Puedo activar/desactivar concepto

---

## 🎉 ¡Listo para Usar!

Si ves "Conceptos Laborales" en el menú y puedes acceder a la página,
**¡el sistema está correctamente configurado!** 🚀

### Próximos Pasos:
1. ✅ Explorar los 18 conceptos pre-configurados
2. ✅ Crear un concepto de prueba
3. ✅ Ir a "Crear Nómina" y usar los selectores
4. ✅ Crear una nómina completa con items + conceptos

**¡Disfruta tu nuevo sistema de nómina profesional!** 💪
