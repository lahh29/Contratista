"use client"

import { useMemo, useState } from "react"
import { collection, doc, query, where, limit } from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { useDoc } from "@/firebase/firestore/use-doc"
import { useCollection } from "@/firebase/firestore/use-collection"
import { useAppUser } from "@/hooks/use-app-user"
import { useNotifications } from "@/hooks/use-notifications"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateVoucherPDF } from "@/lib/generate-voucher"
import { ContractorQRDialog } from "@/components/contractors/ContractorQRDialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Bell,
  BellOff,
  Calendar,
  Hash,
  Phone,
  User,
  Building2,
  Loader2,
  AlertTriangle,
  Clock,
  Download,
  MapPin,
  Users,
  FileText,
  QrCode,
  Ban,
  CalendarClock,
  RefreshCw,
  CheckCheck,
  FileText as FileTextIcon,
  MapPin as MapPinIcon,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import type { Company, Visit } from "@/types"
import { sendNotification } from "@/app/actions/notify"

// ── Sub-components ─────────────────────────────────────────

function SuaStatusCard({ company }: { company: Company }) {
  const validUntil = company.sua?.validUntil

  const status: 'Valid' | 'Expired' | 'Pending' = useMemo(() => {
    if (validUntil) {
      const today = new Date().toISOString().slice(0, 10)
      return validUntil < today ? 'Expired' : 'Valid'
    }
    const s = company.sua?.status
    if (s === 'Valid' || s === 'Expired') return s
    return 'Pending'
  }, [validUntil, company.sua?.status])

  const config = {
    Valid:   { bg: 'bg-green-50 dark:bg-green-950/30',   border: 'border-green-200 dark:border-green-800',  text: 'text-green-800 dark:text-green-300',   muted: 'text-green-600 dark:text-green-400',  label: 'Vigente',   icon: ShieldCheck  },
    Expired: { bg: 'bg-red-50 dark:bg-red-950/30',       border: 'border-red-200 dark:border-red-800',      text: 'text-red-800 dark:text-red-300',       muted: 'text-red-600 dark:text-red-400',      label: 'Vencido',   icon: ShieldX      },
    Pending: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800',text: 'text-orange-800 dark:text-orange-300',  muted: 'text-orange-600 dark:text-orange-400',label: 'Pendiente', icon: ShieldAlert  },
  }[status]

  const Icon = config.icon

  const daysLeft = useMemo(() => {
    if (!validUntil) return null
    const today  = new Date(); today.setHours(0, 0, 0, 0)
    const expiry = new Date(validUntil + 'T00:00:00')
    return Math.round((expiry.getTime() - today.getTime()) / 864e5)
  }, [validUntil])

  const daysLabel = daysLeft === null ? null
    : daysLeft > 0  ? `Vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`
    : daysLeft === 0 ? 'Vence hoy'
    : `Venció hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? 's' : ''}`

  return (
    <Card className={`border ${config.border} ${config.bg} shadow-none`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0">
              <Icon className={`w-10 h-10 ${config.text}`} />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${config.muted}`}>Estado SUA</p>
              <p className={`text-3xl font-black ${config.text} leading-tight`}>{config.label}</p>
              {daysLabel && (
                <div className={`flex items-center gap-1.5 mt-1 ${config.muted}`}>
                  <Clock className="w-3.5 h-3.5" />
                  <p className="text-sm font-medium">{daysLabel}</p>
                </div>
              )}
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <Badge
              variant={status === 'Valid' ? 'default' : status === 'Expired' ? 'destructive' : 'secondary'}
              className="text-sm px-4 py-1.5 rounded-xl"
            >
              {status ?? 'N/A'}
            </Badge>
            {validUntil && (
              <p className={`text-xs ${config.muted}`}>hasta {validUntil}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold mt-0.5 truncate">{value}</p>
      </div>
    </div>
  )
}

function visitDuration(entry: Date, exit: Date) {
  const ms = exit.getTime() - entry.getTime()
  const h  = Math.floor(ms / 3600000)
  const m  = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── Main page ──────────────────────────────────────────────

export default function PortalPage() {
  const { appUser, loading: authLoading } = useAppUser()
  const db           = useFirestore()
  const { permission, supported, requestPermission } = useNotifications()
  const [qrOpen, setQrOpen] = useState(false)
  const [renewalSent, setRenewalSent] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(`sua_renewal_${appUser?.companyId}`)
    if (!stored) return false
    return Date.now() - Number(stored) < 24 * 60 * 60 * 1000 // 24 h cooldown
  })
  const [sendingRenewal, setSendingRenewal] = useState(false)

  // Use companyId (string) as dep — more stable than the appUser object reference
  const companyId = appUser?.companyId
  const companyRef = useMemo(
    () => companyId && db ? doc(db, 'companies', companyId) : null,
    [companyId, db],
  )
  const { data: rawCompany, loading: companyLoading } = useDoc(companyRef)
  const company = rawCompany as Company | null

  // All visits for this company — single-field query avoids composite index requirement
  const visitsQuery = useMemo(() => {
    if (!db || !companyId) return null
    return query(
      collection(db, 'visits'),
      where('companyId', '==', companyId),
      limit(50),
    )
  }, [db, companyId])
  const { data: rawVisits, loading: visitsLoading } = useCollection(visitsQuery)

  // Sort and derive client-side (no composite index needed)
  const visits = useMemo(() => {
    if (!rawVisits) return null
    return [...rawVisits]
      .sort((a: any, b: any) => {
        const at = a.entryTime?.toMillis?.() ?? 0
        const bt = b.entryTime?.toMillis?.() ?? 0
        return bt - at
      })
      .slice(0, 20) as Visit[]
  }, [rawVisits])

  // Visitas programadas — ordenadas por fecha/hora asc
  const upcomingVisits = useMemo(() => {
    if (!rawVisits) return null
    return [...rawVisits]
      .filter((v: any) => v.status === 'Programada')
      .sort((a: any, b: any) => {
        const ad = (a.scheduledDate ?? '') + (a.scheduledTime ?? '')
        const bd = (b.scheduledDate ?? '') + (b.scheduledTime ?? '')
        return ad < bd ? -1 : ad > bd ? 1 : 0
      }) as Visit[]
  }, [rawVisits])

  const activeVisit = useMemo(
    () => (visits as Visit[] | null)?.find(v => v.status === 'Activa') ?? null,
    [visits],
  )

  async function handleRenewalRequest() {
    if (!company || renewalSent || sendingRenewal) return
    setSendingRenewal(true)
    try {
      await sendNotification({ type: 'sua_renewal_request', companyName: company.name, companyId: company.id })
      localStorage.setItem(`sua_renewal_${company.id}`, String(Date.now()))
      setRenewalSent(true)
    } finally {
      setSendingRenewal(false)
    }
  }

  if (authLoading || companyLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!appUser?.companyId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 max-w-md w-full">
          <CardContent className="p-6 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-800 dark:text-orange-300">Sin empresa asignada</p>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                Tu cuenta no está vinculada a ninguna empresa. Contacta al administrador de ViñoPlastic.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border-destructive/30 bg-destructive/5 max-w-md w-full">
          <CardContent className="p-6 flex gap-3 items-start">
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Empresa no encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                No se pudo cargar la información de tu empresa. Intenta más tarde.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Header empresa */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">{company.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 shrink-0"
            onClick={() => setQrOpen(true)}
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Mi QR</span>
          </Button>
          <Button asChild variant="outline" className="gap-2 shrink-0">
            <Link href="/portal/contrato">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Reglamento</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Banner: empresa bloqueada */}
      {company.status === 'Blocked' && (
        <Card className="border-destructive/40 bg-destructive/5 shadow-none">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
              <Ban className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-bold text-destructive text-sm">Acceso bloqueado</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Tu empresa ha sido bloqueada temporalmente y no puede registrar nuevas visitas.
                Contacta al administrador de ViñoPlastic para más información.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* En Planta — banner en tiempo real */}
      {activeVisit && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 shadow-none">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-green-800 dark:text-green-300">Actualmente dentro de planta</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                {activeVisit.areaName && (
                  <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                    <MapPin className="w-3 h-3" /> {activeVisit.areaName}
                  </span>
                )}
                {activeVisit.personnelCount && (
                  <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                    <Users className="w-3 h-3" /> {activeVisit.personnelCount} personas
                  </span>
                )}
                {activeVisit.entryTime && (
                  <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                    <Clock className="w-3 h-3" />
                    Ingresó {formatDistanceToNow(activeVisit.entryTime.toDate(), { locale: es, addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
            <Badge className="shrink-0 bg-green-600 text-white border-green-700 px-3 py-1">
              En Planta
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* SUA status */}
      <SuaStatusCard company={company} />

      {/* Solicitar renovación SUA */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${renewalSent ? 'bg-green-100 dark:bg-green-900/40' : 'bg-muted'}`}>
              {renewalSent
                ? <CheckCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                : <RefreshCw className="w-5 h-5 text-muted-foreground" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">
                {renewalSent ? 'Solicitud enviada' : 'Notificar renovación de SUA'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {renewalSent
                  ? 'El administrador ha sido notificado y actualizará tu póliza pronto.'
                  : 'Si ya renovaste tu póliza SUA, avísanos para que actualicemos el sistema.'}
              </p>
            </div>
          </div>
          {!renewalSent && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-2 self-end sm:self-auto"
              onClick={handleRenewalRequest}
              disabled={sendingRenewal}
            >
              {sendingRenewal
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />
              }
              Notificar renovación
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 2 columnas en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Datos de la empresa */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Información de la empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-0">
            <InfoRow icon={Building2}  label="Razón Social"       value={company.name} />
            <InfoRow icon={User}       label="Contacto Principal" value={company.contact} />
            <InfoRow icon={Phone}      label="Teléfono"           value={company.phone} />
            <InfoRow icon={FileTextIcon} label="RFC"              value={company.rfc} />
            <InfoRow icon={MapPinIcon} label="Dirección"          value={company.address} />
          </CardContent>
        </Card>

        {/* Datos SUA */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Datos SUA / Póliza
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-0">
            <InfoRow icon={Hash}     label="N° de Póliza / SUA" value={company.sua?.number} />
            <InfoRow icon={Calendar} label="Vencimiento SUA"    value={company.sua?.validUntil} />
          </CardContent>
        </Card>

        {/* Notificaciones */}
        {supported && (
          <Card className="border-none shadow-sm lg:col-span-2">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${permission === 'granted' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-muted'}`}>
                  {permission === 'granted'
                    ? <Bell    className="w-5 h-5 text-green-700 dark:text-green-400" />
                    : <BellOff className="w-5 h-5 text-muted-foreground" />
                  }
                </div>
                <div>
                  <p className="font-semibold">
                    {permission === 'granted' ? 'Notificaciones activas' : 'Activar notificaciones push'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {permission === 'granted'
                      ? 'Recibirás alertas de vencimiento de SUA en este dispositivo'
                      : 'Recibe alertas cuando tu SUA esté por vencer o haya vencido'}
                  </p>
                </div>
              </div>
              {permission !== 'granted' ? (
                <Button onClick={requestPermission} className="shrink-0">Activar</Button>
              ) : (
                <Badge className="shrink-0 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 px-3 py-1.5">Activo</Badge>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Visitas Programadas */}
      {upcomingVisits && upcomingVisits.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Próximas visitas
            </h2>
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full">
              {upcomingVisits.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingVisits.map(visit => (
              <Card key={visit.id} className="border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-800 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Fecha y hora */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-blue-900 dark:text-blue-100">
                          {visit.scheduledDate
                            ? new Date(visit.scheduledDate + 'T12:00:00').toLocaleDateString('es-MX', {
                                weekday: 'long', day: 'numeric', month: 'long',
                              })
                            : '—'}
                        </p>
                        {(visit as any).scheduledTime && (
                          <span className="text-xs font-semibold bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-mono">
                            {(visit as any).scheduledTime}
                          </span>
                        )}
                      </div>
                      {/* Área y supervisor */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {visit.areaName && (
                          <span className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {visit.areaName}
                          </span>
                        )}
                        {visit.personnelCount && (
                          <span className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400">
                            <Users className="w-3 h-3 shrink-0" />
                            {visit.personnelCount} persona{visit.personnelCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {/* Actividad */}
                      {(visit as any).activity && (
                        <p className="text-xs text-blue-600 dark:text-blue-500 mt-1 line-clamp-1">
                          {(visit as any).activity}
                        </p>
                      )}
                    </div>
                    <Badge className="shrink-0 bg-blue-600 text-white border-none text-xs px-2.5 py-1">
                      Programada
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Historial de visitas */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0 px-5 pt-5 pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Historial de visitas
          </CardTitle>
          {visits && visits.length > 0 && (
            <span className="text-xs text-muted-foreground">{visits.length} registro{visits.length !== 1 ? 's' : ''}</span>
          )}
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="pl-5">Fecha</TableHead>
                  <TableHead className="hidden sm:table-cell">Área</TableHead>
                  <TableHead className="hidden md:table-cell">Entrada</TableHead>
                  <TableHead className="hidden md:table-cell">Salida</TableHead>
                  <TableHead className="hidden sm:table-cell">Duración</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="pr-5 text-right">Voucher</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : visits && visits.length > 0 ? (
                  visits.map((visit) => {
                    const entryDate = visit.entryTime?.toDate()
                    const exitDate  = visit.exitTime?.toDate()
                    return (
                      <TableRow key={visit.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="pl-5 py-4 font-medium text-sm">
                          {entryDate
                            ? entryDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{visit.areaName ?? '—'}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs font-mono">
                          {entryDate ? entryDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs font-mono">
                          {exitDate ? exitDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">
                          {entryDate && exitDate ? visitDuration(entryDate, exitDate) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={visit.status === 'Completed' ? 'secondary' : 'default'}
                            className={
                              visit.status === 'Activa'     ? 'bg-green-100 text-green-700 border-green-200' :
                              visit.status === 'Programada' ? 'bg-blue-100 text-blue-700 border-blue-200' : ''
                            }
                          >
                            {visit.status === 'Activa' ? 'Activa' : visit.status === 'Programada' ? 'Programada' : 'Completada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-full"
                            title="Descargar voucher"
                            onClick={() => generateVoucherPDF(visit, company)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground pl-5">
                      No hay visitas registradas aún.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* QR Dialog */}
      {company && (
        <ContractorQRDialog
          company={company}
          open={qrOpen}
          onOpenChange={setQrOpen}
        />
      )}

    </div>
  )
}
