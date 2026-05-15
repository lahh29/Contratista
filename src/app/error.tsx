"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, RotateCcw, Home } from "lucide-react"

import { StatusShell } from "@/components/status/StatusShell"
import { Button } from "@/components/ui/button"

/**
 * Next.js App Router runtime error boundary.
 * Renderizado dentro del layout root.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Hook de logging — Next reporta automáticamente, pero dejamos rastro local
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[error.tsx]", error)
    }
  }, [error])

  return (
    <StatusShell
      eyebrow="ViñoPlastic"
      tone="destructive"
      icon={<AlertCircle className="w-6 h-6" />}
      title="Algo salió mal"
      description={
        <>
          Ocurrió un error inesperado al procesar tu solicitud.
          {error.digest && (
            <span className="block mt-2 text-[10px] font-mono tracking-wide text-muted-foreground/60">
              ref: {error.digest}
            </span>
          )}
        </>
      }
    >
      <Button onClick={() => reset()} className="w-full h-10 text-sm">
        <RotateCcw className="w-4 h-4" />
        Reintentar
      </Button>
      <Link
        href="/dashboard"
        className="flex items-center justify-center gap-2 w-full h-10 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <Home className="w-4 h-4" />
        Volver al inicio
      </Link>
    </StatusShell>
  )
}
