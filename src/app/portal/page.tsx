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
  ArrowRight,
  Activity,
  ChevronRight,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import type { Company, Visit } from "@/types"
import { sendNotification } from "@/app/actions/notify"

// ─────────────────────────────────────────────────────────────
// Animation config
// ─────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
}

// ─────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl ${className}`} style={{ background: 'var(--pm-surface-soft, #f5f5f7)' }} />
}

function PortalSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="pm-sidebar space-y-6">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="pm-main space-y-6">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function visitDuration(entry: Date, exit: Date) {
  const ms = exit.getTime() - entry.getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ─────────────────────────────────────────────────────────────
// SUA status config
// ─────────────────────────────────────────────────────────────

const SUA_CONFIG = {
  Valid: {
    accent: "#16a34a",
    accentLight: "rgba(22,163,74,0.06)",
    accentBorder: "rgba(22,163,74,0.15)",
    label: "Vigente",
    icon: ShieldCheck,
  },
  Expired: {
    accent: "#dc2626",
    accentLight: "rgba(220,38,38,0.06)",
    accentBorder: "rgba(220,38,38,0.15)",
    label: "Vencido",
    icon: ShieldX,
  },
  Pending: {
    accent: "#d97706",
    accentLight: "rgba(217,119,6,0.06)",
    accentBorder: "rgba(217,119,6,0.15)",
    label: "Pendiente",
    icon: ShieldAlert,
  },
} as const

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
        icon={AlertTriangle}
        title="Sin empresa asignada"
        description="Tu cuenta no está vinculada a ninguna empresa. Contacta al administrador de VinoPlastic."
        color="amber"
      />
    )
  }

  if (!company) {
    return (
      <ErrorState
        icon={ShieldAlert}
        title="Empresa no encontrada"
        description="No se pudo cargar la información de tu empresa. Intenta más tarde."
        color="red"
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
  const SuaIcon = sua.icon
  const progressPercent = daysLeft !== null ? Math.max(0, Math.min(100, (daysLeft / 365) * 100)) : 50

  return (
    <>
      <div className="flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 64px)' }}>

        {/* ══════════════════════════════════════════
              SIDEBAR — Meta design: clean, minimal
              ══════════════════════════════════════════ */}
        <motion.aside
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="pm-sidebar"
        >
          <div className="space-y-6">

            {/* Company identity */}
            <motion.div variants={fadeUp}>
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 flex items-center justify-center shrink-0"
                  style={{
                    background: 'var(--pm-ink-deep)',
                    borderRadius: 'var(--pm-rounded-xl)',
                  }}
                >
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h1 className="pm-subtitle-lg" style={{ fontSize: '17px' }}>
                    {company.name}
                  </h1>
                  {company.type && (
                    <p className="pm-caption capitalize" style={{ marginTop: '2px' }}>
                      {company.type}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            <hr className="pm-separator" />

            {/* SUA Status */}
            <motion.div variants={fadeUp}>
              <p className="pm-divider-label" style={{ marginBottom: '12px' }}>Estado SUA</p>

              <div
                className="pm-sua-card"
                style={{
                  background: sua.accentLight,
                  color: sua.accent,
                  border: `1px solid ${sua.accentBorder}`,
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                  <div className="flex items-center gap-2">
                    <SuaIcon className="w-4 h-4" style={{ color: sua.accent }} />
                    <span className="pm-body-sm-bold" style={{ color: sua.accent }}>
                      {sua.label}
                    </span>
                  </div>
                  {validUntil && (
                    <span
                      className="pm-caption-bold"
                      style={{
                        background: sua.accentBorder,
                        color: sua.accent,
                        padding: '2px 8px',
                        borderRadius: 'var(--pm-rounded-full)',
                      }}
                    >
                      {validUntil}
                    </span>
                  )}
                </div>

                {/* Progress track */}
                <div
                  style={{
                    height: '4px',
                    width: '100%',
                    borderRadius: 'var(--pm-rounded-full)',
                    background: 'rgba(255,255,255,0.7)',
                    overflow: 'hidden',
                    marginBottom: '12px',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                    style={{
                      height: '100%',
                      borderRadius: 'var(--pm-rounded-full)',
                      background: sua.accent,
                    }}
                  />
                </div>

                {daysLeft !== null && (
                  <p className="pm-caption flex items-center gap-1.5" style={{ color: 'var(--pm-slate)', marginBottom: '12px' }}>
                    <Clock className="w-3 h-3" />
                    {daysLeft > 0
                      ? `Vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`
                      : daysLeft === 0
                        ? "Vence hoy"
                        : `Venció hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? "s" : ""}`}
                  </p>
                )}

                {renewalSent ? (
                  <div className="flex items-center gap-1.5 pm-caption" style={{ color: 'var(--pm-success)', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.4)' }}>
                    <CheckCheck className="w-3.5 h-3.5" />
                    Solicitud enviada
                  </div>
                ) : (
                  <button
                    onClick={handleRenewalRequest}
                    disabled={sendingRenewal}
                    className="w-full flex items-center justify-center gap-1.5 pm-caption-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      color: sua.accent,
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(255,255,255,0.4)',
                      background: 'none',
                      border: 'none',
                      borderTopStyle: 'solid',
                      borderTopWidth: '1px',
                      borderTopColor: 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw className={`w-3 h-3 ${sendingRenewal ? "animate-spin" : ""}`} />
                    Solicitar renovación
                    {!sendingRenewal && <ArrowRight className="w-3 h-3 ml-0.5 opacity-60" />}
                  </button>
                )}
              </div>

              {/* Blocked banner */}
              {company.status === "Blocked" && (
                <motion.div
                  variants={fadeUp}
                  className="pm-card flex items-start gap-3"
                  style={{
                    marginTop: '12px',
                    background: 'rgba(220,38,38,0.05)',
                    borderColor: 'rgba(220,38,38,0.15)',
                    padding: 'var(--pm-base)',
                  }}
                >
                  <Ban className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--pm-critical)' }} />
                  <div>
                    <p className="pm-body-sm-bold" style={{ color: 'var(--pm-critical)' }}>Acceso bloqueado</p>
                    <p className="pm-caption" style={{ color: 'var(--pm-critical)', marginTop: '2px' }}>Contacta al administrador.</p>
                  </div>
                </motion.div>
              )}
            </motion.div>

            <hr className="pm-separator" />

            {/* Contact */}
            <motion.div variants={fadeUp}>
              <p className="pm-divider-label" style={{ marginBottom: '12px' }}>Contacto</p>
              <div className="space-y-0">
                <SidebarInfoRow icon={User} label="Representante" value={company.contact} />
                <SidebarInfoRow icon={Phone} label="Teléfono" value={company.phone} />
                <SidebarInfoRow icon={Hash} label="No. SUA" value={company.sua?.number} mono />
              </div>
            </motion.div>

            <hr className="pm-separator" />

            {/* Actions */}
            <motion.div variants={fadeUp}>
              <p className="pm-divider-label" style={{ marginBottom: '12px' }}>Acciones</p>
              <div className="space-y-2">
                <ActionButton icon={QrCode} label="Mi código QR" onClick={() => setQrOpen(true)} />
                <Link href="/portal/contrato" className="block">
                  <ActionButton icon={FileText} label="Reglamento" />
                </Link>
                {supported && (
                  <ActionButton
                    icon={permission === "granted" ? Bell : BellOff}
                    label={permission === "granted" ? "Alertas activas" : "Activar alertas push"}
                    onClick={permission !== "granted" ? requestPermission : undefined}
                    active={permission === "granted"}
                  />
                )}
              </div>
            </motion.div>
          </div>
        </motion.aside>

        {/* ══════════════════════════════════════════
              MAIN — visits panel
              ══════════════════════════════════════════ */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="pm-main"
        >
          <div className="max-w-5xl space-y-8">

            {/* Page header */}
            <motion.div variants={fadeUp} className="flex items-end justify-between">
              <div>
                <h2 className="pm-heading-sm">Portal</h2>
                <p className="pm-body-sm" style={{ color: 'var(--pm-steel)', marginTop: '4px' }}>
                  Historial de registros y accesos
                </p>
              </div>
              {activeVisit && (
                <div
                  className="hidden sm:flex items-center gap-2 pm-badge-success"
                  style={{ borderRadius: 'var(--pm-rounded-full)' }}
                >
                  <span className="pm-dot pm-dot-success animate-pulse" />
                  <span className="pm-caption-bold" style={{ color: 'inherit' }}>En planta ahora</span>
                </div>
              )}
            </motion.div>

            {/* Upcoming visits */}
            {upcomingVisits && upcomingVisits.length > 0 && (
              <motion.section variants={fadeUp}>
                <SectionHeader icon={CalendarClock} title="Próximas visitas" count={upcomingVisits.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
                  {upcomingVisits.slice(0, 6).map((visit, i) => (
                    <motion.div
                      key={visit.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 + 0.2, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="pm-card"
                      style={{ padding: 'var(--pm-base) var(--pm-lg)' }}
                    >
                      <p className="pm-body-sm-bold" style={{ color: 'var(--pm-ink-deep)' }}>
                        {visit.scheduledDate
                          ? new Date(visit.scheduledDate + "T12:00:00").toLocaleDateString("es-MX", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                          })
                          : "—"}
                      </p>
                      {(visit as any).scheduledTime && (
                        <p className="pm-caption" style={{ marginTop: '4px', fontFamily: 'var(--pm-font-mono)' }}>
                          {(visit as any).scheduledTime}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 pm-caption" style={{ color: 'var(--pm-steel)' }}>
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

            {/* Visit history */}
            <motion.section variants={fadeUp}>
              <SectionHeader
                icon={Activity}
                title="Historial de visitas"
                count={visits?.length ?? 0}
                hideCount={!visits?.length}
              />

              <div className="mt-4">
                {visitsLoading ? (
                  <div className="pm-card flex justify-center" style={{ padding: '64px 0' }}>
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--pm-stone)' }} />
                  </div>
                ) : visits && visits.length > 0 ? (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block pm-card" style={{ padding: 0, overflow: 'hidden' }}>
                      <table className="pm-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Área</th>
                            <th>Entrada</th>
                            <th>Salida</th>
                            <th>Duración</th>
                            <th>Estado</th>
                            <th style={{ textAlign: 'right' }}>PDF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visits.map((visit) => {
                            const entryDate = visit.entryTime?.toDate()
                            const exitDate = visit.exitTime?.toDate()
                            return (
                              <tr key={visit.id}>
                                <td className="pm-body-sm-bold" style={{ color: 'var(--pm-ink-deep)' }}>
                                  {entryDate?.toLocaleDateString("es-MX", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }) ?? "—"}
                                </td>
                                <td className="pm-body-sm" style={{ color: 'var(--pm-slate)' }}>
                                  {visit.areaName ?? "—"}
                                </td>
                                <td style={{ fontFamily: 'var(--pm-font-mono)', fontSize: '12px', color: 'var(--pm-slate)' }}>
                                  {entryDate?.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) ?? "—"}
                                </td>
                                <td style={{ fontFamily: 'var(--pm-font-mono)', fontSize: '12px', color: 'var(--pm-slate)' }}>
                                  {exitDate?.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) ?? "—"}
                                </td>
                                <td className="pm-body-sm" style={{ color: 'var(--pm-slate)' }}>
                                  {entryDate && exitDate ? visitDuration(entryDate, exitDate) : "—"}
                                </td>
                                <td>
                                  <VisitStatusBadge status={visit.status} />
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    onClick={() => generateVoucherPDF(visit, company)}
                                    className="pm-btn-icon"
                                    style={{ width: '32px', height: '32px', marginLeft: 'auto' }}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-2">
                      {visits.map((visit) => {
                        const entryDate = visit.entryTime?.toDate()
                        const exitDate = visit.exitTime?.toDate()
                        return (
                          <div key={visit.id} className="pm-visit-card">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="pm-body-sm-bold" style={{ color: 'var(--pm-ink-deep)' }}>
                                  {entryDate?.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) ?? "—"}
                                </p>
                                <VisitStatusBadge status={visit.status} />
                              </div>
                              <div className="flex items-center gap-3 mt-1 pm-caption" style={{ color: 'var(--pm-steel)' }}>
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
                              className="pm-btn-icon shrink-0"
                              style={{ width: '36px', height: '36px' }}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="pm-card text-center" style={{ padding: '80px var(--pm-xxl)' }}>
                    <div
                      className="flex items-center justify-center mx-auto"
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--pm-rounded-xxl)',
                        background: 'var(--pm-surface-soft)',
                        marginBottom: '12px',
                      }}
                    >
                      <CalendarClock className="w-5 h-5" style={{ color: 'var(--pm-stone)' }} />
                    </div>
                    <p className="pm-body-sm" style={{ color: 'var(--pm-slate)' }}>
                      No hay visitas registradas aún.
                    </p>
                    <p className="pm-caption" style={{ marginTop: '4px' }}>
                      Las visitas aparecerán aquí una vez registradas.
                    </p>
                  </div>
                )}
              </div>
            </motion.section>

          </div>
        </motion.div>
      </div>

      {/* ── Active visit floating pill ── */}
      <AnimatePresence>
        {activeVisit && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-auto md:max-w-sm z-50"
          >
            <div className="pm-floating-pill">
              <span className="pm-dot pm-dot-success animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="pm-body-sm-bold" style={{ color: 'var(--pm-ink-deep)' }}>Visita activa</p>
                <div className="flex items-center gap-2 pm-caption" style={{ color: 'var(--pm-steel)', marginTop: '2px' }}>
                  {activeVisit.areaName && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {activeVisit.areaName}
                    </span>
                  )}
                  {activeVisit.entryTime && (
                    <span>
                      · {formatDistanceToNow(activeVisit.entryTime.toDate(), { locale: es, addSuffix: true })}
                    </span>
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
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType
  label: string
  value?: string | null
  mono?: boolean
}) {
  if (!value) return null
  return (
    <div
      className="flex items-start gap-3"
      style={{
        padding: '10px 0',
        borderBottom: '1px solid var(--pm-hairline-soft)',
      }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--pm-stone)' }} />
      <div className="min-w-0 flex-1">
        <p className="pm-divider-label">{label}</p>
        <p
          className="pm-body-sm-bold truncate"
          style={{
            color: 'var(--pm-ink-deep)',
            marginTop: '2px',
            fontFamily: mono ? 'var(--pm-font-mono)' : undefined,
            fontSize: mono ? '12px' : undefined,
          }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ElementType
  label: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="pm-action-row w-full"
      style={{
        background: active ? 'rgba(22,163,74,0.05)' : 'var(--pm-canvas)',
        borderColor: active ? 'rgba(22,163,74,0.15)' : undefined,
      }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: active ? 'var(--pm-success)' : 'var(--pm-steel)' }} />
      <span className="pm-body-sm-bold flex-1 text-left" style={{ color: active ? 'var(--pm-success)' : 'var(--pm-ink)' }}>
        {label}
      </span>
      {!active && <ChevronRight className="w-4 h-4" style={{ color: 'var(--pm-stone)' }} />}
    </button>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  hideCount = false,
}: {
  icon: React.ElementType
  title: string
  count: number
  hideCount?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: 'var(--pm-steel)' }} />
        <h2 className="pm-body-sm-bold">{title}</h2>
      </div>
      {!hideCount && count > 0 && (
        <span
          className="pm-caption-bold"
          style={{
            background: 'var(--pm-surface-soft)',
            color: 'var(--pm-slate)',
            padding: '2px 8px',
            borderRadius: 'var(--pm-rounded-full)',
            fontFamily: 'var(--pm-font-mono)',
          }}
        >
          {count}
        </span>
      )}
    </div>
  )
}

function VisitStatusBadge({ status }: { status: Visit["status"] }) {
  if (status === "Activa") {
    return (
      <span className="pm-badge pm-badge-success" style={{ fontSize: '11px', padding: '2px 8px' }}>
        <span className="pm-dot pm-dot-success animate-pulse" style={{ width: '6px', height: '6px' }} />
        Activa
      </span>
    )
  }
  if (status === "Programada") {
    return (
      <span className="pm-badge" style={{ fontSize: '11px', padding: '2px 8px', background: 'var(--pm-primary-soft)', color: 'var(--pm-primary)' }}>
        Programada
      </span>
    )
  }
  return (
    <span className="pm-badge pm-badge-neutral" style={{ fontSize: '11px', padding: '2px 8px' }}>
      Completada
    </span>
  )
}

function ErrorState({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType
  title: string
  description: string
  color: "amber" | "red"
}) {
  const styles = {
    amber: {
      bg: "rgba(217,119,6,0.06)",
      border: "rgba(217,119,6,0.15)",
      icon: "var(--pm-attention)",
      title: "var(--pm-attention)",
      desc: "var(--pm-slate)",
    },
    red: {
      bg: "rgba(220,38,38,0.06)",
      border: "rgba(220,38,38,0.15)",
      icon: "var(--pm-critical)",
      title: "var(--pm-critical)",
      desc: "var(--pm-slate)",
    },
  }
  const s = styles[color]
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '60vh', padding: '0 var(--pm-base)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="pm-card flex gap-3 items-start"
        style={{
          maxWidth: '420px',
          width: '100%',
          background: s.bg,
          borderColor: s.border,
          borderRadius: 'var(--pm-rounded-xxl)',
          padding: 'var(--pm-xl)',
        }}
      >
        <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: s.icon }} />
        <div>
          <p className="pm-subtitle-lg" style={{ color: s.title, fontSize: '14px' }}>{title}</p>
          <p className="pm-body-sm" style={{ color: s.desc, marginTop: '4px' }}>{description}</p>
        </div>
      </motion.div>
    </div>
  )
}
