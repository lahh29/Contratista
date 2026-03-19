'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  MapPin,
  UserCog,
  Users,
  Truck,
  FileText,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { useFirestore, useCollection } from '@/firebase'
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { sendNotification } from '@/app/actions/notify'
import { logAudit } from '@/app/actions/audit'
import { useAppUser } from '@/hooks/use-app-user'

const STEPS = [
  { label: 'Empresa', icon: Building2 },
  { label: 'Lugar', icon: MapPin },
  { label: 'Programación', icon: CalendarIcon },
  { label: 'Actividad', icon: FileText },
]

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -32 : 32, opacity: 0 }),
}
const slideTransition = {
  duration: 0.22,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
}

interface VisitWizardProps {
  visit?: any
  onClose: () => void
}

export function VisitWizard({ visit, onClose }: VisitWizardProps) {
  const { toast } = useToast()
  const db = useFirestore()
  const { appUser } = useAppUser()

  const [step, setStep] = React.useState(0)
  const [direction, setDirection] = React.useState(1)
  const [submitting, setSubmitting] = React.useState(false)

  // Form state
  const [companyId, setCompanyId] = React.useState(visit?.companyId ?? '')
  const [areaId, setAreaId] = React.useState(visit?.areaId ?? '')
  const [supervisorId, setSupervisorId] = React.useState(
    visit?.supervisorId ?? ''
  )
  const [personnelCount, setPersonnelCount] = React.useState(
    visit?.personnelCount ?? 1
  )
  const [vehicle, setVehicle] = React.useState(visit?.vehiclePlates ?? '')
  const [activity, setActivity] = React.useState(visit?.activity ?? '')
  const [visitDate, setVisitDate] = React.useState<Date | undefined>(
    visit?.scheduledDate ? parseISO(visit.scheduledDate) : new Date()
  )
  const [dateInput, setDateInput] = React.useState(
    visit?.scheduledDate
      ? format(parseISO(visit.scheduledDate), 'dd/MM/yyyy')
      : format(new Date(), 'dd/MM/yyyy')
  )
  const [dateError, setDateError] = React.useState('')

  const handleDateInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 4) {
      formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4)
    } else if (digits.length > 2) {
      formatted = digits.slice(0, 2) + '/' + digits.slice(2)
    }
    setDateInput(formatted)

    if (digits.length === 8) {
      const day = parseInt(digits.slice(0, 2), 10)
      const month = parseInt(digits.slice(2, 4), 10) - 1
      const year = parseInt(digits.slice(4, 8), 10)
      const parsed = new Date(year, month, day)
      if (!isNaN(parsed.getTime()) && parsed.getDate() === day && parsed.getMonth() === month) {
        setVisitDate(parsed)
        setDateError('')
      } else {
        setVisitDate(undefined)
        setDateError('Fecha inválida')
      }
    } else {
      setVisitDate(undefined)
      setDateError(digits.length > 0 ? '' : '')
    }
  }
  const [visitTime, setVisitTime] = React.useState(visit?.scheduledTime ?? '')
  const [timeInput, setTimeInput] = React.useState(visit?.scheduledTime ?? '')
  const [timeError, setTimeError] = React.useState('')

  const handleTimeInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    let formatted = digits
    if (digits.length > 2) {
      formatted = digits.slice(0, 2) + ':' + digits.slice(2)
    }
    setTimeInput(formatted)

    if (digits.length === 4) {
      const hours = parseInt(digits.slice(0, 2), 10)
      const minutes = parseInt(digits.slice(2, 4), 10)
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        const hh = digits.slice(0, 2).padStart(2, '0')
        const mm = digits.slice(2, 4).padStart(2, '0')
        setVisitTime(`${hh}:${mm}`)
        setTimeError('')
      } else {
        setVisitTime('')
        setTimeError('Hora inválida')
      }
    } else {
      setVisitTime('')
      setTimeError('')
    }
  }

  const companiesQuery = React.useMemo(
    () => (db ? query(collection(db, 'companies'), limit(500)) : null),
    [db]
  )
  const areasQuery = React.useMemo(
    () => (db ? query(collection(db, 'areas'), limit(100)) : null),
    [db]
  )
  const supervisorsQuery = React.useMemo(
    () => (db ? query(collection(db, 'supervisors'), limit(100)) : null),
    [db]
  )

  const { data: companies } = useCollection(companiesQuery)
  const { data: areas } = useCollection(areasQuery)
  const { data: supervisors } = useCollection(supervisorsQuery)

  const selectedCompany = companies?.find((c) => c.id === companyId) ?? null
  const selectedArea = areas?.find((a) => a.id === areaId) ?? null
  const selectedSupervisor =
    supervisors?.find((s) => s.id === supervisorId) ?? null

  // When company changes, pre-fill area & supervisor from company defaults
  const handleCompanyChange = (id: string) => {
    setCompanyId(id)
    if (visit) return // Don't auto-change things when editing

    const company = companies?.find((c) => c.id === id)
    if (company?.defaultAreaId) {
      setAreaId(company.defaultAreaId)
      const area = areas?.find((a: any) => a.id === company.defaultAreaId)
      setSupervisorId(company.defaultSupervisorId || area?.supervisorId || '')
    }
  }

  // Auto-fill supervisor when area changes
  const handleAreaChange = (id: string) => {
    setAreaId(id)
    const area = areas?.find((a) => a.id === id)
    if (area?.supervisorId) {
      setSupervisorId(area.supervisorId)
    } else {
      setSupervisorId('')
    }
  }

  // Per-step validation
  const canNext = [
    !!companyId,
    !!areaId && !!supervisorId,
    !!visitDate && !dateError && !timeError && personnelCount >= 1,
    !!activity,
  ]

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const handleSubmit = async () => {
    if (
      !db ||
      !selectedCompany ||
      !selectedArea ||
      !selectedSupervisor ||
      !appUser ||
      !visitDate
    )
      return
    setSubmitting(true)

    const isScheduled = !isToday(visitDate) || !!visitTime

    const visitPayload = {
      companyId,
      companyName: selectedCompany.name,
      companyType: selectedCompany.type || 'proveedor',
      areaId,
      areaName: selectedArea.name,
      supervisorId,
      supervisorName: selectedSupervisor.name,
      personnelCount,
      vehiclePlates: vehicle.trim().toUpperCase() || null,
      activity,
      status: visit?.status ?? (isScheduled ? 'Programada' : 'Activa'),
      scheduledDate: format(visitDate, 'yyyy-MM-dd'),
      scheduledTime: visitTime || null,
      updatedAt: serverTimestamp(),
    }

    const auditPayload = (targetId: string) => ({
      actorUid: appUser.uid,
      actorName: appUser.name || appUser.email!,
      actorRole: appUser.role,
      targetType: 'visit' as const,
      targetId,
      targetName: selectedCompany.name,
      details: {
        area: selectedArea.name,
        supervisor: selectedSupervisor.name,
        scheduledDate: format(visitDate, 'yyyy-MM-dd'),
        ...(visitTime && { scheduledTime: visitTime }),
      },
    })

    try {
      if (visit) {
        await updateDoc(doc(db, 'visits', visit.id), visitPayload)
        logAudit({ ...auditPayload(visit.id), action: 'visit.updated' })
        toast({
          title: 'Visita Actualizada',
          description: `La visita de ${selectedCompany.name} ha sido actualizada.`,
        })
      } else {
        const finalPayload = {
          ...visitPayload,
          entryTime: isScheduled ? null : serverTimestamp(),
          createdAt: serverTimestamp(),
          qrCode: `VIS-${Math.random().toString(36).substring(7).toUpperCase()}`,
        }
        const visitRef = await addDoc(collection(db, 'visits'), finalPayload)
        logAudit({
          ...auditPayload(visitRef.id),
          action: isScheduled ? 'visit.scheduled' : 'visit.created',
        })

        if (isScheduled) {
          toast({
            title: 'Visita Programada',
            description: `${selectedCompany.name} agendada para ${format(
              visitDate,
              'PPP',
              { locale: es }
            )}. `,
          })
        } else {
          sendNotification({
            type: 'entry',
            companyName: selectedCompany.name,
            areaName: selectedArea.name,
            personnelCount,
          })
          toast({
            title: 'Visita Activada',
            description: `${selectedCompany.name} ha ingresado a ${selectedArea.name}.`,
          })
        }
      }
      onClose()
    } catch (e) {
      console.error(e)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la visita.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Step content
  const stepContent = [
    // Step 0: Empresa
    <div key="s0" className="space-y-4">
      <Select value={companyId} onValueChange={handleCompanyChange}>
        <SelectTrigger className="h-12 rounded-xl border-border bg-background focus:ring-0 focus:ring-offset-0">
          <SelectValue placeholder="Selecciona empresa registrada" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {companies?.map((c) => (
            <SelectItem key={c.id} value={c.id} className="py-2.5">
              <div className="flex items-center justify-between w-full gap-4 pr-1">
                <span className="font-semibold text-sm">{c.name}</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] rounded-md shrink-0 capitalize ${
                    c.type === 'cliente'
                      ? 'border-blue-300 text-blue-700 bg-blue-50'
                      : 'border-orange-300 text-orange-700 bg-orange-50'
                  }`}
                >
                  {c.type || 'proveedor'}
                </Badge>
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
            <Badge
              className={`text-xs rounded-md ${
                selectedCompany.sua?.status === 'Valid'
                  ? 'bg-green-100 text-green-700 hover:bg-green-100'
                  : 'bg-red-100 text-red-600 hover:bg-red-100'
              }`}
            >
              {selectedCompany.sua?.status === 'Valid'
                ? 'SUA Válido'
                : 'SUA Vencido'}
            </Badge>
          </div>
          {selectedCompany.sua?.validUntil && (
            <p className="text-xs text-muted-foreground">
              Vigente hasta:{' '}
              <span className="font-medium">
                {selectedCompany.sua.validUntil}
              </span>
            </p>
          )}
          {selectedCompany.contact && (
            <p className="text-xs text-muted-foreground">
              Contacto:{' '}
              <span className="font-medium">{selectedCompany.contact}</span>
            </p>
          )}
        </motion.div>
      )}
    </div>,

    // Step 1: Lugar & Encargado
    <div key="s1" className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> Área Destino
        </label>
        <Select value={areaId} onValueChange={handleAreaChange}>
          <SelectTrigger className="h-12 rounded-xl border-border bg-background focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Selecciona área" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {areas?.map((a) => {
              const linked = supervisors?.find((s) => s.id === a.supervisorId)
              return (
                <SelectItem key={a.id} value={a.id}>
                  <div className="flex items-center gap-2">
                    <span>{a.name}</span>
                    {linked && (
                      <span className="text-[10px] text-muted-foreground">
                        · {linked.name}
                      </span>
                    )}
                  </div>
                </SelectItem>
              )
            })}
            {!areas?.length && (
              <p className="text-sm text-muted-foreground text-center py-3">
                Sin áreas. Agrega en Configuración.
              </p>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <UserCog className="w-3.5 h-3.5" /> Encargado
        </label>
        <div className="h-12 rounded-xl border bg-muted/40 px-3 flex items-center gap-2">
          {selectedSupervisor ? (
            <>
              <span className="text-sm font-medium flex-1">
                {selectedSupervisor.name}
              </span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                Auto
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground/60">
              {areaId
                ? 'Sin encargado asignado en esta área'
                : 'Selecciona un área primero'}
            </span>
          )}
        </div>
      </div>
    </div>,

    // Step 2: Programación
    <div key="s2" className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5" /> Fecha
          </label>
          <div className="relative">
            <Input
              value={dateInput}
              onChange={(e) => handleDateInput(e.target.value)}
              placeholder="DD/MM/AAAA"
              className={`h-12 rounded-xl pl-10 font-mono tracking-widest focus-visible:ring-0 focus-visible:ring-offset-0 ${dateError ? 'border-destructive' : ''}`}
              maxLength={10}
              inputMode="numeric"
            />
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          {dateError && (
            <p className="text-xs text-destructive mt-1">{dateError}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Hora{' '}
            <span className="normal-case font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <Input
              value={timeInput}
              onChange={(e) => handleTimeInput(e.target.value)}
              placeholder="HH:MM"
              className={`h-12 rounded-xl pl-10 font-mono tracking-widest focus-visible:ring-0 focus-visible:ring-offset-0 ${timeError ? 'border-destructive' : ''}`}
              maxLength={5}
              inputMode="numeric"
            />
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          {timeError && (
            <p className="text-xs text-destructive mt-1">{timeError}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Personas que ingresan
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl text-lg shrink-0"
            onClick={() => setPersonnelCount((p) => Math.max(1, p - 1))}
          >
            −
          </Button>
          <div className="flex-1 h-12 rounded-xl border flex items-center justify-center text-xl font-black bg-muted/30">
            {personnelCount}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl text-lg shrink-0"
            onClick={() => setPersonnelCount((p) => p + 1)}
          >
            +
          </Button>
        </div>
      </div>
    </div>,

    // Step 3: Actividad
    <div key="s3" className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5" /> Placa del Vehículo{' '}
          <span className="normal-case font-normal">(opcional)</span>
        </label>
        <Input
          placeholder="Ej. ABC-123-D"
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value.toUpperCase())}
          className="h-12 rounded-xl font-mono tracking-widest uppercase focus-visible:ring-0 focus-visible:ring-offset-0"
          maxLength={10}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Actividad
        </label>
        <Textarea
          placeholder="Describe el trabajo a realizar..."
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          className="rounded-xl resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
          rows={4}
        />
      </div>
    </div>,
  ]

  const buttonLabel =
    visit
      ? 'Guardar Cambios'
      : !isToday(visitDate ?? new Date()) || !!visitTime
      ? 'Programar Visita'
      : 'Activar Acceso'

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const done = i < step
            const current = i === step
            return (
              <React.Fragment key={s.label}>
                <div className="flex items-center gap-1.5">
                  <motion.div
                    animate={{ scale: current ? 1.1 : 1 }}
                    transition={{ duration: 0.2 }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      done || current ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <span
                        className={`text-xs font-bold ${
                          current ? 'text-white' : 'text-muted-foreground'
                        }`}
                      >
                        {i + 1}
                      </span>
                    )}
                  </motion.div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      current ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 transition-colors duration-300 ${
                      i < step ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Animated step content */}
      <div className="overflow-hidden">
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

      {/* Navigation */}
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
            onClick={onClose}
          >
            Cancelar
          </Button>
        )}

        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            className="flex-1 h-11 rounded-xl gap-1 font-semibold"
            onClick={() => go(step + 1)}
            disabled={!canNext[step]}
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1 h-11 rounded-xl font-bold gap-2"
            onClick={handleSubmit}
            disabled={!canNext[step] || submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {buttonLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
