/**
 * chartCapture.js - Utilidades para captura de gráficos en PDF
 * ============================================================
 * 
 * Funciones especializadas para capturar gráficos Chart.js y elementos HTML
 * para su inclusión en reportes PDF exportados desde el dashboard
 * 
 * @version 1.0.0
 * @author CorteSec Solutions
 */

import html2canvas from 'html2canvas';

/**
 * Verificar si Chart.js está disponible en el DOM
 * @returns {boolean} - True si Chart.js está disponible
 */
export const isChartJsAvailable = () => {
  return typeof window !== 'undefined' && window.Chart !== undefined;
};

/**
 * Obtener la instancia de Chart.js desde un elemento canvas
 * @param {string} canvasId - ID del canvas
 * @returns {Object|null} - Instancia del gráfico o null
 */
export const getChartInstance = (canvasId) => {
  if (!isChartJsAvailable()) return null;
  
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  // Chart.js almacena las instancias en Chart.instances
  const chartInstances = window.Chart.instances;
  for (let instance of chartInstances) {
    if (instance.canvas === canvas) {
      return instance;
    }
  }
  
  return null;
};

/**
 * Capturar un gráfico Chart.js como imagen
 * @param {string} canvasId - ID del canvas del gráfico
 * @param {Object} options - Opciones de captura
 * @returns {Promise<string|null>} - Data URL de la imagen o null
 */
export const captureChart = async (canvasId, options = {}) => {
  try {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn(`Canvas no encontrado: ${canvasId}`);
      return null;
    }
    
    if (canvas.tagName !== 'CANVAS') {
      console.warn(`Elemento ${canvasId} no es un canvas`);
      return null;
    }
    
    const defaultOptions = {
      format: 'image/png',
      quality: 1.0,
      backgroundColor: '#ffffff'
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Para Chart.js, verificar que el gráfico esté renderizado
    const chartInstance = getChartInstance(canvasId);
    if (chartInstance && chartInstance.data) {
      // Asegurar que el gráfico esté completamente renderizado
      chartInstance.update();
      
      // Pequeña espera para asegurar el renderizado
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Si se especifica color de fondo, crear un canvas temporal
    if (config.backgroundColor && config.backgroundColor !== 'transparent') {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Rellenar con color de fondo
      tempCtx.fillStyle = config.backgroundColor;
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Dibujar el gráfico encima
      tempCtx.drawImage(canvas, 0, 0);
      
      return tempCanvas.toDataURL(config.format, config.quality);
    }
    
    return canvas.toDataURL(config.format, config.quality);
    
  } catch (error) {
    console.error(`Error capturando gráfico ${canvasId}:`, error);
    return null;
  }
};

/**
 * Capturar un elemento HTML completo
 * @param {string} selector - Selector CSS del elemento
 * @param {Object} options - Opciones de html2canvas
 * @returns {Promise<string|null>} - Data URL de la imagen o null
 */
export const captureElement = async (selector, options = {}) => {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`Elemento no encontrado: ${selector}`);
      return null;
    }
    
    const defaultOptions = {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      width: element.scrollWidth,
      height: element.scrollHeight,
      logging: false,
      onclone: (clonedDoc, clonedElement) => {
        // Asegurar que los estilos se apliquen correctamente
        const clonedCharts = clonedElement.querySelectorAll('canvas');
        clonedCharts.forEach(canvas => {
          canvas.style.display = 'block';
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
        });
      }
    };
    
    const config = { ...defaultOptions, ...options };
    
    const canvas = await html2canvas(element, config);
    return canvas.toDataURL('image/png', 1.0);
    
  } catch (error) {
    console.error(`Error capturando elemento ${selector}:`, error);
    return null;
  }
};

/**
 * Capturar múltiples gráficos del dashboard de forma eficiente
 * @param {Array<string>} chartIds - Lista de IDs de gráficos
 * @param {Object} options - Opciones globales de captura
 * @returns {Promise<Object>} - Objeto con las imágenes capturadas
 */
export const captureMultipleCharts = async (chartIds, options = {}) => {
  console.log('🎯 Iniciando captura masiva de gráficos:', chartIds);
  
  const results = {};
  const captureOptions = {
    format: 'image/png',
    quality: 1.0,
    backgroundColor: '#ffffff',
    ...options
  };
  
  // Capturar cada gráfico de forma secuencial para evitar problemas de rendimiento
  for (const chartId of chartIds) {
    try {
      console.log(`📊 Capturando: ${chartId}`);
      const imageData = await captureChart(chartId, captureOptions);
      
      if (imageData) {
        results[chartId] = imageData;
        console.log(`✅ Capturado exitosamente: ${chartId}`);
      } else {
        console.warn(`⚠️  No se pudo capturar: ${chartId}`);
      }
      
      // Pequeña pausa entre capturas para no sobrecargar el DOM
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error(`❌ Error capturando ${chartId}:`, error);
    }
  }
  
  console.log(`🎯 Captura masiva completada. ${Object.keys(results).length}/${chartIds.length} gráficos capturados`);
  return results;
};

/**
 * Obtener metadatos de un gráfico Chart.js
 * @param {string} canvasId - ID del canvas
 * @returns {Object} - Metadatos del gráfico
 */
export const getChartMetadata = (canvasId) => {
  const chartInstance = getChartInstance(canvasId);
  if (!chartInstance) {
    return {
      title: canvasId.replace(/Chart$/, '').toUpperCase(),
      type: 'unknown',
      hasData: false,
      datasetCount: 0
    };
  }
  
  return {
    title: chartInstance.options?.plugins?.title?.text || canvasId.replace(/Chart$/, '').toUpperCase(),
    type: chartInstance.config?.type || 'unknown',
    hasData: !!(chartInstance.data && chartInstance.data.datasets && chartInstance.data.datasets.length > 0),
    datasetCount: chartInstance.data?.datasets?.length || 0,
    labels: chartInstance.data?.labels || [],
    lastUpdate: new Date().toISOString()
  };
};

/**
 * Lista de gráficos predefinidos del dashboard CorteSec
 */
export const DASHBOARD_CHARTS = {
  nominas: 'nominasChart',
  prestamos: 'prestamosChart',
  empleados: 'empleadosChart',
  productividad: 'productividadChart',
  heatmap: 'heatmapChart',
  predictivo: 'predictivoChart',
  kpiTrend: 'kpiTrendChart',
  activityHeatmap: 'activityHeatmapChart',
  departmentActivity: 'departmentActivityChart',
  hourlyPattern: 'hourlyPatternChart'
};

export default {
  isChartJsAvailable,
  getChartInstance,
  captureChart,
  captureElement,
  captureMultipleCharts,
  getChartMetadata,
  DASHBOARD_CHARTS
};
