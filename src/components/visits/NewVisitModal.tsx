"use client"

import * as React from "react"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { VisitForm } from "@/components/admin/VisitForm"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { ClipboardCheck } from "lucide-react"

export function NewVisitModal({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { toast } = useToast()
  const db = useFirestore()

  const companiesQuery = React.useMemo(() => db ? collection(db, "companies") : null, [db])
  const areasQuery = React.useMemo(() => db ? collection(db, "areas") : null, [db])
  const supervisorsQuery = React.useMemo(() => db ? collection(db, "supervisors") : null, [db])

  const { data: companies } = useCollection(companiesQuery)
  const { data: areas } = useCollection(areasQuery)
  const { data: supervisors } = useCollection(supervisorsQuery)

  const handleFormSubmit = async (values: any) => {
    if (!db) return
    setIsSubmitting(true)

    const selectedCompany = companies?.find(c => c.id === values.companyId)
    const selectedArea = areas?.find(a => a.id === values.areaId)
    const selectedSupervisor = supervisors?.find(s => s.id === values.supervisorId)

    const visitData = {
      ...values,
      companyName: selectedCompany?.name || "Empresa Desconocida",
      areaName: selectedArea?.name || "Área Desconocida",
      supervisorName: selectedSupervisor?.name || "Supervisor Desconocido",
      status: "Active",
      entryTime: serverTimestamp(),
      createdAt: serverTimestamp(),
      qrCode: `VIS-${Math.random().toString(36).substring(7).toUpperCase()}`
    }

    try {
      await addDoc(collection(db, "visits"), visitData)
      toast({
        title: "Visita Activada",
        description: `${visitData.companyName} ha ingresado a ${visitData.areaName}.`,
      })
      setOpen(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la visita.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-none shadow-2xl">
        <DialogHeader>
          <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
             <ClipboardCheck className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">Registro de Visita</DialogTitle>
          <DialogDescription>
            Configure el acceso en tiempo real según la arquitectura de seguridad.
          </DialogDescription>
        </DialogHeader>

        <VisitForm
          companies={companies}
          areas={areas}
          supervisors={supervisors}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
