"use client"

import * as React from "react"
import { AlertTriangle, Trash2, Info, CheckCircle2, Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

/**
 * ConfirmDialog — diálogo de confirmación reusable, alineado al diseño del login:
 * card limpia con ícono tonal circular, heading sm + descripción xs muted,
 * y botones h-10 text-sm.
 *
 * Variantes:
 * - delete:  rojo (destructive). Botón principal en variant destructive.
 * - warning: ámbar. Botón principal en variant default (advertencia).
 * - info:    azul.  Botón principal en variant default.
 * - confirm: esmeralda. Botón principal en variant default.
 *
 * Uso típico (controlado):
 *
 * ```tsx
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   variant="delete"
 *   title="¿Eliminar empresa?"
 *   description="Esta acción no se puede deshacer."
 *   confirmLabel="Eliminar"
 *   onConfirm={async () => { await deleteCompany(id) }}
 * />
 * ```
 */

export type ConfirmVariant = "delete" | "warning" | "info" | "confirm"

const VARIANT_STYLES: Record<ConfirmVariant, {
  Icon: React.ComponentType<{ className?: string }>
  bg: string
  fg: string
  actionVariant: "default" | "destructive"
}> = {
  delete: {
    Icon: Trash2,
    bg: "bg-destructive/10",
    fg: "text-destructive",
    actionVariant: "destructive",
  },
  warning: {
    Icon: AlertTriangle,
    bg: "bg-amber-50 dark:bg-amber-950",
    fg: "text-amber-600 dark:text-amber-400",
    actionVariant: "default",
  },
  info: {
    Icon: Info,
    bg: "bg-sky-50 dark:bg-sky-950",
    fg: "text-sky-600 dark:text-sky-400",
    actionVariant: "default",
  },
  confirm: {
    Icon: CheckCircle2,
    bg: "bg-emerald-50 dark:bg-emerald-950",
    fg: "text-emerald-600 dark:text-emerald-400",
    actionVariant: "default",
  },
}

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: ConfirmVariant
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  /** Si true, el footer queda deshabilitado mientras corre onConfirm */
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  variant = "confirm",
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  loading: loadingProp,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = React.useState(false)
  const loading = loadingProp ?? internalLoading

  const { Icon, bg, fg, actionVariant } = VARIANT_STYLES[variant]

  async function handleConfirm(e: React.MouseEvent) {
    e.preventDefault()
    if (loading) return
    try {
      setInternalLoading(true)
      await onConfirm()
      onOpenChange(false)
    } finally {
      setInternalLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
              bg
            )}
          >
            <Icon className={cn("w-5 h-5", fg)} />
          </div>
          <AlertDialogHeader className="flex-1 min-w-0">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              actionVariant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
