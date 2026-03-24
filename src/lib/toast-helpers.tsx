"use client"

/**
 * Convenience wrappers around the base `toast()` function.
 * Prefer these over calling `toast()` directly — they enforce consistent
 * titles, variants, and action patterns across the app.
 */

import { toast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"

/** Plain success toast */
export function toastSuccess(title: string, description?: string) {
  return toast({ title, description })
}

/** Destructive error toast, with optional retry action */
export function toastError(title: string, description?: string, onRetry?: () => void) {
  return toast({
    title,
    description,
    variant: "destructive",
    ...(onRetry && {
      action: (
        <ToastAction altText="Reintentar" onClick={onRetry}>
          Reintentar
        </ToastAction>
      ),
    }),
  })
}

/**
 * Toast with an "Deshacer" action.
 * Ideal for reversible operations (block, soft-delete, status change).
 *
 * @example
 * toastWithUndo("Empresa bloqueada", () => unblockCompany(id))
 */
export function toastWithUndo(title: string, onUndo: () => void, description?: string) {
  // We capture `dismiss` after `toast()` returns — safe because `onUndo`
  // is only called on user click, which is always after the call resolves.
  let dismissFn: (() => void) | undefined

  const result = toast({
    title,
    description,
    action: (
      <ToastAction
        altText="Deshacer"
        onClick={() => {
          dismissFn?.()
          onUndo()
        }}
      >
        Deshacer
      </ToastAction>
    ),
  })

  dismissFn = result.dismiss
  return result
}
