"""
Comando para probar las integraciones de Fase 2A
Valida:
- Generación automática de comprobantes contables
- Integración con préstamos
- Auditoría de cambios
- Deducciones detalladas
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from decimal import Decimal
from payroll.models import (
    Empleado, Nomina, TipoDeduccion, DetalleDeduccion,
    ComprobanteContableNomina, HistorialNomina
)
from prestamos.models import Prestamo, PagoPrestamo
from contabilidad.models import ComprobanteContable
from core.models import Organization

User = get_user_model()


class Command(BaseCommand):
    help = 'Prueba las integraciones de Fase 2A de nómina'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--organization-id',
            type=str,
            help='ID de la organización (opcional)'
        )
    
    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS("PRUEBA DE INTEGRACIONES - FASE 2A"))
        self.stdout.write("=" * 60)
        
        try:
            # Obtener organización
            org_id = options.get('organization_id')
            if org_id:
                organization = Organization.objects.get(id=org_id)
            else:
                organization = Organization.objects.first()
            
            if not organization:
                self.stdout.write(self.style.ERROR("No hay organizaciones disponibles"))
                return
            
            self.stdout.write(f"\n✓ Organización: {organization.nombre}\n")
            
            # PRUEBA 1: Verificar catálogo de tipos de deducción
            self.stdout.write("\n" + "=" * 60)
            self.stdout.write("PRUEBA 1: Catálogo de Tipos de Deducción")
            self.stdout.write("=" * 60)
            
            tipos = TipoDeduccion.objects.filter(
                activo=True
            ).order_by('codigo')
            
            self.stdout.write(f"\nTipos de Deducción: {tipos.count()}")
            for tipo in tipos:
                obligatoria = "✓" if tipo.es_obligatoria else " "
                sobre_ibc = "✓" if tipo.aplica_sobre_ibc else " "
                self.stdout.write(
                    f"  [{obligatoria}] {tipo.codigo:12} - {tipo.nombre:25} "
                    f"({tipo.porcentaje_defecto}%) IBC:[{sobre_ibc}]"
                )
            
            # PRUEBA 2: Crear nómina con deducciones detalladas
            self.stdout.write("\n" + "=" * 60)
            self.stdout.write("PRUEBA 2: Crear Nómina con Deducciones Detalladas")
            self.stdout.write("=" * 60)
            
            empleado = Empleado.objects.filter(
                organization=organization,
                activo=True
            ).first()
            
            if not empleado:
                self.stdout.write(self.style.WARNING("No hay empleados para probar"))
            else:
                self.stdout.write(f"\n✓ Empleado: {empleado.nombre_completo}")
                
                with transaction.atomic():
                    # Crear nómina con período diferente para evitar duplicados
                    from datetime import datetime
                    hoy = datetime.now()
                    periodo_inicio = date(hoy.year, hoy.month, 1)
                    
                    # Buscar un periodo disponible
                    offset = 0
                    while Nomina.objects.filter(
                        empleado=empleado,
                        periodo_inicio=periodo_inicio,
                        periodo_fin=periodo_inicio + timedelta(days=29)
                    ).exists():
                        offset += 1
                        if offset > 12:  # Máximo 12 meses hacia atrás
                            self.stdout.write(self.style.WARNING(
                                "No se pudo encontrar un periodo disponible para crear nómina de prueba"
                            ))
                            return
                        mes_anterior = periodo_inicio.month - offset
                        año = periodo_inicio.year
                        if mes_anterior <= 0:
                            mes_anterior += 12
                            año -= 1
                        periodo_inicio = date(año, mes_anterior, 1)
                    
                    periodo_fin = periodo_inicio + timedelta(days=29)
                    
                    nomina = Nomina.objects.create(
                        organization=organization,
                        empleado=empleado,
                        periodo_inicio=periodo_inicio,
                        periodo_fin=periodo_fin,
                        dias_trabajados=30,
                        ingreso_real_periodo=Decimal('3000000'),
                        ibc_cotizacion=Decimal('3000000'),
                        excedente_no_salarial=Decimal('0'),
                        observaciones='Nómina de prueba Fase 2A'
                    )
                    
                    self.stdout.write(f"✓ Nómina creada: ID {nomina.id}")
                    
                    # Crear deducciones detalladas
                    self.stdout.write("\nCreando deducciones detalladas...")
                    
                    # Salud (4%)
                    tipo_salud = TipoDeduccion.objects.get(codigo='SALUD')
                    DetalleDeduccion.objects.create(
                        organization=organization,
                        nomina=nomina,
                        tipo_deduccion=tipo_salud,
                        concepto='Aporte Salud Empleado 4%',
                        valor=Decimal('120000'),
                        base_calculo=Decimal('3000000'),
                        porcentaje=Decimal('4.00')
                    )
                    
                    # Pensión (4%)
                    tipo_pension = TipoDeduccion.objects.get(codigo='PENSION')
                    DetalleDeduccion.objects.create(
                        organization=organization,
                        nomina=nomina,
                        tipo_deduccion=tipo_pension,
                        concepto='Aporte Pensión Empleado 4%',
                        valor=Decimal('120000'),
                        base_calculo=Decimal('3000000'),
                        porcentaje=Decimal('4.00')
                    )
                    
                    # Restaurante
                    tipo_restaurante = TipoDeduccion.objects.get(codigo='RESTAURANTE')
                    DetalleDeduccion.objects.create(
                        organization=organization,
                        nomina=nomina,
                        tipo_deduccion=tipo_restaurante,
                        concepto='Descuento Restaurante',
                        valor=Decimal('50000'),
                        observaciones='Descuento por alimentación'
                    )
                    
                    # Actualizar totales en nómina
                    nomina.deduccion_salud = Decimal('120000')
                    nomina.deduccion_pension = Decimal('120000')
                    nomina.restaurante = Decimal('50000')
                    nomina.save()
                    
                    deducciones = DetalleDeduccion.objects.filter(nomina=nomina)
                    self.stdout.write(f"✓ {deducciones.count()} deducciones creadas")
                    
                    for deduccion in deducciones:
                        self.stdout.write(
                            f"  - {deduccion.tipo_deduccion.nombre:25} ${deduccion.valor:>12,.2f}"
                        )
                    
                    self.stdout.write(f"\n✓ Total Deducciones: ${nomina.total_deducciones:,.2f}")
                    self.stdout.write(f"✓ Neto a Pagar: ${nomina.neto_pagar:,.2f}")
            
            # PRUEBA 3: Verificar generación de comprobante contable
            self.stdout.write("\n" + "=" * 60)
            self.stdout.write("PRUEBA 3: Comprobantes Contables Automáticos")
            self.stdout.write("=" * 60)
            
            comprobantes = ComprobanteContableNomina.objects.filter(
                organization=organization
            ).select_related('comprobante_contable', 'nomina')
            
            if comprobantes.exists():
                self.stdout.write(f"\n✓ Comprobantes encontrados: {comprobantes.count()}")
                for comp in comprobantes[:5]:
                    self.stdout.write(
                        f"  - {comp.comprobante.numero_comprobante} "
                        f"| Nómina ID: {comp.nomina.id} "
                        f"| {comp.fecha_generacion}"
                    )
            else:
                self.stdout.write(self.style.WARNING(
                    "\n⚠ No se encontraron comprobantes automáticos. "
                    "Verifica que las señales estén conectadas."
                ))
            
            # PRUEBA 4: Verificar historial de auditoría
            self.stdout.write("\n" + "=" * 60)
            self.stdout.write("PRUEBA 4: Historial de Auditoría")
            self.stdout.write("=" * 60)
            
            historiales = HistorialNomina.objects.filter(
                organization=organization
            ).select_related('nomina', 'usuario').order_by('-fecha')
            
            if historiales.exists():
                self.stdout.write(f"\n✓ Registros de auditoría: {historiales.count()}")
                for hist in historiales[:5]:
                    self.stdout.write(
                        f"  - {hist.accion:10} | ID {hist.nomina.id:5} "
                        f"| {hist.usuario.username if hist.usuario else 'Sistema':15} | {hist.fecha}"
                    )
            else:
                self.stdout.write(self.style.WARNING(
                    "\n⚠ No se encontró historial de auditoría. "
                    "Verifica que las señales estén conectadas."
                ))
            
            # PRUEBA 5: Integración con préstamos
            self.stdout.write("\n" + "=" * 60)
            self.stdout.write("PRUEBA 5: Integración con Préstamos")
            self.stdout.write("=" * 60)
            
            prestamos_activos = Prestamo.objects.filter(
                organization=organization,
                estado='activo'
            )
            
            if prestamos_activos.exists():
                self.stdout.write(f"\n✓ Préstamos activos: {prestamos_activos.count()}")
                
                deducciones_prestamo = DetalleDeduccion.objects.filter(
                    organization=organization,
                    tipo_deduccion__codigo='PRESTAMO'
                ).select_related('prestamo', 'nomina')
                
                self.stdout.write(f"✓ Deducciones de préstamo registradas: {deducciones_prestamo.count()}")
                
                for ded in deducciones_prestamo[:5]:
                    prestamo_num = ded.prestamo.numero_prestamo if ded.prestamo else 'N/A'
                    self.stdout.write(
                        f"  - Préstamo {prestamo_num:15} | "
                        f"Nómina ID: {ded.nomina.id:5} | "
                        f"${ded.valor:>12,.2f}"
                    )
            else:
                self.stdout.write(self.style.WARNING(
                    "\n⚠ No hay préstamos activos para probar la integración"
                ))
            
            # RESUMEN FINAL
            self.stdout.write("\n" + "=" * 60)
            self.stdout.write(self.style.SUCCESS("RESUMEN DE PRUEBAS"))
            self.stdout.write("=" * 60)
            
            resumen = {
                'Tipos de Deducción': TipoDeduccion.objects.filter(
                    activo=True
                ).count(),
                'Deducciones Detalladas': DetalleDeduccion.objects.filter(
                    organization=organization
                ).count(),
                'Comprobantes Automáticos': ComprobanteContableNomina.objects.filter(
                    organization=organization
                ).count(),
                'Registros de Auditoría': HistorialNomina.objects.filter(
                    organization=organization
                ).count(),
                'Nóminas Totales': Nomina.objects.filter(
                    organization=organization
                ).count(),
            }
            
            for key, value in resumen.items():
                self.stdout.write(f"  {key:30} : {value:5}")
            
            self.stdout.write("\n" + "=" * 60)
            self.stdout.write(self.style.SUCCESS("✓ Pruebas completadas exitosamente"))
            self.stdout.write("=" * 60)
            
        except Organization.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Organización con ID '{org_id}' no encontrada"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n✗ Error en las pruebas: {str(e)}"))
            import traceback
            self.stdout.write(traceback.format_exc())
