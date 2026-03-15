"""
Modelos del Dashboard
=====================

Modelos para proyectos, asignaciones y contexto activo del sistema CorteSec.

Autor: Sistema CorteSec
Versión: 3.0.0
Fecha: 2026-02-28
"""

import uuid
from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from core.mixins import TenantAwareModel

User = get_user_model()


class Project(TenantAwareModel):
    """
    Modelo mejorado para proyectos.
    Centro del sistema contextual — nóminas, contratos, préstamos,
    contabilidad y KPIs se filtran por proyecto activo.
    """

    # ── Choices ──────────────────────────────────────────────────────
    ESTADO_CHOICES = [
        ('planificacion', 'Planificación'),
        ('activo', 'Activo'),
        ('pausado', 'Pausado'),
        ('completado', 'Completado'),
        ('cancelado', 'Cancelado'),
    ]
    PRIORIDAD_CHOICES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
        ('critica', 'Crítica'),
    ]
    MONEDA_CHOICES = [
        ('COP', 'Peso Colombiano'),
        ('USD', 'Dólar Estadounidense'),
        ('EUR', 'Euro'),
    ]

    # ── Identificación ──────────────────────────────────────────────
    codigo_proyecto = models.CharField(
        _("Código"), max_length=30, blank=True,
        help_text=_("Código único del proyecto, ej: PROJ-2026-001. Se auto-genera si se deja vacío.")
    )
    name = models.CharField(_("Nombre del Proyecto"), max_length=150)
    description = models.TextField(_("Descripción"), blank=True)

    # ── Estado y gestión ────────────────────────────────────────────
    estado = models.CharField(
        _("Estado"), max_length=20,
        choices=ESTADO_CHOICES, default='planificacion',
    )
    prioridad = models.CharField(
        _("Prioridad"), max_length=10,
        choices=PRIORIDAD_CHOICES, default='media',
    )
    progreso = models.PositiveIntegerField(
        _("Progreso (%)"), default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    # ── Presupuesto / finanzas ──────────────────────────────────────
    presupuesto_estimado = models.DecimalField(
        _("Presupuesto estimado"), max_digits=15, decimal_places=2,
        default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0'))],
    )
    presupuesto_aprobado = models.DecimalField(
        _("Presupuesto aprobado"), max_digits=15, decimal_places=2,
        default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0'))],
    )
    moneda = models.CharField(
        _("Moneda"), max_length=3,
        choices=MONEDA_CHOICES, default='COP',
    )

    # ── Personas ────────────────────────────────────────────────────
    responsable = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='proyectos_responsable',
        verbose_name=_("Responsable"),
        help_text=_("Líder o encargado del proyecto. Por defecto, quien lo crea."),
    )
    cliente = models.CharField(
        _("Cliente"), max_length=200, blank=True,
        help_text=_("Empresa o cliente final del proyecto."),
    )
    centro_costo = models.CharField(
        _("Centro de costo"), max_length=100, blank=True,
    )

    # ── Visual ──────────────────────────────────────────────────────
    color = models.CharField(
        _("Color"), max_length=7, default='#6366f1',
        help_text=_("Color hex para la UI, ej: #6366f1"),
    )
    icono = models.CharField(
        _("Ícono"), max_length=50, blank=True, default='briefcase',
        help_text=_("Slug del ícono (lucide-react)"),
    )
    tags = models.JSONField(
        _("Etiquetas"), default=list, blank=True,
        help_text=_("Lista de etiquetas flexibles"),
    )

    # ── Fechas ──────────────────────────────────────────────────────
    start_date = models.DateField(_("Fecha de inicio"))
    end_date = models.DateField(
        _("Fecha de finalización estimada"), null=True, blank=True,
    )
    fecha_real_fin = models.DateField(
        _("Fecha real de finalización"), null=True, blank=True,
    )

    # ── Notas ───────────────────────────────────────────────────────
    notas_internas = models.TextField(
        _("Notas internas"), blank=True,
    )

    # ── Auditoría ───────────────────────────────────────────────────
    created_at = models.DateTimeField(_("Creado el"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Actualizado el"), auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='proyectos_creados',
    )

    class Meta:
        verbose_name = _("Proyecto")
        verbose_name_plural = _("Proyectos")
        ordering = ["-start_date"]
        unique_together = [['organization', 'codigo_proyecto']]
        indexes = [
            models.Index(fields=['organization', 'estado']),
            models.Index(fields=['start_date']),
            models.Index(fields=['end_date']),
            models.Index(fields=['created_at']),
            models.Index(fields=['codigo_proyecto']),
            models.Index(fields=['prioridad']),
        ]

    def __str__(self):
        return f"{self.codigo_proyecto} — {self.name}" if self.codigo_proyecto else self.name

    def save(self, *args, **kwargs):
        # Auto-generar código si está vacío
        if not self.codigo_proyecto:
            year = timezone.now().year
            org_code = ''
            if self.organization:
                org_code = (getattr(self.organization, 'codigo', '') or '')[:4].upper()
            existing = Project.objects.filter(
                organization=self.organization,
                codigo_proyecto__startswith=f'PROJ-{year}',
            ).count()
            self.codigo_proyecto = f'PROJ-{year}-{existing + 1:03d}'
            if org_code:
                self.codigo_proyecto = f'{org_code}-{year}-{existing + 1:03d}'
        # Auto-marcar fecha real de fin cuando se completa
        if self.estado == 'completado' and not self.fecha_real_fin:
            self.fecha_real_fin = timezone.now().date()
        super().save(*args, **kwargs)

    # ── Propiedades calculadas ──────────────────────────────────────
    @property
    def is_active(self):
        return self.estado == 'activo'

    @property
    def duration_days(self):
        end = self.fecha_real_fin or self.end_date
        if end:
            return (end - self.start_date).days
        return (timezone.now().date() - self.start_date).days

    @property
    def gasto_acumulado(self):
        """Suma de nóminas pagadas + flujos de caja egreso del proyecto."""
        from nomina.models import NominaSimple
        from contabilidad.models import FlujoCaja
        nomina_total = NominaSimple.objects.filter(
            proyecto=self, estado='pagada'
        ).aggregate(t=models.Sum('total_pagar'))['t'] or Decimal('0.00')
        egreso_total = FlujoCaja.objects.filter(
            proyecto=self, tipo_movimiento='egreso'
        ).aggregate(t=models.Sum('valor'))['t'] or Decimal('0.00')
        return nomina_total + egreso_total

    @property
    def presupuesto_restante(self):
        aprobado = self.presupuesto_aprobado or self.presupuesto_estimado
        return aprobado - self.gasto_acumulado

    @property
    def porcentaje_ejecucion(self):
        aprobado = self.presupuesto_aprobado or self.presupuesto_estimado
        if aprobado and aprobado > 0:
            return min(round(float(self.gasto_acumulado / aprobado * 100), 1), 999)
        return 0

    @property
    def empleados_count(self):
        return self.asignaciones.filter(activo=True).count()


class AsignacionProyecto(TenantAwareModel):
    """
    Relación Empleado <-> Proyecto.
    Un empleado puede estar asignado a varios proyectos.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(
        Project, on_delete=models.CASCADE,
        related_name='asignaciones',
        verbose_name=_("Proyecto"),
    )
    empleado = models.ForeignKey(
        'nomina.Empleado', on_delete=models.CASCADE,
        related_name='asignaciones_proyecto',
        verbose_name=_("Empleado"),
    )
    fecha_asignacion = models.DateField(_("Fecha de asignación"), default=timezone.now)
    fecha_desasignacion = models.DateField(
        _("Fecha de desasignación"), null=True, blank=True,
    )
    activo = models.BooleanField(_("Activo"), default=True)
    observaciones = models.TextField(_("Observaciones"), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Asignación a Proyecto")
        verbose_name_plural = _("Asignaciones a Proyectos")
        unique_together = [['proyecto', 'empleado']]
        indexes = [
            models.Index(fields=['proyecto', 'activo']),
            models.Index(fields=['empleado', 'activo']),
        ]

    def __str__(self):
        return f"{self.empleado} → {self.proyecto}"


class ActiveProject(models.Model):
    """
    Proyecto(s) activo(s) por usuario.
    Determina qué datos se muestran en el dashboard y módulos.
    Si project es NULL → modo "todos" (ver todos los proyectos).
    """
    MODE_CHOICES = [
        ('single', 'Proyecto único'),
        ('all', 'Todos los proyectos'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='active_project',
        verbose_name=_("Usuario"),
    )
    project = models.ForeignKey(
        Project, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='active_selections',
        verbose_name=_("Proyecto activo"),
    )
    mode = models.CharField(
        _("Modo"), max_length=10,
        choices=MODE_CHOICES, default='all',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Proyecto Activo")
        verbose_name_plural = _("Proyectos Activos")

    def __str__(self):
        if self.mode == 'all':
            return f"{self.user} → Todos los proyectos"
        return f"{self.user} → {self.project}"

