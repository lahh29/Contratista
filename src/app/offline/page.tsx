"use client"

import * as React from "react"
import { WifiOff, RotateCcw, CheckCircle2 } from "lucide-react"

import { StatusShell } from "@/components/status/StatusShell"
import { Button } from "@/components/ui/button"

/**
 * Página /offline
 *
 * Pensada para PWAs: si el service worker o el navegador no puede alcanzar
 * la red, se redirige aquí. La página detecta el evento `online` y permite
 * reintentar manualmente.
 */
export default function OfflinePage() {
  const [online, setOnline] = React.useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  )

  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  if (online) {
    return (
      <StatusShell
        eyebrow="ViñoPlastic"
        tone="success"
        icon={<CheckCircle2 className="w-6 h-6" />}
        title="Conexión restablecida"
        description="Ya tienes señal nuevamente. Puedes continuar."
      >
        <Button onClick={() => window.location.reload()} className="w-full h-10 text-sm">
          <RotateCcw className="w-4 h-4" />
          Recargar
        </Button>
      </StatusShell>
    )
  }

  return (
    <StatusShell
      eyebrow="ViñoPlastic"
      tone="warning"
      icon={<WifiOff className="w-6 h-6" />}
      title="Sin conexión"
      description="No detectamos red. Verifica tu Wi-Fi o datos móviles e intenta de nuevo."
    >
      <Button
        onClick={() => window.location.reload()}
        className="w-full h-10 text-sm"
        variant="outline"
      >
        <RotateCcw className="w-4 h-4" />
        Reintentar
      </Button>
    </StatusShell>
  )
}
