"use client"

import { AlertCircle, AlertTriangle, CheckCircle2, Info, Bell } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastVariant,
} from "@/components/ui/toast"
import { cn } from "@/lib/utils"

/**
 * Mapa de íconos y tonos por variante.
 * El círculo tonal replica el estilo del login (success/error chips).
 */
const VARIANT_ICON: Record<ToastVariant, {
  Icon: React.ComponentType<{ className?: string }>
  bg: string
  fg: string
}> = {
  default: {
    Icon: Bell,
    bg: "bg-muted",
    fg: "text-muted-foreground",
  },
  success: {
    Icon: CheckCircle2,
    bg: "bg-emerald-50 dark:bg-emerald-950",
    fg: "text-emerald-600 dark:text-emerald-400",
  },
  destructive: {
    Icon: AlertCircle,
    bg: "bg-destructive/10",
    fg: "text-destructive",
  },
  warning: {
    Icon: AlertTriangle,
    bg: "bg-amber-50 dark:bg-amber-950",
    fg: "text-amber-600 dark:text-amber-400",
  },
  info: {
    Icon: Info,
    bg: "bg-sky-50 dark:bg-sky-950",
    fg: "text-sky-600 dark:text-sky-400",
  },
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="down">
      {toasts.map(({ id, title, description, action, variant, ...props }) => {
        const v: ToastVariant = (variant as ToastVariant) ?? "default"
        const { Icon, bg, fg } = VARIANT_ICON[v] ?? VARIANT_ICON.default
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex flex-1 items-start gap-3 min-w-0">
              <div
                className={cn(
                  "shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center",
                  bg
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", fg)} />
              </div>
              <div className="flex-1 min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
              {action}
              <ToastClose />
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
