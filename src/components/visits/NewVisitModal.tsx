"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog, DialogContent, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer, DrawerContent, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input }    from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button }   from "@/components/ui/button"
import { Badge }    from "@/components/ui/badge"
import {
  Building2, MapPin, UserCog, Users, Truck, FileText,
  ChevronRight, ChevronLeft, Loader2, CheckCircle2,
} from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, limit } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { sendNotification } from "@/app/actions/notify"

// ── Responsive hook ────────────────────────────────────────────
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

// ── Step config ────────────────────────────────────────────────
const STEPS = [
  { label: "Empresa",  icon: Building2 },
  { label: "Lugar",    icon: MapPin    },
  { label: "Detalles", icon: FileText  },
]

// ── Slide variants ─────────────────────────────────────────────
const slideVariants = {
  enter:  (d: number) => ({ x: d > 0 ?  32 : -32, opacity: 0 }),
  center:              ({  x: 0,          opacity: 1 }),
  exit:   (d: number) => ({ x: d > 0 ? -32 :  32, opacity: 0 }),
}
const slideTransition = { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] as const }

// ── Wizard ─────────────────────────────────────────────────────
interface WizardProps {
  onClose: () => void
  companies:   any[] | null
  areas:       any[] | null
  supervisors: any[] | null
}

function VisitWizard({ onClose, companies, areas, supervisors }: WizardProps) {
  const { toast } = useToast()
  const db = useFirestore()

  const [step,      setStep]      = React.useState(0)
  const [direction, setDirection] = React.useState(1)
  const [submitting, setSubmitting] = React.useState(false)

  // Form state
  const [companyId,      setCompanyId]      = React.useState("")
  const [areaId,         setAreaId]         = React.useState("")
  const [supervisorId,   setSupervisorId]   = React.useState("")
  const [personnelCount, setPersonnelCount] = React.useState(1)
  const [vehicle,        setVehicle]        = React.useState("")
  const [activity,       setActivity]       = React.useState("")

  const selectedCompany    = companies?.find(c => c.id === companyId)   ?? null
  const selectedArea       = areas?.find(a => a.id === areaId)          ?? null
  const selectedSupervisor = supervisors?.find(s => s.id === supervisorId) ?? null

  // Per-step validation
  const canNext = [
    !!companyId,
    !!areaId && !!supervisorId,
    !!activity && personnelCount >= 1,
  ]

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const handleSubmit = async () => {
    if (!db || !selectedCompany || !selectedArea || !selectedSupervisor) return
    setSubmitting(true)
    try {
      await addDoc(collection(db, "visits"), {
        companyId,
        companyName:    selectedCompany.name,
        areaId,
        areaName:       selectedArea.name,
        supervisorId,
        supervisorName: selectedSupervisor.name,
        personnelCount,
        vehiclePlates:  vehicle.trim().toUpperCase() || null,
        activity,
        status:    "Active",
        entryTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        qrCode: `VIS-${Math.random().toString(36).substring(7).toUpperCase()}`,
      })
      sendNotification({
        type: "entry",
        companyName: selectedCompany.name,
        areaName:    selectedArea.name,
        personnelCount,
        ...(vehicle ? { vehiclePlates: vehicle.trim().toUpperCase() } : {}),
      })
      toast({ title: "Visita Activada", description: `${selectedCompany.name} ha ingresado a ${selectedArea.name}.` })
      onClose()
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo registrar la visita." })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Step content ──────────────────────────────────────────────
  const stepContent = [
    // Step 0 — Empresa
    <div key="s0" className="space-y-4">
      <Select value={companyId} onValueChange={setCompanyId}>
        <SelectTrigger className="h-12 rounded-xl border-border bg-background focus:ring-0 focus:ring-offset-0">
          <SelectValue placeholder="Selecciona empresa registrada" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {companies?.map(c => (
            <SelectItem key={c.id} value={c.id} className="py-2.5">
              <div className="flex items-center justify-between w-full gap-4 pr-1">
                <span className="font-semibold text-sm">{c.name}</span>
                <Badge variant="outline" className={`text-[10px] rounded-md shrink-0 ${
                  c.sua?.status === 'Valid'   ? 'border-green-300 text-green-700 bg-green-50' :
                  c.sua?.status === 'Expired' ? 'border-red-300 text-red-600 bg-red-50'       :
                                                'border-muted-foreground/30 text-muted-foreground'
                }`}>{c.sua?.status || 'Sin SUA'}</Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedCompany && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-muted/40 p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">{selectedCompany.name}</p>
            <Badge className={`text-xs rounded-md ${
              selectedCompany.sua?.status === 'Valid'
                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                : 'bg-red-100 text-red-600 hover:bg-red-100'
            }`}>
              {selectedCompany.sua?.status === 'Valid' ? 'SUA Válido' : 'SUA Vencido'}
            </Badge>
          </div>
          {selectedCompany.sua?.validUntil && (
            <p className="text-xs text-muted-foreground">Vigente hasta: <span className="font-medium">{selectedCompany.sua.validUntil}</span></p>
          )}
          {selectedCompany.contact && (
            <p className="text-xs text-muted-foreground">Contacto: <span className="font-medium">{selectedCompany.contact}</span></p>
          )}
        </motion.div>
      )}
    </div>,

    // Step 1 — Lugar & Encargado
    <div key="s1" className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> Área Destino
        </label>
        <Select value={areaId} onValueChange={setAreaId}>
          <SelectTrigger className="h-12 rounded-xl border-border bg-background focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Selecciona área" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {areas?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            {!areas?.length && <p className="text-sm text-muted-foreground text-center py-3">Sin áreas. Agrega en Configuración.</p>}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <UserCog className="w-3.5 h-3.5" /> Encargado
        </label>
        <Select value={supervisorId} onValueChange={setSupervisorId}>
          <SelectTrigger className="h-12 rounded-xl border-border bg-background focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Selecciona encargado" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {supervisors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            {!supervisors?.length && <p className="text-sm text-muted-foreground text-center py-3">Sin encargados. Agrega en Configuración.</p>}
          </SelectContent>
        </Select>
      </div>
    </div>,

    // Step 2 — Detalles
    <div key="s2" className="space-y-4">
      {/* Contador de personas */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Personas que ingresan
        </label>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-xl text-lg shrink-0"
            onClick={() => setPersonnelCount(p => Math.max(1, p - 1))}>−</Button>
          <div className="flex-1 h-12 rounded-xl border flex items-center justify-center text-xl font-black bg-muted/30">
            {personnelCount}
          </div>
          <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-xl text-lg shrink-0"
            onClick={() => setPersonnelCount(p => p + 1)}>+</Button>
        </div>
      </div>

      {/* Placa */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5" /> Placa del Vehículo <span className="normal-case font-normal">(opcional)</span>
        </label>
        <Input
          placeholder="Ej. ABC-123-D"
          value={vehicle}
          onChange={e => setVehicle(e.target.value.toUpperCase())}
          className="h-12 rounded-xl font-mono tracking-widest uppercase focus-visible:ring-0 focus-visible:ring-offset-0"
          maxLength={10}
        />
      </div>

      {/* Actividad */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Actividad
        </label>
        <Textarea
          placeholder="Describe el trabajo a realizar..."
          value={activity}
          onChange={e => setActivity(e.target.value)}
          className="rounded-xl resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
          rows={3}
        />
      </div>
    </div>,
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* ── Progress bar ──────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const done    = i < step
            const current = i === step
            return (
              <React.Fragment key={s.label}>
                <div className="flex items-center gap-1.5">
                  <motion.div
                    animate={{
                      backgroundColor: done || current ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                      scale: current ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  >
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-white" />
                      : <span className={`text-xs font-bold ${current ? 'text-white' : 'text-muted-foreground'}`}>{i + 1}</span>
                    }
                  </motion.div>
                  <span className={`text-xs font-medium hidden sm:block ${current ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <motion.div
                    className="flex-1 h-px mx-2"
                    animate={{ backgroundColor: i < step ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* ── Animated step content ─────────────────────── */}
      <div className="overflow-hidden min-h-[220px]">
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

      {/* ── Navigation ────────────────────────────────── */}
      <div className="flex gap-2 pt-1 border-t">
        {step > 0 ? (
          <Button variant="outline" className="flex-1 h-11 rounded-xl gap-1" onClick={() => go(step - 1)}>
            <ChevronLeft className="w-4 h-4" /> Atrás
          </Button>
        ) : (
          <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={onClose}>
            Cancelar
          </Button>
        )}

        {step < STEPS.length - 1 ? (
          <Button
            className="flex-1 h-11 rounded-xl gap-1 font-semibold"
            onClick={() => go(step + 1)}
            disabled={!canNext[step]}
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            className="flex-1 h-11 rounded-xl font-bold gap-2"
            onClick={handleSubmit}
            disabled={!canNext[step] || submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activar Acceso"}
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Shell ──────────────────────────────────────────────────────
export function NewVisitModal({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()
  const db = useFirestore()

  const companiesQuery   = React.useMemo(() => db ? query(collection(db, "companies"),   limit(500)) : null, [db])
  const areasQuery       = React.useMemo(() => db ? query(collection(db, "areas"),        limit(100)) : null, [db])
  const supervisorsQuery = React.useMemo(() => db ? query(collection(db, "supervisors"), limit(100)) : null, [db])

  const { data: companies }   = useCollection(companiesQuery)
  const { data: areas }       = useCollection(areasQuery)
  const { data: supervisors } = useCollection(supervisorsQuery)

  const wizardProps = { onClose: () => setOpen(false), companies, areas, supervisors }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="rounded-t-3xl">
          <div className="px-5 pb-8">
            <DrawerTitle className="text-base font-bold mb-4">Nueva Visita</DrawerTitle>
            <VisitWizard {...wizardProps} />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px] rounded-2xl border-none shadow-2xl p-6 gap-0">
        <DialogTitle className="text-base font-bold mb-4">Nueva Visita</DialogTitle>
        <VisitWizard {...wizardProps} />
      </DialogContent>
    </Dialog>
  )
}
