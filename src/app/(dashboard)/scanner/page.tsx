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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [selectedArea, setSelectedArea] = React.useState('')
  const [selectedSupervisor, setSelectedSupervisor] = React.useState('')
  const [vehiclePlates, setVehiclePlates] = React.useState('')
  const [confirmedPersonnel, setConfirmedPersonnel] = React.useState<number>(1)
  const [platesVerified, setPlatesVerified] = React.useState(false)
  const [safetyShoes, setSafetyShoes] = React.useState(false)
  const [safetyVest, setSafetyVest] = React.useState(false)
  const [scanHistory, setScanHistory] = React.useState<
    { companyName: string; action: 'entry' | 'exit'; time: Date }[]
  >([])

  const areasQuery = React.useMemo(() => db ? query(collection(db, 'areas'), limit(100)) : null, [db])
  const supervisorsQuery = React.useMemo(() => db ? query(collection(db, 'supervisors'), limit(100)) : null, [db])
  const { data: areas } = useCollection(areasQuery)
  const { data: supervisors } = useCollection(supervisorsQuery)

  const handleAreaChange = React.useCallback(async (areaId: string) => {
    setSelectedArea(areaId)
    if (!db || !areaId) return
    try {
      const areaSnap = await getDoc(doc(db, 'areas', areaId))
      const supervisorId = areaSnap.data()?.supervisorId
      if (supervisorId) setSelectedSupervisor(supervisorId)
    } catch { /* non-critical */ }
  }, [db])

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

      // Verificar visita activa
      const activeSnap = await getDocs(query(
        collection(db, 'visits'),
        where('companyId', '==', qrText.trim()),
        where('status', '==', 'Active')
      ))
      setActiveVisit(activeSnap.empty ? null : { id: activeSnap.docs[0].id, ...activeSnap.docs[0].data() } as import('@/types').Visit)
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
    try {
      const visitRef = await addDoc(collection(db, 'visits'), {
        companyId: currentCompany.id,
        companyName: currentCompany.name,
        areaId: selectedArea,
        areaName: area?.name || '—',
        supervisorId: selectedSupervisor,
        supervisorName: supervisor?.name || '—',
        personnelCount: confirmedPersonnel,
        vehiclePlates: vehiclePlates.trim().toUpperCase(),
        platesVerified,
        safetyEquipment: { shoes: safetyShoes, vest: safetyVest },
        status: 'Active',
        entryTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        qrCode: `VIS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      })
      toast({ title: 'Acceso autorizado', description: `${currentCompany.name} ha ingresado.` })
      logAudit({
        action: 'visit.created',
        actorUid:  appUser?.uid  ?? user?.uid ?? '',
        actorName: appUser?.name ?? appUser?.email ?? 'Guardia',
        actorRole: appUser?.role ?? 'guard',
        targetType: 'visit',
        targetId:   visitRef.id,
        targetName: currentCompany.name,
        details: { área: area?.name ?? '—', personal: confirmedPersonnel, placas: vehiclePlates.trim().toUpperCase() },
      })
      setScanHistory(h => [{ companyName: currentCompany.name, action: 'entry' as const, time: new Date() }, ...h].slice(0, 5))
      setActiveVisit({
        id: visitRef.id, status: 'Active',
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
      await updateDoc(doc(db, 'visits', activeVisit.id), { status: 'Completed', exitTime: serverTimestamp() })
      toast({ title: 'Salida registrada', description: `${currentCompany?.name} ha salido.` })
      logAudit({
        action: 'visit.completed',
        actorUid:  appUser?.uid  ?? user?.uid ?? '',
        actorName: appUser?.name ?? appUser?.email ?? 'Guardia',
        actorRole: appUser?.role ?? 'guard',
        targetType: 'visit', targetId: activeVisit.id,
        targetName: currentCompany?.name ?? '—',
        details: { área: activeVisit.areaName ?? '—' },
      })
      setScanHistory(h => [{ companyName: currentCompany?.name ?? '—', action: 'exit' as const, time: new Date() }, ...h].slice(0, 5))
      sendNotification({ type: 'exit', companyName: currentCompany?.name || '—', areaName: activeVisit.areaName || '—' })
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
    setSelectedArea('')
    setSelectedSupervisor('')
    setVehiclePlates('')
    setConfirmedPersonnel(1)
    setPlatesVerified(false)
    setSafetyShoes(false)
    setSafetyVest(false)
  }

  // ── SCANNING ──────────────────────────────────────────────────
  if (mode === 'SCANNING') {
    return (
      <div className="space-y-4">
        <QRScanner onQRDetected={handleQRDetected} isProcessing={isProcessing} />
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
          isExpired ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
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
            <div className="rounded-xl border bg-amber-50 border-amber-200 px-4 py-3 space-y-1">
              <p className="text-amber-800 font-semibold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" /> Visita activa
              </p>
              <p className="text-sm text-amber-700">
                <span className="font-bold">{activeVisit.areaName}</span>
                {activeVisit.supervisorName && <span className="opacity-70"> · {activeVisit.supervisorName}</span>}
              </p>
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

            {/* Área */}
            <Select onValueChange={handleAreaChange} value={selectedArea}>
              <SelectTrigger className="h-11">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Área destino" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {areas?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Supervisor */}
            <Select onValueChange={setSelectedSupervisor} value={selectedSupervisor}>
              <SelectTrigger className="h-11">
                <div className="flex items-center gap-2 min-w-0">
                  <UserCog className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Supervisor" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {supervisors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>

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
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-orange-200 bg-orange-50 text-orange-700'
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
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-green-400 bg-green-50'
                }`}>
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className={`text-xl font-black ${
                    confirmedPersonnel !== (Number(currentCompany?.personnelCount) || 1)
                      ? 'text-orange-700' : 'text-green-700'
                  }`}>{confirmedPersonnel}</span>
                  <span className="text-xs text-muted-foreground">personas</span>
                </div>
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl text-lg shrink-0"
                  onClick={() => setConfirmedPersonnel(p => p + 1)}>+</Button>
              </div>
              {confirmedPersonnel !== (Number(currentCompany?.personnelCount) || 1) && (
                <p className="text-xs text-orange-600 flex items-center gap-1.5 px-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Difiere del QR ({Number(currentCompany?.personnelCount) || 1} registradas)
                </p>
              )}
            </div>

            {/* Equipo de seguridad — toggles */}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSafetyShoes(v => !v)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  safetyShoes ? 'border-green-400 bg-green-50 text-green-700' : 'border-border bg-background text-muted-foreground'
                }`}>
                <HardHat className="w-5 h-5" />
                Zapatos
              </button>
              <button type="button" onClick={() => setSafetyVest(v => !v)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  safetyVest ? 'border-green-400 bg-green-50 text-green-700' : 'border-border bg-background text-muted-foreground'
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
              disabled={isExpired || !selectedArea || !selectedSupervisor || !vehiclePlates.trim() || !platesVerified || !safetyShoes || !safetyVest || isProcessing}
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
              Confirmar Entrada
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

      <Button
        variant="outline"
        className="w-full h-12 rounded-xl border-2 text-destructive border-red-100 hover:bg-red-50 gap-2 font-bold"
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
