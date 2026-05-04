'use client'

import { useEffect, useState } from 'react'
import { useNotifications } from '@/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { Bell, X } from 'lucide-react'

const NOTIF_DISMISS_KEY = 'notif_banner_dismissed'
const NOTIF_DISMISS_TTL = 7 * 24 * 60 * 60_000  // 7 días

export function PWASetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service workers not supported in this browser')
      return
    }
    // Scope dedicado "/fcm-sw/" para NO colisionar con sw.js de next-pwa (scope "/").
    // Firebase vincula el token FCM al objeto de registro, no al scope,
    // por lo que los mensajes push llegan correctamente a este SW.
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js', { scope: '/fcm-sw/' })
      .then(reg => {
        console.log('[SW] FCM SW registered at scope:', reg.scope)
        // Forzar activación inmediata si hay una versión esperando
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      })
      .catch(err => console.error('[SW] FCM SW registration failed:', err))
  }, [])
  return null
}

export function NotificationBanner() {
  const { permission, supported, requestPermission } = useNotifications()
  const [dismissed, setDismissed] = useState(true) // hidden until hydration

  useEffect(() => {
    const ts = localStorage.getItem(NOTIF_DISMISS_KEY)
    if (!ts || Date.now() - Number(ts) > NOTIF_DISMISS_TTL) {
      setDismissed(false)
    }
  }, [])

  if (!supported || permission !== 'default' || dismissed) return null

  function handleDismiss() {
    localStorage.setItem(NOTIF_DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }

  async function handleActivate() {
    await requestPermission()
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-card border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
        <div className="h-1 bg-primary w-full" />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">Activar notificaciones</p>
                <p className="text-xs text-muted-foreground mt-0.5">Alertas en tiempo real</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 mb-4">
            {[
              'Ingresos y salidas de contratistas',
              'Vencimientos de SUA próximos',
              'Alertas de acceso bloqueado',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-black text-primary bg-primary/10 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-9 text-xs rounded-xl" onClick={handleDismiss}>
              Ahora no
            </Button>
            <Button size="sm" className="flex-1 h-9 text-xs rounded-xl font-bold" onClick={handleActivate}>
              Activar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
