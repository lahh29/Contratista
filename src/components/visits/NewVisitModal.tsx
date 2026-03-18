"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { VisitForm } from "@/components/admin/VisitForm"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, limit } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return isMobile
}

export function NewVisitModal({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const db = useFirestore()

  const companiesQuery  = React.useMemo(() => db ? query(collection(db, "companies"),  limit(500)) : null, [db])
  const areasQuery      = React.useMemo(() => db ? query(collection(db, "areas"),       limit(100)) : null, [db])
  const supervisorsQuery = React.useMemo(() => db ? query(collection(db, "supervisors"), limit(100)) : null, [db])

  const { data: companies }   = useCollection(companiesQuery)
  const { data: areas }       = useCollection(areasQuery)
  const { data: supervisors } = useCollection(supervisorsQuery)

  const handleFormSubmit = async (values: any) => {
    if (!db) return
    setIsSubmitting(true)
    const selectedCompany    = companies?.find(c => c.id === values.companyId)
    const selectedArea       = areas?.find(a => a.id === values.areaId)
    const selectedSupervisor = supervisors?.find(s => s.id === values.supervisorId)
    const visitData = {
      ...values,
      companyName:    selectedCompany?.name    || "Empresa Desconocida",
      areaName:       selectedArea?.name       || "Área Desconocida",
      supervisorName: selectedSupervisor?.name || "Supervisor Desconocido",
      status:    "Active",
      entryTime: serverTimestamp(),
      createdAt: serverTimestamp(),
      qrCode: `VIS-${Math.random().toString(36).substring(7).toUpperCase()}`,
    }
    try {
      await addDoc(collection(db, "visits"), visitData)
      toast({ title: "Visita Activada", description: `${visitData.companyName} ha ingresado a ${visitData.areaName}.` })
      setOpen(false)
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo registrar la visita." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formContent = (
    <VisitForm
      companies={companies}
      areas={areas}
      supervisors={supervisors}
      onSubmit={handleFormSubmit}
      isSubmitting={isSubmitting}
      onClose={() => setOpen(false)}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="px-4 pb-6 rounded-t-3xl">
          <DrawerHeader className="pb-2 px-0">
            <DrawerTitle className="text-lg font-bold">Nueva Visita</DrawerTitle>
          </DrawerHeader>
          {formContent}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px] rounded-2xl border-none shadow-2xl p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold">Nueva Visita</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  )
}
