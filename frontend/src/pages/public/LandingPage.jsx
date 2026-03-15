import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getLandingInfo, getPublicPlans } from '../../services/publicService'
import { useAuth } from '../../context/AuthContext'
import { useConfiguracion } from '../../context/ConfiguracionContext'
import {
  Shield, ArrowRight, ChevronDown, ChevronUp, Check, Users, Building2,
  BarChart3, Zap, FileText, Clock, AlertTriangle, TrendingUp,
  Lock, Eye, Database, Scale, Send, Mail, Briefcase,
  UserCheck, HardDrive, CalendarCheck, BadgeCheck,
  CircleDot, Layers, MonitorSmartphone
} from 'lucide-react'

/* ─── defaults ──────────────────────────────────────────────── */
const DEFAULT_LANDING = {
  brand: 'CorteSec',
  tagline: 'Gestión empresarial y nómina en un solo lugar',
  cta: 'Comienza ahora',
  contact_email: 'ventas@cortesec.com',
}
const DEFAULT_PLANS = { currency: 'COP', intervals: ['monthly', 'yearly'], plans: [] }

/* ─── scroll reveal hook ────────────────────────────────────── */
const useReveal = () => {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); observer.unobserve(el) } },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}
const Reveal = ({ children, className = '', delay = 0 }) => {
  const ref = useReveal()
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/* ─── counter animation ─────────────────────────────────────── */
const AnimatedCounter = ({ end, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const counted = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !counted.current) {
        counted.current = true
        const startTime = Date.now()
        const tick = () => {
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(eased * end))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [end, duration])

  return <span ref={ref}>{count}{suffix}</span>
}

/* ─── FAQ Accordion item ────────────────────────────────────── */
const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-sm md:text-base font-semibold text-gray-800 group-hover:text-primary-600 transition">{q}</span>
        {open ? <ChevronUp className="w-5 h-5 text-primary-500 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-primary-500 flex-shrink-0 transition" />}
      </button>
      <div className={`overflow-hidden transition-all duration-500 ${open ? 'max-h-40 pb-5' : 'max-h-0'}`}>
        <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE — Light Theme (white + blue + purple)
   ═══════════════════════════════════════════════════════════════ */
const LandingPage = () => {
  const { isAuthenticated } = useAuth()
  const { formatCurrency: cfgFormatCurrency } = useConfiguracion()

  const formatCurrency = useCallback((value, currency) => {
    if (value === null || value === undefined) return 'Cotización'
    if (currency && currency !== 'COP') {
      try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value) }
      catch { return `${value}` }
    }
    return cfgFormatCurrency(value)
  }, [cfgFormatCurrency])

  const [landing, setLanding] = useState(DEFAULT_LANDING)
  const [plansPayload, setPlansPayload] = useState(DEFAULT_PLANS)
  const [billingInterval, setBillingInterval] = useState('monthly')
  const [loading, setLoading] = useState(true)

  /* ─── demo form state ──── */
  const [demoForm, setDemoForm] = useState({
    nombre: '', email: '', telefono: '', empresa: '',
    empleados: '', cargo: '', acepta_politicas: false
  })
  const [demoSent, setDemoSent] = useState(false)
  const [demoSending, setDemoSending] = useState(false)

  const handleDemoChange = (e) => {
    const { name, value, type, checked } = e.target
    setDemoForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleDemoSubmit = async (e) => {
    e.preventDefault()
    setDemoSending(true)
    await new Promise(r => setTimeout(r, 1500))
    setDemoSending(false)
    setDemoSent(true)
  }

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const [landingRes, plansRes] = await Promise.all([getLandingInfo(), getPublicPlans()])
        if (!isMounted) return
        setLanding(landingRes?.landing || DEFAULT_LANDING)
        setPlansPayload({
          currency: plansRes?.currency || DEFAULT_PLANS.currency,
          intervals: plansRes?.intervals || DEFAULT_PLANS.intervals,
          plans: plansRes?.plans || [],
        })
        const defInterval = plansRes?.intervals?.[0]
        if (defInterval) setBillingInterval(defInterval)
      } catch (err) { console.error('Error cargando landing:', err) }
      finally { if (isMounted) setLoading(false) }
    }
    load()
    return () => { isMounted = false }
  }, [])

  const plans = useMemo(() => plansPayload.plans || [], [plansPayload])
  const hasYearly = plansPayload.intervals?.includes('yearly')

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-white text-gray-800 font-body overflow-x-hidden">

      {/* ───────────── TOP BAR ───────────── */}
      <div className="w-full bg-gradient-to-r from-primary-600 via-blue-600 to-purple-600 text-white text-xs font-semibold">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Software 100% colombiano · Facturación en COP
          </span>
          <a href="#demo" className="underline underline-offset-2 hover:text-white/80 transition hidden sm:inline">
            Solicitar demo gratuita →
          </a>
        </div>
      </div>

      {/* ───────────── HEADER ───────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <span className="text-lg font-black text-white font-display">C</span>
            </div>
            <div>
              <p className="text-lg font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent font-display tracking-tight">{landing.brand}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Plataforma SaaS</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#problema" className="hover:text-primary-600 transition-colors duration-200">El problema</a>
            <a href="#solucion" className="hover:text-primary-600 transition-colors duration-200">Solución</a>
            <a href="#planes" className="hover:text-primary-600 transition-colors duration-200">Planes</a>
            <a href="#seguridad" className="hover:text-primary-600 transition-colors duration-200">Seguridad</a>
            <a href="#demo" className="hover:text-primary-600 transition-colors duration-200">Demo</a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard" className="text-sm text-gray-500 hover:text-primary-600 transition hidden sm:inline">Dashboard</Link>
            ) : (
              <Link to="/login" className="text-sm text-gray-500 hover:text-primary-600 transition hidden sm:inline">Ingresar</Link>
            )}
            <a href="#demo" className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-blue-600 text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all duration-300 hover:scale-105">
              Solicitar demo
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ═══════════════════════════════════════════════════════
            HERO SECTION
            ═══════════════════════════════════════════════════════ */}
        <section className="relative mesh-gradient grid-pattern">
          <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-primary-400/[0.08] blur-[100px] animate-float" />
          <div className="absolute bottom-20 right-[10%] w-96 h-96 rounded-full bg-purple-400/[0.06] blur-[120px] animate-float" style={{ animationDelay: '3s' }} />

          <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              {/* Left: Copy */}
              <div className="space-y-8">
                <div className="opacity-0 animate-slide-up">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide uppercase bg-primary-50 border border-primary-200/60 text-primary-600">
                    <CircleDot className="w-3 h-3" />
                    Plataforma completa para RRHH y nómina
                  </span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-black leading-[1.1] text-gray-900 font-display opacity-0 animate-slide-up-delay-1">
                  Deja atrás Excel y automatiza tu nómina con
                  <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent"> control total</span>
                </h1>

                <p className="text-lg text-gray-600 leading-relaxed max-w-xl opacity-0 animate-slide-up-delay-2">
                  Centraliza empleados, nómina y operaciones en una sola plataforma SaaS diseñada para empresas colombianas.
                </p>

                <div className="flex flex-wrap gap-4 opacity-0 animate-slide-up-delay-3">
                  <a href="#demo" className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-primary-600 to-blue-600 text-white shadow-xl shadow-primary-500/20 hover:shadow-primary-500/30 transition-all duration-300 hover:scale-[1.03]">
                    Solicitar demo
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                  <a href="#planes" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-gray-700 bg-white border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 hover:border-primary-300">
                    Ver planes
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500 pt-2">
                  <span className="flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-primary-500" /> Cumplimiento normativo colombiano</span>
                  <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary-500" /> Datos protegidos</span>
                  <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-primary-500" /> Multi-sucursal</span>
                </div>
              </div>

              {/* Right: Dashboard mockup */}
              <div className="relative hidden lg:block">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary-200/30 to-purple-200/20 blur-2xl" />
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary-500/10 bg-white border border-gray-200/80">
                  {/* Browser bar */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-4 px-3 py-1 rounded-md text-[10px] text-gray-400 bg-white border border-gray-200/60">
                      app.cortesec.com/dashboard
                    </div>
                  </div>
                  {/* Dashboard content */}
                  <div className="p-6 space-y-4 bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900 font-display">Panel de Control</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Bienvenido, Administrador</p>
                      </div>
                      <div className="px-3 py-1 rounded-full text-[10px] font-semibold bg-green-50 text-green-600 border border-green-200/60">
                        Nómina al día
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Empleados', value: '148', color: 'from-primary-50 to-blue-50', border: 'border-primary-100/60' },
                        { label: 'Nómina mes', value: '$47.2M', color: 'from-purple-50 to-violet-50', border: 'border-purple-100/60' },
                        { label: 'Cumplimiento', value: '99.8%', color: 'from-green-50 to-emerald-50', border: 'border-green-100/60' },
                      ].map(s => (
                        <div key={s.label} className={`rounded-xl p-3 bg-gradient-to-b ${s.color} border ${s.border}`}>
                          <p className="text-lg font-bold text-gray-900 font-display">{s.value}</p>
                          <p className="text-[10px] text-gray-400">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl p-4 bg-white/80 border border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-3">Nómina últimos 6 meses</p>
                      <div className="flex items-end gap-2 h-16">
                        {[40, 55, 45, 65, 58, 72].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-primary-500 to-primary-300 transition-all duration-500" style={{ height: `${h}%`, opacity: 0.5 + i * 0.1 }} />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {['Liquidación aprobada — Q2 2026', 'Nuevo empleado registrado', 'Nómina procesada correctamente'].map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-gray-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <Reveal delay={200}>
              <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[
                  { value: 320, suffix: '+', label: 'Empresas activas' },
                  { value: 18, suffix: 'k', label: 'Usuarios activos' },
                  { value: 99, suffix: '.9%', label: 'Tasa de cumplimiento' },
                  { value: 70, suffix: '%', label: 'Ahorro de tiempo' },
                ].map(stat => (
                  <div key={stat.label} className="landing-card text-center py-6">
                    <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent font-display">
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="text-xs text-gray-500 mt-2">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            TRUST BAR
            ═══════════════════════════════════════════════════════ */}
        <section className="border-y border-gray-100 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              <span className="text-[10px] uppercase tracking-[0.25em] text-gray-500">Confían en nosotros</span>
              {['Grupo Vértice', 'Alianza Delta', 'Operaciones Andes', 'Nova Retail', 'Servicios Atlas'].map(c => (
                <span key={c} className="text-sm font-semibold text-gray-400 hover:text-primary-500 transition-colors cursor-default">{c}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            EL PROBLEMA
            ═══════════════════════════════════════════════════════ */}
        <section id="problema" className="relative py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <Reveal>
              <div className="max-w-2xl">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">El problema</span>
                <h2 className="mt-4 text-3xl md:text-4xl font-black text-gray-900 font-display leading-tight">
                  El costo oculto de gestionar tu empresa con procesos manuales
                </h2>
                <p className="mt-4 text-gray-600">Cada mes, miles de empresas colombianas pierden horas, dinero y tranquilidad por seguir operando con herramientas que no fueron diseñadas para escalar.</p>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: AlertTriangle, title: 'Errores en liquidaciones', desc: 'Un decimal mal puesto en Excel puede costarte una demanda laboral o una sanción de la DIAN.' },
                { icon: Clock, title: 'Horas perdidas cada mes', desc: 'Tu equipo de RRHH pasa más tiempo cuadrando cifras que tomando decisiones estratégicas.' },
                { icon: FileText, title: 'Riesgo por desorden', desc: 'Sin un sistema claro, los errores en liquidaciones y reportes se acumulan y generan problemas legales.' },
                { icon: Database, title: 'Información descentralizada', desc: 'Salarios en un Excel, contratos en otro, vacaciones en un correo. Nadie tiene la foto completa.' },
                { icon: Eye, title: 'Falta de trazabilidad', desc: '¿Quién aprobó ese aumento? ¿Cuándo? Sin registros claros, los conflictos internos se multiplican.' },
                { icon: Building2, title: 'No escala con tu empresa', desc: 'Lo que funcionaba con 10 empleados se convierte en caos operativo cuando llegas a 50.' },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 80}>
                  <div className="group rounded-2xl p-6 transition-all duration-500 bg-red-50/50 border border-red-100/60 hover:border-red-200 hover:shadow-lg hover:shadow-red-500/5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-red-100/80">
                      <item.icon className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={500}>
              <div className="mt-14 rounded-2xl px-8 py-6 text-center bg-gradient-to-r from-red-50 to-orange-50 border border-red-100/60">
                <p className="text-lg md:text-xl font-bold text-gray-900 font-display">
                  Cuando tu operación crece, <span className="text-red-500">Excel deja de ser suficiente.</span>
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            LA SOLUCIÓN
            ═══════════════════════════════════════════════════════ */}
        <section id="solucion" className="relative py-24 bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/30">
          <div className="max-w-7xl mx-auto px-6">
            <Reveal>
              <div className="max-w-2xl">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">La solución</span>
                <h2 className="mt-4 text-3xl md:text-4xl font-black text-gray-900 font-display leading-tight">
                  Una plataforma diseñada para escalar contigo
                </h2>
                <p className="mt-4 text-gray-600">CorteSec centraliza todo lo que necesitas para operar tu nómina y tu equipo humano — con la tranquilidad de cumplir la normativa colombiana.</p>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: BarChart3, title: 'Nómina completa', desc: 'Liquidación, deducciones, préstamos y conceptos laborales automatizados en cada periodo.' },
                { icon: FileText, title: 'Reportes de nómina', desc: 'Genera reportes detallados de cada periodo con desglose por empleado, conceptos y totales.' },
                { icon: Users, title: 'Gestión de empleados', desc: 'Contratos, datos personales, historial laboral y documentos en un solo expediente digital.' },
                { icon: Layers, title: 'Multi-organización', desc: 'Cada empresa o sucursal tiene su entorno aislado, seguro e independiente.' },
                { icon: TrendingUp, title: 'Reportes ejecutivos', desc: 'Dashboards con métricas en tiempo real para tomar decisiones rápidas con datos reales.' },
                { icon: Shield, title: 'Control de acceso por roles', desc: 'Define exactamente quién puede ver, editar o aprobar cada parte del sistema con permisos granulares.' },
                { icon: CalendarCheck, title: 'Cálculo inteligente de nómina', desc: 'Motor que calcula IBC, seguridad social, ARL, transporte y deducciones con parámetros legales actualizados.' },
                { icon: MonitorSmartphone, title: 'Acceso desde cualquier lugar', desc: 'Plataforma web responsive. Opera desde la oficina, casa o desde el celular.' },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 60}>
                  <div className="landing-card h-full">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-primary-50">
                      <item.icon className="w-5 h-5 text-primary-500" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={400}>
              <div className="mt-14 rounded-2xl px-8 py-6 bg-white/80 backdrop-blur-xl border border-primary-100/60">
                <p className="text-center text-sm text-gray-600">
                  <span className="text-primary-600 font-semibold">Cada empresa tiene su entorno aislado y seguro.</span> Tus datos nunca se mezclan con los de otra organización.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            BENEFICIOS (no features)
            ═══════════════════════════════════════════════════════ */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <Reveal>
              <div className="text-center max-w-2xl mx-auto">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Beneficios reales</span>
                <h2 className="mt-4 text-3xl md:text-4xl font-black text-gray-900 font-display">
                  No son solo funcionalidades. Son resultados.
                </h2>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Zap, title: 'Reduce errores en liquidación', desc: 'Automatiza los cálculos que antes hacías a mano. Menos correcciones, menos reclamos, menos riesgo.' },
                { icon: Clock, title: 'Ahorra horas cada mes', desc: 'Lo que tomaba días en Excel, ahora toma minutos. Tu equipo se enfoca en lo que importa.' },
                { icon: TrendingUp, title: 'Mejora el control financiero', desc: 'Visualiza costos de nómina, tendencias y desviaciones antes de que se conviertan en problema.' },
                { icon: Database, title: 'Centraliza toda la información', desc: 'Un solo lugar para empleados, contratos, nómina y documentos. Sin archivos sueltos.' },
                { icon: Building2, title: 'Escala sin cambiar de sistema', desc: 'Crece de 5 a 500 empleados con la misma plataforma. Sin migraciones ni dolores de cabeza.' },
                { icon: Scale, title: 'Mantén cumplimiento normativo', desc: 'Protección de datos Ley 1581, liquidaciones correctas y todo documentado automáticamente.' },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 80}>
                  <div className="landing-card h-full group">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110 bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-100/60">
                      <item.icon className="w-6 h-6 text-primary-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 font-display">{item.title}</h3>
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            PARA QUIÉN ES
            ═══════════════════════════════════════════════════════ */}
        <section className="py-24 bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/30">
          <div className="max-w-7xl mx-auto px-6">
            <Reveal>
              <div className="text-center max-w-2xl mx-auto">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">¿Para quién es CorteSec?</span>
                <h2 className="mt-4 text-3xl md:text-4xl font-black text-gray-900 font-display">
                  Diseñado para quienes toman el control
                </h2>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Users, title: 'Equipos de RRHH', desc: 'Gestiona empleados, contratos y nómina sin depender de hojas de cálculo.', cta: 'Solicitar demo' },
                { icon: Briefcase, title: 'Gerentes y directores', desc: 'Reportes ejecutivos y visibilidad total sobre costos de personal y operación.', cta: 'Solicitar demo' },
                { icon: UserCheck, title: 'Contratistas independientes', desc: 'Accede a tu información laboral, recibos y documentos desde cualquier lugar.', cta: 'Solicitar demo' },
                { icon: Building2, title: 'Empresas multi-sede', desc: 'Cada sucursal con su espacio, misma plataforma, control centralizado.', cta: 'Solicitar demo' },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 100}>
                  <div className="landing-card h-full flex flex-col">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100/60">
                      <item.icon className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed flex-1">{item.desc}</p>
                    <a href="#demo" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition group/link">
                      {item.cta} <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            PLANES Y PRECIOS
            ═══════════════════════════════════════════════════════ */}
        <section id="planes" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <Reveal>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
                <div className="max-w-xl">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Planes y precios</span>
                  <h2 className="mt-4 text-3xl md:text-4xl font-black text-gray-900 font-display leading-tight">Elige el plan que se adapta a tu operación</h2>
                  <p className="mt-4 text-gray-600">Todos los precios en COP. Escala cuando lo necesites, sin penalidades.</p>
                </div>

                {hasYearly && (
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 border border-gray-200/60">
                    <button type="button" onClick={() => setBillingInterval('monthly')} className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${billingInterval === 'monthly' ? 'bg-white text-primary-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                      Mensual
                    </button>
                    <button type="button" onClick={() => setBillingInterval('yearly')} className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${billingInterval === 'yearly' ? 'bg-white text-primary-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                      Anual <span className="text-xs text-green-600 ml-1">-17%</span>
                    </button>
                  </div>
                )}
              </div>
            </Reveal>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <div key={`skel-${i}`} className="rounded-2xl p-6 animate-pulse bg-gray-50 border border-gray-100">
                  <div className="h-4 w-20 rounded-full bg-gray-200" />
                  <div className="mt-6 h-10 w-32 rounded-xl bg-gray-200" />
                  <div className="mt-8 space-y-3">
                    <div className="h-3 w-full rounded-full bg-gray-100" />
                    <div className="h-3 w-5/6 rounded-full bg-gray-100" />
                    <div className="h-3 w-4/6 rounded-full bg-gray-100" />
                  </div>
                </div>
              ))}

              {!loading && plans.length === 0 && (
                <div className="col-span-full text-center text-gray-400 py-12">No hay planes disponibles por ahora.</div>
              )}

              {plans.map((plan, i) => {
                const isPro = plan.id === 'PRO'
                const price = billingInterval === 'yearly' ? plan.price_yearly_cop : plan.price_monthly_cop
                const intervalLabel = billingInterval === 'yearly' ? 'año' : 'mes'

                return (
                  <Reveal key={plan.id} delay={i * 80}>
                    <div className={`relative rounded-2xl p-6 transition-all duration-500 h-full flex flex-col ${isPro ? 'ring-2 ring-primary-500/50 shadow-xl shadow-primary-500/10' : 'shadow-md hover:shadow-lg'}`} style={{ background: isPro ? 'linear-gradient(135deg, #EFF6FF, #F5F3FF)' : 'white', border: `1px solid ${isPro ? 'rgba(59,130,246,0.3)' : '#E5E7EB'}` }}>
                      {isPro && (
                        <span className="absolute -top-3 left-6 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg shadow-primary-500/30">
                          Más popular
                        </span>
                      )}

                      <div className="mb-6">
                        <p className="text-sm font-semibold text-gray-600">{plan.name}</p>
                        <div className="flex items-baseline gap-1.5 mt-3">
                          <span className="text-3xl font-black text-gray-900 font-display">
                            {price === null ? 'Cotización' : formatCurrency(price, plansPayload.currency)}
                          </span>
                          {price !== null && price > 0 && <span className="text-sm text-gray-500">/ {intervalLabel}</span>}
                        </div>
                      </div>

                      <ul className="space-y-3 text-sm text-gray-600 flex-1">
                        {plan.features?.map(feat => (
                          <li key={feat} className="flex items-start gap-2.5">
                            <Check className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                        <p>Usuarios: {plan.limits?.max_users >= 9999 ? 'Ilimitados' : plan.limits?.max_users}</p>
                        <p>Almacenamiento: {plan.limits?.max_storage_mb >= 102400 ? '100 GB' : `${Math.round((plan.limits?.max_storage_mb || 1024) / 1024)} GB`}</p>
                      </div>

                      <Link
                        to={plan.id === 'ENTERPRISE' ? '#demo' : `/register?plan=${encodeURIComponent(plan.id)}&crear_org=1`}
                        className={`mt-6 block text-center py-3 rounded-xl text-sm font-bold transition-all duration-300 ${isPro
                          ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02]'
                          : 'text-gray-700 bg-gray-50 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
                        }`}
                      >
                        {plan.id === 'ENTERPRISE' ? 'Hablar con ventas' : 'Comenzar'}
                      </Link>
                    </div>
                  </Reveal>
                )
              })}
            </div>

            <Reveal delay={300}>
              <div className="mt-10 text-center">
                <a href="#demo" className="inline-flex items-center gap-2 text-primary-600 text-sm font-semibold hover:text-primary-700 transition group">
                  ¿No estás seguro? Solicita una demo personalizada del Plan Profesional
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            SEGURIDAD (enfoque humano)
            ═══════════════════════════════════════════════════════ */}
        <section id="seguridad" className="py-24 bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/30">
          <div className="max-w-7xl mx-auto px-6">
            <Reveal>
              <div className="max-w-2xl">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Seguridad</span>
                <h2 className="mt-4 text-3xl md:text-4xl font-black text-gray-900 font-display leading-tight">
                  Tu información más sensible, protegida de verdad
                </h2>
                <p className="mt-4 text-gray-600">Nóminas, cédulas, cuentas bancarias… sabemos lo delicado que es lo que manejas.</p>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-5 md:grid-cols-2">
              {[
                {
                  icon: HardDrive,
                  title: 'Tus datos son tuyos',
                  desc: 'Exporta, descarga o migra tu información cuando quieras. Sin candados, sin letra pequeña. Tu operación no depende de nosotros para acceder a lo que es tuyo.',
                },
                {
                  icon: Scale,
                  title: 'Cumplimiento con Habeas Data (Ley 1581)',
                  desc: 'Manejas cédulas, direcciones, salarios y cuentas bancarias de personas reales. CorteSec gestiona esa información cumpliendo la normativa colombiana — porque una multa de la SIC no es un riesgo que quieras correr.',
                },
                {
                  icon: Eye,
                  title: 'Sabes quién hizo qué, y cuándo',
                  desc: '¿Quién modificó el salario de un empleado? ¿Quién aprobó una liquidación? Cada acción queda registrada con fecha, hora y responsable. Sin ambigüedades.',
                },
                {
                  icon: Lock,
                  title: 'Información que no anda suelta',
                  desc: 'Nada de salarios en hojas de Excel circulando por WhatsApp o correos reenviados. Todo vive en un solo lugar, cifrado y accesible solo para quien tú decidas.',
                },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 100}>
                  <div className="landing-card h-full">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-100/60">
                      <item.icon className="w-6 h-6 text-primary-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 font-display">{item.title}</h3>
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={400}>
              <div className="mt-14 rounded-2xl px-8 py-6 text-center bg-white/80 backdrop-blur-xl border border-primary-100/40">
                <p className="text-sm text-gray-600 italic">
                  "La seguridad no es una feature que vendemos. Es la base sobre la que construimos todo lo demás."
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            CÓMO FUNCIONA
            ═══════════════════════════════════════════════════════ */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <Reveal>
              <div className="text-center max-w-2xl mx-auto">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Cómo funciona</span>
                <h2 className="mt-4 text-3xl md:text-4xl font-black text-gray-900 font-display">
                  De la complejidad al control en 3 pasos
                </h2>
              </div>
            </Reveal>

            <div className="mt-16 max-w-3xl mx-auto">
              {[
                { step: '01', title: 'Crea tu organización', desc: 'Configura los datos base de tu empresa, define la estructura de tu equipo y establece los accesos para cada persona.' },
                { step: '02', title: 'Carga empleados y contratos', desc: 'Registra o importa tu plantilla, asocia contratos y define los conceptos de nómina que aplican a cada rol.' },
                { step: '03', title: 'Opera y genera reportes', desc: 'Corre la nómina de cada periodo, transmite a la DIAN y obtén métricas ejecutivas en tiempo real.' },
              ].map((item, i) => (
                <Reveal key={item.step} delay={i * 150}>
                  <div className="flex gap-6 mb-2">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-black text-lg shrink-0 bg-gradient-to-br from-primary-500 to-blue-600 text-white shadow-lg shadow-primary-500/20">
                        {item.step}
                      </div>
                      {i < 2 && <div className="w-px flex-1 mt-2 bg-gradient-to-b from-primary-300 to-primary-100/30" />}
                    </div>
                    <div className="pb-12">
                      <h3 className="text-lg font-bold text-gray-900 font-display">{item.title}</h3>
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-lg">{item.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            TESTIMONIOS
            ═══════════════════════════════════════════════════════ */}
        <section className="py-24 bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/30">
          <div className="max-w-7xl mx-auto px-6">
            <Reveal>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">Testimonios</span>
                  <h2 className="mt-4 text-3xl md:text-4xl font-black text-gray-900 font-display">Equipos que ya dieron el paso</h2>
                </div>
                <div className="flex gap-2 text-xs">
                  {['Retail', 'Servicios', 'Logística', 'Construcción'].map(tag => (
                    <span key={tag} className="px-3 py-1.5 rounded-full bg-white border border-gray-200/60 text-gray-600">{tag}</span>
                  ))}
                </div>
              </div>
            </Reveal>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                { company: 'Operaciones Andes', role: 'Directora de RRHH', quote: 'Reducimos tiempos de cierre de nómina en 70% y tenemos trazabilidad completa de cada movimiento.' },
                { company: 'Grupo Altavista', role: 'CEO', quote: 'La visibilidad y control de costos nos permitió tomar decisiones estratégicas más rápido y con datos reales.' },
                { company: 'Servicios Delta', role: 'COO', quote: 'Implementación rápida, soporte cercano y resultados concretos desde el primer mes de operación.' },
              ].map((t, i) => (
                <Reveal key={t.company} delay={i * 100}>
                  <div className="landing-card h-full flex flex-col">
                    <div className="flex-1">
                      <div className="flex gap-1 mb-4">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <svg key={j} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <p className="text-sm font-bold text-gray-900">{t.company}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            FORMULARIO DE DEMO
            ═══════════════════════════════════════════════════════ */}
        <section id="demo" className="py-24 relative bg-white">
          <div className="absolute top-0 left-[20%] w-96 h-96 rounded-full bg-primary-100/40 blur-[150px]" />
          <div className="absolute bottom-0 right-[20%] w-80 h-80 rounded-full bg-purple-100/30 blur-[120px]" />

          <div className="relative max-w-7xl mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-2 items-start">

              {/* Left: info */}
              <Reveal>
                <div className="space-y-8 lg:sticky lg:top-32">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Solicitar demo</span>
                    <h2 className="mt-4 text-3xl md:text-4xl font-black text-gray-900 font-display leading-tight">
                      Agenda tu demostración personalizada
                    </h2>
                    <p className="mt-4 text-gray-600 leading-relaxed">
                      Descubre cómo CorteSec puede centralizar tu nómina y escalar tu operación. Un especialista te contactará en menos de 24 horas.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Lo que verás en la demo de 30 minutos:</p>
                    {[
                      { icon: BarChart3, text: 'Cómo eliminar los errores de cálculo en Excel y tener una única fuente de verdad.' },
                      { icon: FileText, text: 'Cómo generar la nómina de cada periodo con reportes claros y sin errores.' },
                      { icon: Layers, text: 'Cómo la arquitectura multi-tenant protege tu información sin importar cuánto crezca tu equipo.' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-primary-50">
                          <item.icon className="w-4 h-4 text-primary-500" />
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl p-4 bg-blue-50/50 border border-primary-100/60">
                    <p className="text-xs text-gray-600">
                      <span className="text-gray-800 font-semibold">Sin compromiso.</span> La demo es gratuita y sin presión de compra. Si no es para ti, cero problema.
                    </p>
                  </div>
                </div>
              </Reveal>

              {/* Right: Form */}
              <Reveal delay={150}>
                <div className="rounded-2xl p-8 md:p-10 bg-white shadow-2xl shadow-gray-200/50 border border-gray-200/60">
                  {demoSent ? (
                    <div className="text-center py-12 space-y-6">
                      <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-green-50 border border-green-200/60">
                        <Check className="w-8 h-8 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 font-display">¡Solicitud recibida!</h3>
                        <p className="mt-3 text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                          Nuestro equipo ya está revisando tu perfil. Un especialista te contactará en menos de <span className="text-gray-900 font-semibold">24 horas hábiles</span>.
                        </p>
                      </div>
                      <div className="rounded-xl p-4 max-w-sm mx-auto bg-primary-50/50 border border-primary-100/60">
                        <p className="text-xs text-gray-600">
                          ¿Hay algún reto específico que quisieras priorizar en la demo? Respóndenos a <a href={`mailto:${landing.contact_email}`} className="text-primary-600 hover:underline">{landing.contact_email}</a>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleDemoSubmit} className="space-y-5">
                      <div className="mb-2">
                        <h3 className="text-xl font-bold text-gray-900 font-display">Cuéntanos sobre tu empresa</h3>
                        <p className="text-xs text-gray-500 mt-1">Todos los campos son obligatorios.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre y Apellido</label>
                        <input type="text" name="nombre" value={demoForm.nombre} onChange={handleDemoChange} required placeholder="Ej. Camila Rodríguez" className="landing-input" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico corporativo</label>
                        <input type="email" name="email" value={demoForm.email} onChange={handleDemoChange} required placeholder="tu@empresa.com.co" className="landing-input" />
                        <p className="text-[10px] text-gray-500 mt-1">Requerido para validar tu entorno empresarial.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono / Celular</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">+57</span>
                          <input type="tel" name="telefono" value={demoForm.telefono} onChange={handleDemoChange} required placeholder="(___) ___ ____" className="landing-input pl-12" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Empresa o Razón Social</label>
                        <input type="text" name="empresa" value={demoForm.empresa} onChange={handleDemoChange} required placeholder="Nombre de tu compañía" className="landing-input" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Número de empleados</label>
                        <select name="empleados" value={demoForm.empleados} onChange={handleDemoChange} required className="landing-select">
                          <option value="" disabled>Selecciona un rango</option>
                          <option value="1-10">1 – 10 empleados</option>
                          <option value="11-50">11 – 50 empleados</option>
                          <option value="51-200">51 – 200 empleados</option>
                          <option value="201+">201+ empleados</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">¿Cuál es tu cargo?</label>
                        <select name="cargo" value={demoForm.cargo} onChange={handleDemoChange} required className="landing-select">
                          <option value="" disabled>Selecciona tu cargo</option>
                          <option value="gerencia">Gerencia / Dirección General</option>
                          <option value="rrhh">Recursos Humanos / Talento Humano</option>
                          <option value="finanzas">Finanzas / Contabilidad</option>
                          <option value="ti">TI / Tecnología</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>

                      <label className="flex items-start gap-3 pt-2 cursor-pointer group">
                        <input type="checkbox" name="acepta_politicas" checked={demoForm.acepta_politicas} onChange={handleDemoChange} required className="mt-1 w-4 h-4 rounded border-gray-300 bg-white text-primary-500 focus:ring-primary-500/50 cursor-pointer" />
                        <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-700 transition">
                          Acepto las Políticas de Privacidad y el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 (Habeas Data).
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={demoSending || !demoForm.acepta_politicas}
                        className="w-full py-4 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-primary-600 to-blue-600 shadow-xl shadow-primary-500/20 hover:shadow-primary-500/30 transition-all duration-300 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                      >
                        {demoSending ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            Enviando…
                          </>
                        ) : (
                          <>
                            Solicitar mi demostración
                            <Send className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            FAQ
            ═══════════════════════════════════════════════════════ */}
        <section className="py-24 bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/30">
          <div className="max-w-3xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-14">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Preguntas frecuentes</span>
                <h2 className="mt-4 text-3xl font-black text-gray-900 font-display">¿Tienes dudas? Es normal.</h2>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-2xl px-8 py-2 bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-lg">
                <FAQItem q="¿Puedo cambiar de plan después?" a="Sí. Puedes escalar o reducir tu plan en cualquier momento sin perder datos ni configuraciones. El cambio se refleja de inmediato." />
                <FAQItem q="¿Qué necesito para iniciar?" a="Solo los datos básicos de tu organización y un administrador. La configuración inicial toma menos de 15 minutos con nuestro asistente de onboarding." />
                <FAQItem q="¿CorteSec sirve para contratistas individuales?" a="Sí. No solo es para gerentes de RRHH. Los contratistas y empleados pueden acceder a su información laboral, recibos y documentos desde su propia cuenta." />
                <FAQItem q="¿Puedo generar reportes de nómina?" a="Sí. CorteSec genera reportes detallados por periodo, empleado y concepto. Puedes exportarlos en cualquier momento para tu contabilidad o auditorías." />
                <FAQItem q="¿Mis datos están seguros si dejo de usar la plataforma?" a="Tus datos son tuyos. Puedes exportar toda tu información en cualquier momento y pedimos la eliminación completa si lo solicitas, conforme a la Ley 1581." />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            CTA FINAL
            ═══════════════════════════════════════════════════════ */}
        <section className="py-24 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <Reveal>
              <div className="relative rounded-3xl overflow-hidden px-8 md:px-14 py-14 md:py-20 text-center bg-gradient-to-br from-primary-600 via-blue-600 to-purple-700 shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full bg-white/10 blur-[80px]" />

                <div className="relative space-y-6">
                  <h2 className="text-3xl md:text-4xl font-black text-white font-display">
                    ¿Listo para tener el control total de tu operación?
                  </h2>
                  <p className="text-blue-100 max-w-xl mx-auto">
                    Automatiza tu nómina y centraliza tu empresa hoy. Sin Excel, sin riesgo, sin desorden.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4 pt-2">
                    <a href="#demo" className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-white text-primary-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.03]">
                      Solicitar demo
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>
                    <a href={`mailto:${landing.contact_email}`} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white/90 hover:text-white transition-all duration-300 bg-white/10 border border-white/20 hover:bg-white/20">
                      <Mail className="w-4 h-4" /> Hablar con asesor
                    </a>
                  </div>
                  <p className="text-xs text-blue-200/60 pt-4">
                    Planes adaptados a empresas colombianas · Facturación en COP · Sin cláusulas de permanencia
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════ */}
      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 via-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-sm font-black text-white font-display">C</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white font-display">{landing.brand}</p>
                <p className="text-[10px] text-gray-500">Software colombiano para empresas que escalan seguro.</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href={`mailto:${landing.contact_email}`} className="hover:text-white transition">{landing.contact_email}</a>
              <Link to="/login" className="hover:text-white transition">Ingresar</Link>
              <Link to="/register" className="hover:text-white transition">Registrarse</Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>© {new Date().getFullYear()} CorteSec. Todos los derechos reservados.</p>
            <p>Plataforma SaaS hecha en Colombia 🇨🇴</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
