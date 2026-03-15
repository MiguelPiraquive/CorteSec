"""
Script para forzar asignaci\u00f3n de n\u00famero a pr\u00e9stamos
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from prestamos.models import Prestamo

# Obtener pr\u00e9stamos sin n\u00famero
prestamos = Prestamo.objects.all()

for prestamo in prestamos:
    if not prestamo.numero_prestamo or prestamo.numero_prestamo == '':
        # Generar n\u00famero manualmente
        year = 2026
        ultimo = Prestamo.objects.filter(
            organization=prestamo.organization,
            numero_prestamo__startswith=f'PR{year}'
        ).exclude(numero_prestamo='').exclude(id=prestamo.id).order_by('-numero_prestamo').first()
        
        if ultimo and ultimo.numero_prestamo:
            try:
                ultimo_numero = int(ultimo.numero_prestamo[-4:])
                nuevo_numero = ultimo_numero + 1
            except:
                nuevo_numero = 1
        else:
            nuevo_numero = 1
        
        nuevo_numero_prestamo = f'PR{year}{nuevo_numero:04d}'
        print(f"Asignando n\u00famero {nuevo_numero_prestamo} al pr\u00e9stamo {prestamo.id}")
        
        # Actualizar directamente
        Prestamo.objects.filter(id=prestamo.id).update(numero_prestamo=nuevo_numero_prestamo)
        print(f"\u2713 Actualizado")
    else:
        print(f"Pr\u00e9stamo {prestamo.id} ya tiene n\u00famero: {prestamo.numero_prestamo}")

print("\nVerificaci\u00f3n final:")
for prestamo in Prestamo.objects.all():
    print(f"  {prestamo.id}: {prestamo.numero_prestamo}")
