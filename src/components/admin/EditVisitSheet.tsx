"use client"

import * as React from "react"
import { Loader2, MapPin, UserCog, Users } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, query, limit, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

interface EditVisitSheetProps {
  visit: { id: string; areaId?: string; areaName?: string; supervisorId?: string; supervisorName?: string; personnelCount?: number; companyName?: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditVisitSheet({ visit, open, onOpenChange }: EditVisitSheetProps) {
  const db          = useFirestore()
  const { toast }   = useToast()
  const [saving, setSaving]                 = React.useState(false)
  const [areaId, setAreaId]                 = React.useState("")
  const [supervisorId, setSupervisorId]     = React.useState("")
  const [personnelCount, setPersonnelCount] = React.useState(1)

  const areasQuery       = React.useMemo(() => db ? query(collection(db, "areas"), limit(100)) : null, [db])
  const supervisorsQuery = React.useMemo(() => db ? query(collection(db, "supervisors"), limit(100)) : null, [db])
  const { data: areas }       = useCollection(areasQuery)
  const { data: supervisors } = useCollection(supervisorsQuery)

  // Pre-fill when visit changes
  React.useEffect(() => {
    if (visit) {
      setAreaId(visit.areaId ?? "")
      setSupervisorId(visit.supervisorId ?? "")
      setPersonnelCount(visit.personnelCount ?? 1)
    }
  }, [visit])

  const handleSave = async () => {
    if (!db || !visit) return
    setSaving(true)

    try {
      await updateDoc(doc(db, "visits", visit.id), {
        personnelCount,
      })
      toast({ title: "Visita actualizada", description: `Datos de ${visit.companyName} actualizados.` })
      onOpenChange(false)
    } catch {
      toast({ variant: "destructive", title: "Error al actualizar la visita" })
    } finally {
      setSaving(false)
    }
  }

  if (!visit) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col" onCloseAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="mb-6">
          <SheetTitle>Editar Visita</SheetTitle>
          <SheetDescription>Modifica los datos de la visita activa de {visit.companyName}.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5">
          {/* Área — solo lectura */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" /> Área Destino
            </Label>
            <div className="h-11 rounded-lg border bg-muted/40 px-3 flex items-center">
              <span className="text-sm font-medium">{areas?.find(a => a.id === areaId)?.name ?? visit.areaName ?? "—"}</span>
            </div>
          </div>

          {/* Supervisor — solo lectura */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <UserCog className="w-3.5 h-3.5" /> Encargado
            </Label>
            <div className="h-11 rounded-lg border bg-muted/40 px-3 flex items-center gap-2">
              <span className="text-sm font-medium flex-1">{supervisors?.find(s => s.id === supervisorId)?.name ?? visit.supervisorName ?? "—"}</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">Auto</span>
            </div>
          </div>

          {/* Personal */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Users className="w-3.5 h-3.5" /> Personas en Planta
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl text-lg shrink-0"
                onClick={() => setPersonnelCount(p => Math.max(1, p - 1))}
              >
                −
              </Button>
              <div className="flex-1 h-11 rounded-xl border bg-muted/30 flex items-center justify-center text-xl font-black">
                {personnelCount}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl text-lg shrink-0"
                onClick={() => setPersonnelCount(p => p + 1)}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        <SheetFooter className="mt-auto pt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
