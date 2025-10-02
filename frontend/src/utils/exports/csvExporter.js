/**
 * Exportador CSV Simple para Dashboard CorteSec
 * ============================================
 * 
 * CSV básico y funcional para compatibilidad
 * 
 * @version 1.0.0
 * @author CorteSec Solutions
 */

// Función de formateo simple
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value);
};

// Función principal de exportación CSV
export const generateCSVExport = async (comprehensiveExportData, options = {}) => {
  try {
    console.log('📝 Generando CSV básico...');
    
    const employees = comprehensiveExportData.employees || [];
    const currentDate = new Date().toLocaleDateString('es-ES');
    const currentTime = new Date().toLocaleTimeString('es-ES');
    
    // Header del CSV
    let csvContent = 'CORTESEC CONTRACTOR MANAGEMENT SYSTEM\n';
    csvContent += `Exportación CSV - ${currentDate} ${currentTime}\n`;
    csvContent += '\n';
    
    // Header de empleados
    csvContent += 'ID,Nombre Completo,Email,Cargo,Departamento,Salario,Estado,Fecha Ingreso,Teléfono\n';
    
    // Datos de empleados
    employees.forEach((emp, index) => {
      const nombre = emp.nombre || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || `Empleado ${index + 1}`;
      const email = emp.email || `empleado${index + 1}@cortesec.com`;
      const telefono = emp.telefono || emp.phone || 'No especificado';
      const cargo = emp.cargo || emp.position || 'Sin cargo definido';
      const departamento = emp.departamento || emp.department || 'Sin departamento';
      const salario = formatCurrency(emp.salario || emp.salario_base || emp.salary || 0);
      const estado = (emp.activo || emp.is_active || emp.active) ? 'ACTIVO' : 'INACTIVO';
      const fechaIngreso = emp.fechaIngreso || emp.fecha_ingreso || emp.hire_date || 'No definida';
      const id = emp.id || `EMP-${String(index + 1).padStart(3, '0')}`;
      
      csvContent += `${id},"${nombre}","${email}","${cargo}","${departamento}","${salario}",${estado},"${fechaIngreso}","${telefono}"\n`;
    });
    
    // Información adicional
    csvContent += '\n';
    csvContent += 'INFORMACIÓN DEL REPORTE\n';
    csvContent += `Total de empleados: ${employees.length}\n`;
    csvContent += `Fecha de generación: ${currentDate} ${currentTime}\n`;
    csvContent += 'Sistema: CorteSec Contractor Management\n';
    
    // Crear blob y archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
    const fileName = `CorteSec_Empleados_${timestamp}.csv`;
    const mimeType = 'text/csv';

    console.log('✅ CSV básico generado exitosamente!');
    console.log(`📁 Archivo: ${fileName}`);
    console.log(`👥 Empleados incluidos: ${employees.length}`);
    console.log(`💾 Tamaño: ${(blob.size / 1024).toFixed(2)} KB`);

    return { blob, fileName, mimeType };

  } catch (error) {
    console.error('❌ Error generando CSV:', error);
    throw new Error(`Error en generación CSV: ${error.message}`);
  }
};