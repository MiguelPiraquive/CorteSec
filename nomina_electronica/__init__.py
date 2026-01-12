"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    MÓDULO NÓMINA ELECTRÓNICA DIAN                             ║
║                Sistema de Nómina Electrónica - CorteSec                       ║
╚══════════════════════════════════════════════════════════════════════════════╝

DESCRIPCIÓN:
-----------
Este módulo contiene toda la funcionalidad relacionada con la Nómina Electrónica
según la Resolución 000013/2021 de la DIAN.

MODELOS INCLUIDOS:
-----------------
- NominaElectronica: Nómina para envío a DIAN
- DetalleItemNominaElectronica: Items de producción (DIAN)
- DetalleConceptoNominaElectronica: Devengados/Deducciones (DIAN)
- ConfiguracionNominaElectronica: Configuración técnica DIAN
- WebhookConfig: Configuración de webhooks DIAN
- WebhookLog: Logs de eventos DIAN
- NominaAjuste: Notas de ajuste a nóminas electrónicas
- DetalleAjuste: Detalles de ajustes

SERVICIOS INCLUIDOS:
-------------------
- dian_client.py: Cliente HTTP para API DIAN
- xml_generator.py: Generador de XML según XSD DIAN
- firma_digital.py: Firma digital con certificado .p12
- notifications.py: Notificaciones de eventos DIAN

NOTA IMPORTANTE:
---------------
Este módulo está DESACOPLADO de NominaSimple (payroll).
Solo se conecta a través de modelos compartidos (ConceptoLaboral, PeriodoNomina, etc.)

AUTOR: Sistema CorteSec
FECHA: Enero 2026
ESTADO: Módulo independiente - No usado actualmente por NominaSimple
"""

# Este módulo será desarrollado cuando se implemente Nómina Electrónica DIAN
__version__ = '1.0.0'
__all__ = []
