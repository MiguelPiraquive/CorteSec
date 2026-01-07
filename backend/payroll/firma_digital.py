"""
Sistema de Firma Digital para Nómina Electrónica
Implementa firma XMLDSig según estándares DIAN
"""
from OpenSSL import crypto
import base64
from lxml import etree
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class FirmaDigitalNomina:
    """
    Manejador de firma digital para documentos XML de nómina electrónica
    Utiliza certificados digitales .p12/.pfx
    """
    
    def __init__(self):
        self.logger = logger
    
    def firmar(self, xml_contenido, organization):
        """
        Firma digitalmente un XML de nómina electrónica
        
        Args:
            xml_contenido: String con el contenido XML a firmar
            organization: Organización para obtener configuración de certificado
        
        Returns:
            String con XML firmado
        """
        try:
            # Obtener configuración
            from .models import ConfiguracionNominaElectronica
            config = ConfiguracionNominaElectronica.objects.filter(
                organization=organization,
                activa=True
            ).first()
            
            if not config:
                raise ValueError("No hay configuración activa de nómina electrónica")
            
            if not config.certificado_archivo:
                raise ValueError("No hay certificado digital configurado")
            
            # Cargar certificado
            with open(config.certificado_archivo.path, 'rb') as cert_file:
                certificado_data = cert_file.read()
            
            # Extraer certificado y llave privada
            p12 = crypto.load_pkcs12(
                certificado_data,
                config.certificado_password.encode()
            )
            
            cert = p12.get_certificate()
            private_key = p12.get_privatekey()
            
            # Parsear XML
            root = etree.fromstring(xml_contenido.encode('utf-8'))
            
            # Crear firma XMLDSig
            xml_firmado = self._crear_firma_xmldsig(
                root,
                private_key,
                cert
            )
            
            return etree.tostring(
                xml_firmado,
                pretty_print=True,
                xml_declaration=True,
                encoding='UTF-8'
            ).decode('utf-8')
            
        except Exception as e:
            self.logger.error(f"Error al firmar XML: {str(e)}")
            raise Exception(f"Error en firma digital: {str(e)}")
    
    def _crear_firma_xmldsig(self, root, private_key, cert):
        """
        Crea la firma XMLDSig según especificación
        
        Args:
            root: Elemento raíz del XML
            private_key: Llave privada del certificado
            cert: Certificado digital
        
        Returns:
            Elemento XML con firma incluida
        """
        # Namespaces para firma digital
        DSIG_NS = "http://www.w3.org/2000/09/xmldsig#"
        
        # Localizar UBLExtensions
        ubl_extensions = root.find('.//{urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2}UBLExtensions')
        
        if ubl_extensions is None:
            raise ValueError("No se encontró elemento UBLExtensions en el XML")
        
        # Crear nueva extensión para la firma
        ubl_extension = etree.SubElement(
            ubl_extensions,
            '{urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2}UBLExtension'
        )
        
        extension_content = etree.SubElement(
            ubl_extension,
            '{urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2}ExtensionContent'
        )
        
        # Crear elemento Signature
        signature = etree.SubElement(
            extension_content,
            f'{{{DSIG_NS}}}Signature',
            attrib={'Id': 'SignatureNomina'}
        )
        
        # SignedInfo
        signed_info = etree.SubElement(signature, f'{{{DSIG_NS}}}SignedInfo')
        
        # CanonicalizationMethod
        etree.SubElement(
            signed_info,
            f'{{{DSIG_NS}}}CanonicalizationMethod',
            attrib={'Algorithm': 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'}
        )
        
        # SignatureMethod
        etree.SubElement(
            signed_info,
            f'{{{DSIG_NS}}}SignatureMethod',
            attrib={'Algorithm': 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'}
        )
        
        # Reference
        reference = etree.SubElement(
            signed_info,
            f'{{{DSIG_NS}}}Reference',
            attrib={'URI': ''}
        )
        
        # Transforms
        transforms = etree.SubElement(reference, f'{{{DSIG_NS}}}Transforms')
        etree.SubElement(
            transforms,
            f'{{{DSIG_NS}}}Transform',
            attrib={'Algorithm': 'http://www.w3.org/2000/09/xmldsig#enveloped-signature'}
        )
        
        # DigestMethod
        etree.SubElement(
            reference,
            f'{{{DSIG_NS}}}DigestMethod',
            attrib={'Algorithm': 'http://www.w3.org/2001/04/xmlenc#sha256'}
        )
        
        # DigestValue (placeholder - se calcula después)
        digest_value = self._calcular_digest(root)
        etree.SubElement(reference, f'{{{DSIG_NS}}}DigestValue').text = digest_value
        
        # SignatureValue (placeholder - se calcula después)
        signature_value = self._firmar_contenido(signed_info, private_key)
        etree.SubElement(signature, f'{{{DSIG_NS}}}SignatureValue').text = signature_value
        
        # KeyInfo
        key_info = etree.SubElement(signature, f'{{{DSIG_NS}}}KeyInfo')
        x509_data = etree.SubElement(key_info, f'{{{DSIG_NS}}}X509Data')
        
        # X509Certificate
        cert_pem = crypto.dump_certificate(crypto.FILETYPE_PEM, cert)
        cert_base64 = base64.b64encode(cert_pem).decode('utf-8')
        etree.SubElement(x509_data, f'{{{DSIG_NS}}}X509Certificate').text = cert_base64
        
        return root
    
    def _calcular_digest(self, elemento):
        """Calcula el digest SHA-256 del elemento XML"""
        import hashlib
        
        # Canonicalizar el XML
        xml_string = etree.tostring(
            elemento,
            method='c14n',
            exclusive=True,
            with_comments=False
        )
        
        # Calcular SHA-256
        digest = hashlib.sha256(xml_string).digest()
        
        return base64.b64encode(digest).decode('utf-8')
    
    def _firmar_contenido(self, signed_info, private_key):
        """Firma el contenido con la llave privada"""
        # Canonicalizar SignedInfo
        signed_info_string = etree.tostring(
            signed_info,
            method='c14n',
            exclusive=True,
            with_comments=False
        )
        
        # Firmar con RSA-SHA256
        signature = crypto.sign(private_key, signed_info_string, 'sha256')
        
        return base64.b64encode(signature).decode('utf-8')
    
    def verificar_firma(self, xml_firmado):
        """
        Verifica la firma digital de un XML
        
        Args:
            xml_firmado: String con XML firmado
        
        Returns:
            Boolean indicando si la firma es válida
        """
        try:
            root = etree.fromstring(xml_firmado.encode('utf-8'))
            
            # Localizar firma
            DSIG_NS = "http://www.w3.org/2000/09/xmldsig#"
            signature = root.find(f'.//{{{DSIG_NS}}}Signature')
            
            if signature is None:
                return False
            
            # Extraer certificado
            cert_element = signature.find(f'.//{{{DSIG_NS}}}X509Certificate')
            if cert_element is None:
                return False
            
            cert_data = base64.b64decode(cert_element.text)
            cert = crypto.load_certificate(crypto.FILETYPE_PEM, cert_data)
            
            # Extraer SignatureValue
            signature_value_element = signature.find(f'.//{{{DSIG_NS}}}SignatureValue')
            if signature_value_element is None:
                return False
            
            signature_value = base64.b64decode(signature_value_element.text)
            
            # Extraer SignedInfo
            signed_info = signature.find(f'.//{{{DSIG_NS}}}SignedInfo')
            signed_info_string = etree.tostring(
                signed_info,
                method='c14n',
                exclusive=True,
                with_comments=False
            )
            
            # Verificar firma
            try:
                crypto.verify(cert, signature_value, signed_info_string, 'sha256')
                return True
            except:
                return False
                
        except Exception as e:
            self.logger.error(f"Error verificando firma: {str(e)}")
            return False
    
    def obtener_info_certificado(self, certificado_path, password):
        """
        Obtiene información del certificado digital
        
        Args:
            certificado_path: Ruta al archivo .p12/.pfx
            password: Contraseña del certificado
        
        Returns:
            Dict con información del certificado
        """
        try:
            with open(certificado_path, 'rb') as cert_file:
                certificado_data = cert_file.read()
            
            p12 = crypto.load_pkcs12(certificado_data, password.encode())
            cert = p12.get_certificate()
            
            subject = cert.get_subject()
            issuer = cert.get_issuer()
            
            return {
                'titular': subject.CN if hasattr(subject, 'CN') else '',
                'organizacion': subject.O if hasattr(subject, 'O') else '',
                'emisor': issuer.CN if hasattr(issuer, 'CN') else '',
                'fecha_inicio': datetime.strptime(
                    cert.get_notBefore().decode('ascii'),
                    '%Y%m%d%H%M%SZ'
                ),
                'fecha_expiracion': datetime.strptime(
                    cert.get_notAfter().decode('ascii'),
                    '%Y%m%d%H%M%SZ'
                ),
                'numero_serie': cert.get_serial_number(),
                'valido': not cert.has_expired()
            }
            
        except Exception as e:
            raise Exception(f"Error leyendo certificado: {str(e)}")


# Función auxiliar para validación de certificado
def validar_certificado_digital(certificado_path, password):
    """
    Valida que un certificado digital sea válido y no haya expirado
    
    Args:
        certificado_path: Ruta al archivo de certificado
        password: Contraseña del certificado
    
    Returns:
        Tuple (valido: bool, mensaje: str, info: dict)
    """
    firmador = FirmaDigitalNomina()
    
    try:
        info = firmador.obtener_info_certificado(certificado_path, password)
        
        if not info['valido']:
            return False, "El certificado ha expirado", info
        
        # Verificar que falten más de 30 días para expirar
        dias_restantes = (info['fecha_expiracion'] - datetime.now()).days
        
        if dias_restantes < 30:
            return True, f"Advertencia: El certificado expira en {dias_restantes} días", info
        
        return True, "Certificado válido", info
        
    except Exception as e:
        return False, f"Error: {str(e)}", {}
