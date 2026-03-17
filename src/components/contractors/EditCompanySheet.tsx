"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useFirestore } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  contact: z.string().min(2, "Mínimo 2 caracteres"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  suaNumber: z.string().optional(),
  suaValidUntil: z.string().optional(),
})

interface EditCompanySheetProps {
  company: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: (updated: any) => void
}

export function EditCompanySheet({ company, open, onOpenChange, onUpdated }: EditCompanySheetProps) {
  const db = useFirestore()
  const { toast } = useToast()
  const [saving, setSaving] = React.useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      contact: "",
      phone: "",
      email: "",
      suaNumber: "",
      suaValidUntil: "",
    },
  })

  // Pre-fill when company changes
  React.useEffect(() => {
    if (company) {
      form.reset({
        name: company.name || "",
        contact: company.contact || "",
        phone: company.phone || "",
        email: company.email || "",
        suaNumber: company.sua?.number || "",
        suaValidUntil: company.sua?.validUntil || "",
      })
    }
  }, [company, form])

  async function onSubmit(values: z.infer<typeof schema>) {
    if (!db || !company) return
    setSaving(true)

    const updateData = {
      name: values.name,
      contact: values.contact,
      phone: values.phone || "",
      email: values.email ? values.email.toLowerCase().trim() : null,
      sua: {
        ...company.sua,
        number: values.suaNumber || company.sua?.number || "",
        validUntil: values.suaValidUntil || company.sua?.validUntil || "",
      },
    }

    const companyRef = doc(db, "companies", company.id)
    try {
      await updateDoc(companyRef, updateData)
      toast({ title: "Empresa actualizada", description: `${values.name} fue actualizada correctamente.` })
      onUpdated?.({ ...company, ...updateData })
      onOpenChange(false)
    } catch {
      const permissionError = new FirestorePermissionError({
        path: companyRef.path,
        operation: 'update',
        requestResourceData: updateData,
      })
      errorEmitter.emit('permission-error', permissionError)
    } finally {
      setSaving(false)
    }
  }

  if (!company) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md overflow-y-auto flex flex-col"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="mb-6">
          <SheetTitle>Editar Empresa</SheetTitle>
          <SheetDescription>Modifica los datos de {company.name}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón Social</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Constructora ABC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contacto Principal</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del responsable" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="+52 442..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email del Contratista{" "}
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="proveedor@empresa.com" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Usado para vincular automáticamente su cuenta al portal.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Datos SUA
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="suaNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° de Póliza / SUA</FormLabel>
                      <FormControl>
                        <Input placeholder="P-123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="suaValidUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vencimiento SUA</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <SheetFooter className="mt-auto pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar cambios
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
