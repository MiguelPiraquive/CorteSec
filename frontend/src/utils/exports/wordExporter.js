/**
 * Exportador Word para Dashboard CorteSec - Versión Profesional
 */

import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Genera archivo Word profesional para exportación
 * @param {Object} comprehensiveExportData - Datos completos para exportación
 * @returns {Object} - {blob, fileName, mimeType}
 */
export const generateWordExport = async (comprehensiveExportData) => {
  // Métricas principales con variables prefijadas
  const wordEmpleadosTotal = comprehensiveExportData.systemMetrics.totalEmployees;
  const wordEmpleadosActivos = comprehensiveExportData.systemMetrics.activeEmployees;
  const wordEmpleadosInactivos = comprehensiveExportData.systemMetrics.inactiveEmployees;
  const wordPorcentajeActivos = wordEmpleadosTotal > 0 ? Math.round((wordEmpleadosActivos / wordEmpleadosTotal) * 100) : 0;

  const wordTareasCompletadas = comprehensiveExportData.systemMetrics.completedTasks;
  const wordTareasPendientes = comprehensiveExportData.systemMetrics.pendingTasks;
  const wordTareasTotales = wordTareasCompletadas + wordTareasPendientes;
  const wordPorcentajeCompletadas = wordTareasTotales > 0 ? Math.round((wordTareasCompletadas / wordTareasTotales) * 100) : 0;

  const wordTotalDebitos = comprehensiveExportData.accounting.balance.totalDebitos || 0;
  const wordTotalCreditos = comprehensiveExportData.accounting.balance.totalCreditos || 0;
  const wordDiferencia = comprehensiveExportData.accounting.balance.diferencia || 0;

  // Crear documento Word
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 inch
            right: 1440,  // 1 inch
            bottom: 1440, // 1 inch
            left: 1440,   // 1 inch
          },
        },
      },
      headers: {
        default: new Paragraph({
          children: [
            new TextRun({
              text: "CORTESEC - Contractor Management System v2.0",
              bold: true,
              size: 20,
              color: "10B981"
            })
          ],
          alignment: AlignmentType.CENTER,
        }),
      },
      footers: {
        default: new Paragraph({
          children: [
            new TextRun({
              text: `📊 ${comprehensiveExportData.exportStats.totalRecordsExported} registros | 📧 admin@cortesec.com | ⚡ Powered by CorteSec Solutions © 2024-2025`,
              size: 16,
              color: "666666"
            })
          ],
          alignment: AlignmentType.CENTER,
        }),
      },
      children: [
        // ═══════════════════════════════════════════════════════════════════════════
        // TÍTULO PRINCIPAL
        // ═══════════════════════════════════════════════════════════════════════════
        new Paragraph({
          children: [
            new TextRun({
              text: "📊 DASHBOARD EJECUTIVO",
              bold: true,
              size: 32,
              color: "10B981"
            })
          ],
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.TITLE,
          spacing: { after: 400 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "REPORTE COMPLETO DEL SISTEMA",
              bold: true,
              size: 20,
              color: "374151"
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 }
        }),

        // ═══════════════════════════════════════════════════════════════════════════
        // INFORMACIÓN DEL DOCUMENTO
        // ═══════════════════════════════════════════════════════════════════════════
        new Paragraph({
          children: [
            new TextRun({
              text: "📋 INFORMACIÓN DEL DOCUMENTO",
              bold: true,
              size: 18,
              color: "059669"
            })
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 200 }
        }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "ID de Exportación:", bold: true })] })],
                  width: { size: 30, type: WidthType.PERCENTAGE }
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: String(comprehensiveExportData.metadata.exportId) })] })],
                  width: { size: 70, type: WidthType.PERCENTAGE }
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "Fecha de Generación:", bold: true })] })]
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: new Date().toLocaleString('es-ES') })] })]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "Generado por:", bold: true })] })]
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: String(comprehensiveExportData.metadata.exportedBy) })] })]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "Total de Registros:", bold: true })] })]
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: String(comprehensiveExportData.exportStats.totalRecordsExported) })] })]
                })
              ]
            })
          ]
        }),

        // ═══════════════════════════════════════════════════════════════════════════
        // MÉTRICAS EJECUTIVAS PRINCIPALES
        // ═══════════════════════════════════════════════════════════════════════════
        new Paragraph({
          children: [
            new TextRun({
              text: "📈 MÉTRICAS EJECUTIVAS PRINCIPALES",
              bold: true,
              size: 18,
              color: "3B82F6"
            })
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),

        // Tabla de Recursos Humanos
        new Paragraph({
          children: [
            new TextRun({
              text: "👥 RECURSOS HUMANOS",
              bold: true,
              size: 14,
              color: "059669"
            })
          ],
          spacing: { before: 200, after: 100 }
        }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Métrica", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Porcentaje", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total de Empleados" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: wordEmpleadosTotal.toString() })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "100%" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "REGISTRADO", color: "059669" })] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Empleados Activos" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: wordEmpleadosActivos.toString() })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: wordPorcentajeActivos + "%" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: wordPorcentajeActivos > 80 ? "EXCELENTE" : wordPorcentajeActivos > 60 ? "BUENO" : "REVISAR", color: wordPorcentajeActivos > 80 ? "059669" : wordPorcentajeActivos > 60 ? "F59E0B" : "EF4444" })] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Empleados Inactivos" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: wordEmpleadosInactivos.toString() })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (100 - wordPorcentajeActivos) + "%" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "MONITOREADO", color: "6B7280" })] })] })
              ]
            })
          ]
        }),

        // Tabla de Productividad
        new Paragraph({
          children: [
            new TextRun({
              text: "⚡ PRODUCTIVIDAD Y RENDIMIENTO",
              bold: true,
              size: 14,
              color: "059669"
            })
          ],
          spacing: { before: 300, after: 100 }
        }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Métrica", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Porcentaje", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tareas Completadas" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: wordTareasCompletadas.toString() })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: wordPorcentajeCompletadas + "%" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "COMPLETADO", color: "059669" })] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tareas Pendientes" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: wordTareasPendientes.toString() })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (100 - wordPorcentajeCompletadas) + "%" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PENDIENTE", color: "F59E0B" })] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Eficiencia General" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: wordPorcentajeCompletadas + "%" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: wordPorcentajeCompletadas + "%" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: wordPorcentajeCompletadas > 85 ? "EXCELENTE" : wordPorcentajeCompletadas > 70 ? "BUENO" : "MEJORAR", color: wordPorcentajeCompletadas > 85 ? "059669" : wordPorcentajeCompletadas > 70 ? "F59E0B" : "EF4444" })] })] })
              ]
            })
          ]
        }),

        // Tabla Financiera
        new Paragraph({
          children: [
            new TextRun({
              text: "💰 RESUMEN FINANCIERO",
              bold: true,
              size: 14,
              color: "059669"
            })
          ],
          spacing: { before: 300, after: 100 }
        }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Concepto", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total Débitos" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "$" + wordTotalDebitos.toLocaleString('es-ES') })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "REGISTRADO", color: "6B7280" })] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total Créditos" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "$" + wordTotalCreditos.toLocaleString('es-ES') })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "REGISTRADO", color: "6B7280" })] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Balance Neto" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "$" + wordDiferencia.toLocaleString('es-ES') })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: wordDiferencia >= 0 ? "POSITIVO" : "NEGATIVO", color: wordDiferencia >= 0 ? "059669" : "EF4444" })] })] })
              ]
            })
          ]
        }),

        // ═══════════════════════════════════════════════════════════════════════════
        // TABLA DE EMPLEADOS (primeros 10)
        // ═══════════════════════════════════════════════════════════════════════════
        ...(comprehensiveExportData.employees.length > 0 ? [
          new Paragraph({
            children: [
              new TextRun({
                text: "👥 PERSONAL REGISTRADO (Top 10)",
                bold: true,
                size: 18,
                color: "8B4513"
              })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nombre", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Cargo", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Departamento", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Salario", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })] })
                ]
              }),
              ...comprehensiveExportData.employees.slice(0, 10).map(emp => new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: emp.nombre || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Sin nombre'
                      })]
                    })]
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: emp.cargo || 'Sin cargo'
                      })]
                    })]
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: emp.departamento || 'Sin depto.'
                      })]
                    })]
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: '$' + (emp.salario || emp.salario_base || 0).toLocaleString('es-ES')
                      })]
                    })]
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: (emp.activo || emp.is_active) ? '✅ Activo' : '❌ Inactivo',
                        color: (emp.activo || emp.is_active) ? '059669' : 'EF4444'
                      })]
                    })]
                  })
                ]
              }))
            ]
          }),

          ...(comprehensiveExportData.employees.length > 10 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: `... y ${comprehensiveExportData.employees.length - 10} empleados adicionales (ver exportación CSV/Excel para listado completo)`,
                  italics: true,
                  size: 16,
                  color: "6B7280"
                })
              ],
              spacing: { before: 100 }
            })
          ] : [])
        ] : []),

        // ═══════════════════════════════════════════════════════════════════════════
        // PIE DE PÁGINA CORPORATIVO
        // ═══════════════════════════════════════════════════════════════════════════
        new Paragraph({
          children: [
            new TextRun({
              text: "🔒 INFORMACIÓN CONFIDENCIAL",
              bold: true,
              size: 14,
              color: "DC2626"
            })
          ],
          spacing: { before: 600, after: 100 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Este documento contiene información confidencial de la empresa. Su distribución está limitada al personal autorizado únicamente. Los datos aquí presentados reflejan el estado del sistema al momento de la generación del reporte y pueden haber cambiado posteriormente.",
              size: 16,
              color: "6B7280"
            })
          ],
          spacing: { after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "📧 Para consultas: admin@cortesec.com | 🌐 https://cortesec.management | 📞 +57 (1) 234-5678",
              bold: true,
              size: 16,
              color: "059669"
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 }
        })
      ]
    }]
  });

  // Generar el blob del documento
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const fileName = `cortesec-dashboard-ejecutivo-${new Date().getTime()}.docx`;
  const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  return { blob, fileName, mimeType };
};
