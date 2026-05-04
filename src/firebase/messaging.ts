'use client'

import { getApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

let messagingInstance: Messaging | null = null

export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null
  try {
    const app = getApp()
    if (!messagingInstance) messagingInstance = getMessaging(app)
    return messagingInstance
  } catch {
    return null
  }
}

// El SW de FCM debe estar en scope "/" para recibir push.
// Coexiste con next-pwa porque ambos SWs se registran por separado;
// el navegador enruta cada push al SW cuyo scope coincida con la URL de destino.
const FCM_SW_URL = '/firebase-messaging-sw.js'
const FCM_SW_SCOPE = '/'

/**
 * Espera a que un ServiceWorkerRegistration esté en estado 'active'.
 * Si ya está activo lo devuelve de inmediato.
 * Si está 'installing' o 'waiting' espera el evento 'statechange'.
 * Timeout de seguridad: 10 segundos.
 */
function waitForActiveSW(reg: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  if (reg.active) return Promise.resolve(reg)

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('[FCM] SW did not become active within 10 s')),
      10_000,
    )

    const worker = reg.installing ?? reg.waiting
    if (!worker) {
      clearTimeout(timeout)
      // No worker en ningún estado — intentar usar la reg tal cual
      return resolve(reg)
    }

    worker.addEventListener('statechange', function onStateChange() {
      if (worker.state === 'activated') {
        clearTimeout(timeout)
        worker.removeEventListener('statechange', onStateChange)
        resolve(reg)
      } else if (worker.state === 'redundant') {
        clearTimeout(timeout)
        worker.removeEventListener('statechange', onStateChange)
        reject(new Error('[FCM] SW became redundant'))
      }
    })
  })
}

export async function getFCMToken(): Promise<string | null> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    console.warn('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY not set')
    return null
  }

  // Si el permiso está bloqueado salir silenciosamente
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    return null
  }

  const messaging = getFirebaseMessaging()
  if (!messaging) return null

  try {
    // 1. Registrar el SW de FCM en su scope propio
    const swReg = await navigator.serviceWorker.register(FCM_SW_URL, {
      scope: FCM_SW_SCOPE,
    })

    // 2. Esperar a que el SW esté completamente activo antes de pedir el token
    const activeReg = await waitForActiveSW(swReg)
    console.log('[FCM] SW active at scope:', activeReg.scope)

    // 3. Obtener el token FCM
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: activeReg,
    })

    if (!token) {
      console.warn('[FCM] getToken returned empty — VAPID key may be wrong or SW not linked')
      return null
    }

    return token
  } catch (err) {
    console.warn('[FCM] Could not get token:', err)
    return null
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  const messaging = getFirebaseMessaging()
  if (!messaging) return () => { }
  return onMessage(messaging, callback)
}
