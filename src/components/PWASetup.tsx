'use client'

import { useEffect } from 'react'
import { useNotifications } from '@/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'

export function PWASetup() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then(reg => console.log('[SW] Registered:', reg.scope))
        .catch(err => console.error('[SW] Registration failed:', err))
    } else {
      console.warn('[SW] Service workers not supported in this browser')
    }
  }, [])
  return null
}

export function NotificationBanner() {
  const { permission, supported, requestPermission } = useNotifications()

  // Only show the banner when permission hasn't been decided yet
  if (!supported || permission !== 'default') return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-foreground text-background rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <div className="bg-background/15 p-2 rounded-xl shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Activar notificaciones</p>
          <p className="text-xs opacity-60 mt-0.5">
            Alertas de ingresos, salidas y vencimientos SUA
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="opacity-60 hover:opacity-100 hover:bg-background/20 h-8 w-8 p-0"
            onClick={() => {
              // Mark as dismissed without requesting — won't show again this session
              if ('Notification' in window) Notification.requestPermission()
            }}
            title="Ignorar"
          >
            <BellOff className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="bg-background text-foreground hover:bg-background/90 font-bold h-8 px-3"
            onClick={requestPermission}
          >
            Activar
          </Button>
        </div>
      </div>
    </div>
  )
}
