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
import { generateVoucherPDF } from "@/lib/generate-voucher"
import { ContractorQRDialog } from "@/components/contractors/ContractorQRDialog"
import Link from "next/link"
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Bell,
  BellOff,
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
  Phone,
  User,
  Hash,
  Calendar,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import type { Company, Visit } from "@/types"
import { sendNotification } from "@/app/actions/notify"

// ── Animation variants ─────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

// ── Skeleton components ────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />
}

function PortalSkeleton() {
  return (
    <div className="space-y-6 p-1">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}

// ── Helper ─────────────────────────────────────────────────────

function visitDuration(entry: Date, exit: Date) {
  const ms = exit.getTime() - entry.getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── SUA status style maps (full class strings for Tailwind) ────

const SUA_STYLES = {
  Valid: {
    border: 'border-[hsl(var(--sua-valid-border))]',
    bg: 'bg-[hsl(var(--sua-valid-bg))]',
    text: 'text-[hsl(var(--sua-valid))]',
    iconBg: 'bg-[hsl(var(--sua-valid)/0.12)]',
    progressTrack: 'bg-[hsl(var(--sua-valid)/0.15)]',
    progressBar: 'bg-[hsl(var(--sua-valid))]',
    hoverBg: 'hover:bg-[hsl(var(--sua-valid)/0.08)]',
    label: 'Vigente',
    icon: ShieldCheck,
  },
  Expired: {
    border: 'border-[hsl(var(--sua-expired-border))]',
    bg: 'bg-[hsl(var(--sua-expired-bg))]',
    text: 'text-[hsl(var(--sua-expired))]',
    iconBg: 'bg-[hsl(var(--sua-expired)/0.12)]',
    progressTrack: 'bg-[hsl(var(--sua-expired)/0.15)]',
    progressBar: 'bg-[hsl(var(--sua-expired))]',
    hoverBg: 'hover:bg-[hsl(var(--sua-expired)/0.08)]',
    label: 'Vencido',
    icon: ShieldX,
  },
  Pending: {
    border: 'border-[hsl(var(--sua-pending-border))]',
    bg: 'bg-[hsl(var(--sua-pending-bg))]',
    text: 'text-[hsl(var(--sua-pending))]',
    iconBg: 'bg-[hsl(var(--sua-pending)/0.12)]',
    progressTrack: 'bg-[hsl(var(--sua-pending)/0.15)]',
    progressBar: 'bg-[hsl(var(--sua-pending))]',
    hoverBg: 'hover:bg-[hsl(var(--sua-pending)/0.08)]',
    label: 'Pendiente',
    icon: ShieldAlert,
  },
} as const

// ── Main page ──────────────────────────────────────────────────

export default function PortalPage() {
  const { appUser, loading: authLoading } = useAppUser()
  const db = useFirestore()
  const { permission, supported, requestPermission } = useNotifications()
  const [qrOpen, setQrOpen] = useState(false)
  const [renewalSent, setRenewalSent] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(`sua_renewal_${appUser?.companyId}`)
    if (!stored) return false
    return Date.now() - Number(stored) < 24 * 60 * 60 * 1000
  })
  const [sendingRenewal, setSendingRenewal] = useState(false)

  const companyId = appUser?.companyId
  const companyRef = useMemo(
    () => companyId && db ? doc(db, 'companies', companyId) : null,
    [companyId, db],
  )
  const { data: rawCompany, loading: companyLoading } = useDoc(companyRef)
  const company = rawCompany as Company | null

  const visitsQuery = useMemo(() => {
    if (!db || !companyId) return null
    return query(
      collection(db, 'visits'),
      where('companyId', '==', companyId),
      limit(50),
    )
  }, [db, companyId])
  const { data: rawVisits, loading: visitsLoading } = useCollection(visitsQuery)

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
      sendNotification({ type: 'sua_renewal_request', companyName: company.name, companyId: company.id }).catch(() => { })
      localStorage.setItem(`sua_renewal_${company.id}`, String(Date.now()))
      setRenewalSent(true)
    } finally {
      setSendingRenewal(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────
  if (authLoading || companyLoading) {
    return <PortalSkeleton />
  }

  // ── Error states ─────────────────────────────────────────────
  if (!appUser?.companyId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-[hsl(var(--sua-pending-border))] bg-[hsl(var(--sua-pending-bg))] p-6 flex gap-3 items-start max-w-md w-full"
        >
          <AlertTriangle className="w-5 h-5 text-[hsl(var(--sua-pending))] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[hsl(var(--sua-pending))]">Sin empresa asignada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tu cuenta no está vinculada a ninguna empresa. Contacta al administrador de ViñoPlastic.
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 flex gap-3 items-start max-w-md w-full"
        >
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Empresa no encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              No se pudo cargar la información de tu empresa. Intenta más tarde.
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── SUA status logic ─────────────────────────────────────────
  const validUntil = company.sua?.validUntil
  const suaStatus: 'Valid' | 'Expired' | 'Pending' = (() => {
    if (validUntil) {
      const today = new Date().toISOString().slice(0, 10)
      return validUntil < today ? 'Expired' : 'Valid'
    }
    const s = company.sua?.status
    if (s === 'Valid' || s === 'Expired') return s
    return 'Pending'
  })()

  const daysLeft = validUntil
    ? Math.round((new Date(validUntil + 'T00:00:00').getTime() - new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime()) / 864e5)
    : null

  const sua = SUA_STYLES[suaStatus]
  const SuaIcon = sua.icon

  const progressPercent = daysLeft !== null
    ? Math.max(0, Math.min(100, (daysLeft / 365) * 100))
    : 50

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5 pb-24 md:pb-10"
    >

      {/* ── Hero: SUA Status ─────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className={`relative overflow-hidden rounded-2xl border ${sua.border} ${sua.bg} p-6 md:p-8`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${sua.iconBg} flex items-center justify-center shrink-0`}>
              <SuaIcon className={`w-7 h-7 ${sua.text}`} />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${sua.text}`}>
                Estado SUA
              </p>
              <p className={`text-2xl md:text-3xl font-black ${sua.text} leading-tight`}>
                {sua.label}
              </p>
              {daysLeft !== null && (
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {daysLeft > 0
                    ? `Vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`
                    : daysLeft === 0 ? 'Vence hoy'
                      : `Venció hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? 's' : ''}`
                  }
                </p>
              )}
            </div>
          </div>
          {validUntil && (
            <div className="text-right hidden sm:block">
              <Badge
                variant={suaStatus === 'Valid' ? 'default' : suaStatus === 'Expired' ? 'destructive' : 'secondary'}
                className="text-sm px-4 py-1.5 rounded-xl"
              >
                {suaStatus}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">hasta {validUntil}</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className={`h-2 w-full rounded-full ${sua.progressTrack} overflow-hidden`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              className={`h-full rounded-full ${sua.progressBar}`}
            />
          </div>
        </div>

        {/* Renewal inline */}
        <div className={`mt-4 pt-4 border-t ${sua.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {renewalSent
              ? <CheckCheck className="w-4 h-4 text-[hsl(var(--sua-valid))] shrink-0" />
              : <RefreshCw className="w-4 h-4 text-muted-foreground shrink-0" />
            }
            <p className="text-sm text-muted-foreground truncate">
              {renewalSent
                ? 'Solicitud enviada — el administrador actualizará tu póliza.'
                : '¿Ya renovaste tu SUA? Notifica para actualizar el sistema.'
              }
            </p>
          </div>
          {!renewalSent && (
            <Button
              size="sm"
              variant="outline"
              className={`shrink-0 gap-2 ${sua.border} ${sua.hoverBg}`}
              onClick={handleRenewalRequest}
              disabled={sendingRenewal}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sendingRenewal ? 'animate-spin' : ''}`} />
              Notificar
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Blocked banner ───────────────────────────────────── */}
      {company.status === 'Blocked' && (
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="font-bold text-destructive text-sm">Acceso bloqueado</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tu empresa ha sido bloqueada temporalmente. Contacta al administrador.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Quick Actions ────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setQrOpen(true)}
          className="flex flex-col items-center gap-2.5 p-5 rounded-2xl border border-border bg-card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-medium">Mi QR</span>
        </motion.button>

        <Link href="/portal/contrato" className="block">
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col items-center gap-2.5 p-5 rounded-2xl border border-border bg-card hover:shadow-md transition-shadow h-full"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium">Reglamento</span>
          </motion.div>
        </Link>

        {supported && (
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={permission !== 'granted' ? requestPermission : undefined}
            className="flex flex-col items-center gap-2.5 p-5 rounded-2xl border border-border bg-card hover:shadow-md transition-shadow cursor-pointer col-span-2 sm:col-span-1"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${permission === 'granted' ? 'bg-[hsl(var(--sua-valid)/0.12)]' : 'bg-muted'}`}>
              {permission === 'granted'
                ? <Bell className="w-5 h-5 text-[hsl(var(--sua-valid))]" />
                : <BellOff className="w-5 h-5 text-muted-foreground" />
              }
            </div>
            <span className="text-sm font-medium">
              {permission === 'granted' ? 'Alertas activas' : 'Activar alertas'}
            </span>
          </motion.button>
        )}
      </motion.div>

      {/* ── Bento: Info + Upcoming ───────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Company info */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mi Empresa</p>
          <div className="space-y-0">
            <InfoRow icon={User} label="Contacto" value={company.contact} />
            <InfoRow icon={Phone} label="Teléfono" value={company.phone} />
            <InfoRow icon={Hash} label="N° Póliza / SUA" value={company.sua?.number} />
            <InfoRow icon={Calendar} label="Vencimiento" value={company.sua?.validUntil} />
          </div>
        </div>

        {/* Upcoming visits */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Próximas visitas</p>
            {upcomingVisits && upcomingVisits.length > 0 && (
              <Badge variant="secondary" className="text-xs">{upcomingVisits.length}</Badge>
            )}
          </div>
          {upcomingVisits && upcomingVisits.length > 0 ? (
            <div className="space-y-0">
              {upcomingVisits.slice(0, 3).map(visit => (
                <div key={visit.id} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CalendarClock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight">
                      {visit.scheduledDate
                        ? new Date(visit.scheduledDate + 'T12:00:00').toLocaleDateString('es-MX', {
                          weekday: 'short', day: 'numeric', month: 'short',
                        })
                        : '—'}
                      {(visit as any).scheduledTime && (
                        <span className="ml-2 text-xs font-mono text-muted-foreground">{(visit as any).scheduledTime}</span>
                      )}
                    </p>
                    <div className="flex gap-3 mt-0.5">
                      {visit.areaName && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{visit.areaName}
                        </span>
                      )}
                      {visit.personnelCount && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />{visit.personnelCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin visitas programadas</p>
          )}
        </div>
      </motion.div>

      {/* ── Visit History ────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Historial de visitas
          </p>
          {visits && visits.length > 0 && (
            <span className="text-xs text-muted-foreground">{visits.length} registro{visits.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {visitsLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : visits && visits.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border/50 bg-muted/30">
                    <th className="text-left font-medium text-muted-foreground px-5 py-3 text-xs uppercase tracking-wide">Fecha</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-3 text-xs uppercase tracking-wide">Área</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-3 text-xs uppercase tracking-wide">Entrada</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-3 text-xs uppercase tracking-wide">Salida</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-3 text-xs uppercase tracking-wide">Duración</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-3 text-xs uppercase tracking-wide">Estado</th>
                    <th className="text-right font-medium text-muted-foreground px-5 py-3 text-xs uppercase tracking-wide">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {visits.map(visit => {
                    const entryDate = visit.entryTime?.toDate()
                    const exitDate = visit.exitTime?.toDate()
                    return (
                      <tr key={visit.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5 font-medium">
                          {entryDate?.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '—'}
                        </td>
                        <td className="px-3 py-3.5">{visit.areaName ?? '—'}</td>
                        <td className="px-3 py-3.5 font-mono text-xs">
                          {entryDate?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) ?? '—'}
                        </td>
                        <td className="px-3 py-3.5 font-mono text-xs">
                          {exitDate?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) ?? '—'}
                        </td>
                        <td className="px-3 py-3.5 text-xs">
                          {entryDate && exitDate ? visitDuration(entryDate, exitDate) : '—'}
                        </td>
                        <td className="px-3 py-3.5">
                          <VisitStatusBadge status={visit.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                            onClick={() => generateVoucherPDF(visit, company)}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile timeline */}
            <div className="md:hidden divide-y divide-border/50">
              {visits.map(visit => {
                const entryDate = visit.entryTime?.toDate()
                const exitDate = visit.exitTime?.toDate()
                return (
                  <div key={visit.id} className="px-5 py-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">
                          {entryDate?.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) ?? '—'}
                        </p>
                        <VisitStatusBadge status={visit.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {visit.areaName && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{visit.areaName}</span>
                        )}
                        {entryDate && exitDate && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{visitDuration(entryDate, exitDate)}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground shrink-0"
                      onClick={() => generateVoucherPDF(visit, company)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <CalendarClock className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No hay visitas registradas aún.</p>
          </div>
        )}
      </motion.div>

      {/* ── Floating pill: Active visit ──────────────────────── */}
      <AnimatePresence>
        {activeVisit && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-auto md:max-w-sm z-50"
          >
            <div className="rounded-2xl border border-[hsl(var(--sua-valid-border))] bg-[hsl(var(--sua-valid-bg))] backdrop-blur-xl shadow-lg px-5 py-3.5 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[hsl(var(--sua-valid))] animate-pulse shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[hsl(var(--sua-valid))]">En Planta</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {activeVisit.areaName && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{activeVisit.areaName}</span>
                  )}
                  {activeVisit.entryTime && (
                    <span>· {formatDistanceToNow(activeVisit.entryTime.toDate(), { locale: es, addSuffix: true })}</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Dialog */}
      {company && (
        <ContractorQRDialog
          company={company}
          open={qrOpen}
          onOpenChange={setQrOpen}
        />
      )}
    </motion.div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  )
}

function VisitStatusBadge({ status }: { status: Visit['status'] }) {
  if (status === 'Activa') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--sua-valid))] bg-[hsl(var(--sua-valid-bg))] border border-[hsl(var(--sua-valid-border))] px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--sua-valid))] animate-pulse" />
        Activa
      </span>
    )
  }
  if (status === 'Programada') {
    return (
      <span className="inline-flex items-center text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
        Programada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
      Completada
    </span>
  )
}
