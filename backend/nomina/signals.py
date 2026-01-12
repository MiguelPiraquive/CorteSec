"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    SIGNALS DE NÓMINA - CORTESEC                               ║
║                Sistema de Nómina para Construcción                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Señales Django para automatizar procesos de nómina.

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: Enero 2026
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from decimal import Decimal

from .models import (
    NominaSimple,
    NominaItem,
    NominaConcepto,
    NominaPrestamo,
    Contrato,
)


# ══════════════════════════════════════════════════════════════════════════════
# SEÑALES PARA NÓMINA
# ══════════════════════════════════════════════════════════════════════════════

@receiver(pre_save, sender=NominaSimple)
def generar_numero_nomina(sender, instance, **kwargs):
    """
    Genera automáticamente el número de nómina si no existe.
    Formato: NOM-YYYY-NNNNNN
    """
    if not instance.numero:
        from datetime import datetime
        from django.db.models import Max
        
        year = datetime.now().year
        prefix = f"NOM-{year}-"
        
        # Buscar el último número para este año y organización
        ultimo = NominaSimple.objects.filter(
            organization=instance.organization,
            numero__startswith=prefix
        ).aggregate(
            max_numero=Max('numero')
        )['max_numero']
        
        if ultimo:
            try:
                ultimo_secuencia = int(ultimo.replace(prefix, ''))
                nueva_secuencia = ultimo_secuencia + 1
            except ValueError:
                nueva_secuencia = 1
        else:
            nueva_secuencia = 1
        
        instance.numero = f"{prefix}{nueva_secuencia:06d}"


@receiver(post_save, sender=NominaSimple)
def actualizar_estado_contrato(sender, instance, created, **kwargs):
    """
    Actualiza información del contrato cuando se crea una nómina.
    """
    # Solo para nuevas nóminas
    if created and instance.contrato:
        # Aquí podríamos agregar lógica adicional si es necesario
        # Por ejemplo, actualizar fecha de última nómina, etc.
        pass


# ══════════════════════════════════════════════════════════════════════════════
# SEÑALES PARA ITEMS DE NÓMINA
# ══════════════════════════════════════════════════════════════════════════════

@receiver(pre_save, sender=NominaItem)
def calcular_valor_total_item(sender, instance, **kwargs):
    """
    Calcula automáticamente el valor total del item antes de guardar.
    valor_total = cantidad * valor_unitario
    """
    instance.valor_total = instance.cantidad * instance.valor_unitario


@receiver(post_save, sender=NominaItem)
def actualizar_total_items_nomina(sender, instance, **kwargs):
    """
    Actualiza el total de items en la nómina después de guardar un item.
    """
    if instance.nomina:
        total = sum(
            item.valor_total 
            for item in instance.nomina.items.all()
        )
        
        # Actualizar sin disparar señales adicionales
        NominaSimple.objects.filter(pk=instance.nomina.pk).update(
            total_items=total
        )


# ══════════════════════════════════════════════════════════════════════════════
# SEÑALES PARA CONCEPTOS DE NÓMINA
# ══════════════════════════════════════════════════════════════════════════════

@receiver(post_save, sender=NominaConcepto)
def actualizar_totales_por_concepto(sender, instance, **kwargs):
    """
    Actualiza los totales de devengados/deducciones después de guardar un concepto.
    """
    if instance.nomina:
        devengados = sum(
            c.valor for c in instance.nomina.conceptos.filter(tipo='DEVENGADO')
        )
        deducciones = sum(
            c.valor for c in instance.nomina.conceptos.filter(tipo='DEDUCCION')
        )
        
        # Actualizar sin disparar señales adicionales
        NominaSimple.objects.filter(pk=instance.nomina.pk).update(
            total_devengado=instance.nomina.total_items + devengados,
            total_deducciones=deducciones
        )


# ══════════════════════════════════════════════════════════════════════════════
# SEÑALES PARA PRÉSTAMOS EN NÓMINA
# ══════════════════════════════════════════════════════════════════════════════

@receiver(post_save, sender=NominaPrestamo)
def actualizar_total_prestamos_nomina(sender, instance, **kwargs):
    """
    Actualiza el total de préstamos en la nómina después de agregar un descuento.
    """
    if instance.nomina:
        total = sum(
            p.valor_cuota for p in instance.nomina.prestamos_descontados.all()
        )
        
        # Actualizar sin disparar señales adicionales
        NominaSimple.objects.filter(pk=instance.nomina.pk).update(
            total_prestamos=total
        )


# ══════════════════════════════════════════════════════════════════════════════
# SEÑALES PARA CONTRATOS
# ══════════════════════════════════════════════════════════════════════════════

@receiver(post_save, sender=Contrato)
def desactivar_contratos_anteriores(sender, instance, created, **kwargs):
    """
    Cuando se crea un nuevo contrato activo, desactiva los contratos anteriores
    del mismo empleado en la misma organización.
    """
    if created and instance.activo:
        Contrato.objects.filter(
            organization=instance.organization,
            empleado=instance.empleado,
            activo=True
        ).exclude(pk=instance.pk).update(activo=False)
