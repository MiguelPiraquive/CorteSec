// Dashboard Exportación Avanzada
// Funcionalidades de exportación para el dashboard de CorteSec

window.dashboardExport = {
    // Exportar datos avanzados
    async exportAdvancedData(options, metricas, chartData) {
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                exportedBy: 'Dashboard CorteSec',
                version: '1.0',
                options: options
            },
            data: {}
        };

        // Incluir empleados si está seleccionado
        if (options.includeEmployees) {
            exportData.data.employees = {
                total: metricas.empleados.total,
                active: metricas.empleados.activos,
                newThisMonth: metricas.empleados.nuevos_mes,
                growth: metricas.empleados.crecimiento
            };
        }

        // Incluir nóminas si está seleccionado
        if (options.includePayrolls) {
            exportData.data.payrolls = {
                totalMonth: metricas.nominas.total_mes,
                productionMonth: metricas.nominas.produccion_mes,
                deductionsMonth: metricas.nominas.deducciones_mes,
                count: metricas.nominas.count_mes,
                historical: chartData.nominas
            };
        }

        // Incluir préstamos si está seleccionado
        if (options.includeLoans) {
            exportData.data.loans = {
                active: metricas.prestamos.activos,
                pending: metricas.prestamos.pendientes,
                approved: metricas.prestamos.aprobados,
                completed: metricas.prestamos.completados,
                overdue: metricas.prestamos.en_mora,
                activeAmount: metricas.prestamos.monto_activos,
                historical: chartData.prestamos
            };
        }

        // Incluir proyectos si está seleccionado
        if (options.includeProjects) {
            exportData.data.projects = {
                active: metricas.proyectos.activos,
                completed: metricas.proyectos.completados,
                thisMonth: metricas.proyectos.este_mes,
                contractors: metricas.proyectos.contratistas
            };
        }

        // Incluir métricas si está seleccionado
        if (options.includeMetrics) {
            exportData.data.metrics = {
                performance: metricas.rendimiento,
                payments: metricas.pagos,
                kpis: {
                    efficiency: metricas.rendimiento.eficiencia,
                    loanRatio: metricas.rendimiento.ratio_prestamos
                }
            };
        }

        return exportData;
    },

    // Exportar a Excel (XLSX)
    async exportToExcel(data, options) {
        try {
            // Crear workbook
            const workbook = {
                SheetNames: [],
                Sheets: {}
            };

            // Hoja de resumen
            if (options.includeMetrics) {
                const summaryData = [
                    ['Métrica', 'Valor', 'Fecha'],
                    ['Total Empleados', data.data.employees?.total || 0, new Date().toLocaleDateString()],
                    ['Nómina Total Mes', data.data.payrolls?.totalMonth || 0, new Date().toLocaleDateString()],
                    ['Préstamos Activos', data.data.loans?.active || 0, new Date().toLocaleDateString()],
                    ['Proyectos Activos', data.data.projects?.active || 0, new Date().toLocaleDateString()],
                    ['Eficiencia', (data.data.metrics?.performance?.eficiencia || 0) + '%', new Date().toLocaleDateString()]
                ];

                workbook.SheetNames.push('Resumen');
                workbook.Sheets['Resumen'] = this.arrayToSheet(summaryData);
            }

            // Hoja de empleados
            if (options.includeEmployees && data.data.employees) {
                const employeeData = [
                    ['Categoría', 'Cantidad'],
                    ['Total', data.data.employees.total],
                    ['Activos', data.data.employees.active],
                    ['Nuevos este mes', data.data.employees.newThisMonth],
                    ['Crecimiento (%)', data.data.employees.growth]
                ];

                workbook.SheetNames.push('Empleados');
                workbook.Sheets['Empleados'] = this.arrayToSheet(employeeData);
            }

            // Hoja de nóminas
            if (options.includePayrolls && data.data.payrolls) {
                const payrollData = [
                    ['Mes', 'Total Nómina', 'Producción', 'Deducciones', 'Cantidad'],
                    ...data.data.payrolls.historical.map(item => [
                        item.mes,
                        item.total,
                        item.produccion || 0,
                        item.deducciones || 0,
                        item.cantidad || 0
                    ])
                ];

                workbook.SheetNames.push('Nóminas');
                workbook.Sheets['Nóminas'] = this.arrayToSheet(payrollData);
            }

            // Generar archivo Excel
            const excelBuffer = await this.generateExcelFile(workbook);
            const blob = new Blob([excelBuffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });

            return {
                success: true,
                blob: blob,
                filename: `Dashboard_Export_${new Date().toISOString().split('T')[0]}.xlsx`
            };

        } catch (error) {
            console.error('Error exportando a Excel:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Exportar a CSV
    async exportToCSV(data, options) {
        try {
            let csvContent = '';

            // Agregar metadata
            csvContent += `# Dashboard Export - ${new Date().toLocaleString()}\n`;
            csvContent += `# Generated by CorteSec Dashboard\n\n`;

            // Resumen de métricas
            if (options.includeMetrics) {
                csvContent += 'RESUMEN DE MÉTRICAS\n';
                csvContent += 'Métrica,Valor,Fecha\n';
                csvContent += `Total Empleados,${data.data.employees?.total || 0},${new Date().toLocaleDateString()}\n`;
                csvContent += `Nómina Total Mes,${data.data.payrolls?.totalMonth || 0},${new Date().toLocaleDateString()}\n`;
                csvContent += `Préstamos Activos,${data.data.loans?.active || 0},${new Date().toLocaleDateString()}\n`;
                csvContent += `Proyectos Activos,${data.data.projects?.active || 0},${new Date().toLocaleDateString()}\n`;
                csvContent += '\n';
            }

            // Datos históricos de nóminas
            if (options.includePayrolls && data.data.payrolls?.historical) {
                csvContent += 'HISTÓRICO DE NÓMINAS\n';
                csvContent += 'Mes,Total,Producción,Deducciones\n';
                data.data.payrolls.historical.forEach(item => {
                    csvContent += `${item.mes},${item.total},${item.produccion || 0},${item.deducciones || 0}\n`;
                });
                csvContent += '\n';
            }

            // Datos de préstamos
            if (options.includeLoans && data.data.loans) {
                csvContent += 'ESTADO DE PRÉSTAMOS\n';
                csvContent += 'Estado,Cantidad,Monto\n';
                csvContent += `Activos,${data.data.loans.active},${data.data.loans.activeAmount}\n`;
                csvContent += `Pendientes,${data.data.loans.pending},0\n`;
                csvContent += `Completados,${data.data.loans.completed},0\n`;
                csvContent += `En mora,${data.data.loans.overdue},0\n`;
                csvContent += '\n';
            }

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

            return {
                success: true,
                blob: blob,
                filename: `Dashboard_Export_${new Date().toISOString().split('T')[0]}.csv`
            };

        } catch (error) {
            console.error('Error exportando a CSV:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Exportar a PDF
    async exportToPDF(data, options) {
        try {
            // Esta funcionalidad requeriría una librería como jsPDF
            // Por ahora retornamos un placeholder
            const pdfContent = this.generatePDFContent(data, options);
            
            const blob = new Blob([pdfContent], { type: 'application/pdf' });

            return {
                success: true,
                blob: blob,
                filename: `Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf`
            };

        } catch (error) {
            console.error('Error exportando a PDF:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Exportar gráficos como imágenes
    async exportChartsAsImages(chartIds) {
        const images = {};

        for (const chartId of chartIds) {
            try {
                const canvas = document.getElementById(chartId);
                if (canvas && canvas.getContext) {
                    const imageData = canvas.toDataURL('image/png');
                    images[chartId] = imageData;
                }
            } catch (error) {
                console.error(`Error exportando gráfico ${chartId}:`, error);
            }
        }

        return images;
    },

    // Comprimir archivo si es necesario
    async compressFile(blob) {
        // Implementar compresión si es necesario
        // Por ahora retornamos el blob original
        return blob;
    },

    // Descargar archivo
    downloadFile(blob, filename) {
        try {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            return {
                success: true,
                message: `Archivo ${filename} descargado correctamente`
            };
        } catch (error) {
            console.error('Error descargando archivo:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Simular progreso de exportación
    async simulateExportProgress(onProgress) {
        const steps = [
            { step: 1, message: 'Preparando datos...', percentage: 10 },
            { step: 2, message: 'Procesando métricas...', percentage: 30 },
            { step: 3, message: 'Generando gráficos...', percentage: 50 },
            { step: 4, message: 'Compilando documento...', percentage: 70 },
            { step: 5, message: 'Aplicando formato...', percentage: 90 },
            { step: 6, message: 'Finalizando...', percentage: 100 }
        ];

        for (const step of steps) {
            if (onProgress) {
                onProgress(step);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    },

    // Obtener historial de exportaciones
    getExportHistory() {
        try {
            return JSON.parse(localStorage.getItem('exportHistory') || '[]');
        } catch (error) {
            return [];
        }
    },

    // Guardar en historial de exportaciones
    saveToExportHistory(exportInfo) {
        try {
            const history = this.getExportHistory();
            const newEntry = {
                id: Date.now(),
                filename: exportInfo.filename,
                date: new Date().toISOString(),
                status: exportInfo.status || 'completed',
                size: exportInfo.size || 'Unknown',
                type: exportInfo.type || 'unknown'
            };

            history.unshift(newEntry);
            
            // Mantener solo los últimos 20 registros
            if (history.length > 20) {
                history.splice(20);
            }

            localStorage.setItem('exportHistory', JSON.stringify(history));
            return newEntry;
        } catch (error) {
            console.error('Error guardando en historial:', error);
            return null;
        }
    },

    // Limpiar historial de exportaciones
    clearExportHistory() {
        try {
            localStorage.removeItem('exportHistory');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Utilidades auxiliares
    arrayToSheet(data) {
        const sheet = {};
        const range = { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };

        for (let R = 0; R < data.length; R++) {
            for (let C = 0; C < data[R].length; C++) {
                if (range.s.r > R) range.s.r = R;
                if (range.s.c > C) range.s.c = C;
                if (range.e.r < R) range.e.r = R;
                if (range.e.c < C) range.e.c = C;

                const cell = { v: data[R][C] };
                if (cell.v == null) continue;

                const cellRef = this.encodeCell({ c: C, r: R });
                sheet[cellRef] = cell;
            }
        }

        sheet['!ref'] = this.encodeRange(range);
        return sheet;
    },

    encodeCell(cell) {
        return String.fromCharCode(65 + cell.c) + (cell.r + 1);
    },

    encodeRange(range) {
        return this.encodeCell(range.s) + ':' + this.encodeCell(range.e);
    },

    generateExcelFile(workbook) {
        // Placeholder para generación de Excel
        // En una implementación real usaríamos SheetJS o similar
        return new ArrayBuffer(0);
    },

    generatePDFContent(data, options) {
        // Placeholder para generación de PDF
        return `Dashboard Report - ${new Date().toLocaleDateString()}`;
    }
};

// Exportación para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.dashboardExport;
}
