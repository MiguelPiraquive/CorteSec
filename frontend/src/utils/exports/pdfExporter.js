/**
 * Exportador PDF para Dashboard CorteSec - Versión Súper Robusta y Completa
 * ============================================================================
 * 
 * Características avanzadas:
 * - Soporte completo para todos los módulos del sistema
 * - Exportación filtrada y completa
 * - Tablas detalladas con paginación automática
 * - Gráficos y métricas avanzadas
 * - Formato corporativo profesional
 * - Soporte para múltiples idiomas
 * 
 * @version 2.0.0
 * @author CorteSec Solutions
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { captureMultipleCharts, DASHBOARD_CHARTS, getChartMetadata } from './chartCapture.js';

// Configuración de colores corporativos
const COLORS = {
  primary: [16, 185, 129],      // Verde CorteSec
  secondary: [59, 130, 246],    // Azul
  warning: [245, 158, 11],      // Naranja/Amarillo
  danger: [239, 68, 68],        // Rojo
  success: [34, 197, 94],       // Verde claro
  purple: [147, 51, 234],       // Púrpura
  brown: [139, 69, 19],         // Marrón
  gray: [107, 114, 128]         // Gris
};

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES PARA CAPTURA DE GRÁFICOS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Captura múltiples gráficos del dashboard usando las utilidades optimizadas
 * @returns {Promise<Object>} - Objeto con las imágenes capturadas
 */
const captureDashboardCharts = async () => {
  console.log('🎯 Iniciando captura optimizada de gráficos del dashboard...');
  
  try {
    // Usar la lista predefinida de gráficos del dashboard
    const chartIds = Object.values(DASHBOARD_CHARTS);
    
    // Capturar gráficos con configuración optimizada para PDF
    const chartImages = await captureMultipleCharts(chartIds, {
      format: 'image/png',
      quality: 1.0,
      backgroundColor: '#ffffff'  // Fondo blanco para el PDF
    });
    
    // Agregar metadatos útiles para el PDF
    const chartsWithMetadata = {};
    for (const [chartId, imageData] of Object.entries(chartImages)) {
      const metadata = getChartMetadata(chartId);
      chartsWithMetadata[chartId] = {
        imageData,
        metadata,
        title: metadata.title,
        hasData: metadata.hasData
      };
    }
    
    console.log(`🎯 Captura optimizada completada. ${Object.keys(chartsWithMetadata).length} gráficos procesados.`);
    return chartsWithMetadata;
    
  } catch (error) {
    console.error('❌ Error en captura optimizada de gráficos:', error);
    return {};
  }
};

// Utilidades para formateo
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '$0';
  return '$' + amount.toLocaleString('es-ES');
};

const formatPercentage = (value) => {
  if (!value && value !== 0) return '0%';
  return Math.round(value) + '%';
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('es-ES');
};

const safeString = (str) => {
  if (!str) return 'N/A';
  // Remover caracteres especiales que pueden causar problemas en PDF
  return String(str)
    .replace(/[^\w\s\-.,()[\]]/g, '')
    .replace(/[áàâã]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõ]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .substring(0, 50); // Límite de caracteres
};

/**
 * Genera archivo PDF súper completo para exportación
 * @param {Object} comprehensiveExportData - Datos completos para exportación
 * @param {Object} options - Opciones de exportación (filtrada vs completa)
 * @returns {Object} - {blob, fileName, mimeType}
 */
export const generatePDFExport = async (comprehensiveExportData, options = {}) => {
  try {
    // Crear nuevo documento PDF en formato A4
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Verificar que autoTable esté disponible
    if (typeof doc.autoTable !== 'function') {
      console.error('autoTable no esta disponible en doc');
      console.log('Intentando usar autoTable importado directamente...');
      
      if (typeof autoTable !== 'function') {
        console.error('autoTable tampoco esta disponible como función importada');
        throw new Error('Plugin autoTable no se pudo cargar correctamente');
      }
    }
    
    console.log('autoTable esta configurado y listo para usar');
    
    // Crear función wrapper para autoTable
    const createTable = (tableOptions) => {
      if (typeof doc.autoTable === 'function') {
        return doc.autoTable(tableOptions);
      } else if (typeof autoTable === 'function') {
        return autoTable(doc, tableOptions);
      } else {
        throw new Error('No se pudo encontrar una función autoTable valida');
      }
    };
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let currentY = 20;

    // ═══════════════════════════════════════════════════════════════════════════
    // ENCABEZADO CORPORATIVO PROFESIONAL MEJORADO
    // ═══════════════════════════════════════════════════════════════════════════
    
    const addHeader = () => {
      // Fondo gradiente simulado con rectángulos
      doc.setFillColor(...COLORS.primary);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Línea decorativa superior
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 37, pageWidth, 3, 'F');
      
      // Título principal
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(26);
      doc.setFont('helvetica', 'bold');
      doc.text('CORTESEC', pageWidth / 2, 15, { align: 'center' });
      
      // Subtítulo
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('CONTRACTOR MANAGEMENT SYSTEM v2.0', pageWidth / 2, 23, { align: 'center' });
      
      // Tipo de reporte
      const reportType = options.isFiltered ? 
        'REPORTE FILTRADO' : 'DASHBOARD EJECUTIVO COMPLETO';
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(reportType, pageWidth / 2, 31, { align: 'center' });
    };
    
    addHeader();
    currentY = 50;

    // ═══════════════════════════════════════════════════════════════════════════
    // INFORMACIÓN DETALLADA DEL DOCUMENTO
    // ═══════════════════════════════════════════════════════════════════════════
    
    const addDocumentInfo = () => {
      // Caja con información del documento
      doc.setFillColor(248, 250, 252);
      doc.rect(15, currentY - 3, pageWidth - 30, 35, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(15, currentY - 3, pageWidth - 30, 35, 'S');
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACION DEL DOCUMENTO', 20, currentY + 5);
      
      currentY += 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      const documentInfo = [
        ['ID de Exportacion:', safeString(comprehensiveExportData.metadata.exportId)],
        ['Fecha de Generacion:', new Date().toLocaleString('es-ES')],
        ['Usuario Generador:', safeString(comprehensiveExportData.metadata.exportedBy)],
        ['Tipo de Exportacion:', options.isFiltered ? 'FILTRADA' : 'COMPLETA'],
        ['Total de Registros:', String(comprehensiveExportData.exportStats.totalRecordsExported)],
        ['Filtros Aplicados:', options.isFiltered ? String(options.activeFilters?.length || 0) : 'N/A'],
        ['Ultima Actualizacion:', formatDate(comprehensiveExportData.metadata.dataRefresh)]
      ];

      let infoY = currentY;
      documentInfo.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 25, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(safeString(value), 85, infoY);
        infoY += 5;
      });

      currentY = infoY + 10;
    };
    
    addDocumentInfo();

    // ═══════════════════════════════════════════════════════════════════════════
    // RESUMEN EJECUTIVO SÚPER COMPLETO
    // ═══════════════════════════════════════════════════════════════════════════
    
    const addExecutiveSummary = () => {
      // Título de sección
      doc.setFillColor(...COLORS.secondary);
      doc.rect(15, currentY - 5, pageWidth - 30, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN EJECUTIVO GENERAL', 20, currentY + 5);
      
      currentY += 20;

      // Tabla de resumen ejecutivo
      const executiveSummary = [
        ['Total de Empleados', String(comprehensiveExportData.systemMetrics.totalEmployees), 'RRHH'],
        ['Empleados Activos', String(comprehensiveExportData.systemMetrics.activeEmployees), 'RRHH'],
        ['Empleados Inactivos', String(comprehensiveExportData.systemMetrics.inactiveEmployees), 'RRHH'],
        ['Tareas Completadas', String(comprehensiveExportData.systemMetrics.completedTasks), 'OPERACIONES'],
        ['Tareas Pendientes', String(comprehensiveExportData.systemMetrics.pendingTasks), 'OPERACIONES'],
        ['Salud del Sistema', safeString(comprehensiveExportData.systemMetrics.systemHealth), 'SISTEMA'],
        ['Tiempo de Actividad', safeString(comprehensiveExportData.systemMetrics.uptime), 'SISTEMA'],
        ['Tiempo de Respuesta', safeString(comprehensiveExportData.systemMetrics.responseTime), 'SISTEMA']
      ];

      createTable({
        startY: currentY,
        head: [['Metrica', 'Valor', 'Categoria']],
        body: executiveSummary,
        theme: 'striped',
        headStyles: { fillColor: COLORS.secondary, textColor: 255, fontStyle: 'bold', fontSize: 11 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 40, halign: 'center', textColor: [100, 100, 100] }
        },
        margin: { left: 20, right: 20 }
      });

      currentY = doc.lastAutoTable.finalY + 15;
    };
    
    addExecutiveSummary();

    // ═══════════════════════════════════════════════════════════════════════════
    // MÉTRICAS DE RECURSOS HUMANOS DETALLADAS
    // ═══════════════════════════════════════════════════════════════════════════
    
    const addHRMetrics = () => {
      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
      }

      // Título de sección
      doc.setFillColor(...COLORS.success);
      doc.rect(15, currentY - 5, pageWidth - 30, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('METRICAS DE RECURSOS HUMANOS', 20, currentY + 5);
      
      currentY += 20;

      // Métricas básicas de RRHH
      const pdfEmpleadosTotal = comprehensiveExportData.systemMetrics.totalEmployees;
      const pdfEmpleadosActivos = comprehensiveExportData.systemMetrics.activeEmployees;
      const pdfEmpleadosInactivos = comprehensiveExportData.systemMetrics.inactiveEmployees;
      const pdfPorcentajeActivos = pdfEmpleadosTotal > 0 ? Math.round((pdfEmpleadosActivos / pdfEmpleadosTotal) * 100) : 0;
      const pdfPorcentajeInactivos = 100 - pdfPorcentajeActivos;

      const empleadosData = [
        ['Total de Empleados', pdfEmpleadosTotal.toString(), '100%', 'Base total'],
        ['Empleados Activos', pdfEmpleadosActivos.toString(), pdfPorcentajeActivos + '%', 'Trabajando'],
        ['Empleados Inactivos', pdfEmpleadosInactivos.toString(), pdfPorcentajeInactivos + '%', 'Sin actividad'],
        ['Ratio Actividad', pdfPorcentajeActivos > 85 ? 'EXCELENTE' : pdfPorcentajeActivos > 70 ? 'BUENO' : 'CRITICO', '-', 'Evaluacion']
      ];

      createTable({
        startY: currentY,
        head: [['Metrica', 'Valor', 'Porcentaje', 'Estado']],
        body: empleadosData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.success, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 30, halign: 'center', fontSize: 9 }
        },
        margin: { left: 20, right: 20 }
      });

      currentY = doc.lastAutoTable.finalY + 15;
    };
    
    addHRMetrics();

    // ═══════════════════════════════════════════════════════════════════════════
    // ANÁLISIS DE PRODUCTIVIDAD Y RENDIMIENTO
    // ═══════════════════════════════════════════════════════════════════════════
    
    const addProductivityAnalysis = () => {
      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(...COLORS.purple);
      doc.rect(15, currentY - 5, pageWidth - 30, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ANALISIS DE PRODUCTIVIDAD Y RENDIMIENTO', 20, currentY + 5);
      
      currentY += 20;

      const pdfTareasCompletadas = comprehensiveExportData.systemMetrics.completedTasks;
      const pdfTareasPendientes = comprehensiveExportData.systemMetrics.pendingTasks;
      const pdfTareasTotales = pdfTareasCompletadas + pdfTareasPendientes;
      const pdfPorcentajeCompletadas = pdfTareasTotales > 0 ? Math.round((pdfTareasCompletadas / pdfTareasTotales) * 100) : 0;
      const pdfProductividad = comprehensiveExportData.performance?.productivity || 0;
      const pdfEficiencia = comprehensiveExportData.performance?.efficiency || 0;

      const productividadData = [
        ['Tareas Completadas', pdfTareasCompletadas.toString(), pdfPorcentajeCompletadas + '%', pdfPorcentajeCompletadas > 90 ? 'EXCELENTE' : pdfPorcentajeCompletadas > 75 ? 'BUENO' : 'REGULAR'],
        ['Tareas Pendientes', pdfTareasPendientes.toString(), (100 - pdfPorcentajeCompletadas) + '%', pdfTareasPendientes < 10 ? 'BAJO' : pdfTareasPendientes < 25 ? 'MEDIO' : 'ALTO'],
        ['Productividad General', pdfProductividad + '%', '-', pdfProductividad > 85 ? 'ALTA' : pdfProductividad > 70 ? 'MEDIA' : 'BAJA'],
        ['Eficiencia Operacional', pdfEficiencia + '%', '-', pdfEficiencia > 90 ? 'OPTIMA' : pdfEficiencia > 75 ? 'BUENA' : 'MEJORAR'],
        ['Tiempo Promedio Tarea', safeString(comprehensiveExportData.systemMetrics.avgTaskCompletion) + 'h', '-', 'Calculado']
      ];

      createTable({
        startY: currentY,
        head: [['Metrica', 'Valor', 'Porcentaje', 'Evaluacion']],
        body: productividadData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.purple, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 30, halign: 'center', fontSize: 9 }
        },
        margin: { left: 20, right: 20 }
      });

      currentY = doc.lastAutoTable.finalY + 15;
    };
    
    addProductivityAnalysis();

    // ═══════════════════════════════════════════════════════════════════════════
    // GRÁFICOS Y VISUALIZACIONES DEL DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════════
    
    const addDashboardCharts = async () => {
      // Nueva página para gráficos
      doc.addPage();
      currentY = 20;
      
      // Título de la sección
      doc.setFillColor(...COLORS.secondary);
      doc.rect(15, currentY - 5, pageWidth - 30, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('GRÁFICOS Y VISUALIZACIONES DEL DASHBOARD', 20, currentY + 5);
      
      currentY += 25;

      try {
        console.log('🎯 Iniciando captura de gráficos para PDF...');
        const chartImages = await captureDashboardCharts();
        
        if (Object.keys(chartImages).length === 0) {
          // Si no se capturaron gráficos, mostrar mensaje informativo
          doc.setTextColor(...COLORS.gray);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          doc.text('No se pudieron capturar gráficos del dashboard en este momento.', 20, currentY);
          doc.text('Los gráficos pueden no estar disponibles o cargados completamente.', 20, currentY + 10);
          
          // Información de referencia
          currentY += 25;
          doc.setFontSize(10);
          doc.text('Gráficos disponibles en el dashboard:', 20, currentY);
          currentY += 8;
          const availableCharts = [
            '• Evolución de Nóminas - Tendencias mensuales de pagos',
            '• Estado de Préstamos - Distribución por estados',
            '• Crecimiento de Empleados - Análisis de contrataciones',
            '• Top Productividad - Empleados más productivos',
            '• Mapa de Calor - Actividad por empleado y día',
            '• Análisis Predictivo - Proyecciones futuras',
            '• Tendencias KPI - Indicadores clave de rendimiento',
            '• Actividad por Departamento - Rendimiento departamental'
          ];
          
          availableCharts.forEach(chart => {
            doc.text(chart, 25, currentY);
            currentY += 5;
          });
          
          currentY += 10;
          return;
        }

        // Agregar cada gráfico capturado al PDF
        let chartsAdded = 0;
        const maxChartsPerPage = 2;
        
        for (const [chartId, chartInfo] of Object.entries(chartImages)) {
          // chartInfo ahora contiene { imageData, metadata, title, hasData }
          if (!chartInfo.hasData && chartInfo.metadata) {
            console.warn(`⚠️  Gráfico ${chartId} no tiene datos, omitiendo...`);
            continue;
          }
          
          if (chartsAdded > 0 && chartsAdded % maxChartsPerPage === 0) {
            doc.addPage();
            currentY = 20;
          }
          
          // Título del gráfico usando metadatos
          doc.setTextColor(...COLORS.primary);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          
          const chartTitles = {
            'nominasChart': '📊 Evolución de Nóminas',
            'prestamosChart': '💰 Estado de Préstamos',
            'empleadosChart': '👥 Crecimiento de Empleados',
            'productividadChart': '🏆 Top Productividad',
            'heatmapChart': '🔥 Mapa de Calor de Productividad',
            'predictivoChart': '🔮 Análisis Predictivo',
            'kpiTrendChart': '📈 Tendencias KPI',
            'activityHeatmapChart': '🎯 Mapa de Actividad',
            'departmentActivityChart': '🏢 Actividad por Departamento',
            'hourlyPatternChart': '⏰ Patrones Horarios'
          };
          
          const chartTitle = chartTitles[chartId] || chartInfo.title || `📊 ${chartId.replace(/Chart$/, '').toUpperCase()}`;
          doc.text(chartTitle, 20, currentY);
          currentY += 5;
          
          // Agregar información adicional del gráfico
          if (chartInfo.metadata) {
            doc.setTextColor(...COLORS.gray);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Tipo: ${chartInfo.metadata.type} | Datasets: ${chartInfo.metadata.datasetCount}`, 20, currentY);
            currentY += 8;
          } else {
            currentY += 5;
          }
          
          try {
            // Calcular dimensiones para el gráfico
            const maxWidth = pageWidth - 40;  // Márgenes de 20mm a cada lado
            const maxHeight = 80;             // Altura máxima del gráfico
            
            // Usar imageData desde el objeto chartInfo
            const imageData = chartInfo.imageData || chartInfo; // Compatibilidad con formato anterior
            
            // Agregar la imagen al PDF
            doc.addImage(imageData, 'PNG', 20, currentY, maxWidth, maxHeight, `chart_${chartId}`, 'FAST');
            currentY += maxHeight + 15;
            chartsAdded++;
            
            console.log(`✅ Gráfico agregado al PDF: ${chartTitle}`);
            
          } catch (error) {
            console.error(`❌ Error agregando gráfico ${chartId} al PDF:`, error);
            // Mostrar mensaje de error en el PDF
            doc.setTextColor(...COLORS.danger);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text(`Error al cargar gráfico: ${chartId}`, 25, currentY);
            currentY += 15;
          }
          
          // Verificar si necesitamos nueva página
          if (currentY > pageHeight - 100) {
            doc.addPage();
            currentY = 20;
          }
        }
        
        console.log(`🎯 ${chartsAdded} gráficos agregados al PDF exitosamente`);
        
        // Agregar resumen de gráficos incluidos
        if (chartsAdded > 0) {
          currentY += 10;
          doc.setTextColor(...COLORS.gray);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Total de gráficos incluidos: ${chartsAdded}`, 20, currentY);
          doc.text(`Capturados el ${new Date().toLocaleString()}`, 20, currentY + 5);
        }
        
      } catch (error) {
        console.error('❌ Error general capturando gráficos:', error);
        
        // Mostrar error en el PDF
        doc.setTextColor(...COLORS.danger);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Error al capturar gráficos del dashboard.', 20, currentY);
        doc.text('Verifique que los gráficos estén cargados completamente.', 20, currentY + 10);
      }
      
      currentY += 20;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // ANÁLISIS FINANCIERO Y CONTABLE SÚPER DETALLADO
    // ═══════════════════════════════════════════════════════════════════════════
    
    const addFinancialAnalysis = () => {
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(...COLORS.warning);
      doc.rect(15, currentY - 5, pageWidth - 30, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ANALISIS FINANCIERO Y CONTABLE DETALLADO', 20, currentY + 5);
      
      currentY += 20;

      // Obtener datos financieros con valores por defecto
      const accounting = comprehensiveExportData.accounting || {};
      const balance = accounting.balance || {};
      const flujoCaja = accounting.flujoCaja || {};
      const comprobantes = accounting.comprobantes || {};

      const pdfTotalDebitos = balance.totalDebitos || 0;
      const pdfTotalCreditos = balance.totalCreditos || 0;
      const pdfDiferencia = balance.diferencia || 0;
      const pdfIngresosMes = flujoCaja.ingresosMes || 0;
      const pdfEgresosMes = flujoCaja.egresosMes || 0;
      const pdfFlujoNeto = flujoCaja.flujoNeto || 0;
      const pdfComprobantesPendientes = comprobantes.pendientes || 0;
      const pdfComprobantesConfirmados = comprobantes.confirmados || 0;

      const financialData = [
        ['BALANCE GENERAL', '', '', ''],
        ['Total Debitos', formatCurrency(pdfTotalDebitos), 'ACTIVO', pdfTotalDebitos > 0 ? 'REGISTRADO' : 'SIN DATOS'],
        ['Total Creditos', formatCurrency(pdfTotalCreditos), 'PASIVO', pdfTotalCreditos > 0 ? 'REGISTRADO' : 'SIN DATOS'],
        ['Balance Neto', formatCurrency(pdfDiferencia), 'PATRIMONIO', pdfDiferencia >= 0 ? 'POSITIVO' : 'NEGATIVO'],
        ['', '', '', ''],
        ['FLUJO DE CAJA', '', '', ''],
        ['Ingresos del Mes', formatCurrency(pdfIngresosMes), 'ENTRADA', pdfIngresosMes > 0 ? 'GENERANDO' : 'SIN INGRESOS'],
        ['Egresos del Mes', formatCurrency(pdfEgresosMes), 'SALIDA', pdfEgresosMes > 0 ? 'GASTANDO' : 'SIN GASTOS'],
        ['Flujo Neto', formatCurrency(pdfFlujoNeto), 'RESULTADO', pdfFlujoNeto >= 0 ? 'POSITIVO' : 'NEGATIVO'],
        ['', '', '', ''],
        ['COMPROBANTES', '', '', ''],
        ['Pendientes', pdfComprobantesPendientes.toString(), 'PROCESO', pdfComprobantesPendientes > 0 ? 'REQUIERE ATENCION' : 'AL DIA'],
        ['Confirmados', pdfComprobantesConfirmados.toString(), 'COMPLETADO', pdfComprobantesConfirmados > 0 ? 'PROCESADOS' : 'SIN DATOS']
      ];

      createTable({
        startY: currentY,
        head: [['Concepto', 'Valor', 'Tipo', 'Estado']],
        body: financialData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.warning, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: 'bold' },
          1: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
          2: { cellWidth: 25, halign: 'center', fontSize: 8 },
          3: { cellWidth: 25, halign: 'center', fontSize: 8 }
        },
        margin: { left: 20, right: 20 }
      });

      currentY = doc.lastAutoTable.finalY + 15;
    };
    
    addFinancialAnalysis();

    // ═══════════════════════════════════════════════════════════════════════════
    // TABLA COMPLETA DE EMPLEADOS (Expandida con más campos)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const addEmployeesTable = () => {
      if (!comprehensiveExportData.employees || comprehensiveExportData.employees.length === 0) {
        return;
      }

      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(...COLORS.brown);
      doc.rect(15, currentY - 5, pageWidth - 30, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      
      const titleText = options.isFiltered ? 
        `EMPLEADOS FILTRADOS (${comprehensiveExportData.employees.length})` :
        `PERSONAL REGISTRADO (Mostrando ${Math.min(comprehensiveExportData.employees.length, 20)} de ${comprehensiveExportData.employees.length})`;
      
      doc.text(titleText, 20, currentY + 5);
      
      currentY += 20;

      // Limitar empleados para evitar documento muy largo
      const maxEmployees = options.isFiltered ? comprehensiveExportData.employees.length : 20;
      const empleadosTable = comprehensiveExportData.employees
        .slice(0, maxEmployees)
        .map((emp, index) => [
          (index + 1).toString(),
          safeString(emp.nombre || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Sin nombre'),
          safeString(emp.cargo || emp.position || 'Sin cargo'),
          safeString(emp.departamento || emp.department || 'Sin depto.'),
          formatCurrency(emp.salario || emp.salario_base || emp.salary || 0),
          (emp.activo !== undefined ? emp.activo : emp.is_active) ? 'ACTIVO' : 'INACTIVO',
          formatDate(emp.fecha_contratacion || emp.hire_date),
          safeString(emp.telefono || emp.phone || 'N/A')
        ]);

      createTable({
        startY: currentY,
        head: [['#', 'Nombre Completo', 'Cargo', 'Departamento', 'Salario', 'Estado', 'F. Contrato', 'Telefono']],
        body: empleadosTable,
        theme: 'striped',
        headStyles: { fillColor: COLORS.brown, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 35, fontStyle: 'bold' },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 15, halign: 'center', fontSize: 7 },
          6: { cellWidth: 18, halign: 'center', fontSize: 7 },
          7: { cellWidth: 22, fontSize: 7 }
        },
        margin: { left: 15, right: 15 }
      });

      if (comprehensiveExportData.employees.length > maxEmployees) {
        currentY = doc.lastAutoTable.finalY + 5;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(`... y ${comprehensiveExportData.employees.length - maxEmployees} empleados adicionales (exportacion completa en CSV/Excel)`, 20, currentY);
      }

      currentY = doc.lastAutoTable.finalY + 15;
    };
    
    addEmployeesTable();

    // ═══════════════════════════════════════════════════════════════════════════
    // ANÁLISIS DE LOCACIONES Y DEPARTAMENTOS (Si están disponibles)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const addLocationsAnalysis = () => {
      const locations = comprehensiveExportData.locations;
      if (!locations || !locations.totalLocaciones) {
        return;
      }

      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(...COLORS.secondary);
      doc.rect(15, currentY - 5, pageWidth - 30, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ANALISIS DE LOCACIONES Y DEPARTAMENTOS', 20, currentY + 5);
      
      currentY += 20;

      const locationsData = [
        ['Total de Locaciones', String(locations.totalLocaciones), 'GEOGRAFICO', 'REGISTRADAS'],
        ['Locaciones Activas', String(locations.activas || 0), 'OPERATIVAS', locations.activas > 0 ? 'FUNCIONANDO' : 'INACTIVAS'],
        ['Departamentos', String(locations.departamentos || 0), 'ADMINISTRATIVO', 'ORGANIZADOS'],
        ['Municipios', String(locations.municipios || 0), 'TERRITORIAL', 'CUBIERTOS'],
        ['Cobertura Nacional', locations.coberturaNacional ? 'SI' : 'NO', 'EXPANSION', locations.coberturaNacional ? 'COMPLETA' : 'PARCIAL']
      ];

      createTable({
        startY: currentY,
        head: [['Metrica', 'Valor', 'Tipo', 'Estado']],
        body: locationsData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.secondary, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 30, halign: 'center', fontSize: 9 },
          3: { cellWidth: 25, halign: 'center', fontSize: 9 }
        },
        margin: { left: 20, right: 20 }
      });

      currentY = doc.lastAutoTable.finalY + 15;
    };
    
    addLocationsAnalysis();

    // ═══════════════════════════════════════════════════════════════════════════
    // ANÁLISIS DE ÍTEMS Y INVENTARIOS (Si están disponibles)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const addItemsAnalysis = () => {
      const items = comprehensiveExportData.items;
      if (!items || !items.totalItems) {
        return;
      }

      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(...COLORS.gray);
      doc.rect(15, currentY - 5, pageWidth - 30, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ANALISIS DE ITEMS E INVENTARIOS', 20, currentY + 5);
      
      currentY += 20;

      const itemsData = [
        ['Total de Items', String(items.totalItems), formatCurrency(items.valorTotal || 0), 'INVENTARIO'],
        ['Items Activos', String(items.activos || 0), formatCurrency(items.valorActivos || 0), 'DISPONIBLES'],
        ['Items Agotados', String(items.agotados || 0), '-', 'SIN STOCK'],
        ['Categorias', String(items.categorias || 0), '-', 'ORGANIZADAS'],
        ['Stock Critico', String(items.stockCritico || 0), '-', items.stockCritico > 0 ? 'ATENCION' : 'CONTROLADO']
      ];

      createTable({
        startY: currentY,
        head: [['Metrica', 'Cantidad', 'Valor', 'Estado']],
        body: itemsData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.gray, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
          3: { cellWidth: 20, halign: 'center', fontSize: 9 }
        },
        margin: { left: 20, right: 20 }
      });

      currentY = doc.lastAutoTable.finalY + 15;
    };
    
    addItemsAnalysis();

    // ═══════════════════════════════════════════════════════════════════════════
    // ANÁLISIS DE ROLES Y PERMISOS (Si están disponibles)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const addRolesPermissionsAnalysis = () => {
      const rolesData = comprehensiveExportData.roles;
      if (!rolesData || !rolesData.totalRoles) {
        return;
      }

      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(...COLORS.danger);
      doc.rect(15, currentY - 5, pageWidth - 30, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ANALISIS DE ROLES Y PERMISOS DE SEGURIDAD', 20, currentY + 5);
      
      currentY += 20;

      const rolesPermissionsData = [
        ['Total de Roles', String(rolesData.totalRoles), 'DEFINIDOS', 'CONFIGURADOS'],
        ['Roles Activos', String(rolesData.activos || 0), 'OPERATIVOS', rolesData.activos > 0 ? 'FUNCIONANDO' : 'SIN ROLES'],
        ['Asignaciones Activas', String(rolesData.asignacionesActivas || 0), 'VIGENTES', rolesData.asignacionesActivas > 0 ? 'ASIGNADOS' : 'SIN ASIGNAR'],
        ['Usuarios con Roles', String(rolesData.usuariosConRoles || 0), 'AUTORIZADOS', 'GESTIONADOS'],
        ['Permisos Directos', String(rolesData.permisosDirectos || 0), 'ESPECIALES', 'CONTROLADOS'],
        ['Modulos del Sistema', String(rolesData.modulosSistema || 0), 'PROTEGIDOS', 'SEGURIDAD']
      ];

      createTable({
        startY: currentY,
        head: [['Metrica de Seguridad', 'Valor', 'Tipo', 'Estado']],
        body: rolesPermissionsData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.danger, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 30, halign: 'center', fontSize: 9 },
          3: { cellWidth: 25, halign: 'center', fontSize: 9 }
        },
        margin: { left: 20, right: 20 }
      });

      currentY = doc.lastAutoTable.finalY + 15;
    };
    
    addRolesPermissionsAnalysis();

    // ═══════════════════════════════════════════════════════════════════════════
    // INFORMACIÓN DE FILTROS (Solo si es exportación filtrada)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const addFiltersInfo = () => {
      if (!options.isFiltered || !options.activeFilters || options.activeFilters.length === 0) {
        return;
      }

      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(255, 165, 0); // Naranja
      doc.rect(15, currentY - 5, pageWidth - 30, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('FILTROS APLICADOS EN ESTA EXPORTACION', 20, currentY + 5);
      
      currentY += 20;

      const filtersData = options.activeFilters.map((filter, index) => [
        (index + 1).toString(),
        safeString(filter.name || filter.field),
        safeString(filter.operator || 'igual a'),
        safeString(filter.value),
        safeString(filter.type || 'texto')
      ]);

      createTable({
        startY: currentY,
        head: [['#', 'Campo', 'Operador', 'Valor', 'Tipo']],
        body: filtersData,
        theme: 'striped',
        headStyles: { fillColor: [255, 165, 0], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 40, fontStyle: 'bold' },
          2: { cellWidth: 30 },
          3: { cellWidth: 40 },
          4: { cellWidth: 25, halign: 'center', fontSize: 9 }
        },
        margin: { left: 20, right: 20 }
      });

      currentY = doc.lastAutoTable.finalY + 15;
    };
    
    addFiltersInfo();
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CAPTURA E INCLUSIÓN DE GRÁFICOS DEL DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Solo capturar gráficos si la opción está habilitada
    if (options.includeCharts !== false) {
      console.log('🎯 Procesando gráficos del dashboard para PDF...');
      await addDashboardCharts();
    } else {
      console.log('⚠️  Gráficos deshabilitados por opción de usuario');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PIE DE PÁGINA CORPORATIVO MEJORADO
    // ═══════════════════════════════════════════════════════════════════════════

    const addFooter = () => {
      const footerY = pageHeight - 35;
      
      // Fondo del pie de página
      doc.setFillColor(...COLORS.primary);
      doc.rect(0, footerY, pageWidth, 35, 'F');
      
      // Línea decorativa
      doc.setFillColor(255, 255, 255);
      doc.rect(0, footerY, pageWidth, 2, 'F');
      
      // Información corporativa
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('CORTESEC CONTRACTOR MANAGEMENT SYSTEM v2.0', pageWidth / 2, footerY + 10, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Sistema Integral de Gestion Empresarial | Reportes Profesionales', pageWidth / 2, footerY + 17, { align: 'center' });
      doc.text('admin@cortesec.com | https://cortesec.management | +57 (1) 234-5678', pageWidth / 2, footerY + 22, { align: 'center' });
      
      doc.setFontSize(7);
      doc.text('Documento confidencial - Distribucion limitada al personal autorizado', pageWidth / 2, footerY + 27, { align: 'center' });
      
      // Estadísticas del reporte
      const statsText = options.isFiltered ? 
        `Reporte Filtrado - ${comprehensiveExportData.exportStats.totalRecordsExported} registros | Powered by CorteSec Solutions 2024-2025` :
        `Reporte Completo - ${comprehensiveExportData.exportStats.totalRecordsExported} registros | Powered by CorteSec Solutions 2024-2025`;
      doc.text(statsText, pageWidth / 2, footerY + 32, { align: 'center' });
    };

    // Agregar pie de página a todas las páginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter();
      
      // Número de página con estilo
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - 25, 15, { align: 'right' });
      
      // Timestamp en cada página
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(new Date().toLocaleString('es-ES'), 25, 15);
    }

    // Generar el blob del PDF
    const pdfBlob = doc.output('blob');
    const reportTypePrefix = options.isFiltered ? 'filtrado' : 'completo';
    const fileName = `cortesec-dashboard-${reportTypePrefix}-${new Date().getTime()}.pdf`;
    const mimeType = 'application/pdf';

  console.log(`PDF generado exitosamente: ${fileName}`);
  console.log(`Paginas generadas: ${totalPages}`);
  console.log(`Tamaño del archivo: ${(pdfBlob.size / 1024).toFixed(2)} KB`);

  return { blob: pdfBlob, fileName, mimeType };

  } catch (error) {
    console.error('Error generando PDF:', error);
    throw new Error(`Error en generacion PDF: ${error.message}`);
  }
};