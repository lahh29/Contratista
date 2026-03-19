
"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShieldCheck, UploadCloud, Loader2, Users, Truck, MapPin,
  UserCog, Building2, ChevronRight, ChevronLeft, CheckCircle2,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { extractDocumentData } from "@/ai/flows/automated-document-data-extraction"
import { useToast } from "@/hooks/use-toast"
import { collection, addDoc, updateDoc, serverTimestamp, query, limit } from "firebase/firestore"
import { useFirestore, useCollection } from "@/firebase"
import { useRouter } from "next/navigation"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { sendNotification } from "@/app/actions/notify"
import { logAudit } from "@/app/actions/audit"
import { useAppUser } from "@/hooks/use-app-user"

/** "DD/MM/AAAA" → "YYYY-MM-DD" para Firestore */
function toISODate(val: string): string {
  const [d, m, y] = val.split("/")
  if (!d || !m || !y) return val
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
}

/** Formatea `25102024` → `25/10/2024` */
function formatDisplayDate(value: string): string {
  const cleanValue = value.replace(/\D/g, '').slice(0, 8)
  if (cleanValue.length <= 2) return cleanValue
  if (cleanValue.length <= 4) return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2)}`
  return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2, 4)}/${cleanValue.slice(4, 8)}`
}

const contractorSchema = z.object({
  name:               z.string().min(2, "Mínimo 2 caracteres"),
  company:            z.string().min(2, "Mínimo 2 caracteres"),
  type:               z.enum(["proveedor", "cliente"]),
  email:              z.string().email("Email inválido").optional().or(z.literal("")),
  suaExpiration:      z.string().min(1, "Requerida").regex(/^\d{2}\/\d{2}\/\d{4}$/, "Usa DD/MM/AAAA"),
  policyNumber:       z.string().min(1, "Requerido"),
  phone:              z.string().optional(),
  personnelCount:     z.coerce.number().min(1).optional(),
  vehicle:            z.string().optional(),
  defaultAreaId:      z.string().optional(),
  defaultSupervisorId: z.string().optional(),
})

type FormValues = z.infer<typeof contractorSchema>

// ── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { label: "Documento",  Icon: UploadCloud },
  { label: "Empresa",    Icon: Building2   },
  { label: "Póliza SUA", Icon: ShieldCheck },
  { label: "Planta",     Icon: MapPin      },
]

const STEP_REQUIRED_FIELDS: (keyof FormValues)[][] = [
  [],                               // step 0 — siempre puede avanzar
  ["name", "company", "type"],     // step 1
  ["policyNumber", "suaExpiration"],// step 2
  [],                               // step 3 — todo opcional
]

// ── Framer Motion ────────────────────────────────────────────────────────────
const slideVariants = {
  enter:  (d: number) => ({ x: d > 0 ?  32 : -32, opacity: 0 }),
  center:              ({ x: 0,                    opacity: 1 }),
  exit:   (d: number) => ({ x: d > 0 ? -32 :  32, opacity: 0 }),
}
const slideTransition = { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] as const }

// ── Component ────────────────────────────────────────────────────────────────
export function ContractorForm() {
  const [step,      setStep]      = React.useState(0)
  const [direction, setDirection] = React.useState(1)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [analysisResult, setAnalysisResult] = React.useState<any>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const { toast }    = useToast()
  const db           = useFirestore()
  const router       = useRouter()
  const { appUser }  = useAppUser()

  const areasQuery       = React.useMemo(() => db ? query(collection(db, "areas"),       limit(100)) : null, [db])
  const supervisorsQuery = React.useMemo(() => db ? query(collection(db, "supervisors"), limit(100)) : null, [db])
  const { data: areas }       = useCollection(areasQuery)
  const { data: supervisors } = useCollection(supervisorsQuery)

  const forcedType = appUser?.role === 'logistica' ? 'cliente' : appUser?.role === 'seguridad' ? 'proveedor' : undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      name: "",
      company: "",
      type: "proveedor",
      email: "",
      suaExpiration: "",
      policyNumber: "",
      phone: "",
      personnelCount: 1,
      vehicle: "",
      defaultAreaId: "",
      defaultSupervisorId: "",
    },
  })

  // Sync forced type once appUser loads
  React.useEffect(() => {
    if (forcedType) form.setValue('type', forcedType)
  }, [forcedType])

  // Auto-fill supervisor when area changes
  const watchedAreaId = form.watch("defaultAreaId")
  React.useEffect(() => {
    const area = areas?.find((a: any) => a.id === watchedAreaId)
    if (area?.supervisorId) {
      form.setValue("defaultSupervisorId", area.supervisorId, { shouldValidate: true })
    }
  }, [watchedAreaId, areas, form])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const go = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const handleNext = async () => {
    const fields = STEP_REQUIRED_FIELDS[step]
    if (fields.length > 0) {
      const valid = await form.trigger(fields)
      if (!valid) return
    }
    go(step + 1)
  }

  // ── IA Upload ───────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsAnalyzing(true)
    setAnalysisResult(null)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const result = await extractDocumentData({
            documentDataUri: reader.result as string,
            documentDescription: "Documento de Seguro SUA de contratista",
          })
          setAnalysisResult(result)
          if (result.contractorName)   form.setValue("name",          result.contractorName)
          if (result.companyName)      form.setValue("company",        result.companyName)
          if (result.suaExpirationDate) form.setValue("suaExpiration", result.suaExpirationDate)
          if (result.policyNumber)     form.setValue("policyNumber",   result.policyNumber)
          toast({ title: "Verificación completada", description: "Datos extraídos por IA." })
        } catch {
          toast({ variant: "destructive", title: "Error", description: "No se pudo leer el documento." })
        } finally {
          setIsAnalyzing(false)
        }
      }
      reader.readAsDataURL(file)
    } catch {
      setIsAnalyzing(false)
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function onSubmit(values: FormValues) {
    if (!db || !appUser) return
    setSubmitting(true)
    const companyData = {
      name:    values.company,
      type:    values.type,
      contact: values.name,
      phone:   values.phone || "",
      ...(values.email ? { email: values.email.toLowerCase().trim() } : {}),
      status: "Active",
      sua: {
        number:     values.policyNumber,
        validUntil: toISODate(values.suaExpiration),
        status:     "Valid",
      },
      ...(values.personnelCount     ? { personnelCount:      values.personnelCount }     : {}),
      ...(values.vehicle            ? { vehicle:             values.vehicle.toUpperCase().trim() } : {}),
      ...(values.defaultAreaId      ? { defaultAreaId:       values.defaultAreaId }      : {}),
      ...(values.defaultSupervisorId? { defaultSupervisorId: values.defaultSupervisorId }: {}),
      createdAt: serverTimestamp(),
    }
    const companiesRef = collection(db, "companies")
    addDoc(companiesRef, companyData)
      .then(async (docRef) => {
        await updateDoc(docRef, { qrCode: docRef.id })
        
        // Registrar Auditoría
        logAudit({
          action: "company.created",
          actorUid: appUser.uid,
          actorName: appUser.name || appUser.email || "Usuario",
          actorRole: appUser.role,
          targetType: "company",
          targetId: docRef.id,
          targetName: values.company,
          details: {
            contact: values.name,
            suaExpiration: toISODate(values.suaExpiration)
          }
        })

        toast({ title: "Registro Exitoso", description: `${values.company} ha sido registrada.` })
        sendNotification({ type: "new_contractor", companyName: values.company })
        router.push("/contractors")
      })
      .catch(() => {
        const permissionError = new FirestorePermissionError({
          path: companiesRef.path,
          operation: "create",
          requestResourceData: companyData,
        })
        errorEmitter.emit("permission-error", permissionError)
        setSubmitting(false)
      })
  }

  // ── Step content ────────────────────────────────────────────────────────────
  const stepContent = [

    // ── Step 0: Documento IA ─────────────────────────────────────────────────
    <div key="s0" className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Sube el certificado SUA y la IA llenará los campos automáticamente.
      </p>

      <div className="border-2 border-dashed border-muted rounded-xl p-8 text-center hover:bg-muted/20 transition-colors group cursor-pointer relative">
        <input
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          onChange={handleFileUpload}
          accept="image/*"
          disabled={isAnalyzing}
        />
        {isAnalyzing ? (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">Analizando documento…</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Toca para subir el documento</p>
              <p className="text-xs text-muted-foreground mt-0.5">Imagen de póliza o certificado SUA</p>
            </div>
          </div>
        )}
      </div>

      {analysisResult && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-muted/30 p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold">Datos extraídos</span>
            </div>
            <Badge variant={analysisResult.suaStatus === "Active" ? "default" : "destructive"}>
              {analysisResult.suaStatus || "N/A"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{analysisResult.verificationNotes}</p>
        </motion.div>
      )}

      <Button
        type="button"
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={() => go(1)}
      >
        Llenar manualmente <ArrowRight className="w-4 h-4 ml-1.5" />
      </Button>
    </div>,

    // ── Step 1: Empresa ──────────────────────────────────────────────────────
    <div key="s1" className="space-y-4">
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Nombre del Contacto</FormLabel>
          <FormControl>
            <Input className="h-11" placeholder="Apellidos y Nombres" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="company" render={({ field }) => (
        <FormItem>
          <FormLabel>Empresa</FormLabel>
          <FormControl>
            <Input className="h-11" placeholder="Ej. ViñoPlastic" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      {forcedType ? (
        <div className="flex items-center gap-2 h-11 px-3 border rounded-lg bg-muted/30">
          <span className="text-sm text-muted-foreground flex-1">Tipo de empresa</span>
          <Badge variant="outline" className={forcedType === 'cliente' ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-orange-300 text-orange-700 bg-orange-50'}>
            {forcedType === 'cliente' ? 'Cliente' : 'Proveedor'}
          </Badge>
        </div>
      ) : (
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecciona el tipo..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="proveedor">Proveedor</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField control={form.control} name="phone" render={({ field }) => (
        <FormItem>
          <FormLabel>Teléfono <span className="text-muted-foreground font-normal text-xs">(opcional)</span></FormLabel>
          <FormControl>
            <Input className="h-11" placeholder="+52 442…" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="email" render={({ field }) => (
        <FormItem>
          <FormLabel>Email <span className="text-muted-foreground font-normal text-xs">(opcional)</span></FormLabel>
          <FormControl>
            <Input className="h-11" type="email" placeholder="proveedor@empresa.com" {...field} />
          </FormControl>
          <p className="text-xs text-muted-foreground">Para acceso al portal del contratista.</p>
          <FormMessage />
        </FormItem>
      )} />
    </div>,

    // ── Step 2: Póliza SUA ───────────────────────────────────────────────────
    <div key="s2" className="space-y-4">
      <FormField control={form.control} name="policyNumber" render={({ field }) => (
        <FormItem>
          <FormLabel>N° de Póliza / SUA</FormLabel>
          <FormControl>
            <Input className="h-11" placeholder="SUA" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="suaExpiration" render={({ field }) => (
        <FormItem>
          <FormLabel>Vencimiento SUA</FormLabel>
          <FormControl>
            <Input
              className="h-11"
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              {...field}
              onChange={(e) => field.onChange(formatDisplayDate(e.target.value))}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>,

    // ── Step 3: Planta ───────────────────────────────────────────────────────
    <div key="s3" className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField control={form.control} name="personnelCount" render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Personas
            </FormLabel>
            <FormControl>
              <Input className="h-11" type="number" min={1} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="vehicle" render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" /> Placa
            </FormLabel>
            <FormControl>
              <Input className="h-11 font-mono uppercase" placeholder="QRO-00-00" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <FormField control={form.control} name="defaultAreaId" render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Área Destino
          </FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Área habitual…" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {areas?.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="defaultSupervisorId" render={({ field }) => {
        const sup = supervisors?.find((s: any) => s.id === field.value)
        return (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <UserCog className="w-3.5 h-3.5" /> Encargado
            </FormLabel>
            <div className="h-11 rounded-md border bg-muted/40 px-3 flex items-center gap-2">
              {sup ? (
                <>
                  <span className="text-sm font-medium flex-1">{sup.name}</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">Auto</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground/60">
                  {watchedAreaId ? "Sin encargado en esta área" : "Selecciona un área primero"}
                </span>
              )}
            </div>
          </FormItem>
        )
      }} />
    </div>,
  ]

  const isLastStep = step === STEPS.length - 1

  return (
    <div className="max-w-lg mx-auto">
      <Form {...form}>
        <Card className="border shadow-sm">
          <CardContent className="p-5 space-y-5">

            {/* ── Progress indicator ─────────────────────────────────────── */}
            <div className="flex items-center">
              {STEPS.map(({ label, Icon }, i) => {
                const done    = i < step
                const current = i === step
                return (
                  <React.Fragment key={label}>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <motion.div
                        animate={{ scale: current ? 1.1 : 1 }}
                        transition={{ duration: 0.2 }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          done || current ? "bg-primary" : "bg-muted" 
                        }`}>
                        {done
                          ? <CheckCircle2 className="w-4 h-4 text-white" />
                          : <Icon className={`w-4 h-4 ${current ? "text-white" : "text-muted-foreground"}`} />
                        }
                      </motion.div>
                      <span className={`text-[10px] font-medium leading-none ${current ? "text-foreground" : "text-muted-foreground"}`}>
                        {label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-px mx-1.5 mb-4 transition-colors duration-300 ${
                        i < step ? "bg-primary" : "bg-border"
                      }`} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>

            {/* ── Step content ───────────────────────────────────────────── */}
            <div className="overflow-hidden min-h-[280px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                >
                  {stepContent[step]}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Navigation ─────────────────────────────────────────────── */}
            <div className="flex gap-2 pt-1 border-t">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 rounded-xl gap-1"
                  onClick={() => go(step - 1)}
                >
                  <ChevronLeft className="w-4 h-4" /> Atrás
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  onClick={() => router.push("/contractors")}
                >
                  Cancelar
                </Button>
              )}

              {isLastStep ? (
                <Button
                  type="button"
                  className="flex-1 h-11 rounded-xl font-bold"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={submitting}
                >
                  {submitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : "Completar Alta"
                  }
                </Button>
              ) : (
                <Button
                  type="button"
                  className="flex-1 h-11 rounded-xl gap-1 font-semibold"
                  onClick={handleNext}
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>

          </CardContent>
        </Card>
      </Form>
    </div>
  )
}
