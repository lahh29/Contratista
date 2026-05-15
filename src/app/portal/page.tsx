"use client"

import { useMemo, useState } from "react"
import { collection, doc, query, where, limit } from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { useDoc } from "@/firebase/firestore/use-doc"
import { useCollection } from "@/firebase/firestore/use-collection"
import { useAppUser } from "@/hooks/use-app-user"
import { useNotifications } from "@/hooks/use-notifications"
import { generateVoucherPDF } from "@/lib/generate-voucher"
import { ContractorQRDialog } from "@/components/contractors/ContractorQRDialog"
import Link from "next/link"
import {
  ShieldCheck, ShieldAlert, ShieldX, Bell, BellOff, Clock, Download,
  MapPin, Users, FileText, QrCode, Ban, CalendarClock, RefreshCw,
  CheckCheck, Phone, User, Hash, AlertTriangle, Loader2, ArrowRight,
  Activity, ChevronRight,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import type { Company, Visit } from "@/types"
import { sendNotification } from "@/app/actions/notify"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────
// Animation config (igual que login: ease + duración)
// ─────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
}

// ─────────────────────────────────────────────────────────────
// SUA status — chips tipo login (success / destructive / warning)
// ─────────────────────────────────────────────────────────────

const SUA_CONFIG = {
  Valid: {
    label: "Vigente",
    Icon: ShieldCheck,
    bg: "bg-emerald-50 dark:bg-emerald-950",
    fg: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900",
  },
  Expired: {
    label: "Vencido",
    Icon: ShieldX,
    bg: "bg-destructive/10",
    fg: "text-destructive",
    bar: "bg-destructive",
    chip: "bg-destructive/5 text-destructive border-destructive/20",
  },
  Pending: {
    label: "Pendiente",
    Icon: ShieldAlert,
    bg: "bg-amber-50 dark:bg-amber-950",
    fg: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-100 dark:border-amber-900",
  },
} as const

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function visitDuration(entry: Date, exit: Date) {
  const ms = exit.getTime() - entry.getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function Skel({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted/60", className)} />
}

function PortalSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid lg:grid-cols-[280px_1fr]">
          <aside className="border-b lg:border-b-0 lg:border-r border-border bg-muted/40 p-6 space-y-5">
            <Skel className="h-6 w-40" />
            <Skel className="h-32 w-full" />
            <Skel className="h-24 w-full" />
            <Skel className="h-20 w-full" />
          </aside>
          <div className="p-6 space-y-5">
            <Skel className="h-6 w-52" />
            <Skel className="h-64 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

export default function PortalPage() {
  const { appUser, loading: authLoading } = useAppUser()
  const db = useFirestore()
  const { permission, supported, requestPermission } = useNotifications()
  const [qrOpen, setQrOpen] = useState(false)
  const [renewalSent, setRenewalSent] = useState(() => {
    if (typeof window === "undefined") return false
    const stored = localStorage.getItem(`sua_renewal_${appUser?.companyId}`)
    if (!stored) return false
    return Date.now() - Number(stored) < 24 * 60 * 60 * 1000
  })
  const [sendingRenewal, setSendingRenewal] = useState(false)

  const companyId = appUser?.companyId
  const companyRef = useMemo(
    () => (companyId && db ? doc(db, "companies", companyId) : null),
    [companyId, db],
  )
  const { data: rawCompany, loading: companyLoading } = useDoc(companyRef)
  const company = rawCompany as Company | null

  const visitsQuery = useMemo(() => {
    if (!db || !companyId) return null
    return query(collection(db, "visits"), where("companyId", "==", companyId), limit(50))
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
      .filter((v: any) => v.status === "Programada")
      .sort((a: any, b: any) => {
        const ad = (a.scheduledDate ?? "") + (a.scheduledTime ?? "")
        const bd = (b.scheduledDate ?? "") + (b.scheduledTime ?? "")
        return ad < bd ? -1 : ad > bd ? 1 : 0
      }) as Visit[]
  }, [rawVisits])

  const activeVisit = useMemo(
    () => (visits as Visit[] | null)?.find((v) => v.status === "Activa") ?? null,
    [visits],
  )

  async function handleRenewalRequest() {
    if (!company || renewalSent || sendingRenewal) return
    setSendingRenewal(true)
    try {
      sendNotification({ type: "sua_renewal_request", companyName: company.name, companyId: company.id }).catch(() => { })
      localStorage.setItem(`sua_renewal_${company.id}`, String(Date.now()))
      setRenewalSent(true)
    } finally {
      setSendingRenewal(false)
    }
  }

  if (authLoading || companyLoading) return <PortalSkeleton />

  if (!appUser?.companyId) {
    return (
      <ErrorState
        Icon={AlertTriangle}
        title="Sin empresa asignada"
        description="Tu cuenta no está vinculada a ninguna empresa. Contacta al administrador de ViñoPlastic."
        tone="warning"
      />
    )
  }

  if (!company) {
    return (
      <ErrorState
        Icon={ShieldAlert}
        title="Empresa no encontrada"
        description="No se pudo cargar la información de tu empresa. Intenta más tarde."
        tone="destructive"
      />
    )
  }

  // SUA logic
  const validUntil = company.sua?.validUntil
  const suaStatus: "Valid" | "Expired" | "Pending" = (() => {
    if (validUntil) {
      const today = new Date().toISOString().slice(0, 10)
      return validUntil < today ? "Expired" : "Valid"
    }
    const s = company.sua?.status
    if (s === "Valid" || s === "Expired") return s
    return "Pending"
  })()

  const daysLeft = validUntil
    ? Math.round(
      (new Date(validUntil + "T00:00:00").getTime() -
        new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime()) /
      864e5,
    )
    : null

  const sua = SUA_CONFIG[suaStatus]
  const SuaIcon = sua.Icon
  const progressPercent = daysLeft !== null ? Math.max(0, Math.min(100, (daysLeft / 365) * 100)) : 50

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {/* ── Card raíz: misma estructura del login (rounded-xl border shadow-sm + sidebar/main) ── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-border bg-background shadow-sm overflow-hidden"
        >
          <div className="grid lg:grid-cols-[280px_1fr]">

            {/* ══════════════════════════════════════════
                  SIDEBAR
                  ══════════════════════════════════════════ */}
            <aside className="border-b lg:border-b-0 lg:border-r border-border bg-muted/40 p-6 space-y-6">
              {/* Identidad de empresa */}
              <motion.div variants={fadeUp}>
                <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                  Empresa
                </p>
                <p className="mt-1.5 text-sm font-medium text-foreground truncate">
                  {company.name}
                </p>
                {company.type && (
                  <p className="text-xs text-muted-foreground capitalize mt-0.5 truncate">
                    {company.type}
                  </p>
                )}
              </motion.div>

              <div className="border-t border-border" />

              {/* SUA Status — card tipo "error/success" del login */}
              <motion.div variants={fadeUp} className="space-y-2">
                <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                  Estado SUA
                </p>

                <div className={cn("rounded-lg border p-3 space-y-3", sua.chip)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <SuaIcon className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{sua.label}</span>
                    </div>
                    {validUntil && (
                      <span className="text-[10px] font-mono tracking-wide opacity-80">
                        {validUntil}
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="h-1 w-full rounded-full bg-foreground/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
                      className={cn("h-full rounded-full", sua.bar)}
                    />
                  </div>

                  {daysLeft !== null && (
                    <p className="text-[11px] flex items-center gap-1 opacity-80">
                      <Clock className="w-3 h-3" />
                      {daysLeft > 0
                        ? `Vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`
                        : daysLeft === 0
                          ? "Vence hoy"
                          : `Venció hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? "s" : ""}`}
                    </p>
                  )}

                  {renewalSent ? (
                    <div className="flex items-center gap-1.5 text-[11px] pt-2 border-t border-current/15">
                      <CheckCheck className="w-3 h-3" />
                      Solicitud enviada
                    </div>
                  ) : (
                    <button
                      onClick={handleRenewalRequest}
                      disabled={sendingRenewal}
                      className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium pt-2 border-t border-current/15 hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                      <RefreshCw className={cn("w-3 h-3", sendingRenewal && "animate-spin")} />
                      Solicitar renovación
                      {!sendingRenewal && <ArrowRight className="w-3 h-3 opacity-60" />}
                    </button>
                  )}
                </div>

                {/* Banner bloqueado — chip de error del login */}
                {company.status === "Blocked" && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                    <Ban className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Acceso bloqueado</p>
                      <p className="opacity-80 text-[11px] mt-0.5">Contacta al administrador.</p>
                    </div>
                  </div>
                )}
              </motion.div>

              <div className="border-t border-border" />

              {/* Contacto */}
              <motion.div variants={fadeUp} className="space-y-2">
                <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                  Contacto
                </p>
                <div className="space-y-2">
                  <SidebarInfoRow Icon={User} label="Representante" value={company.contact} />
                  <SidebarInfoRow Icon={Phone} label="Teléfono" value={company.phone} />
                  <SidebarInfoRow Icon={Hash} label="No. SUA" value={company.sua?.number} mono />
                </div>
              </motion.div>

              <div className="border-t border-border" />

              {/* Acciones */}
              <motion.div variants={fadeUp} className="space-y-2">
                <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                  Acciones
                </p>
                <div className="space-y-1.5">
                  <ActionButton Icon={QrCode} label="Mi código QR" onClick={() => setQrOpen(true)} />
                  <Link href="/portal/contrato" className="block">
                    <ActionButton Icon={FileText} label="Reglamento" />
                  </Link>
                  {supported && (
                    <ActionButton
                      Icon={permission === "granted" ? Bell : BellOff}
                      label={permission === "granted" ? "Alertas activas" : "Activar alertas"}
                      onClick={permission !== "granted" ? requestPermission : undefined}
                      active={permission === "granted"}
                    />
                  )}
                </div>
              </motion.div>
            </aside>

            {/* ══════════════════════════════════════════
                  MAIN — visitas
                  ══════════════════════════════════════════ */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Header */}
              <motion.div variants={fadeUp} className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Portal</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Historial de registros y accesos
                  </p>
                </div>
                {activeVisit && (
                  <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-medium">En planta ahora</span>
                  </div>
                )}
              </motion.div>

              {/* Próximas visitas */}
              {upcomingVisits && upcomingVisits.length > 0 && (
                <motion.section variants={fadeUp} className="space-y-3">
                  <SectionHeader Icon={CalendarClock} title="Próximas visitas" count={upcomingVisits.length} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {upcomingVisits.slice(0, 6).map((visit, i) => (
                      <motion.div
                        key={visit.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 + 0.1, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="rounded-lg border border-border p-3 bg-background hover:bg-muted/30 transition-colors"
                      >
                        <p className="text-xs font-medium text-foreground">
                          {visit.scheduledDate
                            ? new Date(visit.scheduledDate + "T12:00:00").toLocaleDateString("es-MX", {
                              weekday: "long", day: "numeric", month: "short",
                            })
                            : "—"}
                        </p>
                        {(visit as any).scheduledTime && (
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {(visit as any).scheduledTime}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                          {visit.areaName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {visit.areaName}
                            </span>
                          )}
                          {visit.personnelCount && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {visit.personnelCount}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Historial */}
              <motion.section variants={fadeUp} className="space-y-3">
                <SectionHeader
                  Icon={Activity}
                  title="Historial de visitas"
                  count={visits?.length ?? 0}
                  hideCount={!visits?.length}
                />

                {visitsLoading ? (
                  <div className="rounded-lg border border-border flex justify-center py-12">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : visits && visits.length > 0 ? (
                  <>
                    {/* Tabla desktop */}
                    <div className="hidden md:block rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr className="text-left">
                            <Th>Fecha</Th>
                            <Th>Área</Th>
                            <Th>Entrada</Th>
                            <Th>Salida</Th>
                            <Th>Duración</Th>
                            <Th>Estado</Th>
                            <Th className="text-right">PDF</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {visits.map((visit) => {
                            const entryDate = visit.entryTime?.toDate()
                            const exitDate = visit.exitTime?.toDate()
                            return (
                              <tr key={visit.id} className="border-t border-border">
                                <Td className="text-foreground font-medium">
                                  {entryDate?.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) ?? "—"}
                                </Td>
                                <Td>{visit.areaName ?? "—"}</Td>
                                <Td className="font-mono text-[12px]">
                                  {entryDate?.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) ?? "—"}
                                </Td>
                                <Td className="font-mono text-[12px]">
                                  {exitDate?.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) ?? "—"}
                                </Td>
                                <Td>{entryDate && exitDate ? visitDuration(entryDate, exitDate) : "—"}</Td>
                                <Td><VisitStatusBadge status={visit.status} /></Td>
                                <Td className="text-right">
                                  <button
                                    onClick={() => generateVoucherPDF(visit, company)}
                                    aria-label="Descargar PDF"
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </Td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Cards mobile */}
                    <div className="md:hidden space-y-2">
                      {visits.map((visit) => {
                        const entryDate = visit.entryTime?.toDate()
                        const exitDate = visit.exitTime?.toDate()
                        return (
                          <div key={visit.id} className="rounded-lg border border-border p-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-medium text-foreground">
                                  {entryDate?.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) ?? "—"}
                                </p>
                                <VisitStatusBadge status={visit.status} />
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                                {visit.areaName && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {visit.areaName}
                                  </span>
                                )}
                                {entryDate && exitDate && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {visitDuration(entryDate, exitDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => generateVoucherPDF(visit, company)}
                              aria-label="Descargar PDF"
                              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  // Estado vacío — círculo tonal del login
                  <div className="rounded-lg border border-border py-16 px-6 flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                      <CalendarClock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Sin visitas registradas</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
                      Las visitas aparecerán aquí una vez que se registren.
                    </p>
                  </div>
                )}
              </motion.section>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pill de visita activa flotante */}
      <AnimatePresence>
        {activeVisit && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-auto md:max-w-sm z-40"
          >
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background shadow-md px-3.5 py-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Visita activa</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  {activeVisit.areaName && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {activeVisit.areaName}
                    </span>
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
        <ContractorQRDialog company={company} open={qrOpen} onOpenChange={setQrOpen} />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function SidebarInfoRow({
  Icon, label, value, mono = false,
}: {
  Icon: React.ElementType
  label: string
  value?: string | null
  mono?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground/80">{label}</p>
        <p className={cn(
          "text-xs font-medium text-foreground truncate mt-0.5",
          mono && "font-mono",
        )}>
          {value}
        </p>
      </div>
    </div>
  )
}

function ActionButton({
  Icon, label, onClick, active = false,
}: {
  Icon: React.ElementType
  label: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-lg border px-3 h-10 text-xs font-medium transition-colors",
        active
          ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400"
          : "bg-background border-border text-foreground hover:bg-muted/40",
      )}
    >
      <Icon className={cn("w-3.5 h-3.5 shrink-0", active ? "" : "text-muted-foreground")} />
      <span className="flex-1 text-left">{label}</span>
      {!active && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  )
}

function SectionHeader({
  Icon, title, count, hideCount = false,
}: {
  Icon: React.ElementType
  title: string
  count: number
  hideCount?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-foreground">{title}</p>
      </div>
      {!hideCount && count > 0 && (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  )
}

function VisitStatusBadge({ status }: { status: Visit["status"] }) {
  if (status === "Activa") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
        Activa
      </span>
    )
  }
  if (status === "Programada") {
    return (
      <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900">
        Programada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
      Completada
    </span>
  )
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 py-2 text-[10px] font-medium tracking-[0.08em] uppercase text-muted-foreground", className)}>
      {children}
    </th>
  )
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("px-3 py-2.5 text-xs text-muted-foreground", className)}>
      {children}
    </td>
  )
}

function ErrorState({
  Icon, title, description, tone,
}: {
  Icon: React.ElementType
  title: string
  description: string
  tone: "destructive" | "warning"
}) {
  const styles = {
    destructive: { bg: "bg-destructive/10", fg: "text-destructive" },
    warning: { bg: "bg-amber-50 dark:bg-amber-950", fg: "text-amber-600 dark:text-amber-400" },
  }
  const s = styles[tone]
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-[420px] rounded-xl border border-border bg-background shadow-sm px-8 py-10 flex flex-col items-center text-center"
      >
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-4", s.bg, s.fg)}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-2 max-w-[300px] leading-relaxed">{description}</p>
      </motion.div>
    </div>
  )
}
