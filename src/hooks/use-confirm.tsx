"use client"

/**
 * useConfirm — Promise-based confirmation dialog hook.
 *
 * Replaces `window.confirm()` with a proper, themed dialog that matches
 * the app's design system. The hook returns:
 *   - `confirm(options)` — call this to open the dialog; returns a Promise<boolean>
 *   - `ConfirmDialog`    — a React element that MUST be rendered in the component tree
 *
 * @example
 * const { confirm, ConfirmDialog } = useConfirm()
 *
 * async function handleDelete(id: string) {
 *   const ok = await confirm({
 *     title: '¿Eliminar área?',
 *     description: 'Esta acción no se puede deshacer.',
 *     confirmLabel: 'Eliminar',
 *     variant: 'destructive',
 *   })
 *   if (!ok) return
 *   await deleteDoc(...)
 * }
 *
 * return (
 *   <>
 *     {ConfirmDialog}
 *     <YourUI />
 *   </>
 * )
 */

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** "destructive" renders the confirm button in red */
  variant?: "default" | "destructive"
}

export function useConfirm() {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<ConfirmOptions>({ title: "" })
  // Stable ref — avoids re-rendering the dialog just because the resolver changed
  const resolverRef = React.useRef<((confirmed: boolean) => void) | null>(null)

  const confirm = React.useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const resolve = React.useCallback((value: boolean) => {
    setOpen(false)
    resolverRef.current?.(value)
    resolverRef.current = null
  }, [])

  // Closing the dialog via backdrop / Escape counts as "cancel"
  const handleOpenChange = React.useCallback(
    (v: boolean) => { if (!v) resolve(false) },
    [resolve]
  )

  const ConfirmDialog = (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{options.title}</DialogTitle>
          {options.description && (
            <DialogDescription>{options.description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => resolve(false)}
          >
            {options.cancelLabel ?? "Cancelar"}
          </Button>
          <Button
            variant={options.variant ?? "default"}
            className="rounded-xl"
            onClick={() => resolve(true)}
          >
            {options.confirmLabel ?? "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { confirm, ConfirmDialog }
}
