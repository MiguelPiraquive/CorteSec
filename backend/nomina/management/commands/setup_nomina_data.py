"""
Management Command: setup_nomina_data
=====================================

Crea los datos iniciales para el sistema de nómina:
- Parámetros legales 2026
- Tipos de contrato estándar
- Conceptos laborales comunes
- Items básicos

Uso:
    python manage.py setup_nomina_data
    python manage.py setup_nomina_data --organization CORTESEC

Autor: Sistema CorteSec
Fecha: Enero 2026
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from datetime import date

from core.models import Organization
from nomina.models import (
    ParametroLegal,
    TipoContrato,
    ConceptoLaboral,
)
from items.models import Item


class Command(BaseCommand):
    help = 'Crea los datos iniciales para el sistema de nómina'

    def add_arguments(self, parser):
        parser.add_argument(
            '--organization',
            type=str,
            default='CORTESEC',
            help='Código de la organización (default: CORTESEC)'
        )

    def handle(self, *args, **options):
        org_codigo = options['organization']
        
        try:
            organization = Organization.objects.get(codigo=org_codigo)
        except Organization.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Organización "{org_codigo}" no encontrada')
            )
            return
        
        self.stdout.write(f'Configurando nómina para: {organization.nombre}')
        
        with transaction.atomic():
            self.crear_parametros_legales(organization)
            self.crear_tipos_contrato(organization)
            self.crear_conceptos_laborales(organization)
            self.crear_items_basicos(organization)
        
        self.stdout.write(
            self.style.SUCCESS('✅ Datos de nómina creados exitosamente')
        )

    def crear_parametros_legales(self, organization):
        """
        Crea los parámetros legales vigentes para Colombia 2026.
        
        Fuentes:
        - Ley 100/1993: Sistema de Seguridad Social
        - Ley 21/1982: Aportes parafiscales
        - Decreto 1295/1994: Sistema de Riesgos Laborales
        """
        self.stdout.write('  → Creando parámetros legales 2026...')
        
        parametros = [
            # ═══════════════════════════════════════════════════════════════
            # SALUD (EPS)
            # ═══════════════════════════════════════════════════════════════
            {
                'concepto': 'SALUD',
                'descripcion': 'Aporte a Salud (EPS) - Ley 100/1993',
                'porcentaje_total': Decimal('12.50'),
                'porcentaje_empleado': Decimal('4.00'),
                'porcentaje_empleador': Decimal('8.50'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            # ═══════════════════════════════════════════════════════════════
            # PENSIÓN (AFP)
            # ═══════════════════════════════════════════════════════════════
            {
                'concepto': 'PENSION',
                'descripcion': 'Aporte a Pensión (AFP) - Ley 100/1993',
                'porcentaje_total': Decimal('16.00'),
                'porcentaje_empleado': Decimal('4.00'),
                'porcentaje_empleador': Decimal('12.00'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            # ═══════════════════════════════════════════════════════════════
            # ARL - Riesgos Laborales (por nivel de riesgo)
            # ═══════════════════════════════════════════════════════════════
            {
                'concepto': 'ARL_NIVEL_I',
                'descripcion': 'ARL Nivel I - Riesgo Mínimo (oficinas)',
                'porcentaje_total': Decimal('0.522'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('0.522'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            {
                'concepto': 'ARL_NIVEL_II',
                'descripcion': 'ARL Nivel II - Riesgo Bajo',
                'porcentaje_total': Decimal('1.044'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('1.044'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            {
                'concepto': 'ARL_NIVEL_III',
                'descripcion': 'ARL Nivel III - Riesgo Medio',
                'porcentaje_total': Decimal('2.436'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('2.436'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            {
                'concepto': 'ARL_NIVEL_IV',
                'descripcion': 'ARL Nivel IV - Riesgo Alto',
                'porcentaje_total': Decimal('4.350'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('4.350'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            {
                'concepto': 'ARL_NIVEL_V',
                'descripcion': 'ARL Nivel V - Riesgo Máximo (construcción)',
                'porcentaje_total': Decimal('6.960'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('6.960'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            # ═══════════════════════════════════════════════════════════════
            # PARAFISCALES
            # ═══════════════════════════════════════════════════════════════
            {
                'concepto': 'CAJA_COMPENSACION',
                'descripcion': 'Caja de Compensación Familiar - Ley 21/1982',
                'porcentaje_total': Decimal('4.00'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('4.00'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            {
                'concepto': 'SENA',
                'descripcion': 'Aporte SENA - Ley 21/1982',
                'porcentaje_total': Decimal('2.00'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('2.00'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            {
                'concepto': 'ICBF',
                'descripcion': 'Aporte ICBF - Ley 21/1982',
                'porcentaje_total': Decimal('3.00'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('3.00'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            # ═══════════════════════════════════════════════════════════════
            # PRESTACIONES SOCIALES
            # ═══════════════════════════════════════════════════════════════
            {
                'concepto': 'CESANTIAS',
                'descripcion': 'Provisión Cesantías - CST Art. 249',
                'porcentaje_total': Decimal('8.33'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('8.33'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            {
                'concepto': 'INTERESES_CESANTIAS',
                'descripcion': 'Intereses sobre Cesantías - Ley 52/1975',
                'porcentaje_total': Decimal('1.00'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('1.00'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            {
                'concepto': 'PRIMA_SERVICIOS',
                'descripcion': 'Provisión Prima de Servicios - CST Art. 306',
                'porcentaje_total': Decimal('8.33'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('8.33'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            {
                'concepto': 'VACACIONES',
                'descripcion': 'Provisión Vacaciones - CST Art. 186',
                'porcentaje_total': Decimal('4.17'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('4.17'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            # ═══════════════════════════════════════════════════════════════
            # VALORES FIJOS (SMMLV 2026)
            # ═══════════════════════════════════════════════════════════════
            {
                'concepto': 'SMMLV',
                'descripcion': 'Salario Mínimo Mensual Legal Vigente 2026',
                'porcentaje_total': Decimal('0.00'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('0.00'),
                'valor_fijo': Decimal('1423500.00'),  # Proyectado 2026
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            {
                'concepto': 'AUXILIO_TRANSPORTE',
                'descripcion': 'Auxilio de Transporte 2026',
                'porcentaje_total': Decimal('0.00'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('0.00'),
                'valor_fijo': Decimal('200000.00'),  # Proyectado 2026
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            {
                'concepto': 'TOPE_AUXILIO_TRANSPORTE',
                'descripcion': 'Tope salarial para auxilio de transporte (2 SMMLV)',
                'porcentaje_total': Decimal('0.00'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('0.00'),
                'valor_fijo': Decimal('2847000.00'),  # 2 x SMMLV
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
            # ═══════════════════════════════════════════════════════════════
            # IBC SERVICIOS (40%)
            # ═══════════════════════════════════════════════════════════════
            {
                'concepto': 'IBC_SERVICIOS',
                'descripcion': 'IBC para contratos de servicios (40%)',
                'porcentaje_total': Decimal('40.00'),
                'porcentaje_empleado': Decimal('0.00'),
                'porcentaje_empleador': Decimal('0.00'),
                'vigente_desde': date(2026, 1, 1),
                'vigente_hasta': date(2026, 12, 31),
            },
        ]
        
        creados = 0
        for param_data in parametros:
            param, created = ParametroLegal.objects.update_or_create(
                organization=organization,
                concepto=param_data['concepto'],
                vigente_desde=param_data['vigente_desde'],
                defaults={
                    'descripcion': param_data['descripcion'],
                    'porcentaje_total': param_data['porcentaje_total'],
                    'porcentaje_empleado': param_data['porcentaje_empleado'],
                    'porcentaje_empleador': param_data['porcentaje_empleador'],
                    'valor_fijo': param_data.get('valor_fijo', Decimal('0.00')),
                    'vigente_hasta': param_data['vigente_hasta'],
                    'activo': True,
                }
            )
            if created:
                creados += 1
        
        self.stdout.write(f'    ✓ {creados} parámetros legales creados')

    def crear_tipos_contrato(self, organization):
        """
        Crea los tipos de contrato estándar según legislación colombiana.
        """
        self.stdout.write('  → Creando tipos de contrato...')
        
        tipos = [
            {
                'nombre': 'Término Indefinido',
                'codigo': 'INDEFINIDO',
                'descripcion': 'Contrato laboral a término indefinido - CST Art. 47',
                'aplica_salud': True,
                'aplica_pension': True,
                'aplica_arl': True,
                'aplica_parafiscales': True,
                'ibc_porcentaje': Decimal('100.00'),
                'requiere_fecha_fin': False,
            },
            {
                'nombre': 'Término Fijo',
                'codigo': 'FIJO',
                'descripcion': 'Contrato laboral a término fijo - CST Art. 46',
                'aplica_salud': True,
                'aplica_pension': True,
                'aplica_arl': True,
                'aplica_parafiscales': True,
                'ibc_porcentaje': Decimal('100.00'),
                'requiere_fecha_fin': True,
            },
            {
                'nombre': 'Obra o Labor',
                'codigo': 'OBRA_LABOR',
                'descripcion': 'Contrato por obra o labor determinada - CST Art. 45',
                'aplica_salud': True,
                'aplica_pension': True,
                'aplica_arl': True,
                'aplica_parafiscales': True,
                'ibc_porcentaje': Decimal('100.00'),
                'requiere_fecha_fin': False,
            },
            {
                'nombre': 'Prestación de Servicios',
                'codigo': 'SERVICIOS',
                'descripcion': 'Contrato de prestación de servicios (independiente)',
                'aplica_salud': True,
                'aplica_pension': True,
                'aplica_arl': True,
                'aplica_parafiscales': False,  # No aplica
                'ibc_porcentaje': Decimal('40.00'),  # 40% del valor del contrato
                'requiere_fecha_fin': True,
            },
            {
                'nombre': 'Aprendizaje SENA',
                'codigo': 'APRENDIZ',
                'descripcion': 'Contrato de aprendizaje SENA - Ley 789/2002',
                'aplica_salud': True,
                'aplica_pension': False,  # Solo en etapa productiva
                'aplica_arl': True,
                'aplica_parafiscales': False,
                'ibc_porcentaje': Decimal('100.00'),
                'requiere_fecha_fin': True,
            },
        ]
        
        creados = 0
        for tipo_data in tipos:
            tipo, created = TipoContrato.objects.update_or_create(
                organization=organization,
                codigo=tipo_data['codigo'],
                defaults={
                    'nombre': tipo_data['nombre'],
                    'descripcion': tipo_data['descripcion'],
                    'aplica_salud': tipo_data['aplica_salud'],
                    'aplica_pension': tipo_data['aplica_pension'],
                    'aplica_arl': tipo_data['aplica_arl'],
                    'aplica_parafiscales': tipo_data['aplica_parafiscales'],
                    'ibc_porcentaje': tipo_data['ibc_porcentaje'],
                    'requiere_fecha_fin': tipo_data['requiere_fecha_fin'],
                    'activo': True,
                }
            )
            if created:
                creados += 1
        
        self.stdout.write(f'    ✓ {creados} tipos de contrato creados')

    def crear_conceptos_laborales(self, organization):
        """
        Crea los conceptos laborales comunes (devengados y deducciones).
        """
        self.stdout.write('  → Creando conceptos laborales...')
        
        conceptos = [
            # ═══════════════════════════════════════════════════════════════
            # DEVENGADOS
            # ═══════════════════════════════════════════════════════════════
            {
                'nombre': 'Salario Básico',
                'codigo': 'SAL_BASICO',
                'tipo': 'DEVENGADO',
                'descripcion': 'Salario básico mensual según contrato',
                'aplica_porcentaje': False,
                'base_calculo': 'SALARIO',
                'es_legal': False,
            },
            {
                'nombre': 'Auxilio de Transporte',
                'codigo': 'AUX_TRANSPORTE',
                'tipo': 'DEVENGADO',
                'descripcion': 'Auxilio de transporte legal',
                'aplica_porcentaje': False,
                'base_calculo': 'SALARIO',
                'es_legal': True,
            },
            {
                'nombre': 'Horas Extras Diurnas',
                'codigo': 'HED',
                'tipo': 'DEVENGADO',
                'descripcion': 'Horas extras diurnas (25% adicional)',
                'aplica_porcentaje': True,
                'porcentaje': Decimal('25.00'),
                'base_calculo': 'SALARIO',
                'es_legal': False,
            },
            {
                'nombre': 'Horas Extras Nocturnas',
                'codigo': 'HEN',
                'tipo': 'DEVENGADO',
                'descripcion': 'Horas extras nocturnas (75% adicional)',
                'aplica_porcentaje': True,
                'porcentaje': Decimal('75.00'),
                'base_calculo': 'SALARIO',
                'es_legal': False,
            },
            {
                'nombre': 'Recargo Nocturno',
                'codigo': 'REC_NOCTURNO',
                'tipo': 'DEVENGADO',
                'descripcion': 'Recargo nocturno (35% adicional)',
                'aplica_porcentaje': True,
                'porcentaje': Decimal('35.00'),
                'base_calculo': 'SALARIO',
                'es_legal': False,
            },
            {
                'nombre': 'Hora Extra Dominical/Festiva Diurna',
                'codigo': 'HEDDF',
                'tipo': 'DEVENGADO',
                'descripcion': 'Hora extra dominical/festiva diurna (100% adicional)',
                'aplica_porcentaje': True,
                'porcentaje': Decimal('100.00'),
                'base_calculo': 'SALARIO',
                'es_legal': False,
            },
            {
                'nombre': 'Bonificación',
                'codigo': 'BONIFICACION',
                'tipo': 'DEVENGADO',
                'descripcion': 'Bonificación adicional',
                'aplica_porcentaje': False,
                'base_calculo': 'SALARIO',
                'es_legal': False,
            },
            {
                'nombre': 'Comisiones',
                'codigo': 'COMISIONES',
                'tipo': 'DEVENGADO',
                'descripcion': 'Comisiones por ventas o producción',
                'aplica_porcentaje': False,
                'base_calculo': 'SALARIO',
                'es_legal': False,
            },
            {
                'nombre': 'Producción',
                'codigo': 'PRODUCCION',
                'tipo': 'DEVENGADO',
                'descripcion': 'Pago por producción/obra',
                'aplica_porcentaje': False,
                'base_calculo': 'SALARIO',
                'es_legal': False,
            },
            # ═══════════════════════════════════════════════════════════════
            # DEDUCCIONES
            # ═══════════════════════════════════════════════════════════════
            {
                'nombre': 'Aporte Salud Empleado',
                'codigo': 'DED_SALUD',
                'tipo': 'DEDUCCION',
                'descripcion': 'Descuento salud empleado (4%)',
                'aplica_porcentaje': True,
                'porcentaje': Decimal('4.00'),
                'base_calculo': 'IBC',
                'es_legal': True,
            },
            {
                'nombre': 'Aporte Pensión Empleado',
                'codigo': 'DED_PENSION',
                'tipo': 'DEDUCCION',
                'descripcion': 'Descuento pensión empleado (4%)',
                'aplica_porcentaje': True,
                'porcentaje': Decimal('4.00'),
                'base_calculo': 'IBC',
                'es_legal': True,
            },
            {
                'nombre': 'Fondo de Solidaridad Pensional',
                'codigo': 'FSP',
                'tipo': 'DEDUCCION',
                'descripcion': 'Fondo solidaridad pensional (1% si > 4 SMMLV)',
                'aplica_porcentaje': True,
                'porcentaje': Decimal('1.00'),
                'base_calculo': 'IBC',
                'es_legal': True,
            },
            {
                'nombre': 'Retención en la Fuente',
                'codigo': 'RETENCION',
                'tipo': 'DEDUCCION',
                'descripcion': 'Retención en la fuente por salarios',
                'aplica_porcentaje': False,
                'base_calculo': 'DEVENGADO',
                'es_legal': True,
            },
            {
                'nombre': 'Libranza',
                'codigo': 'LIBRANZA',
                'tipo': 'DEDUCCION',
                'descripcion': 'Descuento por libranza bancaria',
                'aplica_porcentaje': False,
                'base_calculo': 'SALARIO',
                'es_legal': False,
            },
            {
                'nombre': 'Préstamo Empresa',
                'codigo': 'PRESTAMO_EMP',
                'tipo': 'DEDUCCION',
                'descripcion': 'Descuento por préstamo de la empresa',
                'aplica_porcentaje': False,
                'base_calculo': 'SALARIO',
                'es_legal': False,
            },
            {
                'nombre': 'Embargo Judicial',
                'codigo': 'EMBARGO',
                'tipo': 'DEDUCCION',
                'descripcion': 'Embargo judicial',
                'aplica_porcentaje': False,
                'base_calculo': 'SALARIO',
                'es_legal': False,
            },
            {
                'nombre': 'Cooperativa',
                'codigo': 'COOPERATIVA',
                'tipo': 'DEDUCCION',
                'descripcion': 'Descuento por aportes a cooperativa',
                'aplica_porcentaje': False,
                'base_calculo': 'SALARIO',
                'es_legal': False,
            },
        ]
        
        creados = 0
        orden = 1
        for concepto_data in conceptos:
            concepto, created = ConceptoLaboral.objects.update_or_create(
                organization=organization,
                codigo=concepto_data['codigo'],
                defaults={
                    'nombre': concepto_data['nombre'],
                    'tipo': concepto_data['tipo'],
                    'descripcion': concepto_data['descripcion'],
                    'aplica_porcentaje': concepto_data['aplica_porcentaje'],
                    'porcentaje': concepto_data.get('porcentaje', Decimal('0.00')),
                    'base_calculo': concepto_data['base_calculo'],
                    'es_legal': concepto_data['es_legal'],
                    'orden': orden,
                    'activo': True,
                }
            )
            if created:
                creados += 1
            orden += 1
        
        self.stdout.write(f'    ✓ {creados} conceptos laborales creados')

    def crear_items_basicos(self, organization):
        """
        Crea items básicos de producción para construcción.
        """
        self.stdout.write('  → Creando items básicos...')
        
        items = [
            {
                'nombre': 'Metro cuadrado de pintura',
                'codigo': 'PINTURA_M2',
                'descripcion': 'Pintura por metro cuadrado',
                'tipo_cantidad': 'm2',
                'precio_unitario': Decimal('5000.00'),
            },
            {
                'nombre': 'Metro lineal de tubo',
                'codigo': 'TUBO_ML',
                'descripcion': 'Instalación de tubería por metro lineal',
                'tipo_cantidad': 'ml',
                'precio_unitario': Decimal('8000.00'),
            },
            {
                'nombre': 'Metro cuadrado de piso',
                'codigo': 'PISO_M2',
                'descripcion': 'Instalación de piso por metro cuadrado',
                'tipo_cantidad': 'm2',
                'precio_unitario': Decimal('25000.00'),
            },
            {
                'nombre': 'Punto eléctrico',
                'codigo': 'PUNTO_ELEC',
                'descripcion': 'Instalación de punto eléctrico',
                'tipo_cantidad': 'global',
                'precio_unitario': Decimal('35000.00'),
            },
            {
                'nombre': 'Metro cúbico de excavación',
                'codigo': 'EXCAV_M3',
                'descripcion': 'Excavación manual por metro cúbico',
                'tipo_cantidad': 'm3',
                'precio_unitario': Decimal('45000.00'),
            },
            {
                'nombre': 'Metro cuadrado de enchape',
                'codigo': 'ENCHAPE_M2',
                'descripcion': 'Instalación de enchape cerámico',
                'tipo_cantidad': 'm2',
                'precio_unitario': Decimal('35000.00'),
            },
            {
                'nombre': 'Metro cuadrado de estuco',
                'codigo': 'ESTUCO_M2',
                'descripcion': 'Aplicación de estuco por m²',
                'tipo_cantidad': 'm2',
                'precio_unitario': Decimal('12000.00'),
            },
            {
                'nombre': 'Hora de trabajo',
                'codigo': 'HORA_TRAB',
                'descripcion': 'Hora de trabajo general',
                'tipo_cantidad': 'global',
                'precio_unitario': Decimal('15000.00'),
            },
        ]
        
        creados = 0
        for item_data in items:
            item, created = Item.objects.update_or_create(
                organization=organization,
                nombre=item_data['nombre'],
                defaults={
                    'codigo': item_data['codigo'],
                    'descripcion': item_data['descripcion'],
                    'tipo_cantidad': item_data['tipo_cantidad'],
                    'precio_unitario': item_data['precio_unitario'],
                    'activo': True,
                }
            )
            if created:
                creados += 1
        
        self.stdout.write(f'    ✓ {creados} items creados')
