# 🔍 Sistema de Auditoría Detallada - Frontend

## ✅ YA ESTÁ IMPLEMENTADO Y FUNCIONANDO

El sistema de auditoría frontend registra **AUTOMÁTICAMENTE**:
- ✅ Cada página que visitas
- ✅ Cada botón que presionas
- ✅ Cada modal que abres
- ✅ Cada búsqueda que haces
- ✅ Cada filtro que aplicas
- ✅ Cada tab que cambias
- ✅ Cada exportación que realizas

## 📝 Cómo Usar en CUALQUIER Componente

### Paso 1: Importar el Hook

```jsx
import useAudit from '../../hooks/useAudit'
```

### Paso 2: Inicializar (al inicio del componente)

```jsx
const MiComponente = () => {
  const audit = useAudit('NombreDelModulo') // 🔥 Cambia esto según tu módulo
  
  // ... resto del código
}
```

### Paso 3: Usar en tus funciones

```jsx
// 🔘 BOTONES
const handleCrear = () => {
  audit.button('Crear Registro') // 🔥 Log automático
  // ... tu lógica
}

// 📋 MODALES
const handleAbrirModal = () => {
  audit.modalOpen('Modal Editar', { id: 123 }) // 🔥 Log automático
  setShowModal(true)
}

const handleCerrarModal = () => {
  audit.modalClose('Modal Editar') // 🔥 Log automático
  setShowModal(false)
}

// 🔍 BÚSQUEDAS
const handleBuscar = (termino) => {
  audit.search(termino, resultados.length) // 🔥 Log automático
  setBusqueda(termino)
}

// 🎚️ FILTROS
const handleFiltrar = (valor) => {
  audit.filter('Estado', valor) // 🔥 Log automático
  setFiltro(valor)
}

// 📊 TABS
const handleCambiarTab = (tabId) => {
  audit.tab(tabId) // 🔥 Log automático
  setActiveTab(tabId)
}

// 📥 EXPORTAR
const handleExportar = () => {
  audit.export('CSV', datos.length) // 🔥 Log automático
  exportarCSV()
}

// 📄 FORMULARIOS
const handleSubmit = (datos) => {
  audit.formSubmit('Formulario Crear', datos) // 🔥 Log automático
  // ... enviar al backend
}

// ❌ ERRORES
const handleError = (error) => {
  audit.error(error.message, { contexto: 'Al cargar datos' }) // 🔥 Log automático
  showNotification('error', error.message)
}

// 🎨 ACCIÓN PERSONALIZADA
const handleAccionPersonalizada = () => {
  audit.custom('accion_especial', { 
    dato1: 'valor1',
    dato2: 'valor2'
  }) // 🔥 Log automático
}
```

## 🎯 Ejemplos Completos por Módulo

### Módulo de Roles

```jsx
import React, { useState } from 'react'
import useAudit from '../../hooks/useAudit'

const RolesPage = () => {
  const audit = useAudit('Roles')
  const [showModal, setShowModal] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const handleCrearRol = () => {
    audit.button('Crear Rol')
    audit.modalOpen('Modal Crear Rol')
    setShowModal(true)
  }

  const handleGuardarRol = async (datos) => {
    audit.formSubmit('Formulario Crear Rol', datos)
    try {
      await rolesService.createRol(datos)
      audit.custom('rol_creado_exitoso', { rol: datos.nombre })
      audit.modalClose('Modal Crear Rol')
      setShowModal(false)
    } catch (error) {
      audit.error('Error al crear rol', { error: error.message })
    }
  }

  const handleBuscar = (termino) => {
    audit.search(termino)
    setBusqueda(termino)
  }

  const handleExportarCSV = () => {
    audit.export('CSV', roles.length)
    exportarCSV(roles)
  }

  return (
    // ... tu JSX
  )
}
```

### Módulo de Préstamos

```jsx
import useAudit from '../../hooks/useAudit'

const PrestamosPage = () => {
  const audit = useAudit('Prestamos')

  const handleAprobarPrestamo = (prestamoId) => {
    audit.button('Aprobar Préstamo')
    audit.custom('aprobar_prestamo', { prestamo_id: prestamoId })
    // ... lógica de aprobación
  }

  const handleRechazarPrestamo = (prestamoId, motivo) => {
    audit.button('Rechazar Préstamo')
    audit.custom('rechazar_prestamo', { 
      prestamo_id: prestamoId,
      motivo: motivo 
    })
    // ... lógica de rechazo
  }

  const handleDesembolsar = (prestamoId, monto) => {
    audit.button('Desembolsar')
    audit.custom('desembolsar_prestamo', { 
      prestamo_id: prestamoId,
      monto: monto 
    })
    // ... lógica de desembolso
  }

  // ... resto del componente
}
```

### Módulo de Empleados

```jsx
import useAudit from '../../hooks/useAudit'

const EmpleadosPage = () => {
  const audit = useAudit('Empleados')

  const handleCrearEmpleado = () => {
    audit.button('Crear Empleado')
    audit.modalOpen('Modal Crear Empleado')
    setShowModal(true)
  }

  const handleEditarEmpleado = (empleado) => {
    audit.button('Editar Empleado')
    audit.modalOpen('Modal Editar Empleado', { id: empleado.id })
    setEmpleadoSeleccionado(empleado)
    setShowModal(true)
  }

  const handleEliminarEmpleado = (empleadoId) => {
    audit.button('Eliminar Empleado')
    audit.custom('eliminar_empleado', { empleado_id: empleadoId })
    // ... lógica de eliminación
  }

  const handleCambiarEstado = (empleadoId, nuevoEstado) => {
    audit.button('Cambiar Estado')
    audit.custom('cambiar_estado_empleado', { 
      empleado_id: empleadoId,
      nuevo_estado: nuevoEstado 
    })
    // ... lógica de cambio de estado
  }

  // ... resto del componente
}
```

### Módulo de Auditoría (Meta!)

```jsx
import useAudit from '../../../hooks/useAudit'

const LogsTab = () => {
  const audit = useAudit('Auditoria')

  const handleAplicarFiltros = () => {
    audit.button('Aplicar Filtros')
    if (filtroAccion !== 'todos') audit.filter('Acción', filtroAccion)
    if (filtroModelo !== 'todos') audit.filter('Módulo', filtroModelo)
    if (fechaInicio) audit.filter('Fecha Inicio', fechaInicio)
    if (fechaFin) audit.filter('Fecha Fin', fechaFin)
    loadData()
  }

  const handleVerDetalle = (log) => {
    audit.button('Ver Detalle')
    audit.modalOpen('Modal Detalle Log', { log_id: log.id })
    setLogSeleccionado(log)
    setShowModal(true)
  }

  const handleExportarCSV = () => {
    audit.button('Exportar CSV')
    audit.export('CSV', logs.length)
    exportarCSV()
  }

  // ... resto del componente
}
```

## 🚀 Qué se Registra Automáticamente

Cada log incluye:

```json
{
  "usuario": "admin@cortesec.com",
  "accion": "click_boton",
  "modelo": "Roles",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2025-12-31T10:30:00Z",
  "metadata": {
    "boton": "Crear Rol",
    "url": "/dashboard/roles",
    "timestamp": "2025-12-31T10:30:00.123Z"
  }
}
```

## 📊 Ejemplos de Acciones que se Registran

### Navegación
- `navegar_pagina` - Cuando entras a una página

### Botones
- `click_boton` - Clicks generales
- Acciones específicas pasadas como segundo parámetro

### Modales
- `abrir_modal` - Al abrir un modal
- `cerrar_modal` - Al cerrar un modal

### Búsquedas
- `buscar` - Búsquedas de texto

### Filtros
- `aplicar_filtro` - Aplicación de filtros

### Formularios
- `enviar_formulario` - Envío de formularios

### Exportaciones
- `exportar_datos` - Exportar CSV/Excel

### Tabs
- `cambiar_tab` - Cambio de pestañas

### Errores
- `error_usuario` - Errores capturados

### Personalizadas
- Cualquier acción que definas con `audit.custom()`

## 🎯 Beneficios

1. **Trazabilidad Completa**: Sabes exactamente qué hizo cada usuario
2. **Análisis de Uso**: Qué módulos y funciones son más usados
3. **Detección de Problemas**: Ver dónde los usuarios tienen errores
4. **Seguridad**: Auditoría forense completa
5. **Mejora UX**: Analizar patrones de navegación

## ⚡ Optimizaciones

- ✅ **Logs en lote**: Se envían cada 5 segundos o cada 10 logs
- ✅ **No bloquea UI**: Envío asíncrono en segundo plano
- ✅ **Resistente a fallos**: Si falla el envío, se reintenta
- ✅ **Envío al cerrar**: Los logs pendientes se envían antes de cerrar la ventana

## 🛠️ Activar/Desactivar

```jsx
import auditLogger from './services/auditLogger'

// Desactivar temporalmente
auditLogger.disable()

// Reactivar
auditLogger.enable()
```

## 📝 Resumen de Implementación

Para agregar auditoría a CUALQUIER página:

1. Importar: `import useAudit from '../../hooks/useAudit'`
2. Inicializar: `const audit = useAudit('NombreModulo')`
3. Usar: `audit.button('Nombre del Botón')` en tus funciones

**¡ESO ES TODO!** El resto es automático. 🎉

---

**Sistema de Auditoría Detallada - Completamente Funcional** ✅  
**Última actualización:** 31 de diciembre de 2025
