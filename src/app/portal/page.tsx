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
  AlertTriangle,
  Loader2,
  Building2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import type { Company, Visit } from "@/types"
import { sendNotification } from "@/app/actions/notify"

// ── Animation variants ─────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
}


// ── Skeleton ───────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />
}

function PortalSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
      <div className="lg:w-[380px] p-6 space-y-4 border-r border-border/60">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
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

// ── SUA status style maps ──────────────────────────────────────

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
              Tu cuenta no esta vinculada a ninguna empresa. Contacta al administrador de VinoPlastic.
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
              No se pudo cargar la informacion de tu empresa. Intenta mas tarde.
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

  // ── Render ───────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">

        {/* ════════════════════════════════════════════════════════
            LEFT PANEL — Company Profile + SUA + Actions
            ════════════════════════════════════════════════════════ */}
        <motion.aside
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="lg:w-[380px] xl:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r border-border/60 bg-card overflow-y-auto"
        >
          <div className="p-5 lg:p-6 space-y-5">

            {/* Company header */}
            <motion.div variants={fadeUp} className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
                    {company.name}
                  </h1>
                  {company.type && (
                    <p className="text-xs text-muted-foreground capitalize">{company.type}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* SUA status card */}
            <motion.div
              variants={fadeUp}
              className={`rounded-xl border ${sua.border} ${sua.bg} p-4 space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg ${sua.iconBg} flex items-center justify-center`}>
                    <SuaIcon className={`w-4.5 h-4.5 ${sua.text}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Estado SUA</p>
                    <p className={`text-sm font-bold ${sua.text}`}>{sua.label}</p>
                  </div>
                </div>
                {validUntil && (
                  <Badge
                    variant={suaStatus === 'Valid' ? 'default' : suaStatus === 'Expired' ? 'destructive' : 'secondary'}
                    className="text-xs px-2.5 py-0.5 rounded-lg"
                  >
                    {suaStatus}
                  </Badge>
                )}
              </div>

              {/* Progress bar */}
              <div className={`h-1.5 w-full rounded-full ${sua.progressTrack} overflow-hidden`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  className={`h-full rounded-full ${sua.progressBar}`}
                />
              </div>

              {daysLeft !== null && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {daysLeft > 0
                    ? `Vence en ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`
                    : daysLeft === 0 ? 'Vence hoy'
                      : `Vencio hace ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) !== 1 ? 's' : ''}`
                  }
                  {validUntil && <span className="ml-auto font-mono text-[10px]">{validUntil}</span>}
                </p>
              )}

              {/* Renewal */}
              <div className={`pt-3 border-t ${sua.border}`}>
                {renewalSent ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5 text-[hsl(var(--sua-valid))]" />
                    Solicitud enviada
                  </p>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className={`w-full gap-2 text-xs ${sua.border} ${sua.hoverBg}`}
                    onClick={handleRenewalRequest}
                    disabled={sendingRenewal}
                  >
                    <RefreshCw className={`w-3 h-3 ${sendingRenewal ? 'animate-spin' : ''}`} />
                    Notificar renovacion SUA
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Blocked banner */}
            {company.status === 'Blocked' && (
              <motion.div
                variants={fadeUp}
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3"
              >
                <Ban className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-destructive text-xs">Acceso bloqueado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Contacta al administrador.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Contact info */}
            <motion.div variants={fadeUp} className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Contacto</p>
              <InfoRow icon={User} label="Representante" value={company.contact} />
              <InfoRow icon={Phone} label="Telefono" value={company.phone} />
              <InfoRow icon={Hash} label="Poliza / SUA" value={company.sua?.number} />
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={fadeUp} className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acciones</p>
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setQrOpen(true)}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium">Mi QR</span>
                </motion.button>

                <Link href="/portal/contrato" className="block">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors h-full"
                  >
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium">Reglamento</span>
                  </motion.div>
                </Link>

                {supported && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={permission !== 'granted' ? requestPermission : undefined}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer col-span-2"
                  >
                    {permission === 'granted'
                      ? <Bell className="w-4 h-4 text-[hsl(var(--sua-valid))]" />
                      : <BellOff className="w-4 h-4 text-muted-foreground" />
                    }
                    <span className="text-xs font-medium">
                      {permission === 'granted' ? 'Alertas activas' : 'Activar alertas'}
                    </span>
                  </motion.button>
                )}
              </div>
            </motion.div>

          </div>
        </motion.aside>

        {/* ════════════════════════════════════════════════════════
            RIGHT PANEL — Visits (upcoming + history)
            ════════════════════════════════════════════════════════ */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="flex-1 overflow-y-auto"
        >
          <div className="p-5 lg:p-8 space-y-6 max-w-4xl">

            {/* Upcoming visits */}
            {upcomingVisits && upcomingVisits.length > 0 && (
              <motion.section variants={fadeUp}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-primary" />
                    Proximas visitas
                  </h2>
                  <Badge variant="secondary" className="text-xs">{upcomingVisits.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {upcomingVisits.slice(0, 6).map(visit => (
                    <div
                      key={visit.id}
                      className="rounded-xl border border-border bg-card p-4 space-y-2 hover:shadow-sm transition-shadow"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {visit.scheduledDate
                          ? new Date(visit.scheduledDate + 'T12:00:00').toLocaleDateString('es-MX', {
                            weekday: 'short', day: 'numeric', month: 'short',
                          })
                          : '\u2014'}
                      </p>
                      {(visit as any).scheduledTime && (
                        <p className="text-xs font-mono text-muted-foreground">{(visit as any).scheduledTime}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {visit.areaName && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{visit.areaName}</span>
                        )}
                        {visit.personnelCount && (
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{visit.personnelCount}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Visit History */}
            <motion.section variants={fadeUp}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground">Historial de visitas</h2>
                {visits && visits.length > 0 && (
                  <span className="text-xs text-muted-foreground">{visits.length} registro{visits.length !== 1 ? 's' : ''}</span>
                )}
              </div>

              {visitsLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : visits && visits.length > 0 ? (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40">
                          <th className="text-left font-medium text-muted-foreground px-4 py-3 text-xs">Fecha</th>
                          <th className="text-left font-medium text-muted-foreground px-3 py-3 text-xs">Area</th>
                          <th className="text-left font-medium text-muted-foreground px-3 py-3 text-xs">Entrada</th>
                          <th className="text-left font-medium text-muted-foreground px-3 py-3 text-xs">Salida</th>
                          <th className="text-left font-medium text-muted-foreground px-3 py-3 text-xs">Duracion</th>
                          <th className="text-left font-medium text-muted-foreground px-3 py-3 text-xs">Estado</th>
                          <th className="text-right font-medium text-muted-foreground px-4 py-3 text-xs">PDF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {visits.map(visit => {
                          const entryDate = visit.entryTime?.toDate()
                          const exitDate = visit.exitTime?.toDate()
                          return (
                            <tr key={visit.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">
                                {entryDate?.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '\u2014'}
                              </td>
                              <td className="px-3 py-3 text-muted-foreground">{visit.areaName ?? '\u2014'}</td>
                              <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                                {entryDate?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) ?? '\u2014'}
                              </td>
                              <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                                {exitDate?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) ?? '\u2014'}
                              </td>
                              <td className="px-3 py-3 text-xs text-muted-foreground">
                                {entryDate && exitDate ? visitDuration(entryDate, exitDate) : '\u2014'}
                              </td>
                              <td className="px-3 py-3">
                                <VisitStatusBadge status={visit.status} />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
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

                  {/* Mobile list */}
                  <div className="md:hidden space-y-2">
                    {visits.map(visit => {
                      const entryDate = visit.entryTime?.toDate()
                      const exitDate = visit.exitTime?.toDate()
                      return (
                        <div key={visit.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {entryDate?.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) ?? '\u2014'}
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
                            className="h-8 w-8 rounded-lg text-muted-foreground shrink-0"
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
                <div className="rounded-xl border border-border bg-card py-16 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <CalendarClock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No hay visitas registradas aun.</p>
                </div>
              )}
            </motion.section>

          </div>
        </motion.div>
      </div>

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
            <div className="rounded-xl border border-[hsl(var(--sua-valid-border))] bg-[hsl(var(--sua-valid-bg))] backdrop-blur-xl shadow-lg px-4 py-3 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--sua-valid))] animate-pulse shrink-0" />
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
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  )
}

function VisitStatusBadge({ status }: { status: Visit['status'] }) {
  if (status === 'Activa') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[hsl(var(--sua-valid))] bg-[hsl(var(--sua-valid-bg))] border border-[hsl(var(--sua-valid-border))] px-2 py-0.5 rounded-md">
        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--sua-valid))] animate-pulse" />
        Activa
      </span>
    )
  }
  if (status === 'Programada') {
    return (
      <span className="inline-flex items-center text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
        Programada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
      Completada
    </span>
  )
}
