"""
Servicio de Validación HSE (Health, Safety & Environment)

Este servicio proporciona:
- Validación de certificados obligatorios
- Bloqueos de nómina por certificados vencidos
- Verificación de dotaciones pendientes
- Validación de paz y salvos HSE

Normatividad:
- Resolución 2346/2007: Exámenes médicos obligatorios
- Ley 1562/2012: Elementos de protección personal
- Código Sustantivo del Trabajo Art. 230: Dotación
"""

from django.utils import timezone
from datetime import date, timedelta
from typing import Dict, List, Optional

from payroll.models import CertificadoEmpleado, EntregaDotacion, Empleado


class HSEValidator:
    """
    Validador de cumplimiento HSE para procesos de nómina.
    
    Verifica:
    - Certificados médicos vigentes
    - Certificados de competencia al día
    - Dotaciones entregadas según período
    - Bloqueos por incumplimientos
    """
    
    def __init__(self, empleado: Empleado, fecha_validacion: Optional[date] = None):
        """
        Inicializa el validador para un empleado.
        
        Args:
            empleado (Empleado): Empleado a validar
            fecha_validacion (date, optional): Fecha de referencia (default: hoy)
        """
        self.empleado = empleado
        self.fecha_validacion = fecha_validacion or timezone.now().date()
        self.errores = []
        self.advertencias = []
    
    def validar_certificados_obligatorios(self) -> bool:
        """
        Valida que el empleado tenga todos los certificados obligatorios vigentes.
        
        Returns:
            bool: True si todos los certificados están vigentes
        """
        certificados = CertificadoEmpleado.objects.filter(
            organization=self.empleado.organization,
            empleado=self.empleado,
            obligatorio_para_nomina=True
        )
        
        if not certificados.exists():
            # No hay certificados obligatorios configurados
            return True
        
        tiene_errores = False
        
        for certificado in certificados:
            if certificado.esta_vencido:
                self.errores.append(
                    f"Certificado VENCIDO: {certificado.get_tipo_certificado_display()} "
                    f"(venció {certificado.fecha_vencimiento})"
                )
                tiene_errores = True
            elif certificado.estado == CertificadoEmpleado.ESTADO_POR_VENCER:
                self.advertencias.append(
                    f"Certificado próximo a vencer: {certificado.get_tipo_certificado_display()} "
                    f"(vence en {certificado.dias_para_vencimiento} días)"
                )
        
        return not tiene_errores
    
    def validar_certificado_medico(self) -> bool:
        """
        Valida específicamente el certificado médico de aptitud.
        
        Returns:
            bool: True si tiene certificado médico vigente
        """
        certificado = CertificadoEmpleado.objects.filter(
            organization=self.empleado.organization,
            empleado=self.empleado,
            tipo_certificado__in=[
                CertificadoEmpleado.TIPO_MEDICO_INGRESO,
                CertificadoEmpleado.TIPO_MEDICO_PERIODICO
            ]
        ).order_by('-fecha_vencimiento').first()
        
        if not certificado:
            self.errores.append(
                "No tiene certificado médico de aptitud laboral"
            )
            return False
        
        if certificado.esta_vencido:
            self.errores.append(
                f"Certificado médico VENCIDO (venció {certificado.fecha_vencimiento})"
            )
            return False
        
        if certificado.dias_para_vencimiento <= 30:
            self.advertencias.append(
                f"Certificado médico próximo a vencer (quedan {certificado.dias_para_vencimiento} días)"
            )
        
        return True
    
    def validar_dotacion_periodo_actual(self) -> bool:
        """
        Valida que el empleado tenga la dotación del período actual entregada.
        
        Returns:
            bool: True si tiene dotación entregada o no aplica
        """
        from payroll.constants import SMMLV_2026
        
        # Solo aplica para empleados hasta 2 SMMLV (Art. 230 CST)
        if self.empleado.salario_base > SMMLV_2026 * 2:
            return True
        
        # Determinar período actual
        mes_actual = self.fecha_validacion.month
        if mes_actual <= 4:
            periodo = EntregaDotacion.PERIODO_1
        elif mes_actual <= 8:
            periodo = EntregaDotacion.PERIODO_2
        else:
            periodo = EntregaDotacion.PERIODO_3
        
        # Verificar dotación del período
        dotacion = EntregaDotacion.objects.filter(
            organization=self.empleado.organization,
            empleado=self.empleado,
            tipo_dotacion=EntregaDotacion.TIPO_UNIFORME,
            periodo_dotacion=periodo,
            anio=self.fecha_validacion.year
        ).first()
        
        if not dotacion:
            self.advertencias.append(
                f"No tiene registrada dotación para {periodo} {self.fecha_validacion.year}"
            )
            return True  # No bloqueante
        
        if dotacion.estado == EntregaDotacion.ESTADO_PENDIENTE:
            if dotacion.esta_vencida:
                self.errores.append(
                    f"Dotación {periodo} PENDIENTE (debió entregarse el {dotacion.fecha_programada})"
                )
                return False
            else:
                self.advertencias.append(
                    f"Dotación {periodo} pendiente de entrega (programada: {dotacion.fecha_programada})"
                )
        
        return True
    
    def validar_epp_critico(self) -> bool:
        """
        Valida que el empleado tenga EPP crítico si su cargo lo requiere.
        
        Returns:
            bool: True si tiene EPP o no aplica
        """
        # TODO: Integrar con riesgos por cargo cuando esté disponible
        # Por ahora solo genera advertencias
        
        epp_basico = EntregaDotacion.objects.filter(
            organization=self.empleado.organization,
            empleado=self.empleado,
            tipo_dotacion=EntregaDotacion.TIPO_EPP_BASICO,
            anio=self.fecha_validacion.year,
            estado=EntregaDotacion.ESTADO_ENTREGADO
        ).exists()
        
        if not epp_basico:
            self.advertencias.append(
                "No tiene registrada entrega de EPP básico para el año actual"
            )
        
        return True  # No bloqueante por ahora
    
    def validar_paz_y_salvo_dotacion(self) -> bool:
        """
        Valida que el empleado no tenga dotaciones pendientes de devolución.
        
        Returns:
            bool: True si no tiene pendientes
        """
        pendientes = EntregaDotacion.objects.filter(
            organization=self.empleado.organization,
            empleado=self.empleado,
            estado=EntregaDotacion.ESTADO_PENDIENTE,
            fecha_programada__lt=self.fecha_validacion
        ).count()
        
        if pendientes > 0:
            self.advertencias.append(
                f"Tiene {pendientes} entregas de dotación pendientes"
            )
        
        return True  # No bloqueante
    
    def validar_completo(self, strict_mode: bool = False) -> Dict:
        """
        Ejecuta todas las validaciones HSE.
        
        Args:
            strict_mode (bool): Si True, advertencias también bloquean
        
        Returns:
            dict: {
                'valido': bool,
                'puede_procesar_nomina': bool,
                'errores': List[str],
                'advertencias': List[str],
                'resumen': str
            }
        """
        self.errores = []
        self.advertencias = []
        
        # Validaciones críticas (bloquean nómina)
        cert_obligatorios_ok = self.validar_certificados_obligatorios()
        cert_medico_ok = self.validar_certificado_medico()
        dotacion_ok = self.validar_dotacion_periodo_actual()
        
        # Validaciones no críticas (solo advertencias)
        self.validar_epp_critico()
        self.validar_paz_y_salvo_dotacion()
        
        # Determinar si puede procesar nómina
        puede_procesar = cert_obligatorios_ok and cert_medico_ok and dotacion_ok
        
        if strict_mode:
            puede_procesar = puede_procesar and len(self.advertencias) == 0
        
        # Generar resumen
        if puede_procesar:
            if self.advertencias:
                resumen = f"✅ Apto para nómina ({len(self.advertencias)} advertencias)"
            else:
                resumen = "✅ Apto para nómina (sin observaciones)"
        else:
            resumen = f"❌ NO APTO para nómina ({len(self.errores)} errores críticos)"
        
        return {
            'valido': puede_procesar,
            'puede_procesar_nomina': puede_procesar,
            'errores': self.errores,
            'advertencias': self.advertencias,
            'resumen': resumen,
            'empleado': {
                'id': self.empleado.id,
                'documento': self.empleado.numero_documento,
                'nombre_completo': f"{self.empleado.nombres} {self.empleado.apellidos}",
            }
        }
    
    @staticmethod
    def validar_lote_empleados(empleados: List[Empleado], strict_mode: bool = False) -> Dict:
        """
        Valida un lote de empleados para procesamiento de nómina.
        
        Args:
            empleados (List[Empleado]): Lista de empleados a validar
            strict_mode (bool): Modo estricto (advertencias también bloquean)
        
        Returns:
            dict: {
                'total_empleados': int,
                'aptos': int,
                'no_aptos': int,
                'con_advertencias': int,
                'resultados': List[Dict]
            }
        """
        resultados = []
        aptos = 0
        no_aptos = 0
        con_advertencias = 0
        
        for empleado in empleados:
            validator = HSEValidator(empleado)
            resultado = validator.validar_completo(strict_mode=strict_mode)
            resultados.append(resultado)
            
            if resultado['valido']:
                aptos += 1
                if resultado['advertencias']:
                    con_advertencias += 1
            else:
                no_aptos += 1
        
        return {
            'total_empleados': len(empleados),
            'aptos': aptos,
            'no_aptos': no_aptos,
            'con_advertencias': con_advertencias,
            'resultados': resultados,
            'resumen': f"{aptos}/{len(empleados)} empleados aptos para nómina"
        }
    
    @staticmethod
    def bloquear_empleado_nomina(empleado: Empleado, motivo: str) -> bool:
        """
        Marca un empleado como bloqueado para procesamiento de nómina.
        
        Args:
            empleado (Empleado): Empleado a bloquear
            motivo (str): Razón del bloqueo
        
        Returns:
            bool: True si se bloqueó exitosamente
        """
        # TODO: Implementar campo 'bloqueado_nomina' en modelo Empleado
        # Por ahora solo registra en observaciones
        
        empleado.observaciones = f"[BLOQUEADO HSE] {motivo}\n{empleado.observaciones or ''}"
        empleado.save(update_fields=['observaciones'])
        
        return True
    
    @staticmethod
    def desbloquear_empleado_nomina(empleado: Empleado) -> bool:
        """
        Remueve el bloqueo de nómina del empleado.
        
        Args:
            empleado (Empleado): Empleado a desbloquear
        
        Returns:
            bool: True si se desbloqueó exitosamente
        """
        # TODO: Implementar campo 'bloqueado_nomina' en modelo Empleado
        # Por ahora solo limpia observaciones
        
        if empleado.observaciones and '[BLOQUEADO HSE]' in empleado.observaciones:
            empleado.observaciones = empleado.observaciones.replace('[BLOQUEADO HSE]', '[DESBLOQUEADO]')
            empleado.save(update_fields=['observaciones'])
        
        return True


class DotacionValidator:
    """
    Validador específico para dotaciones (Art. 230 CST).
    
    Verifica:
    - Elegibilidad para dotación (hasta 2 SMMLV)
    - Entregas pendientes por período
    - Cumplimiento de plazos legales
    """
    
    @staticmethod
    def empleado_elegible_dotacion(empleado: Empleado) -> bool:
        """
        Verifica si el empleado es elegible para dotación.
        
        Art. 230 CST: Empleados hasta 2 SMMLV
        
        Args:
            empleado (Empleado): Empleado a verificar
        
        Returns:
            bool: True si es elegible
        """
        from payroll.constants import SMMLV_2026
        
        return empleado.salario_base <= SMMLV_2026 * 2
    
    @staticmethod
    def periodo_actual() -> str:
        """
        Determina el período de dotación actual.
        
        Returns:
            str: PERIODO_1, PERIODO_2 o PERIODO_3
        """
        mes = timezone.now().month
        
        if mes <= 4:
            return EntregaDotacion.PERIODO_1
        elif mes <= 8:
            return EntregaDotacion.PERIODO_2
        else:
            return EntregaDotacion.PERIODO_3
    
    @staticmethod
    def fecha_limite_periodo(periodo: str, anio: int) -> date:
        """
        Retorna la fecha límite de entrega para un período.
        
        Args:
            periodo (str): PERIODO_1, PERIODO_2 o PERIODO_3
            anio (int): Año
        
        Returns:
            date: Fecha límite
        """
        if periodo == EntregaDotacion.PERIODO_1:
            return date(anio, 4, 30)
        elif periodo == EntregaDotacion.PERIODO_2:
            return date(anio, 8, 31)
        else:
            return date(anio, 12, 31)
    
    @staticmethod
    def verificar_dotaciones_vencidas(organization) -> Dict:
        """
        Genera reporte de dotaciones vencidas.
        
        Args:
            organization: Organización a verificar
        
        Returns:
            dict: Reporte con dotaciones vencidas
        """
        hoy = timezone.now().date()
        
        vencidas = EntregaDotacion.objects.filter(
            organization=organization,
            estado=EntregaDotacion.ESTADO_PENDIENTE,
            fecha_programada__lt=hoy
        ).select_related('empleado')
        
        por_empleado = {}
        
        for dotacion in vencidas:
            emp_key = dotacion.empleado.numero_documento
            
            if emp_key not in por_empleado:
                por_empleado[emp_key] = {
                    'empleado': dotacion.empleado,
                    'dotaciones_vencidas': []
                }
            
            por_empleado[emp_key]['dotaciones_vencidas'].append({
                'tipo': dotacion.get_tipo_dotacion_display(),
                'periodo': dotacion.get_periodo_dotacion_display() if dotacion.periodo_dotacion else 'N/A',
                'fecha_programada': dotacion.fecha_programada,
                'dias_retraso': dotacion.dias_retraso
            })
        
        return {
            'total_vencidas': vencidas.count(),
            'empleados_afectados': len(por_empleado),
            'detalle': por_empleado
        }
