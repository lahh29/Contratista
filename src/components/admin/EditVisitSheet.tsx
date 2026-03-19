"use client"

import * as React from "react"
import { VisitWizard } from "@/components/admin/VisitWizard"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

interface EditVisitSheetProps {
  visit: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditVisitSheet({ visit, open, onOpenChange }: EditVisitSheetProps) {
  if (!visit) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>Editar Visita</SheetTitle>
          <SheetDescription>Modifica los datos de la visita de {visit.companyName}.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <VisitWizard visit={visit} onClose={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
