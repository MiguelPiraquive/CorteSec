"""
Sincroniza pagos de préstamos con descuentos en nóminas pagadas.
Crea PagoPrestamo faltantes y recalcula saldo_pendiente y total_pagado.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone

from nomina.models import NominaSimple, NominaPrestamo
from prestamos.models import Prestamo, PagoPrestamo
from django.contrib.auth import get_user_model

User = get_user_model()
usuario_defecto = User.objects.filter(is_superuser=True).first() or User.objects.first()

print("\n" + "="*80)
print("SINCRONIZACIÓN DE PAGOS POR NÓMINA PAGADA")
print("="*80 + "\n")

nominas_pagadas = NominaSimple.objects.filter(estado='pagada')
print(f"Nóminas pagadas encontradas: {nominas_pagadas.count()}\n")

# Crear pagos faltantes
creados = 0
for nomina in nominas_pagadas:
    for nomina_prestamo in nomina.prestamos.all():
        prestamo = nomina_prestamo.prestamo
        if not prestamo:
            continue

        numero_pago = f'PAG-{prestamo.numero_prestamo}-{nomina_prestamo.numero_cuota:03d}'
        if PagoPrestamo.objects.filter(prestamo=prestamo, numero_pago=numero_pago).exists():
            continue

        saldo_anterior = prestamo.saldo_pendiente or Decimal('0.00')
        saldo_nuevo = max(saldo_anterior - nomina_prestamo.valor_cuota, Decimal('0.00'))

        if not usuario_defecto:
            print("⚠️  No hay usuario disponible para registrar pagos. Abortando.")
            break

        PagoPrestamo.objects.create(
            organization=nomina.organization,
            prestamo=prestamo,
            numero_pago=numero_pago,
            fecha_pago=nomina.fecha_pago or timezone.now().date(),
            tipo_pago='cuota',
            metodo_pago='descuento_nomina',
            monto_pago=nomina_prestamo.valor_cuota,
            monto_capital=nomina_prestamo.valor_cuota,
            monto_interes=Decimal('0.00'),
            monto_mora=Decimal('0.00'),
            saldo_anterior=saldo_anterior,
            saldo_nuevo=saldo_nuevo,
            observaciones=f'Pago automático vía nómina {nomina.numero}',
            registrado_por=usuario_defecto
        )
        creados += 1

print(f"Pagos creados: {creados}\n")

# Recalcular saldos por préstamo
for prestamo in Prestamo.objects.all():
    pagos_total = PagoPrestamo.objects.filter(prestamo=prestamo).aggregate(total=Sum('monto_pago'))['total'] or Decimal('0.00')
    monto_total = Decimal(str(prestamo.monto_final or 0))
    saldo_nuevo = max(monto_total - pagos_total, Decimal('0.00'))
    nuevo_estado = 'liquidado' if saldo_nuevo == Decimal('0.00') else 'activo'

    Prestamo.objects.filter(pk=prestamo.pk).update(
        total_pagado=pagos_total,
        saldo_pendiente=saldo_nuevo,
        estado=nuevo_estado
    )

print("Saldos recalculados para todos los préstamos.")
print("\n" + "="*80 + "\n")
