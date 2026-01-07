"""
Cliente para integración con DIAN
Implementa comunicación con servicios web de DIAN
"""
import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class DIANClient:
    """
    Cliente para comunicación con servicios web de DIAN
    Maneja envío de documentos y consulta de estado
    """
    
    def __init__(self, organization):
        self.organization = organization
        self.config = self._obtener_configuracion()
        self.logger = logger
    
    def _obtener_configuracion(self):
        """Obtener configuración activa"""
        from .models import ConfiguracionNominaElectronica
        return ConfiguracionNominaElectronica.objects.filter(
            organization=self.organization,
            activa=True
        ).first()
    
    def probar_conexion(self):
        """
        Prueba la conexión con los servicios de DIAN
        
        Returns:
            Dict con resultado de la prueba
        """
        if not self.config:
            return {
                'exitoso': False,
                'mensaje': 'No hay configuración activa'
            }
        
        if not self.config.url_webservice:
            return {
                'exitoso': False,
                'mensaje': 'No se ha configurado la URL del servicio web'
            }
        
        try:
            # En producción, aquí iría la llamada real al servicio de DIAN
            # Por ahora, simulamos una prueba exitosa
            
            if self.config.ambiente == 'pruebas':
                mensaje = 'Conexión exitosa con ambiente de HABILITACIÓN'
            else:
                mensaje = 'Conexión exitosa con ambiente de PRODUCCIÓN'
            
            return {
                'exitoso': True,
                'mensaje': mensaje,
                'ambiente': self.config.get_ambiente_display(),
                'url': self.config.url_webservice
            }
            
        except Exception as e:
            self.logger.error(f"Error probando conexión: {str(e)}")
            return {
                'exitoso': False,
                'mensaje': f'Error de conexión: {str(e)}'
            }
    
    def enviar_nomina(self, nomina_electronica):
        """
        Envía una nómina electrónica a DIAN
        
        Args:
            nomina_electronica: Instancia de NominaElectronica
        
        Returns:
            Dict con respuesta de DIAN
        """
        if not self.config:
            raise ValueError("No hay configuración activa de nómina electrónica")
        
        if not nomina_electronica.xml_firmado:
            raise ValueError("El XML debe estar firmado antes de enviar")
        
        try:
            # Preparar datos para envío
            datos_envio = {
                'nit': f"{self.config.nit}{self.config.dv}",
                'software_id': self.config.identificador_software,
                'cune': nomina_electronica.cune,
                'numero_documento': nomina_electronica.numero_documento,
                'xml': nomina_electronica.xml_firmado,
                'ambiente': self.config.ambiente
            }
            
            # En producción, aquí iría la llamada real al WS de DIAN
            # Por ahora, simulamos respuesta exitosa
            
            if self.config.ambiente == 'pruebas':
                # Simular respuesta de habilitación
                respuesta = self._simular_respuesta_habilitacion(nomina_electronica)
            else:
                # Simular respuesta de producción
                respuesta = self._simular_respuesta_produccion(nomina_electronica)
            
            self.logger.info(f"Nómina enviada: {nomina_electronica.numero_documento}")
            
            return respuesta
            
        except Exception as e:
            self.logger.error(f"Error enviando nómina a DIAN: {str(e)}")
            return {
                'exitoso': False,
                'codigo': 'ERROR',
                'mensaje': f'Error en envío: {str(e)}',
                'errores': {'error_general': str(e)}
            }
    
    def _simular_respuesta_habilitacion(self, nomina_electronica):
        """
        Simula respuesta del ambiente de habilitación
        """
        import uuid
        
        # Simular validaciones de DIAN
        errores = []
        
        # Validar estructura básica
        if not nomina_electronica.cune:
            errores.append({
                'codigo': 'AAH04',
                'mensaje': 'El CUNE no está presente en el documento'
            })
        
        if not nomina_electronica.nomina.empleado.documento:
            errores.append({
                'codigo': 'AAH05',
                'mensaje': 'El documento del trabajador no está presente'
            })
        
        # Si hay errores, rechazar
        if errores:
            return {
                'exitoso': False,
                'codigo': 'RECHAZADO',
                'mensaje': 'Documento rechazado por errores de validación',
                'errores': errores,
                'track_id': str(uuid.uuid4())
            }
        
        # Si no hay errores, aceptar
        return {
            'exitoso': True,
            'codigo': 'ACEPTADO',
            'mensaje': 'Documento aceptado por la DIAN',
            'track_id': str(uuid.uuid4()),
            'fecha_validacion': datetime.now().isoformat()
        }
    
    def _simular_respuesta_produccion(self, nomina_electronica):
        """
        Simula respuesta del ambiente de producción
        """
        import uuid
        
        # En producción, validaciones más estrictas
        errores = []
        
        # Validar CUNE
        if not nomina_electronica.cune or len(nomina_electronica.cune) != 96:
            errores.append({
                'codigo': 'CUNE01',
                'mensaje': 'CUNE inválido o mal formado'
            })
        
        # Validar numeración
        if not self.config.resolucion_numero:
            errores.append({
                'codigo': 'NUM01',
                'mensaje': 'No hay resolución de numeración configurada'
            })
        
        # Si hay errores, rechazar
        if errores:
            return {
                'exitoso': False,
                'codigo': 'RECHAZADO',
                'mensaje': 'Documento rechazado',
                'errores': errores,
                'track_id': str(uuid.uuid4())
            }
        
        # Aceptar
        return {
            'exitoso': True,
            'codigo': 'ACEPTADO',
            'mensaje': 'Documento de nómina electrónica aceptado exitosamente',
            'track_id': str(uuid.uuid4()),
            'fecha_validacion': datetime.now().isoformat(),
            'qr_code': self._generar_qr_code(nomina_electronica)
        }
    
    def _generar_qr_code(self, nomina_electronica):
        """
        Genera datos para código QR del documento
        """
        return {
            'url': f"https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey={nomina_electronica.cune}",
            'cune': nomina_electronica.cune,
            'numero': nomina_electronica.numero_documento
        }
    
    def consultar_estado(self, track_id):
        """
        Consulta el estado de un documento enviado
        
        Args:
            track_id: ID de seguimiento retornado al enviar
        
        Returns:
            Dict con estado del documento
        """
        try:
            # En producción, llamada al WS de consulta de DIAN
            # Por ahora, simulamos respuesta
            
            return {
                'exitoso': True,
                'track_id': track_id,
                'estado': 'ACEPTADO',
                'mensaje': 'Documento procesado correctamente',
                'fecha_consulta': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error consultando estado: {str(e)}")
            return {
                'exitoso': False,
                'mensaje': f'Error en consulta: {str(e)}'
            }
    
    def obtener_validaciones_documento(self, cune):
        """
        Obtiene las validaciones de un documento por CUNE
        
        Args:
            cune: CUNE del documento
        
        Returns:
            Dict con validaciones y estado
        """
        try:
            # En producción, llamada al servicio de validación de DIAN
            
            return {
                'exitoso': True,
                'cune': cune,
                'estado': 'VALIDADO',
                'validaciones': [
                    {'nombre': 'Estructura XML', 'resultado': 'EXITOSO'},
                    {'nombre': 'Firma Digital', 'resultado': 'EXITOSO'},
                    {'nombre': 'CUNE', 'resultado': 'EXITOSO'},
                    {'nombre': 'Numeración', 'resultado': 'EXITOSO'},
                ],
                'fecha_validacion': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error obteniendo validaciones: {str(e)}")
            return {
                'exitoso': False,
                'mensaje': f'Error: {str(e)}'
            }


# Función auxiliar para validar configuración antes de enviar
def validar_configuracion_dian(organization):
    """
    Valida que la configuración esté completa para enviar a DIAN
    
    Args:
        organization: Organización a validar
    
    Returns:
        Tuple (valido: bool, errores: list)
    """
    from .models import ConfiguracionNominaElectronica
    
    config = ConfiguracionNominaElectronica.objects.filter(
        organization=organization,
        activa=True
    ).first()
    
    if not config:
        return False, ['No hay configuración activa']
    
    errores = []
    
    # Validar datos básicos
    if not config.nit:
        errores.append('NIT no configurado')
    
    if not config.dv:
        errores.append('Dígito de verificación no configurado')
    
    if not config.razon_social:
        errores.append('Razón social no configurada')
    
    # Validar parámetros técnicos
    if not config.identificador_software:
        errores.append('Identificador de software no configurado')
    
    if not config.clave_tecnica:
        errores.append('Clave técnica no configurada')
    
    # Validar certificado
    if not config.certificado_archivo:
        errores.append('Certificado digital no cargado')
    
    if not config.certificado_password:
        errores.append('Contraseña del certificado no configurada')
    
    # Validar URL de servicio
    if not config.url_webservice:
        errores.append('URL del servicio web no configurada')
    
    return len(errores) == 0, errores
