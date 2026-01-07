"""
Señales (Signals) para el módulo de Nómina
==========================================

Señales para automatizar:
- Generación de comprobantes contables
- Registro de auditoría
- Integración con préstamos
- Notificaciones

Autor: Sistema CorteSec
Versión: 2.0.0 - Fase 2A
"""

from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from decimal import Decimal
import json
import logging

from .models import (
    NominaSimple, NominaElectronica
)

# Alias para compatibilidad
Nomina = NominaSimple

logger = logging.getLogger(__name__)


# ============================================
# SEÑALES PARA AUDITORÍA
# ============================================

@receiver(pre_save, sender=Nomina)
def guardar_estado_anterior_nomina(sender, instance, **kwargs):
    """
    Guarda el estado anterior de la nómina antes de modificarla
    """
    if instance.pk:  # Solo si ya existe
        try:
            nomina_anterior = Nomina.objects.get(pk=instance.pk)
            # Guardar en una variable temporal para usar en post_save
            instance._estado_anterior = {
                'ingreso_real_periodo': float(nomina_anterior.ingreso_real_periodo),
                'ibc_cotizacion': float(nomina_anterior.ibc_cotizacion),
                'excedente_no_salarial': float(nomina_anterior.excedente_no_salarial),
                'deduccion_salud': float(nomina_anterior.deduccion_salud),
                'deduccion_pension': float(nomina_anterior.deduccion_pension),
                'prestamos': float(nomina_anterior.prestamos),
                'restaurante': float(nomina_anterior.restaurante),
                'otras_deducciones': float(nomina_anterior.otras_deducciones),
            }
        except Nomina.DoesNotExist:
            instance._estado_anterior = None
    else:
        instance._estado_anterior = None


@receiver(post_save, sender=Nomina)
def registrar_cambio_nomina(sender, instance, created, **kwargs):
    """
    Registra en el historial cada cambio en la nómina
    """
    try:
        # Determinar acción
        if created:
            accion = 'crear'
            datos_anteriores = None
            datos_nuevos = {
                'ingreso_real_periodo': float(instance.ingreso_real_periodo),
                'ibc_cotizacion': float(instance.ibc_cotizacion),
                'excedente_no_salarial': float(instance.excedente_no_salarial),
                'neto_pagar': float(instance.neto_pagar),
            }
            campos_modificados = list(datos_nuevos.keys())
        else:
            accion = 'editar'
            datos_anteriores = getattr(instance, '_estado_anterior', None)
            datos_nuevos = {
                'ingreso_real_periodo': float(instance.ingreso_real_periodo),
                'ibc_cotizacion': float(instance.ibc_cotizacion),
                'excedente_no_salarial': float(instance.excedente_no_salarial),
                'deduccion_salud': float(instance.deduccion_salud),
                'deduccion_pension': float(instance.deduccion_pension),
                'prestamos': float(instance.prestamos),
                'restaurante': float(instance.restaurante),
                'otras_deducciones': float(instance.otras_deducciones),
            }
            
            # Detectar campos modificados
            campos_modificados = []
            if datos_anteriores:
                for campo, valor_nuevo in datos_nuevos.items():
                    valor_anterior = datos_anteriores.get(campo)
                    if valor_anterior != valor_nuevo:
                        campos_modificados.append(campo)
        
        # Crear registro de historial
        if campos_modificados or created:
            HistorialNomina.objects.create(
                nomina=instance,
                accion=accion,
                organization=instance.organization,
                datos_anteriores=datos_anteriores,
                datos_nuevos=datos_nuevos,
                campos_modificados=campos_modificados,
                observaciones=f"Nómina {accion} - Empleado: {instance.empleado.nombre_completo}"
            )
            
            logger.info(f"Historial registrado: Nómina #{instance.id} - Acción: {accion}")
    
    except Exception as e:
        logger.error(f"Error al registrar historial de nómina #{instance.id}: {str(e)}")


# COMENTADO: DetalleDeduccion ya no existe en arquitectura v3.0
# @receiver(post_save, sender=DetalleDeduccion)
# def actualizar_total_deducciones(sender, instance, created, **kwargs):
#     """
#     Actualiza el total de deducciones en la nómina cuando se agrega una deducción
#     """
#     if created:
#         try:
#             nomina = instance.nomina
#             
#             # Actualizar campo correspondiente según tipo
#             if instance.tipo_deduccion.codigo == 'PRESTAMO':
#                 nomina.prestamos = Decimal(nomina.prestamos or 0) + instance.valor
#             elif instance.tipo_deduccion.codigo == 'RESTAURANTE':
#                 nomina.restaurante = Decimal(nomina.restaurante or 0) + instance.valor
#             else:
#                 nomina.otras_deducciones = Decimal(nomina.otras_deducciones or 0) + instance.valor
#             
#             nomina.save(update_fields=['prestamos', 'restaurante', 'otras_deducciones'])
#             
#             logger.info(f"Deducción agregada a nómina #{nomina.id}: {instance.concepto} - ${instance.valor}")
#         
#         except Exception as e:
#             logger.error(f"Error al actualizar deducciones de nómina: {str(e)}")


# ============================================
# SEÑALES PARA INTEGRACIÓN CONTABLE
# ============================================

@receiver(post_save, sender=Nomina)
def generar_comprobante_contable(sender, instance, created, **kwargs):
    """
    Genera automáticamente el comprobante contable cuando se crea/actualiza una nómina
    """
    # Solo generar si no existe ya un comprobante
    if hasattr(instance, 'comprobante_contable'):
        logger.info(f"Comprobante contable ya existe para nómina #{instance.id}")
        return
    
    try:
        from contabilidad.models import ComprobanteContable, MovimientoContable, PlanCuentas
        from django.db import transaction
        
        # Generar número de comprobante
        ultimo_numero = ComprobanteContable.objects.filter(
            organization=instance.organization,
            tipo_comprobante='nomina'
        ).count()
        numero_comprobante = f"NOM-{instance.periodo_inicio.strftime('%Y%m')}-{ultimo_numero + 1:05d}"
        
        with transaction.atomic():
            # Obtener usuario del sistema para creado_por
            from login.models import CustomUser
            usuario_sistema = CustomUser.objects.filter(
                organization=instance.organization,
                is_staff=True
            ).first()
            
            if not usuario_sistema:
                logger.warning("No hay usuario staff disponible para crear comprobante")
                return
            
            # Crear comprobante contable
            try:
                comprobante = ComprobanteContable.objects.create(
                    organization=instance.organization,
                    numero=numero_comprobante,
                    tipo_comprobante='nomina',
                    fecha=instance.periodo_fin,
                    descripcion=f"Nómina {instance.empleado.nombre_completo} - {instance.periodo_inicio} a {instance.periodo_fin}",
                    estado='borrador',
                    creado_por=usuario_sistema
                )
            except Exception as e:
                logger.warning(f"No se pudo crear comprobante contable: {str(e)}")
                return
            
            # Crear registro de vinculación
            comprobante_nomina = ComprobanteContableNomina.objects.create(
                organization=instance.organization,
                nomina=instance,
                comprobante=comprobante,
                total_devengado=instance.ingreso_real_periodo,
                total_deducciones=instance.total_deducciones,
                neto_pagado=instance.neto_pagar,
                estado='generado'
            )
            
            # Buscar cuentas contables (ejemplo simplificado)
            try:
                cuenta_gastos_nomina = PlanCuentas.objects.filter(
                    organization=instance.organization,
                    codigo__startswith='51',  # Gastos operacionales
                    activa=True
                ).first()
                
                cuenta_bancos = PlanCuentas.objects.filter(
                    organization=instance.organization,
                    codigo__startswith='11',  # Activos corrientes
                    activa=True
                ).first()
                
                # Movimiento débito: Gasto de nómina
                if cuenta_gastos_nomina:
                    MovimientoContable.objects.create(
                        organization=instance.organization,
                        comprobante=comprobante,
                        cuenta=cuenta_gastos_nomina,
                        tipo_movimiento='debito',
                        valor=instance.ingreso_real_periodo,
                        descripcion=f"Gasto nómina - {instance.empleado.nombre_completo}"
                    )
                
                # Movimiento crédito: Banco (neto a pagar)
                if cuenta_bancos:
                    MovimientoContable.objects.create(
                        organization=instance.organization,
                        comprobante=comprobante,
                        cuenta=cuenta_bancos,
                        tipo_movimiento='credito',
                        valor=instance.neto_pagar,
                        descripcion=f"Pago nómina - {instance.empleado.nombre_completo}"
                    )
                
                # Actualizar totales del comprobante
                comprobante.total_debito = instance.ingreso_real_periodo
                comprobante.total_credito = instance.neto_pagar
                comprobante.save(update_fields=['total_debito', 'total_credito'])
                
                logger.info(f"Comprobante contable generado: {numero_comprobante} para nómina #{instance.id}")
            
            except Exception as e:
                logger.warning(f"No se pudieron crear movimientos contables: {str(e)}")
                # El comprobante se crea pero sin movimientos
    
    except Exception as e:
        logger.error(f"Error al generar comprobante contable para nómina #{instance.id}: {str(e)}")


# ============================================
# SEÑALES PARA INTEGRACIÓN CON PRÉSTAMOS
# ============================================

# COMENTADO: DetalleDeduccion ya no existe en arquitectura v3.0
# @receiver(post_save, sender=DetalleDeduccion)
# def marcar_pago_prestamo_registrado(sender, instance, created, **kwargs):
#     """
#     Vincula el pago del préstamo cuando se crea una deducción de nómina
#     """
#     if created and instance.pago_prestamo:
#         try:
#             pago = instance.pago_prestamo
#             
#             # Agregar observación indicando que fue registrado vía nómina
#             obs = f"Deducción registrada en nómina {instance.nomina.numero_nomina}"
#             if pago.observaciones:
#                 pago.observaciones += f"\n{obs}"
#             else:
#                 pago.observaciones = obs
#             pago.save(update_fields=['observaciones'])
#             
#             logger.info(f"Pago {pago.numero_pago} vinculado a nómina {instance.nomina.numero_nomina}")
#         
#         except Exception as e:
#             logger.error(f"Error al vincular pago con nómina: {str(e)}")


# ============================================
# CONFIGURACIÓN DE SEÑALES
# ============================================

def conectar_senales():
    """
    Función para conectar todas las señales
    Se llama desde apps.py
    """
    logger.info("Señales de nómina conectadas correctamente")
