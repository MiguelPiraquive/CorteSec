"""
Management Command: Check Permisos Health
Verificación automática de la salud del sistema de permisos

Este comando verifica el estado del sistema de permisos y envía alertas
por email cuando detecta problemas críticos.

Uso:
    python manage.py check_permisos_health
    python manage.py check_permisos_health --email admin@example.com
    python manage.py check_permisos_health --send-email  # Enviar a todos los admins
    python manage.py check_permisos_health --fix  # Intentar corregir automáticamente
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from core.email_service import send_system_email, _get_email_config

from dashboard.permisos_dashboard import (
    get_permisos_dashboard_stats,
    get_dashboard_alerts,
    get_roles_sin_permisos,
    get_usuarios_sin_roles,
    get_asignaciones_expiradas
)
from roles.models import AsignacionRol


class Command(BaseCommand):
    help = 'Verifica la salud del sistema de permisos y envía alertas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email al que enviar el reporte (además de los admins)'
        )
        parser.add_argument(
            '--send-email',
            action='store_true',
            help='Enviar email con el reporte a todos los administradores'
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Intentar corregir automáticamente problemas detectados'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostrar información detallada'
        )

    def handle(self, *args, **options):
        verbose = options.get('verbose', False)
        send_email = options.get('send_email', False)
        custom_email = options.get('email', None)
        fix_issues = options.get('fix', False)

        self.stdout.write("\n" + "="*80)
        self.stdout.write(self.style.SUCCESS("VERIFICACION DE SALUD - Sistema de Permisos RBAC".center(80)))
        self.stdout.write("="*80 + "\n")

        # =====================================================================
        # PASO 1: Obtener estadísticas y alertas
        # =====================================================================

        try:
            stats = get_permisos_dashboard_stats()
            alerts = get_dashboard_alerts()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"ERROR: No se pudo obtener estadísticas: {e}"))
            return

        # =====================================================================
        # PASO 2: Mostrar resumen
        # =====================================================================

        resumen = stats['resumen']
        salud = stats['salud']

        self.stdout.write("RESUMEN DEL SISTEMA:")
        self.stdout.write(f"  Fecha: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.stdout.write(f"  Estado: {salud['estado'].upper()}")
        self.stdout.write(f"  Mensaje: {salud['mensaje']}\n")

        # Mostrar métricas clave
        self.stdout.write("METRICAS CLAVE:")
        self.stdout.write(f"  Roles totales: {resumen['roles_total']}")
        self.stdout.write(f"  Roles sin permisos: {resumen['roles_sin_permisos']}")
        self.stdout.write(f"  Usuarios sin roles: {resumen['usuarios_sin_roles']}")
        self.stdout.write(f"  Asignaciones expiradas: {resumen['asignaciones_expiradas']}\n")

        # =====================================================================
        # PASO 3: Mostrar alertas
        # =====================================================================

        if alerts:
            self.stdout.write(f"ALERTAS DETECTADAS: {len(alerts)}")
            self.stdout.write("-" * 80)

            for alert in alerts:
                if alert['severidad'] == 'critico':
                    style = self.style.ERROR
                    prefix = "[CRITICO]"
                elif alert['severidad'] == 'advertencia':
                    style = self.style.WARNING
                    prefix = "[ADVERTENCIA]"
                else:
                    style = self.style.NOTICE
                    prefix = "[INFO]"

                self.stdout.write(style(f"{prefix} {alert['mensaje']}"))
                self.stdout.write(f"  Valor: {alert['valor']}/{alert['total']} ({alert['porcentaje']}%)")
                self.stdout.write("")

        else:
            self.stdout.write(self.style.SUCCESS("NO HAY ALERTAS - Sistema funcionando correctamente\n"))

        # =====================================================================
        # PASO 4: Detalles adicionales (modo verbose)
        # =====================================================================

        if verbose:
            self.stdout.write("\n" + "="*80)
            self.stdout.write("DETALLES ADICIONALES")
            self.stdout.write("="*80 + "\n")

            # Roles sin permisos
            if resumen['roles_sin_permisos'] > 0:
                roles_sin_permisos = get_roles_sin_permisos()
                self.stdout.write("Roles sin permisos:")
                for rol in roles_sin_permisos:
                    self.stdout.write(f"  - {rol['nombre']} ({rol['codigo']})")
                self.stdout.write("")

            # Usuarios sin roles
            if resumen['usuarios_sin_roles'] > 0:
                usuarios_sin_roles = get_usuarios_sin_roles()
                self.stdout.write(f"Usuarios sin roles (primeros 10):")
                for usuario in list(usuarios_sin_roles)[:10]:
                    self.stdout.write(f"  - {usuario['username']} ({usuario['email']})")
                self.stdout.write("")

            # Asignaciones expiradas
            if resumen['asignaciones_expiradas'] > 0:
                asignaciones_exp = get_asignaciones_expiradas()
                self.stdout.write(f"Asignaciones expiradas (primeras 10):")
                for asig in list(asignaciones_exp)[:10]:
                    self.stdout.write(f"  - Usuario: {asig['usuario__username']}")
                    self.stdout.write(f"    Rol: {asig['rol__nombre']}")
                    self.stdout.write(f"    Expiró: {asig['fecha_fin']}")
                    self.stdout.write("")

        # =====================================================================
        # PASO 5: Corrección automática (si se solicita)
        # =====================================================================

        if fix_issues:
            self.stdout.write("\n" + "="*80)
            self.stdout.write("CORRECCION AUTOMATICA")
            self.stdout.write("="*80 + "\n")

            # Desactivar asignaciones expiradas
            if resumen['asignaciones_expiradas'] > 0:
                self.stdout.write(f"Desactivando {resumen['asignaciones_expiradas']} asignaciones expiradas...")

                try:
                    now = timezone.now()
                    asignaciones_expiradas = AsignacionRol.objects.filter(
                        activa=True,
                        fecha_fin__isnull=False,
                        fecha_fin__lt=now
                    )

                    count = asignaciones_expiradas.update(
                        activa=False,
                        estado_id=3  # Asumiendo que 3 es "Expirado"
                    )

                    self.stdout.write(self.style.SUCCESS(f"OK: {count} asignaciones desactivadas"))

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"ERROR: No se pudieron desactivar asignaciones: {e}"))

            else:
                self.stdout.write(self.style.SUCCESS("OK: No hay asignaciones expiradas que corregir"))

        # =====================================================================
        # PASO 6: Enviar email (si se solicita)
        # =====================================================================

        if send_email or custom_email:
            self.stdout.write("\n" + "="*80)
            self.stdout.write("ENVIANDO REPORTE POR EMAIL")
            self.stdout.write("="*80 + "\n")

            email_subject = f"[RBAC] Reporte de Salud del Sistema - {salud['estado'].upper()}"
            email_body = self.generate_email_body(stats, alerts)

            try:
                if custom_email:
                    send_system_email(
                        subject=email_subject,
                        message=email_body,
                        recipient_list=[custom_email],
                        fail_silently=False,
                    )
                    self.stdout.write(self.style.SUCCESS(f"OK: Email enviado a {custom_email}"))

                if send_email:
                    # Enviar a email_administrador de ConfiguracionEmail, o ADMINS de settings
                    email_config = _get_email_config()
                    admin_email = email_config.get('email_administrador', '') if email_config else ''
                    if admin_email:
                        send_system_email(
                            subject=email_subject,
                            message=email_body,
                            recipient_list=[admin_email],
                            fail_silently=False,
                        )
                    else:
                        # Fallback a ADMINS de settings.py
                        admins = getattr(settings, 'ADMINS', [])
                        admin_emails = [a[1] for a in admins if len(a) > 1]
                        if admin_emails:
                            send_system_email(
                                subject=email_subject,
                                message=email_body,
                                recipient_list=admin_emails,
                                fail_silently=False,
                            )
                    self.stdout.write(self.style.SUCCESS("OK: Email enviado a administradores"))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"ERROR: No se pudo enviar email: {e}"))

        # =====================================================================
        # PASO 7: Resultado final
        # =====================================================================

        self.stdout.write("\n" + "="*80)
        self.stdout.write("RESULTADO FINAL".center(80))
        self.stdout.write("="*80 + "\n")

        if salud['estado'] == 'ok':
            self.stdout.write(self.style.SUCCESS("SISTEMA SALUDABLE - No se requiere acción"))
            exit_code = 0
        elif salud['estado'] == 'advertencia':
            self.stdout.write(self.style.WARNING("ADVERTENCIA - Se recomienda revisión"))
            exit_code = 1
        else:
            self.stdout.write(self.style.ERROR("CRITICO - Se requiere atención inmediata"))
            exit_code = 2

        self.stdout.write("\nAcciones recomendadas:")

        if resumen['roles_sin_permisos'] > 0:
            self.stdout.write("  1. Asignar permisos a roles sin permisos:")
            self.stdout.write("     python manage.py init_permisos_roles --limpiar")

        if resumen['usuarios_sin_roles'] > 0:
            self.stdout.write(f"  2. Revisar y asignar roles a {resumen['usuarios_sin_roles']} usuarios sin roles")

        if resumen['asignaciones_expiradas'] > 0:
            self.stdout.write(f"  3. Desactivar asignaciones expiradas:")
            self.stdout.write("     python manage.py check_permisos_health --fix")

        if salud['estado'] == 'ok':
            self.stdout.write("  - Ninguna acción requerida")

        self.stdout.write("\n" + "="*80 + "\n")

        # Salir con código de error apropiado para scripts de monitoreo
        if exit_code != 0:
            self.stdout.write(self.style.WARNING(f"Exit code: {exit_code}"))

    def generate_email_body(self, stats, alerts):
        """Genera el cuerpo del email con el reporte"""

        resumen = stats['resumen']
        salud = stats['salud']

        body = []
        body.append("="*80)
        body.append("REPORTE DE SALUD - Sistema de Permisos RBAC")
        body.append("="*80)
        body.append("")
        body.append(f"Fecha: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
        body.append(f"Estado: {salud['estado'].upper()}")
        body.append(f"Mensaje: {salud['mensaje']}")
        body.append("")

        body.append("RESUMEN:")
        body.append(f"  Roles totales: {resumen['roles_total']}")
        body.append(f"  Roles con permisos: {resumen['roles_con_permisos']}")
        body.append(f"  Roles sin permisos: {resumen['roles_sin_permisos']}")
        body.append(f"  Usuarios totales: {resumen['usuarios_total']}")
        body.append(f"  Usuarios con roles: {resumen['usuarios_con_roles']}")
        body.append(f"  Usuarios sin roles: {resumen['usuarios_sin_roles']}")
        body.append(f"  Asignaciones totales: {resumen['asignaciones_total']}")
        body.append(f"  Asignaciones vigentes: {resumen['asignaciones_vigentes']}")
        body.append(f"  Asignaciones expiradas: {resumen['asignaciones_expiradas']}")
        body.append("")

        if alerts:
            body.append(f"ALERTAS DETECTADAS: {len(alerts)}")
            body.append("-" * 80)
            for alert in alerts:
                severidad = alert['severidad'].upper()
                body.append(f"[{severidad}] {alert['mensaje']}")
                body.append(f"  Valor: {alert['valor']}/{alert['total']} ({alert['porcentaje']}%)")
                body.append("")
        else:
            body.append("NO HAY ALERTAS - Sistema funcionando correctamente")
            body.append("")

        body.append("="*80)
        body.append("")
        body.append("Este es un mensaje automático generado por el sistema RBAC.")
        body.append(f"Para más detalles, ejecute: python manage.py check_permisos_health --verbose")

        return "\n".join(body)
