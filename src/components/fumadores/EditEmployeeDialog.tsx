"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Hash, Briefcase, Building2, ChevronLeft, ChevronRight, Check, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { doc, updateDoc, deleteDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useConfirm } from "@/hooks/use-confirm"

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  Nombre:          z.string().min(2, "Mínimo 2 caracteres"),
  ApellidoPaterno: z.string().min(2, "Mínimo 2 caracteres"),
  ApellidoMaterno: z.string().optional(),
  Puesto:          z.string().min(2, "Mínimo 2 caracteres"),
  Departamento:    z.string().min(2, "Mínimo 2 caracteres"),
  Área:            z.string().min(1, "Requerido"),
  Turno:           z.string().min(1, "Requerido"),
})

type FormValues = z.infer<typeof schema>

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Identificación", icon: Hash,      fields: ["Nombre", "ApellidoPaterno", "ApellidoMaterno"] as const },
  { label: "Puesto",         icon: Briefcase,  fields: ["Puesto", "Departamento"] as const },
  { label: "Área y Turno",   icon: Building2,  fields: ["Área", "Turno"] as const },
]

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmployeeData {
  employeeId: string
  Nombre: string
  ApellidoPaterno: string
  ApellidoMaterno?: string
  Puesto: string
  Departamento: string
  Área: string
  Turno: string
}

interface EditEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: EmployeeData | null
  onUpdated?: () => void
  onDeleted?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditEmployeeDialog({ open, onOpenChange, employee, onUpdated, onDeleted }: EditEmployeeDialogProps) {
  const db = useFirestore()
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [step, setStep] = React.useState(0)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      Nombre: "", ApellidoPaterno: "", ApellidoMaterno: "",
      Puesto: "", Departamento: "", Área: "", Turno: "",
    },
  })

  // Populate form when employee changes
  React.useEffect(() => {
    if (employee && open) {
      form.reset({
        Nombre:          employee.Nombre,
        ApellidoPaterno: employee.ApellidoPaterno,
        ApellidoMaterno: employee.ApellidoMaterno ?? "",
        Puesto:          employee.Puesto,
        Departamento:    employee.Departamento,
        Área:            employee.Área,
        Turno:           employee.Turno,
      })
      setStep(0)
    }
  }, [employee, open, form])

  // Validate current step fields before advancing
  const validateStep = async () => {
    const fields = STEPS[step].fields as unknown as (keyof FormValues)[]
    return await form.trigger(fields)
  }

  const handleNext = async () => {
    const valid = await validateStep()
    if (!valid) return
    if (step < STEPS.length - 1) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleSubmit = async () => {
    const valid = await validateStep()
    if (!valid) return

    const values = form.getValues()
    if (!db || !employee) return

    setSaving(true)
    try {
      await updateDoc(doc(db, "empleados", employee.employeeId), {
        Nombre:          values.Nombre.toUpperCase().trim(),
        ApellidoPaterno: values.ApellidoPaterno.toUpperCase().trim(),
        ApellidoMaterno: values.ApellidoMaterno?.toUpperCase().trim() ?? "",
        Puesto:          values.Puesto.toUpperCase().trim(),
        Departamento:    values.Departamento.toUpperCase().trim(),
        Área:            values.Área.toUpperCase().trim(),
        Turno:           values.Turno,
      })

      toast({
        title: "Empleado actualizado",
        description: `${values.Nombre} ${values.ApellidoPaterno} fue actualizado correctamente.`,
      })

      onUpdated?.()
      onOpenChange(false)
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar el empleado.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!db || !employee) return

    const ok = await confirm({
      title: `¿Eliminar empleado #${employee.employeeId}?`,
      description: `Se eliminará a ${employee.Nombre} ${employee.ApellidoPaterno} permanentemente. Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      variant: "destructive",
    })
    if (!ok) return

    setDeleting(true)
    try {
      await deleteDoc(doc(db, "empleados", employee.employeeId))
      toast({
        title: "Empleado eliminado",
        description: `#${employee.employeeId} fue eliminado correctamente.`,
      })
      onDeleted?.()
      onOpenChange(false)
    } catch {
      toast({
        title: "Error",
        description: "No se pudo eliminar el empleado.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const isLastStep = step === STEPS.length - 1
  const currentStep = STEPS[step]
  const StepIcon = currentStep.icon

  return (
    <>
      {ConfirmDialog}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar empleado</DialogTitle>
            <DialogDescription>
              {employee ? `#${employee.employeeId} — ` : ""}Paso {step + 1} de {STEPS.length} — {currentStep.label}
            </DialogDescription>
          </DialogHeader>

          {/* ── Stepper ── */}
          <div className="flex items-center justify-center gap-2 py-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isActive = i === step
              const isDone = i < step
              return (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <div className={`h-px flex-1 max-w-8 transition-colors ${isDone ? "bg-primary" : "bg-border"}`} />
                  )}
                  <button
                    type="button"
                    onClick={() => { if (isDone) setStep(i) }}
                    disabled={!isDone}
                    className={`
                      w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all text-xs font-medium
                      ${isActive
                        ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                        : isDone
                          ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                          : "bg-muted text-muted-foreground"
                      }
                    `}
                    aria-label={`Paso ${i + 1}: ${s.label}`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </button>
                </React.Fragment>
              )
            })}
          </div>

          {/* ── Form ── */}
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">

              {/* Step 0: Identificación */}
              {step === 0 && (
                <>
                  {/* Employee ID — read only */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Número de empleado
                    </p>
                    <Input className="h-11 font-mono bg-muted/50" value={employee?.employeeId ?? ""} disabled />
                  </div>

                  <FormField control={form.control} name="Nombre" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Nombre(s)
                      </FormLabel>
                      <FormControl>
                        <Input className="h-11" placeholder="Ej. JUAN CARLOS" autoCapitalize="words"
                          {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="ApellidoPaterno" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Ap. Paterno
                        </FormLabel>
                        <FormControl>
                          <Input className="h-11" placeholder="GARCÍA" autoCapitalize="words"
                            {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="ApellidoMaterno" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Ap. Materno
                        </FormLabel>
                        <FormControl>
                          <Input className="h-11" placeholder="LÓPEZ" autoCapitalize="words"
                            {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </>
              )}

              {/* Step 1: Puesto */}
              {step === 1 && (
                <>
                  <FormField control={form.control} name="Puesto" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Puesto
                      </FormLabel>
                      <FormControl>
                        <Input className="h-11" placeholder="Ej. OPERADOR DE PRODUCCIÓN" autoCapitalize="words"
                          {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="Departamento" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Departamento
                      </FormLabel>
                      <FormControl>
                        <Input className="h-11" placeholder="Ej. PRODUCCIÓN" autoCapitalize="words"
                          {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}

              {/* Step 2: Área y Turno */}
              {step === 2 && (
                <>
                  <FormField control={form.control} name="Área" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Área
                      </FormLabel>
                      <FormControl>
                        <Input className="h-11" placeholder="Ej. LÍNEA 3" autoCapitalize="words"
                          {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="Turno" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Turno
                      </FormLabel>
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
                </>
              )}

              {/* ── Navigation ── */}
              <div className="flex gap-2 pt-2">
                {step > 0 && (
                  <Button type="button" variant="outline" className="flex-1 h-11 gap-1.5" onClick={handleBack}>
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                )}

                {isLastStep ? (
                  <Button
                    type="button"
                    className="flex-1 h-11 gap-1.5"
                    onClick={handleSubmit}
                    disabled={saving || deleting}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Guardar
                  </Button>
                ) : (
                  <Button type="button" className="flex-1 h-11 gap-1.5" onClick={handleNext}>
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* ── Delete button ── */}
              <Button
                type="button"
                variant="ghost"
                className="w-full h-10 text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                onClick={handleDelete}
                disabled={saving || deleting}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Eliminar empleado
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
