"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-is-mobile"
import { VisitWizard } from "@/components/admin/VisitWizard"
import {
  Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer, DrawerContent, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer"

export function NewVisitModal({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  const handleClose = () => setOpen(false)

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="rounded-t-3xl">
          <div className="px-5 pb-8 pt-4">
            <DrawerTitle className="text-base font-bold mb-4">Nueva Visita</DrawerTitle>
            <VisitWizard onClose={handleClose} />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px] rounded-2xl border-none shadow-2xl p-6 gap-0">
        <DialogTitle className="text-base font-bold mb-4">Nueva Visita</DialogTitle>
        <DialogDescription className="sr-only">Registra una nueva visita de proveedor o cliente.</DialogDescription>
        <VisitWizard onClose={handleClose} />
      </DialogContent>
    </Dialog>
  )
}
