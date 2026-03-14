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

export async function getFCMToken(): Promise<string | null> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    console.warn('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY not set')
    return null
  }
  const messaging = getFirebaseMessaging()
  if (!messaging) return null
  try {
    const swReg = await navigator.serviceWorker.ready
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
