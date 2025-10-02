/**
 * Exportador Principal para Dashboard CorteSec
 * Coordina todas las funciones de exportación
 */

import { generateJSONExport } from './jsonExporter.js';
import { generateCSVExport } from './csvExporter.js';
import { generateExcelExport } from './excelExporter.js';
import { generatePDFExport } from './pdfExporter.js';
import { generateWordExport } from './wordExporter.js';
import { generatePowerPointExport } from './powerpointExporter.js';
import { 
  generateComprehensiveExportData, 
  updateExportProgress,
  saveToExportHistory,
  downloadFile,
  showSuccessNotification,
  showErrorNotification
} from './exportUtils.js';

/**
 * Función principal de exportación completa del dashboard
 * @param {string} format - Formato de exportación ('json', 'csv', 'excel', 'pdf')
 * @param {Object} dashboardData - Datos del dashboard
 * @param {Object} user - Usuario actual
 * @param {string} lastUpdated - Última actualización
 * @param {Function} setExportProgress - Setter del progreso
 * @param {Function} setExportHistory - Setter del historial
 * @param {Function} createCelebrationEffect - Función de celebración
 * @param {Object} options - Opciones de exportación (filtrada vs completa)
 */
export const exportFilteredResults = async (
  format = 'json',
  dashboardData,
  user,
  lastUpdated,
  setExportProgress,
  setExportHistory,
  createCelebrationEffect,
  options = {}
) => {
  if (!dashboardData) {
    showErrorNotification(format, 'No hay datos del dashboard disponibles para exportar');
    return;
  }

  try {
    // Inicializar progreso
    await updateExportProgress(setExportProgress, 0, 0);

    // Generar datos comprehensivos
    const comprehensiveExportData = generateComprehensiveExportData(
      dashboardData, 
      user, 
      lastUpdated, 
      format
    );

    // Actualizar progreso
    await updateExportProgress(setExportProgress, 25, 500);

    let blob, fileName, mimeType;

    // Generar archivo según formato
    switch (format.toLowerCase()) {
      case 'json':
        ({ blob, fileName, mimeType } = generateJSONExport(comprehensiveExportData));
        break;

      case 'csv':
        ({ blob, fileName, mimeType } = await generateCSVExport(comprehensiveExportData));
        break;

      case 'excel':
        ({ blob, fileName, mimeType } = await generateExcelExport(comprehensiveExportData));
        break;

      case 'pdf':
        ({ blob, fileName, mimeType } = await generatePDFExport(comprehensiveExportData, {
          isFiltered: !!(options?.isFiltered),
          activeFilters: options?.activeFilters || [],
          exportType: options?.exportType || 'complete',
          includeCharts: options?.includeCharts !== false  // Por defecto incluir gráficos
        }));
        break;

      case 'powerpoint':
      case 'pptx':
        ({ blob, fileName, mimeType } = await generatePowerPointExport(comprehensiveExportData, {
          isFiltered: !!(options?.isFiltered),
          activeFilters: options?.activeFilters || [],
          exportType: options?.exportType || 'complete',
          includeCharts: options?.includeCharts !== false
        }));
        break;

      case 'word':
      case 'docx':
        ({ blob, fileName, mimeType } = await generateWordExport(comprehensiveExportData));
        break;

      default:
        throw new Error(`Formato de exportación no soportado: ${format}`);
    }

    // Actualizar progreso
    await updateExportProgress(setExportProgress, 75, 300);

    // Actualizar estadísticas con el tamaño real
    comprehensiveExportData.exportStats.exportSize = blob.size;

    // Descargar archivo
    downloadFile(blob, fileName);

    // Completar progreso
    await updateExportProgress(setExportProgress, 100, 500);

    // Guardar en historial
    saveToExportHistory(
      fileName,
      format,
      blob.size,
      comprehensiveExportData.exportStats.totalRecordsExported,
      user?.username || 'Usuario Sistema',
      setExportHistory
    );

    // Limpiar progreso
    setExportProgress({ show: false, progress: 0 });

    // Efecto de celebración
    if (createCelebrationEffect) {
      createCelebrationEffect();
    }

    // Notificación de éxito
    showSuccessNotification(format);

    // Log de éxito
    console.log(`✅ Exportación completa exitosa:`, {
      format: format.toUpperCase(),
      fileName,
      records: comprehensiveExportData.exportStats.totalRecordsExported,
      size: `${(blob.size / 1024).toFixed(2)} KB`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en exportación completa:', error);
    setExportProgress({ show: false, progress: 0 });
    showErrorNotification(format, error.message);
  }
};
