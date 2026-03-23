'use client'

import { useEffect, useState } from 'react'
import { X, Share, Monitor, Smartphone, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Platform = 'ios' | 'android' | 'desktop'

const DISMISSED_KEY = 'pwa-install-dismissed'
const DISMISSED_TTL = 7 * 24 * 60 * 60_000  // 7 días

function getPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

// ── Config por plataforma ───────────────────────────────────────────────────

const CONFIG = {
  ios: {
    icon:  <Share className="w-5 h-5 shrink-0" />,
    title: 'Instalar en iPhone / iPad',
    steps: [
      <>Toca el botón <Share className="w-3.5 h-3.5 inline-block mx-0.5 -mt-0.5" /> en la barra del navegador</>,
      <>Selecciona <strong>"Agregar a pantalla de inicio"</strong></>,
    ],
    cta: null,  // iOS no permite disparar el prompt
  },
  android: {
    icon:  <Smartphone className="w-5 h-5 shrink-0" />,
    title: 'Instalar en Android',
    steps: ['Accede más rápido desde tu pantalla de inicio sin abrir el navegador.'],
    cta: 'Instalar',
  },
  desktop: {
    icon:  <Monitor className="w-5 h-5 shrink-0" />,
    title: 'Instalar en tu equipo',
    steps: ['Accede desde el escritorio como una aplicación independiente.'],
    cta: 'Instalar',
  },
}

// ── Componente ──────────────────────────────────────────────────────────────

export function PWAInstallBanner() {
  const [platform, setPlatform]     = useState<Platform | null>(null)
  const [visible,  setVisible]      = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // No mostrar si ya está instalada o fue descartada recientemente
    if (isStandalone()) return
    const ts = localStorage.getItem(DISMISSED_KEY)
    if (ts && Date.now() - Number(ts) < DISMISSED_TTL) return

    const p = getPlatform()
    setPlatform(p)

    if (p === 'ios') {
      setVisible(true)
      return
    }

    // Android / Desktop — esperar el evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setVisible(false)
  }

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    setDeferredPrompt(null)
  }

  if (!visible || !platform) return null

  const cfg = CONFIG[platform]

  return (
    <div
      className="
        fixed bottom-4 left-4 right-4
        md:left-auto md:right-6 md:bottom-6 md:w-96
        z-50
        animate-in slide-in-from-bottom-4 fade-in duration-500
      "
    >
      <div className="bg-card border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">

        {/* Barra superior de color */}
        <div className="h-1 bg-primary w-full" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {cfg.icon}
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">{cfg.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">ViñoPlastic · Control de acceso</p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Instrucciones */}
          <div className="space-y-1.5 mb-4">
            {cfg.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-black text-primary bg-primary/10 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs rounded-xl"
              onClick={dismiss}
            >
              Ahora no
            </Button>
            {cfg.cta && (
              <Button
                size="sm"
                className="flex-1 h-9 text-xs rounded-xl gap-1.5 font-bold"
                onClick={install}
              >
                <Download className="w-3.5 h-3.5" />
                {cfg.cta}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
