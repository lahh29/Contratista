"use client"

import * as React from "react"
import { AlertOctagon, RotateCcw } from "lucide-react"

/**
 * global-error.tsx
 *
 * Boundary de último recurso: se monta cuando incluso el RootLayout
 * falla, por lo que NO puede usar componentes que dependan de
 * providers de la app (Toaster, Firebase, AuthProvider, etc.).
 *
 * Replica visualmente el estilo del login con CSS plano + Tailwind base.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[global-error.tsx]", error)
    }
  }, [error])

  return (
    <html lang="es">
      <body className="bg-background text-foreground antialiased">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] rounded-xl border border-border bg-background shadow-sm overflow-hidden">
            <div className="px-8 py-10 flex flex-col items-center text-center">
              <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-foreground mb-6">
                ViñoPlastic
              </p>

              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5 bg-destructive/10 text-destructive">
                <AlertOctagon className="w-6 h-6" />
              </div>

              <p className="text-sm font-medium text-foreground">
                Error crítico de la aplicación
              </p>

              <p className="text-xs text-muted-foreground mt-2 max-w-[320px] leading-relaxed">
                No fue posible cargar la interfaz. Intenta recargar la página; si el
                problema persiste, contacta a soporte.
                {error.digest && (
                  <span className="block mt-2 text-[10px] font-mono tracking-wide text-muted-foreground/60">
                    ref: {error.digest}
                  </span>
                )}
              </p>

              <button
                type="button"
                onClick={() => reset()}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
