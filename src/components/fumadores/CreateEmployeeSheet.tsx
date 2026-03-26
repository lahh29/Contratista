"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, User, Briefcase, Building2, Hash } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFirestore } from "@/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  employeeId:      z.string().min(1, "Requerido"),
  Nombre:          z.string().min(2, "Mínimo 2 caracteres"),
  ApellidoPaterno: z.string().min(2, "Mínimo 2 caracteres"),
  ApellidoMaterno: z.string().optional(),
  Puesto:          z.string().min(2, "Mínimo 2 caracteres"),
  Departamento:    z.string().min(2, "Mínimo 2 caracteres"),
  Área:            z.string().min(1, "Requerido"),
  Turno:           z.string().min(1, "Requerido"),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateEmployeeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (employee: FormValues) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateEmployeeSheet({ open, onOpenChange, onCreated }: CreateEmployeeSheetProps) {
  const db = useFirestore()
  const { toast } = useToast()
  const [saving, setSaving] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId:      "",
      Nombre:          "",
      ApellidoPaterno: "",
      ApellidoMaterno: "",
      Puesto:          "",
      Departamento:    "",
      Área:            "",
      Turno:           "",
    },
  })

  // Reset form when sheet closes
  React.useEffect(() => {
    if (!open) form.reset()
  }, [open, form])

  async function onSubmit(values: FormValues) {
    if (!db) return
    setSaving(true)
    try {
      const ref = doc(db, "empleados", values.employeeId)

      // Check for duplicate ID
      const existing = await getDoc(ref)
      if (existing.exists()) {
        form.setError("employeeId", { message: "Ya existe un empleado con ese número" })
        return
      }

      await setDoc(ref, {
        employeeId:      values.employeeId,
        Nombre:          values.Nombre.toUpperCase().trim(),
        ApellidoPaterno: values.ApellidoPaterno.toUpperCase().trim(),
        ApellidoMaterno: values.ApellidoMaterno?.toUpperCase().trim() ?? "",
        Puesto:          values.Puesto.toUpperCase().trim(),
        Departamento:    values.Departamento.toUpperCase().trim(),
        Área:            values.Área.toUpperCase().trim(),
        Turno:           values.Turno,
      })

      toast({
        title: "Empleado registrado",
        description: `${values.Nombre} ${values.ApellidoPaterno} fue agregado correctamente.`,
      })

      onCreated?.({
        ...values,
        Nombre:          values.Nombre.toUpperCase().trim(),
        ApellidoPaterno: values.ApellidoPaterno.toUpperCase().trim(),
        ApellidoMaterno: values.ApellidoMaterno?.toUpperCase().trim() ?? "",
        Puesto:          values.Puesto.toUpperCase().trim(),
        Departamento:    values.Departamento.toUpperCase().trim(),
        Área:            values.Área.toUpperCase().trim(),
      })
      onOpenChange(false)
    } catch {
      toast({
        title: "Error",
        description: "No se pudo registrar el empleado.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md flex flex-col overflow-y-auto"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="mb-5">
          <SheetTitle>Nuevo empleado</SheetTitle>
          <SheetDescription>Registra un empleado para el control de fumadores.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 gap-5">

            {/* ── Identificación ── */}
            <div className="space-y-4">
              <SectionLabel icon={Hash} label="Identificación" />

              <FormField control={form.control} name="employeeId" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Número de empleado</FieldLabel>
                  <FormControl>
                    <Input
                      className="h-11 font-mono"
                      placeholder="Ej. 1234"
                      inputMode="numeric"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="Nombre" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Nombre(s)</FieldLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      placeholder="Ej. JUAN CARLOS"
                      autoCapitalize="words"
                      {...field}
                      onChange={e => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="ApellidoPaterno" render={({ field }) => (
                  <FormItem>
                    <FieldLabel>Ap. Paterno</FieldLabel>
                    <FormControl>
                      <Input
                        className="h-11"
                        placeholder="GARCÍA"
                        autoCapitalize="words"
                        {...field}
                        onChange={e => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="ApellidoMaterno" render={({ field }) => (
                  <FormItem>
                    <FieldLabel>Ap. Materno</FieldLabel>
                    <FormControl>
                      <Input
                        className="h-11"
                        placeholder="LÓPEZ"
                        autoCapitalize="words"
                        {...field}
                        onChange={e => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* ── Puesto ── */}
            <div className="space-y-4">
              <SectionLabel icon={Briefcase} label="Puesto" />

              <FormField control={form.control} name="Puesto" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Puesto</FieldLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      placeholder="Ej. OPERADOR DE PRODUCCIÓN"
                      autoCapitalize="words"
                      {...field}
                      onChange={e => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="Departamento" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Departamento</FieldLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      placeholder="Ej. PRODUCCIÓN"
                      autoCapitalize="words"
                      {...field}
                      onChange={e => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* ── Área y Turno ── */}
            <div className="space-y-4">
              <SectionLabel icon={Building2} label="Área y Turno" />

              <FormField control={form.control} name="Área" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Área</FieldLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      placeholder="Ej. LÍNEA 3"
                      autoCapitalize="words"
                      {...field}
                      onChange={e => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="Turno" render={({ field }) => (
                <FormItem>
                  <FieldLabel>Turno</FieldLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecciona el turno…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="MIXTO">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
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
                Registrar
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
