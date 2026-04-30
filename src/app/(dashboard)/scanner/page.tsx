"use client"

import * as React from "react"
import {
  CheckCircle2,
  UserCheck,
  MapPin,
  Loader2,
  XCircle,
  Users,
  UserCog,
  LogOut,
  Car,
  AlertTriangle,
  HardHat,
  ShieldCheck,
  Calendar as CalendarIcon,
  Clock,
  Search,
  X,
} from "lucide-react"
import { format, isToday } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser } from "@/firebase"
import { useCollection } from "@/firebase/firestore/use-collection"
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
  limit
} from "firebase/firestore"
import { QRScanner } from "@/components/contractor/QRScanner"
import { sendNotification } from '@/app/actions/notify'
import { logAudit } from '@/app/actions/audit'
import { useAppUser } from '@/hooks/use-app-user'
import { useCompanies } from '@/hooks/use-companies'

// ── LocalStorage helpers ───────────────────────────────────────────────────

const HISTORY_KEY = 'scanner_history_v1'
const ACTIVITY_KEY = 'scanner_last_activity'

type HistoryEntry = { companyName: string; action: 'entry' | 'exit'; time: Date }

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const { date, history } = JSON.parse(raw) as {
      date: string
      history: Array<Omit<HistoryEntry, 'time'> & { time: string }>
    }
    if (date !== format(new Date(), 'yyyy-MM-dd')) return []
    return history.map(h => ({ ...h, time: new Date(h.time) }))
  } catch {
    return []
  }
}

function saveHistory(history: HistoryEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(HISTORY_KEY, JSON.stringify({
    date: format(new Date(), 'yyyy-MM-dd'),
    history: history.map(h => ({ ...h, time: h.time.toISOString() })),
  }))
}

// ──────────────────────────────────────────────────────────────────────────

type ScannerMode = 'SCANNING' | 'VERIFYING' | 'ON_SITE'

export default function ScannerPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const { appUser } = useAppUser()
  const [mode, setMode] = React.useState<ScannerMode>('SCANNING')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [currentCompany, setCurrentCompany] = React.useState<import('@/types').Company | null>(null)
  const [activeVisit, setActiveVisit] = React.useState<import('@/types').Visit | null>(null)
  const [programadaVisit, setProgramadaVisit] = React.useState<import('@/types').Visit | null>(null)
  const [selectedArea, setSelectedArea] = React.useState('')
  const [selectedSupervisor, setSelectedSupervisor] = React.useState('')
  const [vehiclePlates, setVehiclePlates] = React.useState('')
  const [confirmedPersonnel, setConfirmedPersonnel] = React.useState<number>(1)
  const [platesVerified, setPlatesVerified] = React.useState(false)
  const [safetyShoes, setSafetyShoes] = React.useState(false)
  const [safetyVest, setSafetyVest] = React.useState(false)

  const todayStr = format(new Date(), 'dd/MM/yyyy')
  const [dateInput, setDateInput] = React.useState(todayStr)
  const [scheduledDate, setScheduledDate] = React.useState<Date>(new Date())
  const [dateError, setDateError] = React.useState('')
  const [timeInput, setTimeInput] = React.useState('')
  const [scheduledTime, setScheduledTime] = React.useState('')
  const [timeError, setTimeError] = React.useState('')

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
      const day   = parseInt(digits.slice(0, 2), 10)
      const month = parseInt(digits.slice(2, 4), 10) - 1
      const year  = parseInt(digits.slice(4, 8), 10)
      const parsed = new Date(year, month, day)
      if (!isNaN(parsed.getTime()) && parsed.getDate() === day && parsed.getMonth() === month) {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        if (parsed < today) {
          setDateError('La fecha no puede ser en el pasado')
        } else {
          setScheduledDate(parsed)
          setDateError('')
        }
      } else {
        setDateError('Fecha inválida')
      }
    } else {
      setDateError('')
    }
  }

  const handleTimeInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    let formatted = digits
    if (digits.length > 2) formatted = digits.slice(0, 2) + ':' + digits.slice(2)
    setTimeInput(formatted)
    if (digits.length === 4) {
      const hours = parseInt(digits.slice(0, 2), 10)
      const minutes = parseInt(digits.slice(2, 4), 10)
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        setScheduledTime(`${digits.slice(0, 2)}:${digits.slice(2, 4)}`)
        setTimeError('')
      } else {
        setScheduledTime('')
        setTimeError('Hora inválida')
      }
    } else {
      setScheduledTime('')
      setTimeError('')
    }
  }
  const [scanHistory, setScanHistory] = React.useState<HistoryEntry[]>(loadHistory)
  const { companies: cachedCompanies, loading: loadingCompanies } = useCompanies()
  const allCompanies = (cachedCompanies ?? []) as import('@/types').Company[]
  const [showManualSearch, setShowManualSearch] = React.useState(false)
  const [manualQuery, setManualQuery] = React.useState('')
  const [exitMotivo, setExitMotivo] = React.useState<string | null>(null)
  const [lastActivityTime, setLastActivityTime] = React.useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(ACTIVITY_KEY)
    return raw ? parseInt(raw, 10) : null
  })

  const [areas, setAreas] = React.useState<any[] | null>(null)
  const [supervisors, setSupervisors] = React.useState<any[] | null>(null)

  React.useEffect(() => {
    if (!db) return
    getDocs(query(collection(db, 'areas'), limit(100)))
      .then(snap => setAreas(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setAreas([]))
    getDocs(query(collection(db, 'supervisors'), limit(100)))
      .then(snap => setSupervisors(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setSupervisors([]))
  }, [db])

  React.useEffect(() => { saveHistory(scanHistory) }, [scanHistory])
  React.useEffect(() => {
    if (lastActivityTime !== null) localStorage.setItem(ACTIVITY_KEY, String(lastActivityTime))
  }, [lastActivityTime])

  const activeVisitsQuery = React.useMemo(() =>
    db ? query(collection(db, 'visits'), where('status', '==', 'Activa')) : null, [db])
  const { data: activeVisits } = useCollection(activeVisitsQuery)

  const areaOccupancy = React.useMemo(() => {
    if (!activeVisits) return {} as Record<string, number>
    return activeVisits.reduce((acc, v) => {
      const areaName = (v as any).areaName || 'Sin área'
      acc[areaName] = (acc[areaName] || 0) + (Number((v as any).personnelCount) || 1)
      return acc
    }, {} as Record<string, number>)
  }, [activeVisits])

  const manualResults = React.useMemo(() => {
    if (!manualQuery.trim()) return []
    const q = manualQuery.toLowerCase()
    return allCompanies.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8)
  }, [allCompanies, manualQuery])

  const hoursIdle = lastActivityTime !== null ? (Date.now() - lastActivityTime) / 3_600_000 : null

  const handleAreaChange = React.useCallback(async (areaId: string) => {
    setSelectedArea(areaId)
    if (!db || !areaId) return
    try {
      const areaSnap = await getDoc(doc(db, 'areas', areaId))
      const supervisorId = areaSnap.data()?.supervisorId
      if (supervisorId) setSelectedSupervisor(supervisorId)
    } catch { /* non-critical */ }
  }, [db])

  const openManualSearch = () => {
    setShowManualSearch(true)
  }

  const handleQRDetected = async (qrText: string) => {
    if (!db) return
    setIsProcessing(true)
    try {
      const companyRef = doc(db, 'companies', qrText.trim())
      const companySnap = await getDoc(companyRef)

      if (!companySnap.exists()) {
        toast({ variant: 'destructive', title: 'QR no reconocido', description: 'No se encontró ninguna empresa con este código.' })
        setIsProcessing(false)
        return
      }

      const company = { id: companySnap.id, ...companySnap.data() } as import('@/types').Company

      if (company.status === 'Blocked') {
        toast({ variant: 'destructive', title: 'Acceso bloqueado', description: `${company.name} no tiene autorización para ingresar a planta.` })
        return
      }

      setCurrentCompany(company)
      setConfirmedPersonnel(Number(company.personnelCount) || 1)

      // Auto-llenar placas si están registradas
      if (company.vehicle) {
        setVehiclePlates(company.vehicle)
      }

      // Auto-llenar área y supervisor desde defaults
      const areaId = (company as any).defaultAreaId
      if (areaId) {
        setSelectedArea(areaId)
        try {
          const areaSnap = await getDoc(doc(db, 'areas', areaId))
          const supervisorId = areaSnap.data()?.supervisorId ?? (company as any).defaultSupervisorId
          if (supervisorId) setSelectedSupervisor(supervisorId)
        } catch { /* non-critical */ }
      } else if ((company as any).defaultSupervisorId) {
        setSelectedSupervisor((company as any).defaultSupervisorId)
      }

      // Verificar visita activa (Activa) o programada (Programada)
      const [activaSnap, programadaSnap] = await Promise.all([
        getDocs(query(collection(db, 'visits'), where('companyId', '==', qrText.trim()), where('status', '==', 'Activa'), limit(1))),
        getDocs(query(collection(db, 'visits'), where('companyId', '==', qrText.trim()), where('status', '==', 'Programada'), limit(1))),
      ])

      if (!activaSnap.empty) {
        setActiveVisit({ id: activaSnap.docs[0].id, ...activaSnap.docs[0].data() } as import('@/types').Visit)
        setProgramadaVisit(null)
      } else if (!programadaSnap.empty) {
        // Hay visita programada — pre-llenar sus datos
        const pv = { id: programadaSnap.docs[0].id, ...programadaSnap.docs[0].data() } as import('@/types').Visit
        setProgramadaVisit(pv)
        setActiveVisit(null)
        if (pv.areaId) { setSelectedArea(pv.areaId) }
        if (pv.supervisorId) { setSelectedSupervisor(pv.supervisorId) }
        if (pv.vehiclePlates) { setVehiclePlates(pv.vehiclePlates) }
        if (pv.personnelCount) { setConfirmedPersonnel(Number(pv.personnelCount)) }
      } else {
        setActiveVisit(null)
        setProgramadaVisit(null)
      }
      setMode('VERIFYING')
    } catch {
      toast({ variant: 'destructive', title: 'Error al buscar empresa' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmEntry = async () => {
    if (!db || !currentCompany || !selectedArea || !selectedSupervisor || !vehiclePlates.trim()) return
    setIsProcessing(true)
    const area = areas?.find(a => a.id === selectedArea)
    const supervisor = supervisors?.find(s => s.id === selectedSupervisor)
    const isScheduled = !isToday(scheduledDate) || !!scheduledTime
    const entryPayload = {
      companyId: currentCompany.id,
      companyName: currentCompany.name,
      companyType: (currentCompany as any).type || 'proveedor',
      areaId: selectedArea,
      areaName: area?.name || '—',
      supervisorId: selectedSupervisor,
      supervisorName: supervisor?.name || '—',
      personnelCount: confirmedPersonnel,
      vehiclePlates: vehiclePlates.trim().toUpperCase(),
      platesVerified,
      safetyEquipment: { shoes: safetyShoes, vest: safetyVest },
      status: isScheduled ? 'Programada' : 'Activa',
      scheduledDate: format(scheduledDate, 'yyyy-MM-dd'),
      scheduledTime: scheduledTime || null,
      updatedAt: serverTimestamp(),
    }
    try {
      let visitId: string
      if (programadaVisit) {
        // Activar visita programada existente
        await updateDoc(doc(db, 'visits', programadaVisit.id), {
          ...entryPayload,
          entryTime: isScheduled ? null : serverTimestamp(),
        })
        visitId = programadaVisit.id
      } else {
        const visitRef = await addDoc(collection(db, 'visits'), {
          ...entryPayload,
          entryTime: isScheduled ? null : serverTimestamp(),
          createdAt: serverTimestamp(),
          qrCode: `VIS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        })
        visitId = visitRef.id
      }
      toast({ title: isScheduled ? 'Visita Programada' : 'Acceso autorizado', description: `${currentCompany.name} ${isScheduled ? 'agendada.' : 'ha ingresado.'}` })
      logAudit({
        action: isScheduled ? 'visit.scheduled' : 'visit.created',
        actorUid:  appUser?.uid  ?? user?.uid ?? '',
        actorName: appUser?.name ?? appUser?.email ?? 'Guardia',
        actorRole: appUser?.role ?? 'guard',
        targetType: 'visit',
        targetId: visitId,
        targetName: currentCompany.name,
        details: { área: area?.name ?? '—', personal: confirmedPersonnel, placas: vehiclePlates.trim().toUpperCase() },
      })
      setScanHistory(h => [{ companyName: currentCompany.name, action: 'entry' as const, time: new Date() }, ...h].slice(0, 20))
      setLastActivityTime(Date.now())
      setActiveVisit({
        id: visitId, status: isScheduled ? 'Programada' : 'Activa',
        areaName: area?.name, supervisorName: supervisor?.name,
        personnelCount: confirmedPersonnel, vehiclePlates: vehiclePlates.trim().toUpperCase(),
      })
      setMode('ON_SITE')
      sendNotification({ type: 'entry', companyName: currentCompany.name, areaName: area?.name || '—', personnelCount: confirmedPersonnel, vehiclePlates: vehiclePlates.trim().toUpperCase() })
      const authorized = Number(currentCompany.personnelCount) || 0
      if (authorized > 0 && confirmedPersonnel > authorized)
        sendNotification({ type: 'over_capacity', companyName: currentCompany.name, areaName: area?.name || '—', authorized, actual: confirmedPersonnel })
      if ((area as any)?.restricted)
        sendNotification({ type: 'restricted_area', companyName: currentCompany.name, areaName: area?.name || '—' })
    } catch {
      toast({ variant: 'destructive', title: 'Error al registrar entrada' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRegisterExit = async () => {
    if (!db || !activeVisit) return
    setIsProcessing(true)
    try {
      await updateDoc(doc(db, 'visits', activeVisit.id), {
        status: 'Completed',
        exitTime: serverTimestamp(),
        ...(exitMotivo ? { exitMotivo } : {}),
      })
      toast({ title: 'Salida registrada', description: `${currentCompany?.name} ha salido.` })
      logAudit({
        action: 'visit.completed',
        actorUid:  appUser?.uid  ?? user?.uid ?? '',
        actorName: appUser?.name ?? appUser?.email ?? 'Guardia',
        actorRole: appUser?.role ?? 'guard',
        targetType: 'visit', targetId: activeVisit.id,
        targetName: currentCompany?.name ?? '—',
        details: { área: activeVisit.areaName ?? '—', ...(exitMotivo ? { motivo: exitMotivo } : {}) },
      })
      setScanHistory(h => [{ companyName: currentCompany?.name ?? '—', action: 'exit' as const, time: new Date() }, ...h].slice(0, 20))
      setLastActivityTime(Date.now())
      sendNotification({ type: 'exit', companyName: currentCompany?.name || '—', areaName: activeVisit.areaName || '—', personnelCount: activeVisit.personnelCount })
      resetScanner()
    } catch {
      toast({ variant: 'destructive', title: 'Error al registrar salida' })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetScanner = () => {
    setMode('SCANNING')
    setCurrentCompany(null)
    setActiveVisit(null)
    setProgramadaVisit(null)
    setSelectedArea('')
    setSelectedSupervisor('')
    setVehiclePlates('')
    setConfirmedPersonnel(1)
    setPlatesVerified(false)
    setSafetyShoes(false)
    setSafetyVest(false)
    const today = format(new Date(), 'dd/MM/yyyy')
    setDateInput(today)
    setScheduledDate(new Date())
    setDateError('')
    setTimeInput('')
    setScheduledTime('')
    setTimeError('')
    setExitMotivo(null)
  }

  // ── SCANNING ──────────────────────────────────────────────────
  if (mode === 'SCANNING') {
    const ocupacionEntries = Object.entries(areaOccupancy)
    return (
      <div className="space-y-4">

        {/* Indicador de turno inactivo */}
        {hoursIdle !== null && hoursIdle >= 4 && (
          <div className="max-w-sm mx-auto flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Turno inactivo · {Math.floor(hoursIdle)}h sin registros</span>
          </div>
        )}

        <QRScanner onQRDetected={handleQRDetected} isProcessing={isProcessing} />

        {/* Entrada manual por nombre */}
        <div className="max-w-sm mx-auto">
          {!showManualSearch ? (
            <button
              onClick={openManualSearch}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Buscar empresa por nombre
            </button>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  autoFocus
                  placeholder="Nombre de la empresa…"
                  value={manualQuery}
                  onChange={e => setManualQuery(e.target.value)}
                  className="pl-9 pr-9 h-10 rounded-xl"
                />
                <button
                  onClick={() => { setShowManualSearch(false); setManualQuery('') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {loadingCompanies && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {manualResults.length > 0 && (
                <div className="rounded-xl border bg-card overflow-hidden divide-y">
                  {manualResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setShowManualSearch(false); setManualQuery(''); handleQRDetected(c.id) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {c.name[0]}
                      </div>
                      <span className="flex-1 text-sm font-medium truncate">{c.name}</span>
                      {(c as any).status === 'Blocked' && (
                        <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded shrink-0">Bloqueada</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {!loadingCompanies && manualQuery.trim() && manualResults.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-3">Sin resultados para &quot;{manualQuery}&quot;</p>
              )}
            </div>
          )}
        </div>

        {/* Aforo por área en tiempo real */}
        {ocupacionEntries.length > 0 && (
          <div className="max-w-sm mx-auto space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Aforo actual</p>
            <div className="flex flex-wrap gap-2">
              {ocupacionEntries.map(([area, count]) => (
                <div key={area} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card border text-xs font-semibold">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="truncate max-w-[120px]">{area}</span>
                  <span className="text-primary font-black">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial reciente */}
        {scanHistory.length > 0 && (
          <div className="max-w-sm mx-auto space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Últimos escaneos</p>
            <div className="divide-y rounded-xl border bg-card overflow-hidden">
              {scanHistory.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${entry.action === 'entry' ? 'bg-green-500' : 'bg-orange-400'}`} />
                  <span className="text-sm font-medium flex-1 truncate">{entry.companyName}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{entry.action === 'entry' ? 'Ingreso' : 'Salida'}</span>
                  <span className="text-[11px] text-muted-foreground/60 shrink-0">
                    {entry.time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── VERIFYING ─────────────────────────────────────────────────
  if (mode === 'VERIFYING') {
    const sua = currentCompany?.sua
    const isExpired = sua?.validUntil
      ? sua.validUntil < new Date().toISOString().slice(0, 10)
      : sua?.status !== 'Valid'

    return (
      <div className="max-w-sm mx-auto space-y-4 pb-6 animate-in slide-in-from-bottom-6 duration-400">

        {/* SUA status */}
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold ${
          isExpired
            ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400'
            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
        }`}>
          {isExpired
            ? <XCircle className="w-4 h-4 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{isExpired ? 'SUA Vencido' : 'SUA Vigente'}</span>
          {sua?.validUntil && (
            <span className="ml-auto text-xs font-normal opacity-60">hasta {sua.validUntil}</span>
          )}
        </div>

        {/* Company identity */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shrink-0">
            {currentCompany?.name?.[0]}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-base leading-tight truncate">{currentCompany?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{currentCompany?.contact || '—'}</p>
          </div>
        </div>

        {activeVisit ? (
          /* ── Salida ── */
          <div className="space-y-3">
            <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 px-4 py-3 space-y-1">
              <p className="text-amber-800 dark:text-amber-300 font-semibold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" /> Visita activa
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <span className="font-bold">{activeVisit.areaName}</span>
                {activeVisit.supervisorName && <span className="opacity-70"> · {activeVisit.supervisorName}</span>}
              </p>
            </div>
            {/* Motivo de salida */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">Motivo de salida</p>
              <div className="grid grid-cols-2 gap-2">
                {(['Trabajo terminado', 'Regresa mañana', 'Descanso', 'Otro'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setExitMotivo(prev => prev === m ? null : m)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-left ${
                      exitMotivo === m
                        ? 'border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                        : 'border-border bg-background text-muted-foreground hover:border-foreground/30'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full h-12 font-bold rounded-xl gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleRegisterExit}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Registrar Salida
            </Button>
          </div>
        ) : (
          /* ── Nueva entrada ── */
          <div className="space-y-3">

            {/* Área — solo lectura */}
            <div className="h-11 rounded-md border border-input bg-muted/40 px-3 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">
                {selectedArea ? (areas?.find(a => a.id === selectedArea)?.name ?? '—') : <span className="text-muted-foreground">Sin área asignada</span>}
              </span>
            </div>

            {/* Supervisor — solo lectura */}
            <div className="h-11 rounded-md border border-input bg-muted/40 px-3 flex items-center gap-2">
              <UserCog className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">
                {selectedSupervisor ? (supervisors?.find(s => s.id === selectedSupervisor)?.name ?? '—') : <span className="text-muted-foreground">Sin supervisor asignado</span>}
              </span>
            </div>

            {/* Fecha y Hora */}
            {programadaVisit && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-3 py-2.5 flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  Visita programada: {programadaVisit.scheduledDate}
                  {programadaVisit.scheduledTime && ` · ${programadaVisit.scheduledTime}`}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" /> Fecha
                </label>
                {appUser?.role === 'guard' ? (
                  <div className="h-11 pl-8 relative rounded-md border bg-muted/40 flex items-center font-mono text-sm tracking-widest">
                    <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    {dateInput}
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      value={dateInput}
                      onChange={e => handleDateInput(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      className={`h-11 pl-8 font-mono text-sm tracking-widest focus-visible:ring-0 ${dateError ? 'border-destructive' : ''}`}
                      maxLength={10}
                      inputMode="numeric"
                    />
                    <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                )}
                {dateError && <p className="text-[10px] text-destructive">{dateError}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Hora <span className="normal-case font-normal">(opc.)</span>
                </label>
                {appUser?.role === 'guard' ? (
                  <div className="h-11 pl-8 relative rounded-md border bg-muted/40 flex items-center font-mono text-sm tracking-widest">
                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    {timeInput || <span className="text-muted-foreground/50 text-xs">—</span>}
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      value={timeInput}
                      onChange={e => handleTimeInput(e.target.value)}
                      placeholder="HH:MM"
                      className={`h-11 pl-8 font-mono text-sm tracking-widest focus-visible:ring-0 ${timeError ? 'border-destructive' : ''}`}
                      maxLength={5}
                      inputMode="numeric"
                    />
                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                )}
                {timeError && <p className="text-[10px] text-destructive">{timeError}</p>}
              </div>
            </div>

            {/* Placas */}
            <div className="space-y-2">
              <div className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Placas del vehículo"
                  value={vehiclePlates}
                  onChange={e => { setVehiclePlates(e.target.value.toUpperCase()); setPlatesVerified(false) }}
                  className="h-11 pl-9 font-mono tracking-widest uppercase"
                  maxLength={10}
                />
              </div>
              {vehiclePlates.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setPlatesVerified(v => !v)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    platesVerified
                      ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                      : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
                  }`}
                >
                  {platesVerified
                    ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                    : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  {platesVerified ? 'Placas verificadas' : 'Toca para verificar placas'}
                </button>
              )}
            </div>

            {/* Personal */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl text-lg shrink-0"
                  onClick={() => setConfirmedPersonnel(p => Math.max(1, p - 1))}>−</Button>
                <div className={`flex-1 h-11 rounded-xl border flex items-center justify-center gap-2 ${
                  confirmedPersonnel !== (Number(currentCompany?.personnelCount) || 1)
                    ? 'border-orange-400 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30'
                    : 'border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-950/30'
                }`}>
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className={`text-xl font-black ${
                    confirmedPersonnel !== (Number(currentCompany?.personnelCount) || 1)
                      ? 'text-orange-700 dark:text-orange-400' : 'text-green-700 dark:text-green-400'
                  }`}>{confirmedPersonnel}</span>
                  <span className="text-xs text-muted-foreground">personas</span>
                </div>
              </div>
              {confirmedPersonnel !== (Number(currentCompany?.personnelCount) || 1) && (
                <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5 px-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Difiere del QR ({Number(currentCompany?.personnelCount) || 1} registradas)
                </p>
              )}
            </div>

            {/* Equipo de seguridad — toggles */}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSafetyShoes(v => !v)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  safetyShoes ? 'border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400' : 'border-border bg-background text-muted-foreground'
                }`}>
                <HardHat className="w-5 h-5" />
                Zapatos
              </button>
              <button type="button" onClick={() => setSafetyVest(v => !v)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  safetyVest ? 'border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400' : 'border-border bg-background text-muted-foreground'
                }`}>
                <ShieldCheck className="w-5 h-5" />
                Chaleco
              </button>
            </div>

            {isExpired && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5">
                <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive font-medium">SUA vencido — no se puede autorizar el ingreso.</p>
              </div>
            )}

            <Button
              className="w-full h-14 text-base font-black rounded-2xl gap-2 shadow-lg shadow-primary/20"
              onClick={handleConfirmEntry}
              disabled={isExpired || !selectedArea || !selectedSupervisor || !vehiclePlates.trim() || !platesVerified || !safetyShoes || !safetyVest || !!dateError || !!timeError || isProcessing}
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
              {!isToday(scheduledDate) || !!scheduledTime ? 'Programar Visita' : 'Confirmar Entrada'}
            </Button>
          </div>
        )}

        <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={resetScanner}>
          Cancelar
        </Button>
      </div>
    )
  }

  // ── ON SITE ───────────────────────────────────────────────────
  return (
    <div className="max-w-sm mx-auto space-y-4 pb-6 animate-in zoom-in-95 duration-400">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-2xl font-black ring-4 ring-emerald-50">
          {currentCompany?.name?.[0]}
        </div>
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Acceso Autorizado</p>
        <h2 className="text-lg font-black leading-tight">{currentCompany?.name}</h2>
      </div>

      {/* Details grid */}
      <div className="rounded-xl border bg-card divide-y overflow-hidden">
        <div className="grid grid-cols-2 divide-x">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Área</p>
              <p className="text-sm font-bold truncate">{activeVisit?.areaName || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-3">
            <UserCog className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Supervisor</p>
              <p className="text-sm font-bold truncate">{activeVisit?.supervisorName || '—'}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Personal</p>
              <p className="text-sm font-bold">{activeVisit?.personnelCount ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-3">
            <Car className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Placas</p>
              <p className="text-sm font-bold font-mono truncate">{activeVisit?.vehiclePlates || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Motivo de salida */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">Motivo de salida</p>
        <div className="grid grid-cols-2 gap-2">
          {(['Trabajo terminado', 'Regresa mañana', 'Descanso', 'Otro'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setExitMotivo(prev => prev === m ? null : m)}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-left ${
                exitMotivo === m
                  ? 'border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/30'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full h-12 rounded-xl border-2 text-destructive border-red-100 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 gap-2 font-bold"
        onClick={handleRegisterExit}
        disabled={isProcessing}
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
        Registrar Salida
      </Button>

      <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={resetScanner}>
        Escanear otro
      </Button>
    </div>
  )
}
