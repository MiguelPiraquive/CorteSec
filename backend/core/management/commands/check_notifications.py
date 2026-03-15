"""
Management command para verificaciones periódicas de notificaciones.

Verifica:
- Contratos próximos a vencer (30, 15, 7 días)
- Préstamos con cuotas próximas a vencer
- Limpieza de notificaciones expiradas
- Nóminas pendientes de aprobación

Uso:
    python manage.py check_notifications
    python manage.py check_notifications --contratos
    python manage.py check_notifications --prestamos
    python manage.py check_notifications --limpiar
    python manage.py check_notifications --dry-run
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Verifica y genera notificaciones automáticas periódicas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--contratos',
            action='store_true',
            help='Solo verificar contratos próximos a vencer',
        )
        parser.add_argument(
            '--prestamos',
            action='store_true',
            help='Solo verificar préstamos con cuotas próximas',
        )
        parser.add_argument(
            '--nominas',
            action='store_true',
            help='Solo verificar nóminas pendientes',
        )
        parser.add_argument(
            '--limpiar',
            action='store_true',
            help='Solo limpiar notificaciones expiradas',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Solo mostrar qué se haría, sin crear notificaciones',
        )

    def handle(self, *args, **options):
        self.dry_run = options['dry_run']
        self.verbosity = options['verbosity']

        # Si no se especifica ninguna opción, ejecutar todas
        run_all = not any([
            options['contratos'],
            options['prestamos'],
            options['nominas'],
            options['limpiar'],
        ])

        total_creadas = 0

        if run_all or options['contratos']:
            total_creadas += self._check_contratos()

        if run_all or options['prestamos']:
            total_creadas += self._check_prestamos()

        if run_all or options['nominas']:
            total_creadas += self._check_nominas()

        if run_all or options['limpiar']:
            self._limpiar_expiradas()

        if self.dry_run:
            self.stdout.write(
                self.style.WARNING(f'[DRY RUN] Se habrían creado {total_creadas} notificaciones')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Proceso completado. {total_creadas} notificaciones creadas.')
            )

    def _check_contratos(self):
        """Verifica contratos próximos a vencer."""
        self.stdout.write('Verificando contratos próximos a vencer...')
        creadas = 0

        try:
            from nomina.models import Contrato
            from core.notification_engine import NotificationEngine
        except ImportError as e:
            self.stdout.write(self.style.WARNING(f'  No se pudo importar: {e}'))
            return 0

        hoy = timezone.now().date()
        alertas = [
            (30, 'normal', 'info'),
            (15, 'alta', 'warning'),
            (7, 'urgente', 'warning'),
        ]

        for dias, prioridad, tipo in alertas:
            fecha_limite = hoy + timedelta(days=dias)

            contratos = Contrato.objects.filter(
                activo=True,
                fecha_fin=fecha_limite,
            ).select_related('empleado', 'empleado__organization')

            for contrato in contratos:
                empleado = contrato.empleado
                nombre = getattr(empleado, 'nombre_completo', str(empleado))
                org = getattr(empleado, 'organization', None)

                mensaje = (
                    f'El contrato de {nombre} vence en {dias} días '
                    f'({fecha_limite.strftime("%d/%m/%Y")})'
                )

                if self.dry_run:
                    self.stdout.write(f'  [DRY] {mensaje}')
                    creadas += 1
                    continue

                # Buscar usuarios admin de la organización para notificar
                admins = self._get_admin_users(org)
                for admin_user in admins:
                    NotificationEngine.notify(
                        usuario=admin_user,
                        tipo=tipo,
                        titulo=f'Contrato por vencer ({dias} días)',
                        mensaje=mensaje,
                        categoria='contratos',
                        prioridad=prioridad,
                        url_accion=f'/dashboard/empleados/{empleado.id}',
                        texto_accion='Ver contrato',
                        origen_tipo='contrato',
                        origen_id=str(contrato.id),
                        enviar_email=(dias <= 7),
                    )
                    creadas += 1

                if self.verbosity >= 2:
                    self.stdout.write(f'  Notificado: {mensaje}')

        self.stdout.write(f'  Contratos: {creadas} notificaciones')
        return creadas

    def _check_prestamos(self):
        """Verifica préstamos activos y en mora."""
        self.stdout.write('Verificando préstamos...')
        creadas = 0

        try:
            from prestamos.models import Prestamo
            from core.notification_engine import NotificationEngine
        except ImportError as e:
            self.stdout.write(self.style.WARNING(f'  No se pudo importar: {e}'))
            return 0

        # Préstamos activos/desembolsados — recordatorio semanal
        prestamos_activos = Prestamo.objects.filter(
            estado__in=['activo', 'desembolsado'],
        ).select_related('empleado', 'empleado__organization')

        for prestamo in prestamos_activos:
            empleado = prestamo.empleado
            nombre = getattr(empleado, 'nombre_completo', str(empleado))
            org = getattr(empleado, 'organization', None)
            saldo = getattr(prestamo, 'saldo_pendiente', getattr(prestamo, 'monto_aprobado', ''))

            mensaje = (
                f'El préstamo #{prestamo.numero_prestamo} de {nombre} '
                f'está activo (saldo: ${saldo}).'
            )

            if self.dry_run:
                self.stdout.write(f'  [DRY] {mensaje}')
                creadas += 1
                continue

            admins = self._get_admin_users(org)
            for admin_user in admins:
                NotificationEngine.notify(
                    usuario=admin_user,
                    tipo='info',
                    titulo='Préstamo activo - revisión',
                    mensaje=mensaje,
                    categoria='prestamos',
                    prioridad='normal',
                    url_accion=f'/dashboard/prestamos/{prestamo.id}',
                    texto_accion='Ver préstamo',
                    origen_tipo='prestamo',
                    origen_id=str(prestamo.id),
                )
                creadas += 1

        # Verificar préstamos en mora
        prestamos_mora = Prestamo.objects.filter(
            estado='en_mora',
        ).select_related('empleado', 'empleado__organization')

        for prestamo in prestamos_mora:
            empleado = prestamo.empleado
            nombre = getattr(empleado, 'nombre_completo', str(empleado))
            org = getattr(empleado, 'organization', None)

            mensaje = (
                f'El préstamo #{prestamo.numero_prestamo} de {nombre} '
                f'está en mora. Requiere atención.'
            )

            if self.dry_run:
                self.stdout.write(f'  [DRY] {mensaje}')
                creadas += 1
                continue

            admins = self._get_admin_users(org)
            for admin_user in admins:
                NotificationEngine.notify(
                    usuario=admin_user,
                    tipo='warning',
                    titulo='Préstamo en mora',
                    mensaje=mensaje,
                    categoria='prestamos',
                    prioridad='urgente',
                    url_accion=f'/dashboard/prestamos/{prestamo.id}',
                    texto_accion='Ver préstamo',
                    origen_tipo='prestamo',
                    origen_id=str(prestamo.id),
                    enviar_email=True,
                )
                creadas += 1

        self.stdout.write(f'  Préstamos: {creadas} notificaciones')
        return creadas

    def _check_nominas(self):
        """Verifica nóminas pendientes de aprobación."""
        self.stdout.write('Verificando nóminas pendientes...')
        creadas = 0

        try:
            from nomina.models import NominaSimple
            from core.notification_engine import NotificationEngine
        except ImportError as e:
            self.stdout.write(self.style.WARNING(f'  No se pudo importar: {e}'))
            return 0

        # Nóminas calculadas pero no aprobadas por más de 2 días
        hace_2_dias = timezone.now() - timedelta(days=2)
        nominas_pendientes = NominaSimple.objects.filter(
            estado='calculada',
            calculada_at__lte=hace_2_dias,
        ).select_related('organization')

        for nomina in nominas_pendientes:
            org = getattr(nomina, 'organization', None)
            mensaje = (
                f'La nómina #{nomina.numero or "S/N"} (periodo '
                f'{nomina.periodo_inicio.strftime("%d/%m/%Y")} - '
                f'{nomina.periodo_fin.strftime("%d/%m/%Y")}) '
                f'está calculada pero no ha sido aprobada.'
            )

            if self.dry_run:
                self.stdout.write(f'  [DRY] {mensaje}')
                creadas += 1
                continue

            admins = self._get_admin_users(org)
            for admin_user in admins:
                NotificationEngine.notify(
                    usuario=admin_user,
                    tipo='warning',
                    titulo='Nómina pendiente de aprobación',
                    mensaje=mensaje,
                    categoria='nomina',
                    prioridad='alta',
                    url_accion=f'/dashboard/nomina/{nomina.id}',
                    texto_accion='Revisar nómina',
                    origen_tipo='nomina',
                    origen_id=str(nomina.id),
                )
                creadas += 1

        self.stdout.write(f'  Nóminas: {creadas} notificaciones')
        return creadas

    def _limpiar_expiradas(self):
        """Limpia notificaciones expiradas y leídas antiguas."""
        self.stdout.write('Limpiando notificaciones expiradas...')

        try:
            from core.models import Notificacion
        except ImportError:
            return

        ahora = timezone.now()

        # Eliminar expiradas
        expiradas = Notificacion.objects.filter(
            expires_at__lt=ahora
        )
        count_expiradas = expiradas.count()

        # Eliminar leídas de más de 90 días
        hace_90_dias = ahora - timedelta(days=90)
        leidas_antiguas = Notificacion.objects.filter(
            leida=True,
            fecha__lt=hace_90_dias,
        )
        count_leidas = leidas_antiguas.count()

        if self.dry_run:
            self.stdout.write(
                f'  [DRY] Se eliminarían {count_expiradas} expiradas '
                f'y {count_leidas} leídas antiguas'
            )
            return

        expiradas.delete()
        leidas_antiguas.delete()

        self.stdout.write(
            f'  Eliminadas: {count_expiradas} expiradas, '
            f'{count_leidas} leídas antiguas'
        )

    def _get_admin_users(self, organization):
        """Obtiene los usuarios admin/owner de una organización."""
        try:
            from login.models import CustomUser
        except ImportError:
            return []

        if not organization:
            return []

        return list(
            CustomUser.objects.filter(
                organization=organization,
                is_active=True,
                organization_role__in=['OWNER', 'ADMIN'],
            )[:10]
        )

    def _get_user_for_empleado(self, empleado):
        """Obtiene el usuario asociado a un empleado (vía FK directa)."""
        try:
            usuario = getattr(empleado, 'usuario', None)
            if usuario and usuario.is_active:
                return usuario
            return None
        except Exception:
            return None
