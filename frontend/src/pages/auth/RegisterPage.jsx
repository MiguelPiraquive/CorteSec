import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { toast } from 'react-toastify'
import {
  Lock, Mail, Building2, Eye, EyeOff, UserPlus, AlertCircle,
  User, Phone, CheckCircle, Info, Crown, Zap, Shield, Users, Check
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useConfiguracion } from '../../context/ConfiguracionContext'
import publicService from '../../services/publicService'

const PLAN_ICONS = {
  FREE: Users,
  BASIC: Zap,
  PRO: Crown,
  ENTERPRISE: Shield,
}

const PlanCard = ({ plan, isSelected, onSelect, disabled, formatPrice }) => {
  const isFeatured = plan.id === 'PRO'
  const IconComponent = PLAN_ICONS[plan.id] || Zap
  const isFree = plan.price_monthly_cop === 0 || plan.price_monthly_cop === null

  return (
    <button
      type="button"
      onClick={() => onSelect(plan.id)}
      disabled={disabled}
      className={`
        relative w-full text-left rounded-2xl p-4 border-2 transition-all duration-200
        ${isSelected
          ? 'border-primary-500 bg-primary-50/60 shadow-lg shadow-primary-100'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {isFeatured && (
        <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-gradient-to-r from-primary-600 to-purple-600 text-white text-[10px] font-bold rounded-full shadow-sm uppercase tracking-wider">
          Popular
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className={`
          mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
          ${isSelected
            ? 'border-primary-500 bg-primary-500'
            : 'border-gray-300 bg-white'
          }
        `}>
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <IconComponent className={`w-4 h-4 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />
            <span className="font-semibold text-gray-900 text-sm">{plan.name}</span>
          </div>

          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(plan.price_monthly_cop)}
            </span>
            {plan.price_monthly_cop > 0 && (
              <span className="text-xs text-gray-500">/ mes</span>
            )}
          </div>

          {(plan.features || []).length > 0 && (
            <ul className="mt-2 space-y-1">
              {plan.features.slice(0, 3).map((feature) => (
                <li key={feature} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="h-1 w-1 rounded-full bg-primary-400 flex-shrink-0" />
                  <span className="truncate">{feature}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex gap-3 text-[11px] text-gray-400">
            <span>{plan.limits?.max_users ?? '?'} usuarios</span>
            <span>{plan.limits?.max_storage_mb ? `${plan.limits.max_storage_mb} MB` : 'Ilimitado'}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

const passwordRequirements = [
  { label: 'Minimo 12 caracteres', test: (pw) => pw.length >= 12 },
  { label: 'Al menos una mayuscula', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Al menos una minuscula', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Al menos un numero', test: (pw) => /\d/.test(pw) },
  { label: 'Un caracter especial (@$!%*?&)', test: (pw) => /[@$!%*?&]/.test(pw) },
]

const RegisterPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = useAuth()
  const { formatCurrency } = useConfiguracion()
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [publicPlans, setPublicPlans] = useState([])
  const [planLoading, setPlanLoading] = useState(true)

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const initialPlanCode = queryParams.get('plan') || ''

  const formatPlanPrice = (value) => {
    if (value === null || value === undefined) return 'Cotización'
    if (value === 0) return 'Gratis'
    return formatCurrency(value)
  }

  const validationSchema = Yup.object({
    organizationName: Yup.string()
      .required('El nombre de la organizacion es requerido')
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(200, 'El nombre no puede tener mas de 200 caracteres'),
    organizationCode: Yup.string()
      .min(2, 'El codigo debe tener al menos 2 caracteres')
      .max(50, 'El codigo no puede tener mas de 50 caracteres')
      .matches(
        /^[a-zA-Z0-9-_]+$/,
        'El codigo solo puede contener letras, numeros, guiones y guiones bajos'
      ),
    username: Yup.string()
      .required('El nombre de usuario es requerido')
      .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
      .max(150, 'El nombre de usuario no puede tener mas de 150 caracteres')
      .matches(
        /^[a-zA-Z0-9_]+$/,
        'El nombre de usuario solo puede contener letras, numeros y guiones bajos'
      ),
    email: Yup.string()
      .email('Email invalido')
      .required('El email es requerido'),
    firstName: Yup.string()
      .required('El nombre es requerido')
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(50, 'El nombre no puede tener mas de 50 caracteres'),
    lastName: Yup.string()
      .required('El apellido es requerido')
      .min(2, 'El apellido debe tener al menos 2 caracteres')
      .max(50, 'El apellido no puede tener mas de 50 caracteres'),
    phone: Yup.string()
      .matches(/^[+]?[0-9\s-()]*$/, 'Telefono invalido')
      .max(20, 'El telefono no puede tener mas de 20 caracteres'),
    password: Yup.string()
      .required('La contrasena es requerida')
      .min(12, 'La contrasena debe tener al menos 12 caracteres')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'La contrasena debe contener al menos una mayuscula, una minuscula, un numero y un caracter especial'
      ),
    passwordConfirm: Yup.string()
      .required('Debes confirmar la contrasena')
      .oneOf([Yup.ref('password'), null], 'Las contrasenas no coinciden'),
    acceptTerms: Yup.boolean()
      .oneOf([true], 'Debes aceptar los terminos y condiciones'),
  })

  const formik = useFormik({
    initialValues: {
      organizationName: '',
      organizationCode: '',
      planCode: initialPlanCode,
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      passwordConfirm: '',
      acceptTerms: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true)

      try {
        const userData = {
          username: values.username,
          email: values.email,
          first_name: values.firstName,
          last_name: values.lastName,
          full_name: `${values.firstName} ${values.lastName}`.trim(),
          phone: values.phone,
          password: values.password,
          password_confirm: values.passwordConfirm,
          organization_name: values.organizationName,
          organization_code: values.organizationCode || undefined,
          plan_code: values.planCode || undefined,
        }

        const response = await register(userData)

        if (response.success) {
          setRegistrationSuccess(true)
          toast.success(response.message || 'Registro exitoso! Revisa tu email para verificar tu cuenta.')

          setTimeout(() => {
            navigate('/login')
          }, 3000)
        } else {
          toast.error(response.message || 'Error al registrarse')
        }
      } catch (error) {
        console.error('Registration error:', error)

        if (error.message) {
          toast.error(error.message)
        } else if (error.errors) {
          Object.keys(error.errors).forEach((key) => {
            const errorMessages = error.errors[key]
            if (Array.isArray(errorMessages)) {
              errorMessages.forEach((msg) => toast.error(`${key}: ${msg}`))
            } else {
              toast.error(`${key}: ${errorMessages}`)
            }
          })
        } else {
          toast.error('Error al registrarse. Por favor intenta de nuevo.')
        }
      } finally {
        setIsLoading(false)
      }
    },
  })

  useEffect(() => {
    const loadPlans = async () => {
      try {
        setPlanLoading(true)
        const response = await publicService.getPublicPlans()
        const plans = response?.plans || []
        setPublicPlans(plans)

        if (initialPlanCode && plans.some(p => p.id === initialPlanCode)) {
          formik.setFieldValue('planCode', initialPlanCode)
        } else {
          const freePlan = plans.find(p => p.id === 'FREE')
          if (freePlan) {
            formik.setFieldValue('planCode', 'FREE')
          }
        }
      } catch (error) {
        console.error('Error cargando planes:', error)
      } finally {
        setPlanLoading(false)
      }
    }

    loadPlans()
  }, [])

  if (registrationSuccess) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-6 relative overflow-y-auto">
        <div className="absolute top-0 right-0 w-80 h-80 bg-green-100/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-100/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

        <div className="w-full max-w-md relative z-10 animate-scale-in">
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl mb-5 shadow-md">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Registro Exitoso!</h2>
            <p className="text-gray-600 text-[15px] mb-5 leading-relaxed">
              Te hemos enviado un correo a <strong>{formik.values.email}</strong> para verificar tu cuenta.
              Tu periodo de prueba de 14 dias comienza ahora.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-700">
                <strong>Importante:</strong> Verifica tu email antes de iniciar sesion.
              </p>
            </div>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              Ir al login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Panel Izquierdo ── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] bg-gradient-to-br from-primary-700 via-primary-600 to-blue-600 relative overflow-hidden flex-shrink-0">
        {/* Formas decorativas */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/[0.07] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-blue-400/10 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-1/3 left-1/2 w-72 h-72 bg-primary-300/[0.08] rounded-full blur-2xl" />

        {/* Patron decorativo */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Contenido */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 animate-in">
            <div className="w-11 h-11 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center ring-1 ring-white/10">
              <Shield className="w-5.5 h-5.5 text-white" />
            </div>
            <span className="text-white text-lg font-bold tracking-tight">CorteSec</span>
          </div>

          {/* Texto principal */}
          <div className="space-y-8 animate-in">
            <div className="space-y-4">
              <h2 className="text-3xl xl:text-[2.5rem] font-extrabold text-white leading-tight tracking-tight">
                Gestiona tu{' '}
                <span className="text-blue-200">empresa</span>{' '}
                con total control.
              </h2>
              <p className="text-blue-100/70 text-base leading-relaxed max-w-sm">
                Centraliza la administracion de tu organizacion en una plataforma segura, eficiente y lista para crecer contigo.
              </p>
            </div>

            {/* Pasos */}
            <div className="space-y-5 pt-2">
              <div className="flex items-start gap-4 group">
                <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ring-1 ring-white/10">
                  1
                </div>
                <div>
                  <span className="text-white font-semibold text-sm block">Selecciona un plan</span>
                  <span className="text-blue-200/60 text-xs mt-0.5 block">Compara opciones y elige la mejor para tu negocio</span>
                </div>
              </div>
              <div className="flex items-start gap-4 group">
                <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ring-1 ring-white/10">
                  2
                </div>
                <div>
                  <span className="text-white font-semibold text-sm block">Configura tu organizacion</span>
                  <span className="text-blue-200/60 text-xs mt-0.5 block">Nombre, datos de acceso y credenciales seguras</span>
                </div>
              </div>
              <div className="flex items-start gap-4 group">
                <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ring-1 ring-white/10">
                  3
                </div>
                <div>
                  <span className="text-white font-semibold text-sm block">Invita a tu equipo</span>
                  <span className="text-blue-200/60 text-xs mt-0.5 block">Asigna roles y permisos desde el primer momento</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-blue-200/30 text-xs animate-in">
            &copy; 2026 CorteSec. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* ── Panel Derecho (Formulario) ── */}
      <div className="flex-1 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 relative overflow-y-auto">
        {/* Detalles de fondo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-100/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-100/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10 max-w-2xl mx-auto px-6 sm:px-10 py-10">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8 animate-in">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">CorteSec</span>
          </div>

          {/* Encabezado */}
          <div className="mb-7 animate-slide-in">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Crear tu Organizacion
            </h2>
            <p className="text-gray-500 mt-2 text-[15px] leading-relaxed">
              Registra tu empresa y comienza con 14 dias de prueba gratis
            </p>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4 mb-7 flex items-start gap-3 animate-in">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 leading-relaxed">
              Al registrarte crearas una nueva organizacion y seras su administrador principal (Owner).
              Para agregar miembros, podras enviarles invitaciones desde el panel.
            </div>
          </div>

          {/* Formulario */}
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-7 sm:p-8 animate-scale-in">
            <form onSubmit={formik.handleSubmit} className="space-y-7">

              {/* ── Seccion: Plan ── */}
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary-50 text-primary-600">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <label className="text-sm font-semibold text-gray-800">
                    Selecciona tu plan
                  </label>
                </div>

                {/* Trial Banner */}
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 rounded-xl p-3 mb-4 flex items-center gap-3">
                  <div className="flex-shrink-0 w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary-800">
                      14 dias de prueba gratis en todos los planes
                    </p>
                    <p className="text-xs text-primary-600">
                      Sin compromiso. Puedes cambiar o cancelar en cualquier momento.
                    </p>
                  </div>
                </div>

                {/* Plan Cards */}
                {planLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={`skel-${i}`} className="rounded-2xl border border-gray-200 p-4 animate-pulse">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-gray-200" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-20 bg-gray-200 rounded" />
                            <div className="h-5 w-24 bg-gray-200 rounded" />
                            <div className="h-3 w-full bg-gray-200 rounded" />
                            <div className="h-3 w-3/4 bg-gray-200 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : publicPlans.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {publicPlans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        isSelected={formik.values.planCode === plan.id}
                        onSelect={(code) => formik.setFieldValue('planCode', code)}
                        disabled={isLoading}
                        formatPrice={formatPlanPrice}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-xl">
                    Se asignara el plan gratuito por defecto
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Organizacion</span>
                </div>
              </div>

              {/* ── Seccion: Organizacion ── */}
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-600">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Datos de la organizacion</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nombre de la Organizacion *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Building2 className="h-[18px] w-[18px] text-gray-400" />
                      </div>
                      <input
                        id="organizationName"
                        name="organizationName"
                        type="text"
                        placeholder="Mi Empresa SAS"
                        className={`input-field pl-11 ${
                          formik.touched.organizationName && formik.errors.organizationName ? 'input-error' : ''
                        }`}
                        value={formik.values.organizationName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disabled={isLoading}
                      />
                    </div>
                    {formik.touched.organizationName && formik.errors.organizationName && (
                      <p className="error-message flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {formik.errors.organizationName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="organizationCode" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Codigo (opcional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Building2 className="h-[18px] w-[18px] text-gray-400" />
                      </div>
                      <input
                        id="organizationCode"
                        name="organizationCode"
                        type="text"
                        placeholder="Se genera automaticamente"
                        className={`input-field pl-11 ${
                          formik.touched.organizationCode && formik.errors.organizationCode ? 'input-error' : ''
                        }`}
                        value={formik.values.organizationCode}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disabled={isLoading}
                      />
                    </div>
                    {formik.touched.organizationCode && formik.errors.organizationCode && (
                      <p className="error-message flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {formik.errors.organizationCode}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Si lo dejas vacio, se generara a partir del nombre
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Cuenta</span>
                </div>
              </div>

              {/* ── Seccion: Cuenta ── */}
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-50 text-purple-600">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Tu cuenta de administrador</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nombre de Usuario *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="h-[18px] w-[18px] text-gray-400" />
                      </div>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="usuario123"
                        className={`input-field pl-11 ${
                          formik.touched.username && formik.errors.username ? 'input-error' : ''
                        }`}
                        value={formik.values.username}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disabled={isLoading}
                      />
                    </div>
                    {formik.touched.username && formik.errors.username && (
                      <p className="error-message flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {formik.errors.username}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="h-[18px] w-[18px] text-gray-400" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        className={`input-field pl-11 ${
                          formik.touched.email && formik.errors.email ? 'input-error' : ''
                        }`}
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disabled={isLoading}
                      />
                    </div>
                    {formik.touched.email && formik.errors.email && (
                      <p className="error-message flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {formik.errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nombre *
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Juan"
                      className={`input-field ${
                        formik.touched.firstName && formik.errors.firstName ? 'input-error' : ''
                      }`}
                      value={formik.values.firstName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      disabled={isLoading}
                    />
                    {formik.touched.firstName && formik.errors.firstName && (
                      <p className="error-message flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {formik.errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Apellido *
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Perez"
                      className={`input-field ${
                        formik.touched.lastName && formik.errors.lastName ? 'input-error' : ''
                      }`}
                      value={formik.values.lastName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      disabled={isLoading}
                    />
                    {formik.touched.lastName && formik.errors.lastName && (
                      <p className="error-message flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {formik.errors.lastName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Telefono */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telefono (Opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-[18px] w-[18px] text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+57 300 123 4567"
                    className={`input-field pl-11 ${
                      formik.touched.phone && formik.errors.phone ? 'input-error' : ''
                    }`}
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={isLoading}
                  />
                </div>
                {formik.touched.phone && formik.errors.phone && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.phone}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Seguridad</span>
                </div>
              </div>

              {/* ── Seccion: Contrasena ── */}
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-50 text-amber-600">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Contrasena</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Contrasena *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-[18px] w-[18px] text-gray-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Tu contrasena"
                        className={`input-field pl-11 pr-11 ${
                          formik.touched.password && formik.errors.password ? 'input-error' : ''
                        }`}
                        value={formik.values.password}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-[18px] w-[18px] text-gray-400 hover:text-gray-600 transition-colors" />
                        ) : (
                          <Eye className="h-[18px] w-[18px] text-gray-400 hover:text-gray-600 transition-colors" />
                        )}
                      </button>
                    </div>
                    {formik.touched.password && formik.errors.password && (
                      <p className="error-message flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {formik.errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Confirmar Contrasena *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-[18px] w-[18px] text-gray-400" />
                      </div>
                      <input
                        id="passwordConfirm"
                        name="passwordConfirm"
                        type={showPasswordConfirm ? 'text' : 'password'}
                        placeholder="Repetir contrasena"
                        className={`input-field pl-11 pr-11 ${
                          formik.touched.passwordConfirm && formik.errors.passwordConfirm ? 'input-error' : ''
                        }`}
                        value={formik.values.passwordConfirm}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                        disabled={isLoading}
                      >
                        {showPasswordConfirm ? (
                          <EyeOff className="h-[18px] w-[18px] text-gray-400 hover:text-gray-600 transition-colors" />
                        ) : (
                          <Eye className="h-[18px] w-[18px] text-gray-400 hover:text-gray-600 transition-colors" />
                        )}
                      </button>
                    </div>
                    {formik.touched.passwordConfirm && formik.errors.passwordConfirm && (
                      <p className="error-message flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {formik.errors.passwordConfirm}
                      </p>
                    )}
                  </div>
                </div>

                {/* Requisitos de contrasena dinamicos */}
                <div className="bg-gray-50 rounded-xl p-4 mt-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2.5">Requisitos de contrasena:</p>
                  <ul className="space-y-1.5">
                    {passwordRequirements.map((req, idx) => {
                      const met = formik.values.password ? req.test(formik.values.password) : false
                      return (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle
                            className={`w-3.5 h-3.5 flex-shrink-0 transition-colors duration-200 ${
                              met ? 'text-green-500' : 'text-gray-300'
                            }`}
                          />
                          <span className={`text-xs transition-colors duration-200 ${
                            met ? 'text-green-700 font-medium' : 'text-gray-500'
                          }`}>
                            {req.label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>

              {/* Terminos */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-0.5"
                    checked={formik.values.acceptTerms}
                    onChange={formik.handleChange}
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    Acepto los{' '}
                    <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                      terminos y condiciones
                    </a>{' '}
                    y la{' '}
                    <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                      politica de privacidad
                    </a>
                  </span>
                </label>
                {formik.touched.acceptTerms && formik.errors.acceptTerms && (
                  <p className="error-message flex items-center gap-1 mt-1 ml-7">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.acceptTerms}
                  </p>
                )}
              </div>

              {/* Boton */}
              <button
                type="submit"
                disabled={isLoading || !formik.isValid}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-[15px]"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                    Creando organizacion...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-[18px] h-[18px]" />
                    Crear Organizacion
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Link login */}
          <div className="text-center mt-7">
            <p className="text-sm text-gray-500">
              Ya tienes una cuenta?{' '}
              <Link
                to="/login"
                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                Inicia sesion aqui
              </Link>
            </p>
          </div>

          {/* Footer mobile */}
          <p className="lg:hidden text-center text-xs text-gray-400 mt-8">
            &copy; 2026 CorteSec. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
