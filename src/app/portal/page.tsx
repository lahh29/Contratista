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
import { EditProfileSheet } from "@/components/portal/EditProfileSheet"
import { generateVoucherPDF } from "@/lib/generate-voucher"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Pencil,
  Download,
  MapPin,
  Users,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import type { Company, Visit } from "@/types"

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
    Valid:   { bg: 'bg-green-50',   border: 'border-green-200',  text: 'text-green-800',   muted: 'text-green-600',  label: 'Vigente',   icon: ShieldCheck  },
    Expired: { bg: 'bg-red-50',     border: 'border-red-200',    text: 'text-red-800',     muted: 'text-red-600',    label: 'Vencido',   icon: ShieldX      },
    Pending: { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-800',  muted: 'text-orange-600', label: 'Pendiente', icon: ShieldAlert  },
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
            <div className="w-16 h-16 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm shrink-0">
              <Icon className={`w-8 h-8 ${config.text}`} />
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
  const [editingProfile, setEditingProfile] = useState(false)

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

  const activeVisit = useMemo(
    () => (visits as Visit[] | null)?.find(v => v.status === 'Active') ?? null,
    [visits],
  )

  if (authLoading || companyLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!appUser?.companyId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border-orange-200 bg-orange-50 max-w-md w-full">
          <CardContent className="p-6 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-800">Sin empresa asignada</p>
              <p className="text-sm text-orange-700 mt-1">
                Tu cuenta no tiene una empresa vinculada. Contacta al administrador de ViñoPlastic.
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
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl md:text-3xl shrink-0 border border-primary/20">
          {company.name?.[0]}
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">{company.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Panel de cumplimiento contratista</p>
        </div>
      </div>

      {/* En Planta — banner en tiempo real */}
      {activeVisit && (
        <Card className="border-green-200 bg-green-50 shadow-none">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-green-800">Actualmente dentro de planta</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                {activeVisit.areaName && (
                  <span className="flex items-center gap-1 text-xs text-green-700">
                    <MapPin className="w-3 h-3" /> {activeVisit.areaName}
                  </span>
                )}
                {activeVisit.personnelCount && (
                  <span className="flex items-center gap-1 text-xs text-green-700">
                    <Users className="w-3 h-3" /> {activeVisit.personnelCount} personas
                  </span>
                )}
                {activeVisit.entryTime && (
                  <span className="flex items-center gap-1 text-xs text-green-700">
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

      {/* 2 columnas en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Datos de la empresa */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Información de la empresa
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-full"
              onClick={() => setEditingProfile(true)}
              title="Editar perfil"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-0">
            <InfoRow icon={Building2} label="Razón Social"       value={company.name} />
            <InfoRow icon={User}      label="Contacto Principal" value={company.contact} />
            <InfoRow icon={Phone}     label="Teléfono"           value={company.phone} />
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
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${permission === 'granted' ? 'bg-green-100' : 'bg-muted'}`}>
                  {permission === 'granted'
                    ? <Bell    className="w-5 h-5 text-green-700" />
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
                <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200 px-3 py-1.5">Activo</Badge>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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
                            className={visit.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : ''}
                          >
                            {visit.status === 'Active' ? 'Activa' : 'Completada'}
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

      {/* Edit profile sheet */}
      <EditProfileSheet
        company={company}
        open={editingProfile}
        onOpenChange={setEditingProfile}
      />
    </div>
  )
}
