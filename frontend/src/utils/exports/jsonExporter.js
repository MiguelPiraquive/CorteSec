/**
 * Exportador JSON para Dashboard CorteSec
 */

/**
 * Genera archivo JSON para exportación
 * @param {Object} comprehensiveExportData - Datos completos para exportación
 * @returns {Object} - {blob, fileName, mimeType}
 */
export const generateJSONExport = (comprehensiveExportData) => {
  const jsonContent = JSON.stringify(comprehensiveExportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const fileName = `cortesec-dashboard-completo-${new Date().getTime()}.json`;
  const mimeType = 'application/json';

  return { blob, fileName, mimeType };
};
