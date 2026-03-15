"""
Management Command: check_subscriptions
=========================================

Cron diario que verifica suscripciones:
1. Marca trials expirados como 'expired'
2. Envía notificaciones de 7/3/1 días restantes de trial
3. Suspende suscripciones con pagos fallidos >7 días
4. Expira suscripciones con periodo vencido
5. Notifica suscripciones próximas a vencer (7/3/1 días)

Uso:
    python manage.py check_subscriptions
    python manage.py check_subscriptions --dry-run
    python manage.py check_subscriptions --verbose
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q

from billing.models import Subscription, Payment
from login.models import CustomUser

logger = logging.getLogger('billing')


class Command(BaseCommand):
    help = 'Verificar suscripciones: trials expirados, notificaciones, suspensiones'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Solo mostrar lo que haría sin ejecutar cambios.',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostrar detalles adicionales.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']
        now = timezone.now()

        self.stdout.write(self.style.HTTP_INFO(
            f'\n=== Check Subscriptions — {now.strftime("%Y-%m-%d %H:%M")} ===\n'
        ))

        stats = {
            'trials_expired': 0,
            'trials_notified_7d': 0,
            'trials_notified_3d': 0,
            'trials_notified_1d': 0,
            'subs_expired': 0,
            'subs_notified_7d': 0,
            'subs_notified_3d': 0,
            'subs_notified_1d': 0,
            'subs_suspended': 0,
        }

        # ===== 1. TRIALS EXPIRADOS =====
        expired_trials = Subscription.objects.filter(
            status=Subscription.Status.TRIALING,
            trial_end__lte=now,
        )

        for sub in expired_trials:
            if verbose:
                self.stdout.write(f'  Trial expirado: {sub.organization.nombre} '
                                  f'(trial_end={sub.trial_end})')
            if not dry_run:
                sub.expire()
                self._notify_trial_expired(sub)
            stats['trials_expired'] += 1

        # ===== 2. NOTIFICACIONES DE TRIAL =====
        # 7 días restantes
        day7_start = now + timedelta(days=6, hours=23)
        day7_end = now + timedelta(days=7, hours=1)
        trials_7d = Subscription.objects.filter(
            status=Subscription.Status.TRIALING,
            trial_end__gte=day7_start,
            trial_end__lte=day7_end,
        )
        for sub in trials_7d:
            if verbose:
                self.stdout.write(f'  Trial 7d warning: {sub.organization.nombre}')
            if not dry_run:
                self._notify_trial_warning(sub, days=7, urgency='warning')
            stats['trials_notified_7d'] += 1

        # 3 días restantes
        day3_start = now + timedelta(days=2, hours=23)
        day3_end = now + timedelta(days=3, hours=1)
        trials_3d = Subscription.objects.filter(
            status=Subscription.Status.TRIALING,
            trial_end__gte=day3_start,
            trial_end__lte=day3_end,
        )
        for sub in trials_3d:
            if verbose:
                self.stdout.write(f'  Trial 3d warning: {sub.organization.nombre}')
            if not dry_run:
                self._notify_trial_warning(sub, days=3, urgency='alta')
            stats['trials_notified_3d'] += 1

        # 1 día restante
        day1_start = now + timedelta(hours=23)
        day1_end = now + timedelta(hours=25)
        trials_1d = Subscription.objects.filter(
            status=Subscription.Status.TRIALING,
            trial_end__gte=day1_start,
            trial_end__lte=day1_end,
        )
        for sub in trials_1d:
            if verbose:
                self.stdout.write(f'  Trial 1d URGENTE: {sub.organization.nombre}')
            if not dry_run:
                self._notify_trial_warning(sub, days=1, urgency='urgente')
            stats['trials_notified_1d'] += 1

        # ===== 3. SUSCRIPCIONES ACTIVAS EXPIRADAS =====
        expired_subs = Subscription.objects.filter(
            status=Subscription.Status.ACTIVE,
            current_period_end__lte=now,
        )
        for sub in expired_subs:
            if verbose:
                self.stdout.write(f'  Suscripción expirada: {sub.organization.nombre}')
            if not dry_run:
                sub.expire()
                self._notify_subscription_expired(sub)
            stats['subs_expired'] += 1

        # ===== 4. NOTIFICACIONES DE RENOVACIÓN =====
        for days, key in [(7, 'subs_notified_7d'), (3, 'subs_notified_3d'), (1, 'subs_notified_1d')]:
            start = now + timedelta(days=days - 1, hours=23)
            end = now + timedelta(days=days, hours=1)
            subs_renew = Subscription.objects.filter(
                status=Subscription.Status.ACTIVE,
                current_period_end__gte=start,
                current_period_end__lte=end,
                canceled_at__isnull=True,  # Solo si no está siendo cancelada
            )
            for sub in subs_renew:
                if verbose:
                    self.stdout.write(f'  Renovación en {days}d: {sub.organization.nombre}')
                if not dry_run:
                    self._notify_renewal_coming(sub, days=days)
                stats[key] += 1

        # ===== 5. SUSPENDER POR PAGOS FALLIDOS =====
        past_due = Subscription.objects.filter(
            status=Subscription.Status.PAST_DUE,
        )
        for sub in past_due:
            # Verificar si lleva >7 días en past_due
            latest_failure = Payment.objects.filter(
                invoice__subscription=sub,
                status=Payment.Status.FAILED,
            ).order_by('-created_at').first()

            if latest_failure and (now - latest_failure.created_at).days >= 7:
                if verbose:
                    self.stdout.write(f'  Suspender por pago fallido: {sub.organization.nombre}')
                if not dry_run:
                    sub.suspend()
                    self._notify_suspended(sub)
                stats['subs_suspended'] += 1

        # ===== Resumen =====
        self.stdout.write('')
        prefix = '[DRY RUN] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(f'{prefix}Resultados:'))
        self.stdout.write(f'  Trials expirados:        {stats["trials_expired"]}')
        self.stdout.write(f'  Trials notificados 7d:   {stats["trials_notified_7d"]}')
        self.stdout.write(f'  Trials notificados 3d:   {stats["trials_notified_3d"]}')
        self.stdout.write(f'  Trials notificados 1d:   {stats["trials_notified_1d"]}')
        self.stdout.write(f'  Suscripciones expiradas: {stats["subs_expired"]}')
        self.stdout.write(f'  Renovación 7d:           {stats["subs_notified_7d"]}')
        self.stdout.write(f'  Renovación 3d:           {stats["subs_notified_3d"]}')
        self.stdout.write(f'  Renovación 1d:           {stats["subs_notified_1d"]}')
        self.stdout.write(f'  Suspendidas por pago:    {stats["subs_suspended"]}')

        total = sum(stats.values())
        if total == 0:
            self.stdout.write(self.style.HTTP_INFO('  ✅ Todo en orden, sin acciones necesarias.'))
        else:
            self.stdout.write(self.style.WARNING(f'  Total acciones: {total}'))

        logger.info(f"check_subscriptions: {stats}")
        return  # management commands should return None or string

    # ==================== HELPERS ====================

    def _get_owner(self, sub):
        """Obtener owner de la organización."""
        return CustomUser.objects.filter(
            organization=sub.organization,
            organization_role='OWNER',
        ).first()

    def _notify(self, usuario, titulo, mensaje, tipo, prioridad, url='/billing', texto_accion='Ver plan', origen_id='', enviar_email=True):
        """Enviar notificación via NotificationEngine."""
        try:
            from core.notification_engine import NotificationEngine
            NotificationEngine.notify(
                usuario=usuario,
                titulo=titulo,
                mensaje=mensaje,
                tipo=tipo,
                categoria='sistema',
                prioridad=prioridad,
                url_accion=url,
                texto_accion=texto_accion,
                origen_tipo='subscription',
                origen_id=str(origen_id),
                enviar_email=enviar_email,
            )
        except Exception as e:
            logger.error(f"Error sending notification: {e}")

    def _notify_trial_warning(self, sub, days, urgency):
        owner = self._get_owner(sub)
        if not owner:
            return

        if days == 1:
            titulo = '⚠️ Tu periodo de prueba termina MAÑANA'
            mensaje = (
                'Este es tu último día de prueba gratuita. '
                'Activa tu plan ahora para no perder el acceso a tus datos.'
            )
            tipo = 'error'
        elif days == 3:
            titulo = '⏰ Tu periodo de prueba vence en 3 días'
            mensaje = (
                'Te quedan solo 3 días de prueba. '
                'Activa tu plan para seguir usando CorteSec sin interrupciones.'
            )
            tipo = 'warning'
        else:
            titulo = f'📅 Tu periodo de prueba vence en {days} días'
            mensaje = (
                f'Te quedan {days} días de prueba. '
                'Activa tu plan cuando quieras para asegurar la continuidad.'
            )
            tipo = 'warning'

        self._notify(
            usuario=owner,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
            prioridad=urgency,
            url='/billing/checkout',
            texto_accion='Activar plan',
            origen_id=sub.id,
        )

    def _notify_trial_expired(self, sub):
        owner = self._get_owner(sub)
        if not owner:
            return
        self._notify(
            usuario=owner,
            titulo='🔴 Tu periodo de prueba ha terminado',
            mensaje=(
                'Tu periodo de prueba ha finalizado. Tu cuenta está ahora en modo lectura. '
                'Activa un plan para recuperar el acceso completo. Tus datos se conservarán '
                'durante 90 días.'
            ),
            tipo='error',
            prioridad='urgente',
            url='/billing/checkout',
            texto_accion='Activar plan ahora',
            origen_id=sub.id,
        )

    def _notify_subscription_expired(self, sub):
        owner = self._get_owner(sub)
        if not owner:
            return
        self._notify(
            usuario=owner,
            titulo='Suscripción expirada',
            mensaje=(
                f'Tu suscripción al plan {sub.plan.name} ha expirado. '
                'Renueva tu plan para seguir usando CorteSec.'
            ),
            tipo='error',
            prioridad='urgente',
            url='/billing/checkout',
            texto_accion='Renovar plan',
            origen_id=sub.id,
        )

    def _notify_renewal_coming(self, sub, days):
        owner = self._get_owner(sub)
        if not owner:
            return
        self._notify(
            usuario=owner,
            titulo=f'Tu suscripción se renueva en {days} días',
            mensaje=(
                f'Tu plan {sub.plan.name} se renovará automáticamente en {days} días. '
                'Asegúrate de que tu método de pago esté actualizado.'
            ),
            tipo='info',
            prioridad='media' if days > 3 else 'alta',
            url='/billing',
            texto_accion='Ver suscripción',
            origen_id=sub.id,
            enviar_email=days <= 3,
        )

    def _notify_suspended(self, sub):
        owner = self._get_owner(sub)
        if not owner:
            return
        self._notify(
            usuario=owner,
            titulo='⛔ Suscripción suspendida por pago fallido',
            mensaje=(
                'Tu suscripción ha sido suspendida debido a múltiples intentos de pago fallidos. '
                'Actualiza tu método de pago para reactivar tu cuenta.'
            ),
            tipo='error',
            prioridad='urgente',
            url='/billing/payment-methods',
            texto_accion='Actualizar pago',
            origen_id=sub.id,
        )
