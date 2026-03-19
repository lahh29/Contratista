"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Users, Truck, Building2, Phone, Mail, ShieldCheck, MapPin } from "lucide-react"
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
import { sendNotification } from "@/app/actions/notify"
import { logAudit } from "@/app/actions/audit"
import { useAppUser } from "@/hooks/use-app-user"

/** "DD/MM/AAAA" → "YYYY-MM-DD" para Firestore */
function toISODate(val: string): string {
  const [d, m, y] = val.split('/')
  if (!d || !m || !y) return val
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
}

/** "YYYY-MM-DD" → "DD/MM/AAAA" para mostrar en el input */
function toDisplayDate(val: string): string {
  const [y, m, d] = val.split('-')
  if (!y || !m || !d) return val
  return `${d}/${m}/${y}`
}

const schema = z.object({
  name:          z.string().min(2, "Mínimo 2 caracteres"),
  contact:       z.string().min(2, "Mínimo 2 caracteres"),
  phone:         z.string().optional(),
  email:         z.string().email("Email inválido").optional().or(z.literal("")),
  suaNumber:     z.string().optional(),
  suaValidUntil: z.string().optional(),
  personnelCount: z.coerce.number().min(1).optional(),
  vehicle:       z.string().optional(),
})

interface EditCompanySheetProps {
  company: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: (updated: any) => void
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </FormLabel>
  )
}

export function EditCompanySheet({ company, open, onOpenChange, onUpdated }: EditCompanySheetProps) {
  const db = useFirestore()
  const { toast } = useToast()
  const { appUser } = useAppUser()
  const [saving, setSaving] = React.useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", contact: "", phone: "", email: "",
      suaNumber: "", suaValidUntil: "", personnelCount: 1, vehicle: "",
    },
  })

  const personnelCount = form.watch("personnelCount") ?? 1

  React.useEffect(() => {
    if (company) {
      form.reset({
        name:          company.name          || "",
        contact:       company.contact       || "",
        phone:         company.phone         || "",
        email:         company.email         || "",
        suaNumber:     company.sua?.number   || "",
        suaValidUntil: company.sua?.validUntil ? toDisplayDate(company.sua.validUntil) : "",
        personnelCount: company.personnelCount || 1,
        vehicle:       company.vehicle       || "",
      })
    }
  }, [company, form])

  async function onSubmit(values: z.infer<typeof schema>) {
    if (!db || !company || !appUser) return
    setSaving(true)

    const updateData = {
      name:    values.name,
      contact: values.contact,
      phone:   values.phone || "",
      email:   values.email ? values.email.toLowerCase().trim() : null,
      sua: {
        ...company.sua,
        number:     values.suaNumber     || company.sua?.number     || "",
        validUntil: values.suaValidUntil ? toISODate(values.suaValidUntil) : (company.sua?.validUntil || ""),
      },
      ...(values.personnelCount ? { personnelCount: values.personnelCount } : {}),
      vehicle: values.vehicle ? values.vehicle.toUpperCase().trim() : "",
    }

    const companyRef = doc(db, "companies", company.id)
    try {
      await updateDoc(companyRef, updateData)
      toast({ title: "Empresa actualizada", description: `${values.name} fue actualizada correctamente.` })

      // Auditoría de actualización
      logAudit({
        action: 'company.unblocked', // Si estaba bloqueada y se edita, se asume intención de actualizar/desbloquear
        actorUid:  appUser.uid,
        actorName: appUser.name || appUser.email || "Usuario",
        actorRole: appUser.role,
        targetType: 'company',
        targetId:   company.id,
        targetName: values.name,
      })

      const oldDate  = company.sua?.validUntil
      const newDate  = values.suaValidUntil ? toISODate(values.suaValidUntil) : ""
      const isRenewed = newDate && newDate !== oldDate && newDate > new Date().toISOString().slice(0, 10)
      if (isRenewed) sendNotification({ type: "sua_renewed", companyName: values.name })

      onUpdated?.({ ...company, ...updateData })
      onOpenChange(false)
    } catch {
      const permissionError = new FirestorePermissionError({
        path: companyRef.path,
        operation: "update",
        requestResourceData: updateData,
      })
      errorEmitter.emit("permission-error", permissionError)
    } finally {
      setSaving(false)
    }
  }

  if (!company) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md flex flex-col overflow-y-auto"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="mb-5">
          <SheetTitle>Editar Empresa</SheetTitle>
          <SheetDescription>Modifica los datos de {company.name}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 gap-5">

            {/* ── Empresa ── */}
            <div className="space-y-4">
              <SectionLabel icon={Building2} label="Empresa" />

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Razón Social</FieldLabel>
                  <FormControl>
                    <Input className="h-11" placeholder="Ej. Constructora ABC" autoCapitalize="words" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="contact" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Contacto Principal</FieldLabel>
                  <FormControl>
                    <Input className="h-11" placeholder="Nombre del responsable" autoCapitalize="words" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* ── Contacto ── */}
            <div className="space-y-4">
              <SectionLabel icon={Phone} label="Contacto" />

              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Teléfono</FieldLabel>
                  <FormControl>
                    <Input className="h-11" placeholder="+52 442..." type="tel" inputMode="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Correo electrónico</FieldLabel>
                  <FormControl>
                    <Input className="h-11" type="email" inputMode="email" placeholder="proveedor@empresa.com" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Vincula automáticamente la cuenta del contratista al portal.
                  </p>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* ── SUA ── */}
            <div className="space-y-4">
              <SectionLabel icon={ShieldCheck} label="Datos SUA" />

              <FormField control={form.control} name="suaNumber" render={({ field }) => (
                <FormItem>
                  <FieldLabel>N° de Póliza / SUA</FieldLabel>
                  <FormControl>
                    <Input className="h-11" placeholder="P-123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="suaValidUntil" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Fecha de Vencimiento</FieldLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      type="text"
                      inputMode="numeric"
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* ── Acceso ── */}
            <div className="space-y-4">
              <SectionLabel icon={MapPin} label="Acceso a Planta" />

              {/* Personnel counter */}
              <FormField control={form.control} name="personnelCount" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Personas Autorizadas</FieldLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button" variant="outline" size="icon"
                        className="h-11 w-11 rounded-xl text-lg shrink-0"
                        onClick={() => field.onChange(Math.max(1, (personnelCount as number) - 1))}
                      >−</Button>
                      <div className="flex-1 h-11 rounded-xl border bg-muted/30 flex items-center justify-center">
                        <span className="text-xl font-black">{personnelCount}</span>
                      </div>
                      <Button
                        type="button" variant="outline" size="icon"
                        className="h-11 w-11 rounded-xl text-lg shrink-0"
                        onClick={() => field.onChange((personnelCount as number) + 1)}
                      >+</Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="vehicle" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Placa de Vehículo</FieldLabel>
                  <FormControl>
                    <Input
                      className="h-11 uppercase"
                      placeholder="Ej. ABC-1234"
                      autoCapitalize="characters"
                      maxLength={10}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <SheetFooter className="mt-auto pt-4 flex-row gap-2 pb-safe">
              <Button
                type="button" variant="outline" className="flex-1 h-11"
                onClick={() => onOpenChange(false)} disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-11" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
