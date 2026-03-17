'use client'

import { useEffect, useRef, useState } from 'react'
import { useFirestore, useUser } from '@/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getFCMToken, onForegroundMessage } from '@/firebase/messaging'
import { useAppUser } from './use-app-user'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported]   = useState(false)
  const db          = useFirestore()
  const { user }    = useUser()
  const { appUser } = useAppUser()
  const tokenSaved  = useRef(false)

  useEffect(() => {
    const ok = typeof window !== 'undefined'
      && 'Notification' in window
      && 'serviceWorker' in navigator
    setSupported(ok)
    if (ok) setPermission(Notification.permission)
  }, [])

  // Register FCM token once permission is granted
  useEffect(() => {
    if (!db || !user || !appUser || permission !== 'granted' || tokenSaved.current) return

    getFCMToken().then(async (token) => {
      if (!token) {
        console.warn('[FCM] No token returned — check VAPID key and service worker')
        return
      }
      try {
        const ref = doc(db, 'users', user.uid, 'fcmTokens', token)
        await setDoc(ref, {
          token,
          createdAt:  serverTimestamp(),
          userAgent:  navigator.userAgent,
          // Store role + companyId so sendFCM can filter by audience
          role:       appUser.role,
          companyId:  appUser.companyId ?? null,
        }, { merge: true })
        tokenSaved.current = true
        console.log('[FCM] Token saved for', appUser.role, token.slice(0, 20) + '...')
      } catch (err) {
        console.error('[FCM] Could not save token:', err)
      }
    })
  }, [db, user, appUser, permission])

  // Handle foreground FCM messages (app is open)
  useEffect(() => {
    if (permission !== 'granted') return
    console.log('[FCM] Foreground listener registered')
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[FCM] Foreground message received:', payload)
      const { title, body } = payload.notification ?? {}
      const url = payload.data?.url ?? '/dashboard'
      if (!title) {
        console.warn('[FCM] Message has no title, skipping notification')
        return
      }

      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon:    '/api/pwa-icon?size=192',
          badge:   '/api/pwa-icon?size=96',
          tag:     payload.data?.type ?? 'notification',
          data:    { url },
          vibrate: [200, 100, 200],
        } as NotificationOptions)
      }).catch(err => console.error('[FCM] showNotification failed:', err))
    })
    return () => unsubscribe()
  }, [permission])

  const requestPermission = async () => {
    if (!supported) return false
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      // Reset flag so the new token is saved with the correct role
      if (result === 'granted') tokenSaved.current = false
      return result === 'granted'
    } catch {
      return false
    }
  }

  return { permission, supported, requestPermission }
}
