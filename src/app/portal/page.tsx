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
  ArrowRight,
  Activity,
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
  return <div className={`animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800 ${className}`} />
}

function PortalSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
      <div className="lg:w-[340px] p-8 space-y-6 border-r border-neutral-100 dark:border-neutral-800">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex-1 p-8 space-y-6">
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
    accentLight: "rgba(22,163,74,0.08)",
    accentBorder: "rgba(22,163,74,0.18)",
    label: "Vigente",
    icon: ShieldCheck,
    dot: "bg-emerald-500",
  },
  Expired: {
    accent: "#dc2626",
    accentLight: "rgba(220,38,38,0.07)",
    accentBorder: "rgba(220,38,38,0.18)",
    label: "Vencido",
    icon: ShieldX,
    dot: "bg-red-500",
  },
  Pending: {
    accent: "#d97706",
    accentLight: "rgba(217,119,6,0.07)",
    accentBorder: "rgba(217,119,6,0.18)",
    label: "Pendiente",
    icon: ShieldAlert,
    dot: "bg-amber-500",
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
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');

          .portal-root {
            font-family: 'DM Sans', sans-serif;
          }
          .portal-mono {
            font-family: 'DM Mono', monospace;
          }
          .sua-glow {
            box-shadow: 0 0 0 1px var(--sua-color-border), 0 4px 24px var(--sua-color-shadow);
          }
          .action-btn {
            transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
          }
          .action-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.07);
          }
          .action-btn:active {
            transform: translateY(0);
          }
          .visit-row:hover td {
            background: rgba(0,0,0,0.018);
          }
          .divider-label {
            letter-spacing: 0.1em;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            color: #9ca3af;
          }
          .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            display: inline-block;
          }
          .sidebar-section {
            padding: 0 0 1.5rem 0;
            border-bottom: 1px solid #f1f1f1;
          }
          .sidebar-section:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }
        `}</style>

      <div className="portal-root flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] bg-[#fafafa]">

        {/* ══════════════════════════════════════════
              SIDEBAR — refined executive panel
              ══════════════════════════════════════════ */}
        <motion.aside
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="lg:w-[320px] xl:w-[340px] shrink-0 bg-white border-r border-neutral-100 overflow-y-auto"
          style={{ boxShadow: "2px 0 16px rgba(0,0,0,0.03)" }}
        >
          <div className="p-7 space-y-7">

            {/* Company identity */}
            <motion.div variants={fadeUp} className="sidebar-section pb-6">
              <div className="flex items-start gap-3.5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)" }}
                >
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h1 className="text-[17px] font-semibold tracking-tight text-neutral-900 leading-tight truncate">
                    {company.name}
                  </h1>
                  {company.type && (
                    <p className="text-[12px] text-neutral-400 mt-0.5 capitalize font-normal">{company.type}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* SUA Status — executive card */}
            <motion.div variants={fadeUp} className="sidebar-section pb-6">
              <p className="divider-label mb-3">Estado SUA</p>

              <div
                className="rounded-xl p-4 sua-glow"
                style={{
                  ["--sua-color-border" as any]: sua.accentBorder,
                  ["--sua-color-shadow" as any]: sua.accentLight,
                  background: sua.accentLight,
                  border: `1px solid ${sua.accentBorder}`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <SuaIcon className="w-4 h-4" style={{ color: sua.accent }} />
                    <span className="text-[13px] font-semibold" style={{ color: sua.accent }}>
                      {sua.label}
                    </span>
                  </div>
                  {validUntil && (
                    <span
                      className="portal-mono text-[10px] font-medium px-2 py-0.5 rounded-md"
                      style={{ background: sua.accentBorder, color: sua.accent }}
                    >
                      {validUntil}
                    </span>
                  )}
                </div>

                {/* Progress track */}
                <div className="h-1 w-full rounded-full bg-white/60 overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ background: sua.accent }}
                  />
                </div>

                {daysLeft !== null && (
                  <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 mb-3">
                    <Clock className="w-3 h-3" />
                    {daysLeft > 0
                      ? `Vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`
                      : daysLeft === 0
                        ? "Vence hoy"
                        : `Venció hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? "s" : ""}`}
                  </p>
                )}

                {renewalSent ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 pt-3 border-t border-white/40">
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Solicitud enviada
                  </div>
                ) : (
                  <button
                    onClick={handleRenewalRequest}
                    disabled={sendingRenewal}
                    className="action-btn w-full mt-3 pt-3 border-t border-white/40 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-lg py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: sua.accent }}
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
                  className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3.5 flex items-start gap-2.5"
                >
                  <Ban className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[12px] font-semibold text-red-600">Acceso bloqueado</p>
                    <p className="text-[11px] text-red-400 mt-0.5">Contacta al administrador.</p>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Contact */}
            <motion.div variants={fadeUp} className="sidebar-section pb-6">
              <p className="divider-label mb-3">Contacto</p>
              <div className="space-y-0">
                <SidebarInfoRow icon={User} label="Representante" value={company.contact} />
                <SidebarInfoRow icon={Phone} label="Teléfono" value={company.phone} />
                <SidebarInfoRow icon={Hash} label="No. SUA" value={company.sua?.number} mono />
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div variants={fadeUp} className="sidebar-section">
              <p className="divider-label mb-3">Acciones</p>
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
          className="flex-1 overflow-y-auto"
        >
          <div className="p-7 lg:p-10 max-w-5xl space-y-8">

            {/* Page header */}
            <motion.div variants={fadeUp} className="flex items-end justify-between">
              <div>
                <h2 className="text-[30px] font-bold text-neutral-900 tracking-tight">
                  Portal
                </h2>
                <p className="text-[15px] text-neutral-400 mt-0.5">
                  Historial de registros y accesos
                </p>
              </div>
              {activeVisit && (
                <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2">
                  <span className="status-dot bg-emerald-500 animate-pulse" />
                  <span className="text-[12px] font-medium text-emerald-700">En planta ahora</span>
                </div>
              )}
            </motion.div>

            {/* Upcoming visits */}
            {upcomingVisits && upcomingVisits.length > 0 && (
              <motion.section variants={fadeUp}>
                <SectionHeader icon={CalendarClock} title="Próximas visitas" count={upcomingVisits.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
                  {upcomingVisits.slice(0, 6).map((visit, i) => (
                    <motion.div
                      key={visit.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 + 0.2, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="bg-white rounded-xl border border-neutral-100 p-4 hover:border-neutral-200 hover:shadow-sm transition-all duration-200"
                    >
                      <p className="text-[13px] font-semibold text-neutral-800">
                        {visit.scheduledDate
                          ? new Date(visit.scheduledDate + "T12:00:00").toLocaleDateString("es-MX", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                          })
                          : "—"}
                      </p>
                      {(visit as any).scheduledTime && (
                        <p className="portal-mono text-[11px] text-neutral-400 mt-1">
                          {(visit as any).scheduledTime}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2.5 text-[11px] text-neutral-400">
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

              <div className="mt-3">
                {visitsLoading ? (
                  <div className="bg-white rounded-xl border border-neutral-100 py-16 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
                  </div>
                ) : visits && visits.length > 0 ? (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block bg-white rounded-xl border border-neutral-100 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-neutral-50">
                            <th className="text-left px-5 py-3.5">
                              <span className="divider-label">Fecha</span>
                            </th>
                            <th className="text-left px-4 py-3.5">
                              <span className="divider-label">Área</span>
                            </th>
                            <th className="text-left px-4 py-3.5">
                              <span className="divider-label">Entrada</span>
                            </th>
                            <th className="text-left px-4 py-3.5">
                              <span className="divider-label">Salida</span>
                            </th>
                            <th className="text-left px-4 py-3.5">
                              <span className="divider-label">Duración</span>
                            </th>
                            <th className="text-left px-4 py-3.5">
                              <span className="divider-label">Estado</span>
                            </th>
                            <th className="text-right px-5 py-3.5">
                              <span className="divider-label">PDF</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visits.map((visit, i) => {
                            const entryDate = visit.entryTime?.toDate()
                            const exitDate = visit.exitTime?.toDate()
                            return (
                              <tr
                                key={visit.id}
                                className="visit-row border-b border-neutral-50 last:border-0 transition-colors"
                              >
                                <td className="px-5 py-3.5 text-[13px] font-medium text-neutral-800">
                                  {entryDate?.toLocaleDateString("es-MX", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }) ?? "—"}
                                </td>
                                <td className="px-4 py-3.5 text-[12px] text-neutral-500">
                                  {visit.areaName ?? "—"}
                                </td>
                                <td className="px-4 py-3.5 portal-mono text-[11px] text-neutral-500">
                                  {entryDate?.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) ?? "—"}
                                </td>
                                <td className="px-4 py-3.5 portal-mono text-[11px] text-neutral-500">
                                  {exitDate?.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) ?? "—"}
                                </td>
                                <td className="px-4 py-3.5 text-[12px] text-neutral-500">
                                  {entryDate && exitDate ? visitDuration(entryDate, exitDate) : "—"}
                                </td>
                                <td className="px-4 py-3.5">
                                  <VisitStatusBadge status={visit.status} />
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <button
                                    onClick={() => generateVoucherPDF(visit, company)}
                                    className="action-btn w-7 h-7 rounded-lg flex items-center justify-center ml-auto text-neutral-300 hover:text-neutral-600 hover:bg-neutral-50 transition-colors"
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
                          <div
                            key={visit.id}
                            className="bg-white rounded-xl border border-neutral-100 p-4 flex items-center gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-semibold text-neutral-800">
                                  {entryDate?.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) ?? "—"}
                                </p>
                                <VisitStatusBadge status={visit.status} />
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-400">
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
                              className="action-btn w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-xl border border-neutral-100 py-20 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center mx-auto mb-3">
                      <CalendarClock className="w-5 h-5 text-neutral-300" />
                    </div>
                    <p className="text-[13px] text-neutral-400">No hay visitas registradas aún.</p>
                    <p className="text-[11px] text-neutral-300 mt-1">
                      Las visitas aparecerán aquí una vez registradas.
                    </p>
                  </div>
                )}
              </div>
            </motion.section>

          </div>
        </motion.div >
      </div >

      {/* ── Active visit floating pill ── */}
      <AnimatePresence>
        {
          activeVisit && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-auto md:max-w-sm z-50"
            >
              <div className="bg-white rounded-2xl border border-neutral-100 shadow-xl shadow-neutral-900/10 px-5 py-3.5 flex items-center gap-3.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-neutral-900">Visita activa</p>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
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
          )
        }
      </AnimatePresence >

      {/* QR Dialog */}
      {
        company && (
          <ContractorQRDialog company={company} open={qrOpen} onOpenChange={setQrOpen} />
        )
      }
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
    <div className="flex items-start gap-3 py-2.5 border-b border-neutral-50 last:border-0">
      <Icon className="w-3.5 h-3.5 text-neutral-300 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium">{label}</p>
        <p className={`text-[13px] font-medium text-neutral-800 truncate mt-0.5 ${mono ? "portal-mono text-[12px]" : ""}`}>
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
      className={`action-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all ${active
        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
        : "border-neutral-100 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-200"
        }`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-emerald-500" : "text-neutral-400"}`} />
      <span className="text-[12px] font-medium">{label}</span>
      {!active && <ArrowRight className="w-3 h-3 ml-auto text-neutral-200" />}
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
        <Icon className="w-4 h-4 text-neutral-400" />
        <h2 className="text-[14px] font-semibold text-neutral-800">{title}</h2>
      </div>
      {!hideCount && count > 0 && (
        <span className="text-[11px] font-medium text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md portal-mono">
          {count}
        </span>
      )}
    </div>
  )
}

function VisitStatusBadge({ status }: { status: Visit["status"] }) {
  if (status === "Activa") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
        <span className="status-dot bg-emerald-500 animate-pulse" />
        Activa
      </span>
    )
  }
  if (status === "Programada") {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
        Programada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-[10px] font-medium text-neutral-400 bg-neutral-50 border border-neutral-100 px-2 py-0.5 rounded-md">
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
      wrapper: "border-amber-100 bg-amber-50",
      icon: "text-amber-500",
      title: "text-amber-800",
      desc: "text-amber-600",
    },
    red: {
      wrapper: "border-red-100 bg-red-50",
      icon: "text-red-500",
      title: "text-red-800",
      desc: "text-red-500",
    },
  }
  const s = styles[color]
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl border ${s.wrapper} p-6 flex gap-3.5 items-start max-w-md w-full`}
      >
        <Icon className={`w-5 h-5 ${s.icon} shrink-0 mt-0.5`} />
        <div>
          <p className={`font-semibold text-[14px] ${s.title}`}>{title}</p>
          <p className={`text-[12px] ${s.desc} mt-1 leading-relaxed`}>{description}</p>
        </div>
      </motion.div>
    </div>
  )
}
