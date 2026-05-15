"use client"

import * as React from "react"
import { Wrench, RotateCcw } from "lucide-react"

import { StatusShell } from "@/components/status/StatusShell"
import { Button } from "@/components/ui/button"

/**
 * Página /maintenance
 *
 * Se muestra cuando el portal está temporalmente fuera de servicio
 * (deploy, migración de datos, ventana de mantenimiento, etc).
 *
 * Actívala desde middleware/feature flag — esta vista solo renderiza UI.
 */
export default function MaintenancePage() {
  return (
    <StatusShell
      eyebrow="ViñoPlastic"
      tone="info"
      icon={<Wrench className="w-6 h-6" />}
      title="Mantenimiento programado"
      description={
        <>
          Estamos aplicando mejoras al portal. Volveremos en breve.
          <span className="block mt-2 text-muted-foreground/60">
            Gracias por tu paciencia.
          </span>
        </>
      }
    >
      <Button
        onClick={() => window.location.reload()}
        variant="outline"
        className="w-full h-10 text-sm"
      >
        <RotateCcw className="w-4 h-4" />
        Verificar nuevamente
      </Button>
    </StatusShell>
  )
}
