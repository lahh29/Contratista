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

// Dedicated scope so this SW coexists with next-pwa's sw.js at scope "/"
const FCM_SW_SCOPE = '/firebase-messaging-sw/'

export async function getFCMToken(): Promise<string | null> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    console.warn('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY not set')
    return null
  }
  const messaging = getFirebaseMessaging()
  if (!messaging) return null
  try {
    // Register the FCM SW at its own scope so it coexists with the Workbox sw.js
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: FCM_SW_SCOPE,
    })
    console.log('[FCM] Using SW registration at scope:', swReg.scope)
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg })
    return token || null
  } catch (err) {
    console.warn('[FCM] Could not get token:', err)
    return null
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  const messaging = getFirebaseMessaging()
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}
