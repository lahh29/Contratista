"use client"

import * as React from "react"
import { Loader2, Phone, User } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFirestore } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import type { Company } from "@/types"

interface EditProfileSheetProps {
  company: Company
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProfileSheet({ company, open, onOpenChange }: EditProfileSheetProps) {
  const db          = useFirestore()
  const { toast }   = useToast()
  const [saving, setSaving]       = React.useState(false)
  const [contact, setContact]     = React.useState("")
  const [phone, setPhone]         = React.useState("")

  React.useEffect(() => {
    if (open) {
      setContact(company.contact ?? "")
      setPhone(company.phone ?? "")
    }
  }, [open, company])

  const handleSave = async () => {
    if (!db) return
    setSaving(true)
    try {
      await updateDoc(doc(db, "companies", company.id), { contact, phone })
      toast({ title: "Perfil actualizado", description: "Tus datos de contacto fueron guardados." })
      onOpenChange(false)
    } catch {
      toast({ variant: "destructive", title: "Error al guardar los cambios" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col" onCloseAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="mb-6">
          <SheetTitle>Editar Perfil</SheetTitle>
          <SheetDescription>Actualiza los datos de contacto de {company.name}.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <User className="w-3.5 h-3.5" /> Contacto Principal
            </Label>
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Nombre del responsable"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Phone className="w-3.5 h-3.5" /> Teléfono
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 (000) 000-0000"
              type="tel"
              className="h-11"
            />
          </div>
        </div>

        <SheetFooter className="mt-auto pt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !contact.trim()}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
