"use client"

import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

/**
 * StatusShell — contenedor visual reutilizado por las páginas
 * de error / 404 / offline / mantenimiento.
 *
 * Replica la "card minimalista" del login:
 *   `min-h-screen bg-background` centrado,
 *   `max-w-[480px] rounded-xl border shadow-sm`,
 *   tipografía en escala compacta (sm/xs),
 *   con un círculo tonal arriba para el ícono de la variante.
 */

export type StatusTone = "destructive" | "warning" | "info" | "muted" | "success"

const TONE_STYLES: Record<StatusTone, { bg: string; fg: string }> = {
  destructive: {
    bg: "bg-destructive/10",
    fg: "text-destructive",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950",
    fg: "text-amber-600 dark:text-amber-400",
  },
  info: {
    bg: "bg-sky-50 dark:bg-sky-950",
    fg: "text-sky-600 dark:text-sky-400",
  },
  muted: {
    bg: "bg-muted",
    fg: "text-muted-foreground",
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950",
    fg: "text-emerald-600 dark:text-emerald-400",
  },
}

export interface StatusShellProps {
  icon: React.ReactNode
  tone?: StatusTone
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  /** Pequeño texto en mayúsculas tipo el "ViñoPlastic" del login (eyebrow) */
  eyebrow?: string
}

export function StatusShell({
  icon,
  tone = "muted",
  title,
  description,
  children,
  eyebrow,
}: StatusShellProps) {
  const toneStyles = TONE_STYLES[tone]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-[480px] rounded-xl border border-border bg-background shadow-sm overflow-hidden"
      >
        <div className="px-8 py-10 flex flex-col items-center text-center">
          {eyebrow && (
            <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-foreground mb-6">
              {eyebrow}
            </p>
          )}

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center mb-5",
              toneStyles.bg,
              toneStyles.fg
            )}
          >
            {icon}
          </motion.div>

          <p className="text-sm font-medium text-foreground">{title}</p>

          {description && (
            <div className="text-xs text-muted-foreground mt-2 max-w-[320px] leading-relaxed">
              {description}
            </div>
          )}

          {children && <div className="mt-6 w-full flex flex-col gap-2">{children}</div>}
        </div>
      </motion.div>
    </div>
  )
}
