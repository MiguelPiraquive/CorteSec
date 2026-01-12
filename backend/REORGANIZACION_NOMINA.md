# 📋 REORGANIZACIÓN BACKEND PAYROLL

## 🎯 Objetivo
Separar completamente **Nómina Simple** (uso actual) de **Nómina Electrónica DIAN** (uso futuro).

---

## 📁 Nueva Estructura

```
backend/
├── payroll/                         ← NÓMINA SIMPLE (ACTUAL)
│   ├── models/
│   │   ├── legacy.py               ← Solo NominaSimple y modelos compartidos
│   │   ├── structural.py           ← CentroCosto (compartido)
│   │   ├── time_attendance.py      ← Novedades (compartido)
│   │   ├── accounting.py           ← Contabilidad (compartido)
│   │   ├── legal.py                ← Embargos, retención (compartido)
│   │   └── hse.py                  ← Dotación, certificados (compartido)
│   ├── api/
│   │   ├── views.py                ← Solo viewsets de NominaSimple
│   │   └── serializers.py          ← Solo serializers de NominaSimple
│   └── services/
│       ├── calculo_nomina.py       ← Lógica de cálculo NominaSimple
│       └── pdf_generator.py        ← Desprendibles PDF
│
└── nomina_electronica/              ← NÓMINA DIAN (FUTURO)
    ├── models.py                    ← NominaElectronica, Ajustes, etc.
    ├── dian_client.py               ← Cliente API DIAN
    ├── xml_generator.py             ← Generador XML
    ├── firma_digital.py             ← Firma digital .p12
    ├── notifications.py             ← Webhooks DIAN
    └── README.md                    ← Documentación DIAN
```

---

## 📦 Modelos COMPARTIDOS (usados por ambas nóminas)

Estos permanecen en `payroll/models/`:

| Modelo | Archivo | Uso |
|--------|---------|-----|
| `TipoDocumento` | legacy.py | CC, CE, TI, PA |
| `TipoTrabajador` | legacy.py | Dependiente, Aprendiz, etc. |
| `TipoContrato` | legacy.py | Indefinido, Fijo, Obra |
| `ConceptoLaboral` | legacy.py | **Salud, Pensión, Bonos, Deducciones** |
| `Empleado` | legacy.py | Datos de empleados |
| `Contrato` | legacy.py | Contratos laborales |
| `PeriodoNomina` | legacy.py | Períodos (quincenas/meses) |
| `CentroCosto` | structural.py | Proyectos/Obras |
| `TipoNovedad` | time_attendance.py | Incapacidades, licencias |
| `NovedadCalendario` | time_attendance.py | Ausencias por empleado |
| `EmbargoJudicial` | legal.py | Embargos judiciales |
| `TablaRetencionFuente` | legal.py | Retención en la fuente |

---

## 🚀 Modelos de NÓMINA SIMPLE (payroll/)

| Modelo | Archivo | Descripción |
|--------|---------|-------------|
| `NominaBase` | legacy.py | **Clase abstracta con lógica compartida** |
| `NominaSimple` | legacy.py | **Nómina interna RRHH** |
| `DetalleItemNominaSimple` | legacy.py | Items de producción |
| `DetalleConceptoNominaSimple` | legacy.py | Devengados/Deducciones |

---

## 🔐 Modelos de NÓMINA ELECTRÓNICA DIAN (nomina_electronica/)

**MOVIDOS A CARPETA SEPARADA:**

| Modelo | Descripción |
|--------|-------------|
| `NominaElectronica` | Nómina para envío a DIAN |
| `DetalleItemNominaElectronica` | Items (formato DIAN) |
| `DetalleConceptoNominaElectronica` | Conceptos (formato DIAN) |
| `ConfiguracionNominaElectronica` | Config técnica DIAN |
| `WebhookConfig` | Webhooks DIAN |
| `WebhookLog` | Logs eventos DIAN |
| `NominaAjuste` | Notas de ajuste DIAN |
| `DetalleAjuste` | Detalles de ajustes |

---

## ✅ Beneficios de esta separación

1. **Claridad**: Código de NominaSimple sin referencias a DIAN
2. **Mantenibilidad**: Cambios en DIAN no afectan NominaSimple
3. **Independencia**: Puedes desarrollar DIAN sin romper NominaSimple
4. **Menor complejidad**: Frontend solo interactúa con payroll/
5. **Migración gradual**: Cuando necesites DIAN, está listo para activar

---

## 🔧 Próximos Pasos

### AHORA (Fase Actual):
1. ✅ Separar archivos DIAN a `nomina_electronica/`
2. ✅ Limpiar `payroll/` dejando solo NominaSimple
3. ✅ Actualizar imports y viewsets
4. ⏳ Simplificar formulario de creación de nómina
5. ⏳ Implementar cálculo automático de seguridad social

### FUTURO (Cuando necesites DIAN):
1. ⏸️ Activar módulo `nomina_electronica/`
2. ⏸️ Configurar certificado digital .p12
3. ⏸️ Conectar con API DIAN
4. ⏸️ Generar XMLs según Resolución 000013/2021

---

## 📚 Referencias

- **Resolución 000013/2021 DIAN**: Nómina Electrónica
- **Ley 100/1993**: Sistema de Seguridad Social
- **Código Sustantivo del Trabajo**: Normatividad laboral

---

**Autor**: Sistema CorteSec  
**Fecha**: Enero 2026  
**Versión**: 2.0.0 (Reorganización)
