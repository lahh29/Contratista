"use client"

import { Coffee, Cigarette, HardHat } from "lucide-react"

export default function FumadoresPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="
          rounded-3xl border border-border/60 bg-card
          shadow-sm dark:shadow-none
          p-8 sm:p-10
          flex flex-col items-center gap-8 text-center
        ">

          {/* Íconos */}
          <div className="flex items-end justify-center gap-3 sm:gap-4">
            {/* Café — principal */}
            <div className="
              w-16 h-16 sm:w-20 sm:h-20 rounded-2xl
              bg-amber-100 dark:bg-amber-950/50
              border border-amber-200 dark:border-amber-800/50
              flex items-center justify-center shadow-sm
              animate-bounce
            " style={{ animationDelay: '0ms', animationDuration: '1.2s' }}>
              <Coffee className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600 dark:text-amber-400" />
            </div>

            {/* Casco */}
            <div className="
              w-12 h-12 sm:w-14 sm:h-14 rounded-2xl
              bg-muted/80 dark:bg-muted/40
              border border-border/60
              flex items-center justify-center shadow-sm
              animate-bounce
            " style={{ animationDelay: '180ms', animationDuration: '1.2s' }}>
              <HardHat className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground" />
            </div>

            {/* Cigarro */}
            <div className="
              w-10 h-10 sm:w-12 sm:h-12 rounded-2xl
              bg-muted/50 dark:bg-muted/20
              border border-border/40
              flex items-center justify-center shadow-sm
              animate-bounce
            " style={{ animationDelay: '360ms', animationDuration: '1.2s' }}>
              <Cigarette className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground/50" />
            </div>
          </div>

          {/* Texto */}
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              En construcción
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Estamos trabajando a marchas forzadas para tener esto listo.
            </p>
            <p className="text-sm text-muted-foreground/70">
              ¿Un cafecito mientras esperamos? ☕
            </p>
          </div>

          {/* Divider */}
          <div className="w-12 h-px bg-border/60" />

          {/* Badge */}
          <span className="
            inline-flex items-center gap-2
            text-[11px] sm:text-xs font-bold uppercase tracking-widest
            px-4 py-2 rounded-full
            bg-primary/10 dark:bg-primary/15
            text-primary
            border border-primary/20 dark:border-primary/30
          ">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Próximamente
          </span>

        </div>
      </div>
    </div>
  )
}
