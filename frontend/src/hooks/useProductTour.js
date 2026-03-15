import { useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const STORAGE_PREFIX = 'cortesec_tour_'
const PENDING_TOUR_KEY = 'cortesec_pending_tour'

/**
 * Lanza driver.js con reintentos hasta que los elementos del DOM existan.
 * Retorna el objeto driver para poder destruirlo al desmontar.
 */
function launchWithRetries(steps, options, retriesLeft = 5) {
  const {
    markCompleted,
    onComplete,
    delay = 800,
    onDriverCreated,
  } = options

  const timerId = setTimeout(() => {
    const attempt = (retries) => {
      const filteredSteps = steps.filter((step) => {
        if (!step.element) return true
        return document.querySelector(step.element)
      })

      if (filteredSteps.length === 0 && retries > 0) {
        setTimeout(() => attempt(retries - 1), 500)
        return
      }

      if (filteredSteps.length === 0) return

      const driverObj = driver({
        showProgress: true,
        animate: true,
        overlayColor: 'rgba(0, 0, 0, 0.6)',
        stagePadding: 10,
        stageRadius: 12,
        popoverClass: 'cortesec-tour-popover',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: 'Finalizar',
        progressText: '{{current}} de {{total}}',
        steps: filteredSteps,
        onDestroyed: () => {
          if (markCompleted) markCompleted()
          if (onComplete) onComplete()
        },
      })

      if (onDriverCreated) onDriverCreated(driverObj)
      driverObj.drive()
    }

    attempt(retriesLeft)
  }, delay)

  return timerId
}

/**
 * Hook reutilizable para Product Tours con Driver.js
 *
 * Mecanismo de force-start (desde pagina de tours):
 * - ToursInteractivosPage guarda el key en sessionStorage y navega
 * - Este hook lo detecta al montar, limpia sessionStorage y lanza el tour
 * - Evita problemas con React 18 StrictMode y useEffect cleanup
 */
export default function useProductTour(tourKey, steps, options = {}) {
  const {
    autoStart = true,
    ready = true,
    delay = 800,
    onComplete = null,
  } = options

  const location = useLocation()
  const driverRef = useRef(null)
  const autoStarted = useRef(false)

  const storageKey = `${STORAGE_PREFIX}${tourKey}_done`

  const isCompleted = useCallback(() => {
    return localStorage.getItem(storageKey) === 'true'
  }, [storageKey])

  const markCompleted = useCallback(() => {
    localStorage.setItem(storageKey, 'true')
  }, [storageKey])

  const resetTour = useCallback(() => {
    localStorage.removeItem(storageKey)
    autoStarted.current = false
  }, [storageKey])

  // ─── Force-start: detectar tour pendiente desde sessionStorage ─────
  useEffect(() => {
    if (!ready) return
    if (!steps || steps.length === 0) return

    // Verificar si hay un tour pendiente para este key
    const pendingTour = sessionStorage.getItem(PENDING_TOUR_KEY)
    if (pendingTour !== tourKey) return

    // Limpiar inmediatamente para que no se relance
    sessionStorage.removeItem(PENDING_TOUR_KEY)
    localStorage.removeItem(storageKey)

    // Tambien limpiar ?tour= de la URL si existe
    if (window.location.search.includes('tour=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    const timerId = launchWithRetries(steps, {
      markCompleted,
      onComplete,
      delay,
      onDriverCreated: (d) => { driverRef.current = d },
    }, 6)

    return () => clearTimeout(timerId)
  }, [ready, tourKey, steps, delay, storageKey, markCompleted, onComplete])

  // ─── Tambien detectar ?tour=KEY en URL (por si llegan directo) ────
  useEffect(() => {
    if (!ready) return
    if (!steps || steps.length === 0) return

    const urlParams = new URLSearchParams(location.search)
    if (urlParams.get('tour') !== tourKey) return

    // Si ya se esta manejando via sessionStorage, no duplicar
    if (!sessionStorage.getItem(PENDING_TOUR_KEY)) {
      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname)
      localStorage.removeItem(storageKey)

      const timerId = launchWithRetries(steps, {
        markCompleted,
        onComplete,
        delay,
        onDriverCreated: (d) => { driverRef.current = d },
      }, 6)

      return () => clearTimeout(timerId)
    }
  }, [ready, tourKey, steps, delay, storageKey, markCompleted, onComplete, location.search])

  // ─── Auto-start: primera vez que el usuario visita la pagina ──────
  useEffect(() => {
    if (!autoStart || !ready || autoStarted.current) return
    if (isCompleted()) return
    if (!steps || steps.length === 0) return

    // No auto-start si hay un tour pendiente o forzado por URL
    const pendingTour = sessionStorage.getItem(PENDING_TOUR_KEY)
    const urlParams = new URLSearchParams(location.search)
    if (pendingTour || urlParams.get('tour')) return

    autoStarted.current = true

    const timerId = launchWithRetries(steps, {
      markCompleted,
      onComplete,
      delay,
      onDriverCreated: (d) => { driverRef.current = d },
    }, 3)

    return () => clearTimeout(timerId)
  }, [autoStart, ready, steps, delay, isCompleted, markCompleted, onComplete, location.search])

  // ─── Lanzar manualmente ───────────────────────────────────────────
  const startTour = useCallback(() => {
    resetTour()
    launchWithRetries(steps, {
      markCompleted,
      onComplete,
      delay: 400,
      onDriverCreated: (d) => { driverRef.current = d },
    }, 3)
  }, [resetTour, steps, markCompleted, onComplete])

  // ─── Limpiar driver al desmontar ──────────────────────────────────
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        try { driverRef.current.destroy() } catch { /* ya destruido */ }
      }
    }
  }, [])

  return {
    startTour,
    resetTour,
    isCompleted: isCompleted(),
    markCompleted,
  }
}

/**
 * Senalar que un tour debe lanzarse en la siguiente pagina.
 * Usado por ToursInteractivosPage al hacer clic en "Iniciar Tour".
 */
export function scheduleTour(tourKey) {
  sessionStorage.setItem(PENDING_TOUR_KEY, tourKey)
}

/**
 * Resetear TODOS los tours
 */
export function resetAllTours() {
  const keys = Object.keys(localStorage)
  keys.forEach((key) => {
    if (key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key)
    }
  })
}

/**
 * Verificar si un tour fue completado
 */
export function isTourCompleted(tourKey) {
  return localStorage.getItem(`${STORAGE_PREFIX}${tourKey}_done`) === 'true'
}
