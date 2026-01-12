"""
Generador de XML para Nómina Electrónica según estándares DIAN
Basado en Resolución 000013 de 2021
"""
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom
from decimal import Decimal
from datetime import datetime


class NominaElectronicaXMLGenerator:
    """
    Generador de XML para nómina electrónica DIAN
    Implementa esquema oficial de DIAN v1.0
    """
    
    NAMESPACES = {
        'xmlns': 'dian:gov:co:facturaelectronica:NominaIndividual',
        'xmlns:ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
        'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    }
    
    def __init__(self, nomina_electronica):
        self.nomina = nomina_electronica
        self.config = self._obtener_configuracion()
    
    def _obtener_configuracion(self):
        """Obtener configuración activa de nómina electrónica"""
        from .models import ConfiguracionNominaElectronica
        return ConfiguracionNominaElectronica.objects.filter(
            organization=self.nomina.organization,
            activa=True
        ).first()
    
    def generar(self):
        """Genera el XML completo de la nómina electrónica"""
        if not self.config:
            raise ValueError("No hay configuración activa de nómina electrónica")
        
        # Crear elemento raíz
        root = Element('NominaIndividual', self.NAMESPACES)
        
        # Extensiones
        self._agregar_extensiones(root)
        
        # Información general del documento
        self._agregar_informacion_general(root)
        
        # Información del empleador
        self._agregar_empleador(root)
        
        # Información del trabajador
        self._agregar_trabajador(root)
        
        # Periodo de nómina
        self._agregar_periodo(root)
        
        # Lugar de generación
        self._agregar_lugar_generacion(root)
        
        # Devengados
        self._agregar_devengados(root)
        
        # Deducciones
        self._agregar_deducciones(root)
        
        # Totales
        self._agregar_totales(root)
        
        # Redondeos
        self._agregar_redondeos(root)
        
        # Convertir a string formateado
        return self._formatear_xml(root)
    
    def _agregar_extensiones(self, root):
        """Agregar extensiones UBL"""
        ext_root = SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2}UBLExtensions')
        ext = SubElement(ext_root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2}UBLExtension')
        ext_content = SubElement(ext, '{urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2}ExtensionContent')
        
        # DianExtensions
        dian_ext = SubElement(ext_content, 'DianExtensions')
        
        # InvoiceControl - Información de numeración autorizada
        if self.config.resolucion_numero:
            invoice_control = SubElement(dian_ext, 'InvoiceControl')
            SubElement(invoice_control, 'InvoiceAuthorization').text = self.config.resolucion_numero
            
            auth_period = SubElement(invoice_control, 'AuthorizationPeriod')
            SubElement(auth_period, 'StartDate').text = self.config.fecha_vigencia_desde.isoformat() if self.config.fecha_vigencia_desde else ''
            SubElement(auth_period, 'EndDate').text = self.config.fecha_vigencia_hasta.isoformat() if self.config.fecha_vigencia_hasta else ''
            
            authorized_invoices = SubElement(invoice_control, 'AuthorizedInvoices')
            SubElement(authorized_invoices, 'Prefix').text = self.config.prefijo or ''
            SubElement(authorized_invoices, 'From').text = str(self.config.rango_inicio) if self.config.rango_inicio else ''
            SubElement(authorized_invoices, 'To').text = str(self.config.rango_fin) if self.config.rango_fin else ''
        
        # InvoiceSource - Información del software
        invoice_source = SubElement(dian_ext, 'InvoiceSource')
        SubElement(invoice_source, 'IdentificationCode', {
            'listAgencyID': '6',
            'listAgencyName': 'United Nations Economic Commission for Europe',
            'listSchemeURI': 'urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1'
        }).text = 'CO'
        
        # SoftwareProvider - Proveedor del software
        software_provider = SubElement(dian_ext, 'SoftwareProvider')
        SubElement(software_provider, 'ProviderID', {
            'schemeAgencyID': '195',
            'schemeAgencyName': 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
            'schemeID': '31',
            'schemeName': '31'
        }).text = self.config.nit
        
        SubElement(software_provider, 'SoftwareID', {
            'schemeAgencyID': '195',
            'schemeAgencyName': 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)'
        }).text = self.config.identificador_software or ''
        
        # SoftwareSecurityCode - PIN de software
        software_security = SubElement(dian_ext, 'SoftwareSecurityCode', {
            'schemeAgencyID': '195',
            'schemeAgencyName': 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)'
        })
        software_security.text = self.config.clave_tecnica or ''
    
    def _agregar_informacion_general(self, root):
        """Agregar información general del documento"""
        # Número del documento
        SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID').text = self.nomina.numero_documento
        
        # UUID (CUNE)
        if self.nomina.cune:
            SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}UUID', {
                'schemeID': 'CUNE-SHA384',
                'schemeName': 'CUNE-SHA384'
            }).text = self.nomina.cune
        
        # Fecha de emisión
        if self.nomina.fecha_emision:
            SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}IssueDate').text = self.nomina.fecha_emision.strftime('%Y-%m-%d')
            SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}IssueTime').text = self.nomina.fecha_emision.strftime('%H:%M:%S-05:00')
        
        # Tipo de documento
        SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}InvoiceTypeCode').text = self.nomina.tipo_documento
        
        # Nota del documento
        if self.nomina.observaciones:
            SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Note').text = self.nomina.observaciones
    
    def _agregar_empleador(self, root):
        """Agregar información del empleador"""
        employer_party = SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}EmployerParty')
        
        # Identificación del empleador
        party_id = SubElement(employer_party, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PartyIdentification')
        SubElement(party_id, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID', {
            'schemeAgencyID': '195',
            'schemeAgencyName': 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
            'schemeID': '31',
            'schemeName': '31'
        }).text = f"{self.config.nit}{self.config.dv}"
        
        # Nombre del empleador
        party_name = SubElement(employer_party, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PartyName')
        SubElement(party_name, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Name').text = self.config.razon_social
        
        # Dirección del empleador
        address = SubElement(employer_party, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PhysicalLocation')
        address_detail = SubElement(address, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Address')
        SubElement(address_detail, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID').text = self.config.municipio_codigo
        SubElement(address_detail, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}CityName').text = self.config.municipio_codigo
        SubElement(address_detail, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}PostalZone').text = self.config.municipio_codigo
        
        country = SubElement(address_detail, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Country')
        SubElement(country, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}IdentificationCode', {
            'listAgencyID': '6',
            'listAgencyName': 'United Nations Economic Commission for Europe',
            'listSchemeURI': 'urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1'
        }).text = 'CO'
        
        # Líneas de dirección
        address_line = SubElement(address_detail, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}AddressLine')
        SubElement(address_line, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Line').text = self.config.direccion
        
        # Contacto
        if self.config.telefono or self.config.email:
            contact = SubElement(employer_party, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Contact')
            if self.config.telefono:
                SubElement(contact, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Telephone').text = self.config.telefono
            if self.config.email:
                SubElement(contact, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ElectronicMail').text = self.config.email
    
    def _agregar_trabajador(self, root):
        """Agregar información del trabajador"""
        empleado = self.nomina.nomina.empleado
        
        worker_party = SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}WorkerParty')
        
        # Identificación del trabajador
        party_id = SubElement(worker_party, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PartyIdentification')
        tipo_doc = empleado.tipo_documento.codigo if empleado.tipo_documento else '13'
        SubElement(party_id, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID', {
            'schemeAgencyID': '195',
            'schemeAgencyName': 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
            'schemeID': tipo_doc,
            'schemeName': tipo_doc
        }).text = empleado.documento
        
        # Nombre del trabajador
        person = SubElement(worker_party, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Person')
        SubElement(person, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}FirstName').text = empleado.nombres
        SubElement(person, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}FamilyName').text = empleado.apellidos
        
        # Tipo de trabajador
        if empleado.tipo_vinculacion:
            SubElement(worker_party, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}WorkerTypeCode').text = empleado.tipo_vinculacion.codigo
    
    def _agregar_periodo(self, root):
        """Agregar periodo de nómina"""
        nomina = self.nomina.nomina
        
        payroll_period = SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PayrollPeriod')
        SubElement(payroll_period, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}StartDate').text = nomina.periodo_inicio.isoformat()
        SubElement(payroll_period, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}EndDate').text = nomina.periodo_fin.isoformat()
        
        # Días trabajados
        SubElement(payroll_period, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}WorkingDays').text = str(nomina.dias_trabajados)
    
    def _agregar_lugar_generacion(self, root):
        """Agregar lugar de generación del documento"""
        place = SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PlaceOfIssue')
        SubElement(place, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}CitySubdivisionName').text = self.config.municipio_codigo
        
        country = SubElement(place, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Country')
        SubElement(country, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}IdentificationCode', {
            'listAgencyID': '6',
            'listAgencyName': 'United Nations Economic Commission for Europe',
            'listSchemeURI': 'urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1'
        }).text = 'CO'
    
    def _agregar_devengados(self, root):
        """Agregar devengados de la nómina"""
        if not self.nomina.devengados.exists():
            return
        
        accrued = SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}AccruedPayments')
        
        total_devengados = Decimal('0.00')
        
        for devengado in self.nomina.devengados.all():
            item = SubElement(accrued, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}AccruedPaymentItem')
            
            # Tipo de devengado
            SubElement(item, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}PaymentID').text = devengado.tipo
            
            # Descripción
            SubElement(item, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Description').text = devengado.concepto
            
            # Valor
            SubElement(item, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Amount', {
                'currencyID': 'COP'
            }).text = f"{devengado.valor_total:.2f}"
            
            total_devengados += devengado.valor_total
        
        # Total de devengados
        SubElement(accrued, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}TotalAccruedAmount', {
            'currencyID': 'COP'
        }).text = f"{total_devengados:.2f}"
    
    def _agregar_deducciones(self, root):
        """Agregar deducciones de la nómina"""
        if not self.nomina.deducciones.exists():
            return
        
        deductions = SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Deductions')
        
        total_deducciones = Decimal('0.00')
        
        for deduccion in self.nomina.deducciones.all():
            item = SubElement(deductions, '{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}DeductionItem')
            
            # Tipo de deducción
            SubElement(item, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}PaymentID').text = deduccion.tipo
            
            # Descripción
            SubElement(item, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Description').text = deduccion.concepto
            
            # Porcentaje si aplica
            if deduccion.porcentaje:
                SubElement(item, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Percent').text = f"{deduccion.porcentaje:.2f}"
            
            # Valor
            SubElement(item, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Amount', {
                'currencyID': 'COP'
            }).text = f"{deduccion.valor:.2f}"
            
            total_deducciones += deduccion.valor
        
        # Total de deducciones
        SubElement(deductions, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}TotalDeductionsAmount', {
            'currencyID': 'COP'
        }).text = f"{total_deducciones:.2f}"
    
    def _agregar_totales(self, root):
        """Agregar totales de la nómina"""
        nomina = self.nomina.nomina
        
        # Total devengado
        SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}LineExtensionAmount', {
            'currencyID': 'COP'
        }).text = f"{nomina.ingreso_real_periodo:.2f}"
        
        # Total deducciones
        SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}TaxExclusiveAmount', {
            'currencyID': 'COP'
        }).text = f"{nomina.total_deducciones:.2f}"
        
        # Neto a pagar
        SubElement(root, '{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}PayableAmount', {
            'currencyID': 'COP'
        }).text = f"{nomina.neto_pagar:.2f}"
    
    def _agregar_redondeos(self, root):
        """Agregar información de redondeos si aplica"""
        # Por ahora no se aplican redondeos
        # Se puede implementar según necesidad
        pass
    
    def _formatear_xml(self, root):
        """Formatea el XML con indentación"""
        xml_string = tostring(root, encoding='utf-8')
        dom = minidom.parseString(xml_string)
        return dom.toprettyxml(indent='  ', encoding='utf-8').decode('utf-8')
