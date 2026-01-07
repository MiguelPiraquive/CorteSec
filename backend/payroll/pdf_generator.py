"""
Generador de PDF para nómina electrónica
Representación gráfica del documento según estándares DIAN
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, Image, PageBreak, KeepTogether
)
from reportlab.pdfgen import canvas
from django.conf import settings
from django.utils import timezone
import qrcode
import os
from io import BytesIO
from decimal import Decimal


class NominaElectronicaPDFGenerator:
    """Generador de PDF para nómina electrónica"""
    
    def __init__(self, nomina_electronica):
        self.nomina = nomina_electronica
        self.styles = getSampleStyleSheet()
        self._crear_estilos_personalizados()
    
    def _crear_estilos_personalizados(self):
        """Crea estilos personalizados para el PDF"""
        # Estilo para título principal
        self.styles.add(ParagraphStyle(
            name='TituloPrincipal',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1a237e'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Estilo para subtítulo
        self.styles.add(ParagraphStyle(
            name='Subtitulo',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#283593'),
            spaceAfter=10,
            spaceBefore=10,
            fontName='Helvetica-Bold'
        ))
        
        # Estilo para texto normal
        self.styles.add(ParagraphStyle(
            name='TextoNormal',
            parent=self.styles['Normal'],
            fontSize=9,
            leading=12
        ))
        
        # Estilo para texto pequeño
        self.styles.add(ParagraphStyle(
            name='TextoPequeno',
            parent=self.styles['Normal'],
            fontSize=7,
            leading=9,
            textColor=colors.HexColor('#666666')
        ))
        
        # Estilo para montos
        self.styles.add(ParagraphStyle(
            name='Monto',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_RIGHT,
            fontName='Helvetica-Bold'
        ))
    
    def generar(self):
        """
        Genera PDF completo de la nómina electrónica
        
        Returns:
            str: Path al archivo PDF generado
        """
        # Definir ruta del archivo
        filename = f"nomina_{self.nomina.numero_documento}.pdf"
        filepath = os.path.join(settings.MEDIA_ROOT, 'nominas', 'pdf', filename)
        
        # Crear directorio si no existe
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Crear documento
        doc = SimpleDocTemplate(
            filepath,
            pagesize=letter,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch
        )
        
        # Construir contenido
        story = []
        
        # Encabezado
        story.extend(self._crear_encabezado())
        story.append(Spacer(1, 0.2*inch))
        
        # Información del documento
        story.extend(self._crear_info_documento())
        story.append(Spacer(1, 0.2*inch))
        
        # Información del empleador
        story.extend(self._crear_info_empleador())
        story.append(Spacer(1, 0.15*inch))
        
        # Información del empleado
        story.extend(self._crear_info_empleado())
        story.append(Spacer(1, 0.2*inch))
        
        # Periodo
        story.extend(self._crear_periodo())
        story.append(Spacer(1, 0.2*inch))
        
        # Devengados
        story.extend(self._crear_devengados())
        story.append(Spacer(1, 0.2*inch))
        
        # Deducciones
        story.extend(self._crear_deducciones())
        story.append(Spacer(1, 0.2*inch))
        
        # Totales
        story.extend(self._crear_totales())
        story.append(Spacer(1, 0.3*inch))
        
        # Código QR con CUNE
        story.extend(self._crear_qr_cune())
        story.append(Spacer(1, 0.2*inch))
        
        # Pie de página con información legal
        story.extend(self._crear_pie_legal())
        
        # Construir PDF
        doc.build(story, onFirstPage=self._agregar_marca_agua)
        
        return filepath
    
    def _crear_encabezado(self):
        """Crea el encabezado del documento"""
        elementos = []
        
        # Título principal
        titulo = Paragraph(
            "DOCUMENTO SOPORTE DE PAGO DE NÓMINA ELECTRÓNICA",
            self.styles['TituloPrincipal']
        )
        elementos.append(titulo)
        
        # Subtítulo
        subtitulo = Paragraph(
            f"Nº {self.nomina.numero_documento}",
            self.styles['Subtitulo']
        )
        elementos.append(subtitulo)
        
        return elementos
    
    def _crear_info_documento(self):
        """Crea tabla con información del documento"""
        elementos = []
        
        elementos.append(Paragraph("INFORMACIÓN DEL DOCUMENTO", self.styles['Subtitulo']))
        
        data = [
            ['Tipo de Documento:', self.nomina.get_tipo_documento_display()],
            ['Número:', self.nomina.numero_documento],
            ['CUNE:', self.nomina.cune[:50] + '...' if len(self.nomina.cune) > 50 else self.nomina.cune],
            ['Fecha de Emisión:', self.nomina.fecha_emision.strftime('%d/%m/%Y')],
            ['Estado DIAN:', self.nomina.get_estado_display()],
        ]
        
        if self.nomina.track_id:
            data.append(['Track ID:', self.nomina.track_id])
        
        if self.nomina.fecha_validacion_dian:
            data.append(['Fecha Validación DIAN:', self.nomina.fecha_validacion_dian.strftime('%d/%m/%Y %H:%M')])
        
        tabla = Table(data, colWidths=[2*inch, 4*inch])
        tabla.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e3f2fd')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        elementos.append(tabla)
        
        return elementos
    
    def _crear_info_empleador(self):
        """Crea tabla con información del empleador"""
        elementos = []
        
        elementos.append(Paragraph("EMPLEADOR", self.styles['Subtitulo']))
        
        config = self.nomina.organization.configuracion_nomina_electronica.filter(activa=True).first()
        
        if config:
            data = [
                ['Razón Social:', config.razon_social],
                ['NIT:', f"{config.nit}-{config.dv}"],
                ['Dirección:', config.direccion],
                ['Teléfono:', config.telefono],
                ['Email:', config.email],
            ]
        else:
            data = [
                ['Organización:', self.nomina.organization.name],
                ['Email:', self.nomina.organization.email or 'N/A'],
            ]
        
        tabla = Table(data, colWidths=[2*inch, 4*inch])
        tabla.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#fff3e0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        elementos.append(tabla)
        
        return elementos
    
    def _crear_info_empleado(self):
        """Crea tabla con información del empleado"""
        elementos = []
        
        elementos.append(Paragraph("TRABAJADOR", self.styles['Subtitulo']))
        
        empleado = self.nomina.nomina.empleado
        
        data = [
            ['Nombres y Apellidos:', empleado.nombre_completo],
            ['Documento:', f"{empleado.documento} - {empleado.tipo_documento}"],
            ['Cargo:', empleado.cargo.nombre if empleado.cargo else 'N/A'],
            ['Email:', empleado.email],
        ]
        
        if hasattr(empleado, 'telefono') and empleado.telefono:
            data.append(['Teléfono:', empleado.telefono])
        
        tabla = Table(data, colWidths=[2*inch, 4*inch])
        tabla.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8f5e9')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        elementos.append(tabla)
        
        return elementos
    
    def _crear_periodo(self):
        """Crea información del periodo"""
        elementos = []
        
        elementos.append(Paragraph("PERIODO DE NÓMINA", self.styles['Subtitulo']))
        
        nomina = self.nomina.nomina
        
        data = [
            ['Periodo Inicio:', nomina.periodo_inicio.strftime('%d/%m/%Y')],
            ['Periodo Fin:', nomina.periodo_fin.strftime('%d/%m/%Y')],
            ['Estado Nómina:', nomina.get_estado_display()],
        ]
        
        tabla = Table(data, colWidths=[2*inch, 4*inch])
        tabla.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3e5f5')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        elementos.append(tabla)
        
        return elementos
    
    def _crear_devengados(self):
        """Crea tabla de devengados"""
        elementos = []
        
        elementos.append(Paragraph("DEVENGADOS", self.styles['Subtitulo']))
        
        devengados = self.nomina.devengados.all()
        
        if devengados.exists():
            data = [['Concepto', 'Tipo', 'Cantidad', 'Valor', 'Salarial']]
            
            total = Decimal('0.00')
            
            for dev in devengados:
                cantidad = ''
                if dev.dias_trabajados:
                    cantidad = f"{dev.dias_trabajados} días"
                elif dev.cantidad_horas:
                    cantidad = f"{dev.cantidad_horas} horas"
                
                data.append([
                    dev.concepto,
                    dev.get_tipo_display(),
                    cantidad,
                    f"${dev.valor_total:,.2f}",
                    'Sí' if dev.es_salarial else 'No'
                ])
                
                total += dev.valor_total
            
            # Fila de total
            data.append(['', '', '', f"${total:,.2f}", ''])
            
            tabla = Table(data, colWidths=[2*inch, 1.5*inch, 1*inch, 1.2*inch, 0.8*inch])
            tabla.setStyle(TableStyle([
                # Encabezado
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4caf50')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                
                # Contenido
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -2), 9),
                ('ALIGN', (2, 1), (2, -2), 'CENTER'),
                ('ALIGN', (3, 1), (3, -2), 'RIGHT'),
                ('ALIGN', (4, 1), (4, -2), 'CENTER'),
                
                # Total
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#c8e6c9')),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 10),
                ('ALIGN', (3, -1), (3, -1), 'RIGHT'),
                
                # Bordes
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            
            elementos.append(tabla)
        else:
            elementos.append(Paragraph("No hay devengados registrados", self.styles['TextoNormal']))
        
        return elementos
    
    def _crear_deducciones(self):
        """Crea tabla de deducciones"""
        elementos = []
        
        elementos.append(Paragraph("DEDUCCIONES", self.styles['Subtitulo']))
        
        deducciones = self.nomina.deducciones.all()
        
        if deducciones.exists():
            data = [['Concepto', 'Tipo', 'Porcentaje', 'Valor']]
            
            total = Decimal('0.00')
            
            for ded in deducciones:
                porcentaje = f"{ded.porcentaje}%" if ded.porcentaje else '-'
                
                data.append([
                    ded.concepto,
                    ded.get_tipo_display(),
                    porcentaje,
                    f"${ded.valor:,.2f}"
                ])
                
                total += ded.valor
            
            # Fila de total
            data.append(['', '', '', f"${total:,.2f}"])
            
            tabla = Table(data, colWidths=[2.5*inch, 2*inch, 1*inch, 1*inch])
            tabla.setStyle(TableStyle([
                # Encabezado
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f44336')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                
                # Contenido
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -2), 9),
                ('ALIGN', (2, 1), (2, -2), 'CENTER'),
                ('ALIGN', (3, 1), (3, -2), 'RIGHT'),
                
                # Total
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#ffcdd2')),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 10),
                ('ALIGN', (3, -1), (3, -1), 'RIGHT'),
                
                # Bordes
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            
            elementos.append(tabla)
        else:
            elementos.append(Paragraph("No hay deducciones registradas", self.styles['TextoNormal']))
        
        return elementos
    
    def _crear_totales(self):
        """Crea tabla de totales"""
        elementos = []
        
        elementos.append(Paragraph("RESUMEN DE PAGO", self.styles['Subtitulo']))
        
        nomina = self.nomina.nomina
        
        data = [
            ['Total Devengados:', f"${nomina.total_devengado:,.2f}"],
            ['Total Deducciones:', f"${nomina.total_deducciones:,.2f}"],
            ['NETO A PAGAR:', f"${nomina.neto_pagar:,.2f}"],
        ]
        
        tabla = Table(data, colWidths=[3*inch, 2*inch])
        tabla.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e0e0')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#2196f3')),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -2), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -2), 11),
            ('FONTSIZE', (0, -1), (-1, -1), 14),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elementos.append(tabla)
        
        return elementos
    
    def _crear_qr_cune(self):
        """Crea código QR con el CUNE"""
        elementos = []
        
        if not self.nomina.cune:
            return elementos
        
        elementos.append(Paragraph("CÓDIGO QR DE VERIFICACIÓN", self.styles['Subtitulo']))
        
        # Generar QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        
        # Datos del QR: CUNE + URL de verificación
        qr_data = f"CUNE:{self.nomina.cune}\nDoc:{self.nomina.numero_documento}"
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        # Crear imagen QR
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Guardar en BytesIO
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        # Crear imagen ReportLab
        qr_img = Image(buffer, width=1.5*inch, height=1.5*inch)
        
        elementos.append(qr_img)
        
        # Texto explicativo
        texto_qr = Paragraph(
            f"Escanee este código QR para verificar la autenticidad del documento.<br/>"
            f"<b>CUNE:</b> {self.nomina.cune[:40]}...",
            self.styles['TextoPequeno']
        )
        elementos.append(texto_qr)
        
        return elementos
    
    def _crear_pie_legal(self):
        """Crea pie de página con información legal"""
        elementos = []
        
        texto_legal = """
        <b>DOCUMENTO SOPORTE DE PAGO DE NÓMINA ELECTRÓNICA</b><br/>
        Generado de conformidad con la Resolución 000013 de 2021 de la DIAN.<br/>
        Este documento tiene plena validez legal y probatoria.<br/>
        Para verificar la autenticidad, escanee el código QR o consulte en el portal DIAN.<br/>
        <br/>
        <i>Generado el {fecha_generacion}</i>
        """.format(
            fecha_generacion=timezone.now().strftime('%d/%m/%Y %H:%M')
        )
        
        pie = Paragraph(texto_legal, self.styles['TextoPequeno'])
        elementos.append(pie)
        
        return elementos
    
    def _agregar_marca_agua(self, canvas, doc):
        """Agrega marca de agua según el estado del documento"""
        canvas.saveState()
        
        if self.nomina.estado in ['borrador', 'error']:
            # Marca de agua para borradores
            canvas.setFont('Helvetica-Bold', 80)
            canvas.setFillColorRGB(0.9, 0.9, 0.9, alpha=0.3)
            canvas.translate(letter[0]/2, letter[1]/2)
            canvas.rotate(45)
            canvas.drawCentredString(0, 0, "BORRADOR")
        elif self.nomina.estado == 'rechazado':
            # Marca de agua para rechazados
            canvas.setFont('Helvetica-Bold', 60)
            canvas.setFillColorRGB(1, 0, 0, alpha=0.2)
            canvas.translate(letter[0]/2, letter[1]/2)
            canvas.rotate(45)
            canvas.drawCentredString(0, 0, "RECHAZADO DIAN")
        
        canvas.restoreState()


def generar_pdf_batch(nominas_ids):
    """
    Genera PDFs para múltiples nóminas en lote
    
    Args:
        nominas_ids: Lista de IDs de nóminas electrónicas
        
    Returns:
        dict: Resultado con paths de PDFs generados
    """
    from payroll.models import NominaElectronica
    
    resultados = {
        'exitosos': [],
        'errores': []
    }
    
    for nomina_id in nominas_ids:
        try:
            nomina = NominaElectronica.objects.get(id=nomina_id)
            generator = NominaElectronicaPDFGenerator(nomina)
            pdf_path = generator.generar()
            
            nomina.pdf_generado = pdf_path
            nomina.save(update_fields=['pdf_generado'])
            
            resultados['exitosos'].append({
                'nomina_id': nomina_id,
                'pdf_path': pdf_path
            })
            
        except Exception as e:
            resultados['errores'].append({
                'nomina_id': nomina_id,
                'error': str(e)
            })
    
    return resultados
