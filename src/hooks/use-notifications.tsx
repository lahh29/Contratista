'use client'

import { useEffect, useRef, useState } from 'react'
import { useFirestore, useUser } from '@/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getFCMToken, onForegroundMessage } from '@/firebase/messaging'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported]   = useState(false)
  const db       = useFirestore()
  const { user } = useUser()
  const tokenSaved = useRef(false)

  useEffect(() => {
    const ok = typeof window !== 'undefined'
      && 'Notification' in window
      && 'serviceWorker' in navigator
    setSupported(ok)
    if (ok) setPermission(Notification.permission)
  }, [])

  // Register FCM token once permission is granted
  useEffect(() => {
    if (!db || !user || permission !== 'granted' || tokenSaved.current) return
    tokenSaved.current = true

    getFCMToken().then(async (token) => {
      if (!token) return
      try {
        // Store under users/{uid}/fcmTokens/{token}
        const ref = doc(db, 'users', user.uid, 'fcmTokens', token)
        await setDoc(ref, { token, createdAt: serverTimestamp(), userAgent: navigator.userAgent }, { merge: true })
      } catch (err) {
        console.warn('[FCM] Could not save token:', err)
      }
    })
  }, [db, user, permission])

  // Handle foreground FCM messages (app is open)
  useEffect(() => {
    if (permission !== 'granted') return
    const unsubscribe = onForegroundMessage((payload) => {
      const { title, body } = payload.notification ?? {}
      const url = payload.data?.url ?? '/dashboard'
      if (!title) return

      // Use service worker notification so it's consistent with background
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon:  '/api/pwa-icon?size=192',
          badge: '/api/pwa-icon?size=96',
          tag:   payload.data?.type ?? 'notification',
          data:  { url },
          vibrate: [200, 100, 200],
        } as NotificationOptions)
      })
    })
    return () => unsubscribe()
  }, [permission])

  const requestPermission = async () => {
    if (!supported) return false
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch {
      return false
    }
  }

  return { permission, supported, requestPermission }
}
