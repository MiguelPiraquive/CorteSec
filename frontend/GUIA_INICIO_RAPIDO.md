# 🚀 Guía de Inicio Rápido - CorteSec Nómina Electrónica

## ✅ Sistema Completado

¡El sistema de Nómina Electrónica está **100% completado** y listo para usar! 🎉

---

## 📍 Cómo Acceder

### 1. Iniciar el Sistema

**Backend (Terminal 1):**
```bash
cd backend
python manage.py runserver
```

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```

### 2. Acceder al Dashboard

1. Abrir navegador: `http://localhost:5173`
2. Iniciar sesión
3. En el sidebar izquierdo, ver la nueva sección: **"Nómina Electrónica" 💼**

---

## 🎯 Rutas Disponibles en el Sidebar

Cuando abras el sidebar, encontrarás el nuevo menú **"Nómina Electrónica"** con estas opciones:

```
📁 Nómina Electrónica (Color: Índigo 🟣)
  │
  ├── 📄 Nóminas Electrónicas
  │   └── Lista completa con procesamiento automático
  │
  ├── 👤 Portal Empleado
  │   └── Vista para que empleados consulten sus nóminas
  │
  ├── 📊 Analytics
  │   └── Dashboard con métricas y gráficos de la DIAN
  │
  ├── 👥 Empleados
  │   └── CRUD completo de empleados
  │
  ├── 📝 Contratos
  │   └── Gestión de contratos laborales
  │
  ├── 📅 Periodos
  │   └── Administrar periodos de liquidación
  │
  ├── ⚙️ Configuración
  │   └── Configurar empresa y certificado DIAN
  │
  ├── 🔗 Webhooks
  │   └── Notificaciones automáticas
  │
  └── 📈 Reportes
      └── Gráficos y exportación de datos
```

---

## 🎬 Tutorial Paso a Paso

### PASO 1: Configurar la Empresa (⚙️ Configuración)

1. Click en **"Configuración"** en el menú
2. Completar:
   - **Información de la Empresa**: Razón social, NIT, dirección
   - **Configuración DIAN**: Software ID, PIN, ambiente
   - **Certificado Digital**: Subir archivo .p12 o .pfx
3. Click **"Probar Conexión DIAN"** para verificar
4. Click **"Guardar Configuración"**

✅ Configuración lista

---

### PASO 2: Crear Empleados (👥 Empleados)

1. Click en **"Empleados"** en el menú
2. Click botón **"Nuevo Empleado"** (azul, arriba derecha)
3. Completar formulario:
   - Tipo y número de documento
   - Nombres y apellidos
   - Fecha de nacimiento
   - Género
   - Contacto (email, teléfono)
   - Dirección
4. Click **"Crear"**

✅ Empleado registrado

---

### PASO 3: Crear Contratos (📝 Contratos)

1. Click en **"Contratos"** en el menú
2. Click **"Nuevo Contrato"**
3. Seleccionar:
   - **Empleado** (del listado)
   - **Tipo de contrato**: Indefinido, Fijo, Obra, Prestación
   - **Fecha inicio** y fin (opcional)
   - **Salario base**
4. Click **"Crear"**

✅ Contrato creado

---

### PASO 4: Crear Periodo (📅 Periodos)

1. Click en **"Periodos"** en el menú
2. Click **"Nuevo Periodo"**
3. Completar:
   - **Nombre**: Ej: "Nómina Enero 2024"
   - **Tipo**: Mensual, Quincenal, Semanal
   - **Año y Mes**
   - **Fechas de inicio y fin**
4. Click **"Crear"**

✅ Periodo listo para liquidar

---

### PASO 5: Crear Nómina (📄 Nóminas Electrónicas)

1. Click en **"Nóminas Electrónicas"** en el menú
2. Click **"Nueva Nómina"** (arriba derecha)
3. Seleccionar:
   - **Empleado**
   - **Periodo**
   - **Días trabajados**

4. **OPCIÓN A - Cálculo Automático** (Recomendado):
   - Click botón **"Calcular Automáticamente"** 🧮
   - Sistema calcula todo (salario, prestaciones, deducciones)
   - Revisar conceptos generados

5. **OPCIÓN B - Manual**:
   - Agregar conceptos uno por uno:
     * Concepto (nombre)
     * Tipo (Devengado o Deducción)
     * Valor
   - Click **"Agregar"** por cada concepto

6. Revisar **Totales** al final:
   - Total Devengado (verde)
   - Total Deducciones (rojo)
   - Neto a Pagar (azul)

7. Click **"Crear Nómina"**

✅ Nómina creada en estado BORRADOR

---

### PASO 6: Procesar Nómina Electrónica (🚀 Lo Más Importante)

1. En la lista de **"Nóminas Electrónicas"**
2. Buscar la nómina recién creada
3. Click botón **"Procesar"** (azul con icono de avión ✈️)

**¿Qué hace "Procesar"?**
- ✅ Genera XML según formato DIAN
- ✅ Firma digitalmente con certificado
- ✅ Envía automáticamente a la DIAN
- ✅ Espera respuesta
- ✅ Actualiza estado

**Estados posibles:**
- 🟡 **Borrador**: Sin procesar
- 🔵 **Generado**: XML creado
- 🔵 **Firmado**: XML firmado
- 🟡 **Enviado**: Esperando respuesta DIAN
- 🟢 **Aceptado**: ✅ Aprobado por DIAN
- 🔴 **Rechazado**: ❌ Rechazado por DIAN

4. Esperar unos segundos
5. Click **"Actualizar"** para ver nuevo estado
6. Si estado es **"ACEPTADO"** ✅:
   - Click **"Descargar PDF"** 📄
   - Click **"Descargar XML"** 📥

✅ Nómina electrónica procesada y aprobada

---

## 📊 Ver Reportes y Analytics

### Reportes (📈)
1. Click en **"Reportes"** en el menú
2. Seleccionar año y mes
3. Ver automáticamente:
   - **4 KPIs** en tarjetas
   - **3 Gráficos** profesionales:
     * Barras: Distribución mensual
     * Líneas: Tendencia 6 meses
     * Pie: Análisis de costos
   - **Tabla detallada** por empleado
4. Click **"Exportar Excel"** o **"Exportar CSV"** para descargar

### Analytics (📊)
1. Click en **"Analytics"** en el menú
2. Seleccionar periodo (7, 30, 90 días)
3. Ver:
   - **5 KPIs principales**
   - **Alertas del sistema**
   - **Códigos respuesta DIAN** con barras
   - **Tiempos de respuesta**
   - **Errores frecuentes**

---

## 👤 Portal del Empleado

### ¿Qué es?
Vista especial para que **empleados** (no administradores) consulten sus propias nóminas.

### ¿Cómo acceder?
1. Empleado inicia sesión con su cuenta
2. Click en **"Portal Empleado"**

### ¿Qué puede hacer el empleado?
- ✅ Ver sus **4 KPIs personales**
- ✅ Consultar **historial de nóminas**
- ✅ **Descargar PDF** de comprobantes
- ✅ **Descargar XML** firmado
- ✅ **Verificar autenticidad** con DIAN (click en 🛡️)
- ✅ **Reportar inconsistencias** si encuentra errores

---

## 🔗 Webhooks (Avanzado)

### ¿Qué son?
Notificaciones automáticas a URLs externas cuando ocurren eventos.

### Configurar Webhook:
1. Click en **"Webhooks"**
2. Click **"Nuevo Webhook"**
3. Completar:
   - **Nombre**: Ej: "Notificar a Slack"
   - **URL**: https://hooks.slack.com/services/...
   - **Eventos**: Seleccionar (Ctrl+Click):
     * nomina_creada
     * ne_aceptada
     * ne_rechazada
   - **Reintentos**: 3
   - **Timeout**: 30 segundos
4. Click **"Crear"**
5. Click **"Probar"** (icono ▶️) para verificar

### Ver Logs:
- Click en **"Ver Logs"** (icono 👁️) para ver historial de envíos

---

## 🎨 Características Visuales

### Colores por Estado
- 🟢 **Verde**: Aprobado, Activo, Success
- 🔴 **Rojo**: Rechazado, Inactivo, Error
- 🟡 **Amarillo**: Pendiente, Warning
- 🔵 **Azul**: En proceso, Info
- ⚪ **Gris**: Borrador, Default

### Iconos Intuitivos
- ✏️ **Editar**: Lápiz
- 🗑️ **Eliminar**: Papelera
- 👁️ **Ver**: Ojo
- 📥 **Descargar**: Flecha abajo
- ✈️ **Procesar**: Avión
- 🔄 **Actualizar**: Flechas circulares
- ➕ **Crear**: Plus
- 🔍 **Buscar**: Lupa

---

## 🔧 Solución de Problemas

### ❌ "No veo el menú de Nómina Electrónica"
1. Actualizar página (F5)
2. Verificar que frontend esté corriendo
3. Limpiar caché del navegador

### ❌ "Error al procesar nómina"
1. Verificar configuración DIAN en **Configuración**
2. Asegurarse de tener certificado válido
3. Probar conexión con botón **"Probar Conexión DIAN"**
4. Revisar que el backend esté corriendo

### ❌ "No puedo descargar PDF/XML"
1. Verificar que nómina esté en estado **"Aceptado"**
2. Primero procesar con botón **"Procesar"**
3. Esperar a que cambie de estado

### ❌ "Gráficos no se muestran"
1. Ejecutar: `npm install recharts`
2. Reiniciar frontend
3. Limpiar caché

---

## 📖 Documentación Completa

Para documentación técnica detallada, ver:
- **Frontend**: `frontend/SISTEMA_COMPLETO_NOMINA_ELECTRONICA.md`
- **Backend**: `backend/FASE_3_COMPLETADA.md`

---

## 🎯 Flujo Completo Resumido

```
1. Configurar empresa ⚙️
   ↓
2. Crear empleado 👤
   ↓
3. Crear contrato 📝
   ↓
4. Crear periodo 📅
   ↓
5. Crear nómina 📄
   ↓
6. Procesar (XML+Firma+DIAN) ✈️
   ↓
7. Ver estado ✅
   ↓
8. Descargar PDF y XML 📥
   ↓
9. Ver reportes 📊
```

---

## 🎉 ¡Listo para Usar!

El sistema está **completamente funcional** con:
- ✅ 10 páginas completas
- ✅ CRUD de empleados, contratos, periodos
- ✅ Procesamiento automático de nómina electrónica
- ✅ Integración con DIAN
- ✅ Gráficos profesionales
- ✅ Portal para empleados
- ✅ Webhooks
- ✅ Reportes exportables

**¡Disfruta del sistema!** 🚀

---

## 📞 ¿Necesitas Ayuda?

Si tienes dudas:
1. Revisar esta guía
2. Ver documentación técnica completa
3. Revisar logs del navegador (F12 > Console)
4. Revisar logs del backend en terminal

---

**Última actualización**: 1 de Enero de 2026
**Versión**: 1.0.0 - Sistema Completo
