"use client"

import * as React from "react"
import {
  FileDown,
  Filter,
  BarChart3,
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
  X,
  Building2,
  TrendingUp,
  CalendarRange,
  RefreshCw,
  Cigarette,
  Clock,
  Users,
  Trophy,
  CheckCircle2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { useFirestore, useUser } from "@/firebase"
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts: any) {
  if (!ts?.toDate) return '—'
  return format(ts.toDate(), 'dd/MM/yyyy', { locale: es })
}
function fmtDateTime(ts: any) {
  if (!ts?.toDate) return '—'
  return format(ts.toDate(), 'dd/MM/yyyy HH:mm', { locale: es })
}

// ── export functions (browser-only, dynamic imports) ─────────────────────────

async function generateExcel(visits: any[]) {
  const XLSX = await import('xlsx')
  const rows = visits.map(v => ({
    'Fecha Entrada':        fmtDateTime(v.entryTime),
    'Empresa':              v.companyName      || '—',
    'Área':                 v.areaName         || '—',
    'Supervisor':           v.supervisorName   || '—',
    'Personal':             v.personnelCount   ?? 1,
    'Placas':               v.vehiclePlates    || '—',
    'Placas Verificadas':   v.platesVerified   ? 'Sí' : 'No',
    'Zapatos Seguridad':    v.safetyEquipment?.shoes ? 'Sí' : 'No',
    'Chaleco Seguridad':    v.safetyEquipment?.vest  ? 'Sí' : 'No',
    'Estado':               v.status === 'Active' ? 'Activo' : 'Completado',
    'Fecha Salida':         fmtDateTime(v.exitTime),
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Visitas')
  XLSX.writeFile(wb, `reporte-visitas-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}

async function generatePDF(visits: any[]) {
  const { jsPDF }   = await import('jspdf')
  const autoTable   = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'landscape' })

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('ViñoPlastic — Reporte de Auditoría de Accesos', 14, 18)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Generado: ${format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}`, 14, 26)
  doc.text(`Total de registros: ${visits.length}`, 14, 32)

  autoTable(doc, {
    startY: 40,
    head: [['Fecha', 'Empresa', 'Área', 'Supervisor', 'Personal', 'Placas', 'Plc. Ver.', 'Zapatos', 'Chaleco', 'Estado', 'Salida']],
    body: visits.map(v => [
      fmtDate(v.entryTime),
      v.companyName    || '—',
      v.areaName       || '—',
      v.supervisorName || '—',
      String(v.personnelCount ?? 1),
      v.vehiclePlates  || '—',
      v.platesVerified ? 'Sí' : 'No',
      v.safetyEquipment?.shoes ? 'Sí' : 'No',
      v.safetyEquipment?.vest  ? 'Sí' : 'No',
      v.status === 'Active' ? 'Activo' : 'Completado',
      fmtDate(v.exitTime),
    ]),
    styles:      { fontSize: 8, cellPadding: 3 },
    headStyles:  { fillColor: [33, 102, 171], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`auditoria-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

async function generateVisitPDF(visit: any) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Comprobante de Acceso', 14, 22)
  doc.setDrawColor(33, 102, 171)
  doc.setLineWidth(0.5)
  doc.line(14, 26, 196, 26)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60)

  const rows = [
    ['Empresa',           visit.companyName    || '—'],
    ['Área',              visit.areaName       || '—'],
    ['Supervisor',        visit.supervisorName || '—'],
    ['Personal',          String(visit.personnelCount ?? 1)],
    ['Placas',            visit.vehiclePlates  || '—'],
    ['Placas verificadas', visit.platesVerified ? 'Sí' : 'No'],
    ['Zapatos seguridad', visit.safetyEquipment?.shoes ? 'Sí' : 'No'],
    ['Chaleco seguridad', visit.safetyEquipment?.vest  ? 'Sí' : 'No'],
    ['Fecha Entrada',     fmtDateTime(visit.entryTime)],
    ['Fecha Salida',      fmtDateTime(visit.exitTime)],
    ['Estado',            visit.status === 'Active' ? 'Activo' : 'Completado'],
  ]

  rows.forEach(([label, value], i) => {
    const y = 38 + i * 12
    doc.setFont('helvetica', 'bold')
    doc.text(label + ':', 14, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, 70, y)
  })

  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('ViñoPlastic — Control de Acceso de Contratistas', 14, 285)

  doc.save(`visita-${visit.id?.slice(0, 8)}.pdf`)
}

// ── Smoking helpers ───────────────────────────────────────────────────────────

function calcDurationMins(exit: any, ret: any): number | null {
  const e = exit?.toDate?.() ?? null
  const r = ret?.toDate?.()  ?? null
  if (!e || !r) return null
  return Math.round((r.getTime() - e.getTime()) / 60_000)
}

function fmtDurationMins(mins: number | null): string {
  if (mins === null) return '—'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

async function generateSmokingExcel(records: any[]) {
  const XLSX = await import('xlsx')
  const rows = records.map(r => {
    const mins = calcDurationMins(r.exitTime, r.returnTime)
    return {
      'Empleado':      r.nombre      || '—',
      'Puesto':        r.puesto      || '—',
      'Departamento':  r.departamento || '—',
      'Turno':         r.turno       || '—',
      'Fecha':         r.date        || '—',
      'Salida':        r.exitTime?.toDate  ? format(r.exitTime.toDate(),  'HH:mm') : '—',
      'Regreso':       r.returnTime?.toDate ? format(r.returnTime.toDate(), 'HH:mm') : '—',
      'Duración':      fmtDurationMins(mins),
      'Estado':        r.status === 'out' ? 'Fuera' : 'Regresó',
    }
  })
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Fumadores')
  XLSX.writeFile(wb, `fumadores-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}

async function generateSmokingPDF(records: any[]) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('ViñoPlastic — Reporte de Área de Fumadores', 14, 18)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Generado: ${format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}`, 14, 26)
  doc.text(`Total de registros: ${records.length}`, 14, 32)

  autoTable(doc, {
    startY: 40,
    head: [['Empleado', 'Puesto', 'Departamento', 'Turno', 'Fecha', 'Salida', 'Regreso', 'Duración', 'Estado']],
    body: records.map(r => {
      const mins = calcDurationMins(r.exitTime, r.returnTime)
      return [
        r.nombre       || '—',
        r.puesto        || '—',
        r.departamento  || '—',
        r.turno         || '—',
        r.date          || '—',
        r.exitTime?.toDate   ? format(r.exitTime.toDate(),  'HH:mm') : '—',
        r.returnTime?.toDate ? format(r.returnTime.toDate(), 'HH:mm') : '—',
        fmtDurationMins(mins),
        r.status === 'out' ? 'Fuera' : 'Regresó',
      ]
    }),
    styles:     { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [180, 83, 9], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`fumadores-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

// ── Monthly summary helpers ───────────────────────────────────────────────────

function buildMonthlySummary(visits: any[]) {
  const byMonth: Record<string, { count: number; personnel: number; completed: number }> = {}
  const byCompany: Record<string, number> = {}
  const byArea: Record<string, number> = {}

  visits.forEach(v => {
    if (v.entryTime?.toDate) {
      const key = format(v.entryTime.toDate(), 'MMM yyyy', { locale: es })
      if (!byMonth[key]) byMonth[key] = { count: 0, personnel: 0, completed: 0 }
      byMonth[key].count++
      byMonth[key].personnel += Number(v.personnelCount) || 1
      if (v.status !== 'Active') byMonth[key].completed++
    }
    if (v.companyName) byCompany[v.companyName] = (byCompany[v.companyName] || 0) + 1
    if (v.areaName)    byArea[v.areaName]        = (byArea[v.areaName]    || 0) + 1
  })

  const topCompanies = Object.entries(byCompany).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topAreas     = Object.entries(byArea).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const months       = Object.entries(byMonth).slice(-6)

  return { months, topCompanies, topAreas }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const db = useFirestore()
  const { user, loading: authLoading } = useUser()
  const { toast } = useToast()

  // fetch
  const [visits, setVisits] = React.useState<any[] | null>(null)
  const [loading, setLoading] = React.useState(false)

  const fetchVisits = React.useCallback(async () => {
    if (!db || !user || authLoading) return
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, "visits"), orderBy("entryTime", "desc"), limit(200)))
      setVisits(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch {
      setVisits([])
    } finally {
      setLoading(false)
    }
  }, [db, user, authLoading])

  React.useEffect(() => { fetchVisits() }, [fetchVisits])

  // filter state
  const [filterOpen,    setFilterOpen]    = React.useState(false)
  const [summaryOpen,   setSummaryOpen]   = React.useState(false)
  const [dateFrom,      setDateFrom]      = React.useState('')
  const [dateTo,        setDateTo]        = React.useState('')
  const [statusFilter,  setStatusFilter]  = React.useState('all')
  const [companyFilter, setCompanyFilter] = React.useState('')

  // loading states
  const [genXlsx, setGenXlsx] = React.useState(false)
  const [genPdf,  setGenPdf]  = React.useState(false)
  const [genAll,  setGenAll]  = React.useState(false)
  const [genRow,  setGenRow]  = React.useState<string | null>(null)

  const filteredVisits = React.useMemo(() => {
    if (!visits) return []
    return visits.filter(v => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (companyFilter && !v.companyName?.toLowerCase().includes(companyFilter.toLowerCase())) return false
      if (dateFrom && v.entryTime?.toDate && v.entryTime.toDate() < new Date(dateFrom)) return false
      if (dateTo   && v.entryTime?.toDate && v.entryTime.toDate() > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [visits, statusFilter, companyFilter, dateFrom, dateTo])

  const activeFilters = [dateFrom, dateTo, statusFilter !== 'all', companyFilter].filter(Boolean).length

  const summary = React.useMemo(() => visits ? buildMonthlySummary(visits) : null, [visits])

  // handlers
  const handleExcel = async () => {
    if (!filteredVisits.length) return toast({ title: 'Sin datos para exportar' })
    setGenXlsx(true)
    try { await generateExcel(filteredVisits); toast({ title: 'Excel descargado' }) }
    catch { toast({ variant: 'destructive', title: 'Error al generar Excel' }) }
    finally { setGenXlsx(false) }
  }

  const handlePDF = async () => {
    if (!filteredVisits.length) return toast({ title: 'Sin datos para exportar' })
    setGenPdf(true)
    try { await generatePDF(filteredVisits); toast({ title: 'PDF descargado' }) }
    catch { toast({ variant: 'destructive', title: 'Error al generar PDF' }) }
    finally { setGenPdf(false) }
  }

  const handleAll = async () => {
    if (!filteredVisits.length) return toast({ title: 'Sin datos para exportar' })
    setGenAll(true)
    try {
      await generateExcel(filteredVisits)
      await generatePDF(filteredVisits)
      toast({ title: 'Archivos descargados', description: 'Excel y PDF generados correctamente.' })
    } catch { toast({ variant: 'destructive', title: 'Error al generar archivos' }) }
    finally { setGenAll(false) }
  }

  const handleRowPDF = async (visit: any) => {
    setGenRow(visit.id)
    try { await generateVisitPDF(visit); toast({ title: 'Comprobante descargado' }) }
    catch { toast({ variant: 'destructive', title: 'Error al generar comprobante' }) }
    finally { setGenRow(null) }
  }

  const clearFilters = () => {
    setDateFrom(''); setDateTo(''); setStatusFilter('all'); setCompanyFilter('')
  }

  // ── Fumadores ─────────────────────────────────────────────────────────────
  const [smokingRecords, setSmokingRecords] = React.useState<any[] | null>(null)
  const [smokeLoading,   setSmokeLoading]   = React.useState(false)
  const [smokeDateFrom,  setSmokeDateFrom]  = React.useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [smokeDateTo,    setSmokeDateTo]    = React.useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [smokeDeptFilter, setSmokeDeptFilter] = React.useState('')
  const [smokeFilterOpen, setSmokeFilterOpen] = React.useState(false)
  const [genSmokeXlsx,   setGenSmokeXlsx]  = React.useState(false)
  const [genSmokePdf,    setGenSmokePdf]    = React.useState(false)

  const fetchSmoking = React.useCallback(async () => {
    if (!db || !user || authLoading) return
    setSmokeLoading(true)
    try {
      const snap = await getDocs(
        query(
          collection(db, 'fumadores'),
          where('date', '>=', smokeDateFrom),
          where('date', '<=', smokeDateTo),
          limit(500)
        )
      )
      setSmokingRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch {
      setSmokingRecords([])
    } finally {
      setSmokeLoading(false)
    }
  }, [db, user, authLoading, smokeDateFrom, smokeDateTo])

  React.useEffect(() => { fetchSmoking() }, [fetchSmoking])

  const filteredSmoking = React.useMemo(() => {
    if (!smokingRecords) return []
    return smokingRecords
      .filter(r => !smokeDeptFilter || r.departamento?.toLowerCase().includes(smokeDeptFilter.toLowerCase()))
      .sort((a, b) => {
        const da = a.exitTime?.toDate?.()?.getTime() ?? 0
        const db2 = b.exitTime?.toDate?.()?.getTime() ?? 0
        return db2 - da
      })
  }, [smokingRecords, smokeDeptFilter])

  const smokingStats = React.useMemo(() => {
    if (!filteredSmoking.length) return null
    const completed = filteredSmoking.filter(r => r.status === 'returned')
    const durations = completed.map(r => calcDurationMins(r.exitTime, r.returnTime)).filter((m): m is number => m !== null)
    const avgMins = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null
    const byEmployee: Record<string, { nombre: string; count: number }> = {}
    filteredSmoking.forEach(r => {
      if (!byEmployee[r.employeeId]) byEmployee[r.employeeId] = { nombre: r.nombre, count: 0 }
      byEmployee[r.employeeId].count++
    })
    const topEmployee = Object.values(byEmployee).sort((a, b) => b.count - a.count)[0] ?? null
    return { total: filteredSmoking.length, avgMins, topEmployee, outNow: filteredSmoking.filter(r => r.status === 'out').length }
  }, [filteredSmoking])

  const handleSmokeExcel = async () => {
    if (!filteredSmoking.length) return toast({ title: 'Sin datos para exportar' })
    setGenSmokeXlsx(true)
    try { await generateSmokingExcel(filteredSmoking); toast({ title: 'Excel descargado' }) }
    catch { toast({ variant: 'destructive', title: 'Error al generar Excel' }) }
    finally { setGenSmokeXlsx(false) }
  }

  const handleSmokePDF = async () => {
    if (!filteredSmoking.length) return toast({ title: 'Sin datos para exportar' })
    setGenSmokePdf(true)
    try { await generateSmokingPDF(filteredSmoking); toast({ title: 'PDF descargado' }) }
    catch { toast({ variant: 'destructive', title: 'Error al generar PDF' }) }
    finally { setGenSmokePdf(false) }
  }

  // Smoking detail modal (mobile)
  const [smokeDetailOpen, setSmokeDetailOpen] = React.useState(false)
  const [smokeDetailRecord, setSmokeDetailRecord] = React.useState<any | null>(null)

  const openSmokeDetail = (record: any) => {
    setSmokeDetailRecord(record)
    setSmokeDetailOpen(true)
  }

  const REPORT_TABS = [
    { value: "accesos", label: "Accesos" },
    { value: "fumadores", label: "Fumadores" },
  ] as const
  type ReportTabValue = typeof REPORT_TABS[number]["value"]

  const [activeReportTab, setActiveReportTab] = React.useState<ReportTabValue>("accesos")

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-8">

    {/* Pill tabs bar */}
    <div className="mb-5 border-b border-border/40">
      <div className="flex flex-wrap gap-1.5 py-2">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveReportTab(tab.value)}
            className="relative shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-full outline-none transition-colors"
          >
            {activeReportTab === tab.value && (
              <motion.div
                layoutId="reports-pill"
                className="absolute inset-0 bg-primary rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className={`relative z-10 transition-colors duration-150 flex items-center gap-1.5 ${
              activeReportTab === tab.value
                ? "text-primary-foreground"
                : "text-muted-foreground"
            }`}>
              {tab.value === "accesos" ? <Building2 className="w-3.5 h-3.5" /> : <Cigarette className="w-3.5 h-3.5" />}
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>

    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeReportTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >

      {/* ═══════════════ TAB ACCESOS ═══════════════ */}
      {activeReportTab === "accesos" && (
      <div className="space-y-6 md:space-y-8">

      {/* Export actions — mobile: icon buttons row / desktop: cards */}
      <div className="flex gap-2 sm:hidden">
        <Button variant="secondary" className="w-20 h-14 flex-col gap-1 text-xs" onClick={handleExcel} disabled={genXlsx || loading}>
          {genXlsx ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5 text-green-600" />}
          Excel
        </Button>
        <Button variant="secondary" className="w-20 h-14 flex-col gap-1 text-xs" onClick={handlePDF} disabled={genPdf || loading}>
          {genPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5 text-red-600" />}
          PDF
        </Button>
        <Button variant="secondary" className="w-20 h-14 flex-col gap-1 text-xs" onClick={() => setSummaryOpen(true)} disabled={loading}>
          <BarChart3 className="w-5 h-5 text-accent" />
          Resumen
        </Button>
      </div>

      <div className="hidden sm:grid grid-cols-3 gap-4 md:gap-6">
        <Card className="border-none shadow-sm hover:ring-2 hover:ring-primary/20 transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" /> Exportar Excel
            </CardTitle>
            <CardDescription className="text-xs">Registros en formato .xlsx.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={handleExcel} disabled={genXlsx || loading}>
              {genXlsx ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Generar XLSX
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:ring-2 hover:ring-primary/20 transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" /> Reporte PDF
            </CardTitle>
            <CardDescription className="text-xs">Reporte formal de cumplimiento con tabla de accesos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={handlePDF} disabled={genPdf || loading}>
              {genPdf ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Generar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:ring-2 hover:ring-primary/20 transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent" /> Detalle Mensual
            </CardTitle>
            <CardDescription className="text-xs">Tendencias visuales y estadísticas de ocupación.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={() => setSummaryOpen(true)} disabled={loading}>
              Ver Resumen
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active filter pills */}
      {activeFilters > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Filtros activos:</span>
          {dateFrom && <Badge variant="secondary" className="gap-1">{dateFrom} <X className="w-3 h-3 cursor-pointer" onClick={() => setDateFrom('')} /></Badge>}
          {dateTo   && <Badge variant="secondary" className="gap-1">hasta {dateTo} <X className="w-3 h-3 cursor-pointer" onClick={() => setDateTo('')} /></Badge>}
          {statusFilter !== 'all' && <Badge variant="secondary" className="gap-1">{statusFilter === 'Active' ? 'Activos' : 'Completados'} <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter('all')} /></Badge>}
          {companyFilter && <Badge variant="secondary" className="gap-1">{companyFilter} <X className="w-3 h-3 cursor-pointer" onClick={() => setCompanyFilter('')} /></Badge>}
          <button className="text-xs text-destructive underline" onClick={clearFilters}>Limpiar todo</button>
          <span className="text-xs text-muted-foreground ml-auto">{filteredVisits.length} registros</span>
        </div>
      )}

      {/* Visits table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle>Historial</CardTitle>
              <CardDescription>
                {loading ? 'Cargando...' : `${filteredVisits.length} visitas`}
              </CardDescription>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={fetchVisits} disabled={loading} title="Actualizar">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="outline" size="sm" className="gap-2 relative" onClick={() => setFilterOpen(true)}>
                <Filter className="w-4 h-4" />
                {activeFilters > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilters}
                  </span>
                )}
              </Button>
              <Button size="sm" className="bg-primary text-white" onClick={handleAll} disabled={genAll || loading}>
                {genAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredVisits.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">No hay registros con los filtros actuales.</p>
          ) : (
            <>
              {/* Mobile — solo Empresa, Estado y Comprobante */}
              <div className="flex flex-col divide-y md:hidden">
                {filteredVisits.map(visit => (
                  <div key={visit.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="font-semibold text-sm shrink-0">{visit.companyName ? visit.companyName.slice(0, 17) + (visit.companyName.length > 17 ? '…' : '') : '—'}</span>
                    <Badge className={`text-xs rounded-md shrink-0 ${
                      visit.status === 'Active'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}>
                      {visit.status === 'Active' ? 'Activo' : 'Completado'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleRowPDF(visit)} disabled={genRow === visit.id}>
                      {genRow === visit.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold">Fecha</TableHead>
                      <TableHead className="font-semibold">Empresa</TableHead>
                      <TableHead className="font-semibold">Área</TableHead>
                      <TableHead className="font-semibold">Supervisor</TableHead>
                      <TableHead className="font-semibold">Personal</TableHead>
                      <TableHead className="font-semibold">Placas</TableHead>
                      <TableHead className="font-semibold">Equipo</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold">Permanencia</TableHead>
                      <TableHead className="text-right font-semibold">Comp.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisits.map(visit => (
                      <TableRow key={visit.id}>
                        <TableCell className="text-xs font-mono">{fmtDate(visit.entryTime)}</TableCell>
                        <TableCell className="font-semibold">{visit.companyName || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{visit.areaName || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{visit.supervisorName || '—'}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-mono">{visit.personnelCount ?? 1}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{visit.vehiclePlates || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant="outline" className={`rounded-md text-xs px-1.5 ${visit.safetyEquipment?.shoes ? 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-400' : 'border-red-200 dark:border-red-800 text-red-500 dark:text-red-400'}`}>
                              Zapatos
                            </Badge>
                            <Badge variant="outline" className={`rounded-md text-xs px-1.5 ${visit.safetyEquipment?.vest ? 'border-green-300 text-green-700' : 'border-red-200 text-red-500'}`}>
                              Chaleco
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-md ${visit.status === 'Active' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            {visit.status === 'Active' ? 'Activo' : 'Completado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {visit.entryTime?.toDate ? formatDistanceToNow(visit.entryTime.toDate(), { locale: es }) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRowPDF(visit)} disabled={genRow === visit.id}>
                            {genRow === visit.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Filter Sheet ────────────────────────────────────────── */}
      {filterOpen && (
        <Sheet open onOpenChange={(o) => { if (!o) setFilterOpen(false) }}>
          <SheetContent 
            onCloseAutoFocus={(e) => e.preventDefault()} 
            className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden"
          >
            <div className="p-6 pb-0">
              <SheetHeader>
                <SheetTitle className="text-xl">Filtrar registros</SheetTitle>
                <SheetDescription>Aplica filtros para refinar el historial y los reportes.</SheetDescription>
              </SheetHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 tracking-wider">
                  <CalendarRange className="w-3.5 h-3.5" /> Rango de fechas
                </label>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground ml-1">Desde</p>
                    <Input 
                      type="date" 
                      value={dateFrom} 
                      onChange={e => setDateFrom(e.target.value)} 
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground ml-1">Hasta</p>
                    <Input 
                      type="date" 
                      value={dateTo} 
                      onChange={e => setDateTo(e.target.value)} 
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Estado de visita</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="Active">Solo activos</SelectItem>
                    <SelectItem value="Completed">Solo completados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 tracking-wider">
                  <Building2 className="w-3.5 h-3.5" /> Empresa
                </label>
                <Input
                  placeholder="Buscar por empresa..."
                  value={companyFilter}
                  onChange={e => setCompanyFilter(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <SheetFooter className="p-6 border-t bg-muted/10 mt-auto flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto h-11 rounded-xl" 
                onClick={() => { clearFilters(); setFilterOpen(false) }}
              >
                Limpiar filtros
              </Button>
              <Button 
                className="w-full sm:flex-1 h-11 rounded-xl font-bold" 
                onClick={() => setFilterOpen(false)}
              >
                Aplicar ({filteredVisits.length})
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* ── Monthly Summary Dialog ──────────────────────────────── */}
      {summaryOpen && summary && (
        <Dialog open onOpenChange={(o) => { if (!o) setSummaryOpen(false) }}>
          <DialogContent
            className="max-w-lg w-[95vw] max-h-[85vh] overflow-y-auto rounded-2xl"
            onCloseAutoFocus={(e) => e.preventDefault()}
            aria-describedby={undefined}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="w-5 h-5 text-primary" /> Resumen de Accesos
              </DialogTitle>
              <DialogDescription>Estadísticas basadas en los últimos 200 registros.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-2">
              {/* Totals */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total visitas', value: visits?.length ?? 0, color: 'text-primary' },
                  { label: 'Personal total', value: visits?.reduce((s, v) => s + (Number(v.personnelCount) || 1), 0) ?? 0, color: 'text-purple-600' },
                  { label: 'Completadas', value: visits?.filter(v => v.status !== 'Active').length ?? 0, color: 'text-green-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-muted/40 rounded-xl p-3 text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* By month */}
              {summary.months.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">Tendencia mensual</p>
                  <div className="space-y-3">
                    {summary.months.map(([month, data]) => {
                      const max = Math.max(...summary.months.map(([, d]) => d.count))
                      const pct = Math.round((data.count / max) * 100)
                      return (
                        <div key={month} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="capitalize font-semibold">{month}</span>
                            <span className="text-muted-foreground font-medium">{data.count} visitas · {data.personnel} personas</span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Top companies */}
              {summary.topCompanies.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-1.5 tracking-wider">
                    <Building2 className="w-3.5 h-3.5" /> Empresas con más ingresos
                  </p>
                  <div className="space-y-2">
                    {summary.topCompanies.map(([name, count], i) => (
                      <div key={name} className="flex items-center gap-3 p-2 bg-muted/20 rounded-lg">
                        <span className="text-xs font-black text-primary w-4">{i + 1}</span>
                        <span className="flex-1 text-sm font-semibold truncate">{name}</span>
                        <Badge variant="secondary" className="font-mono font-bold shrink-0">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top areas */}
              {summary.topAreas.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-1.5 tracking-wider">
                    <BarChart3 className="w-3.5 h-3.5" /> Áreas más frecuentes
                  </p>
                  <div className="space-y-2">
                    {summary.topAreas.map(([name, count], i) => (
                      <div key={name} className="flex items-center gap-3 p-2 bg-muted/20 rounded-lg">
                        <span className="text-xs font-black text-muted-foreground w-4">{i + 1}</span>
                        <span className="flex-1 text-sm font-semibold truncate">{name}</span>
                        <Badge variant="secondary" className="font-mono font-bold shrink-0">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      </div>
      )}

      {/* ═══════════════ TAB FUMADORES ═══════════════ */}
      {activeReportTab === "fumadores" && (
      <div className="space-y-6 md:space-y-8">

        {/* Stats cards */}
        {smokingStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'Total salidas', value: smokingStats.total, icon: <Cigarette className="w-4 h-4" />, color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Fuera ahora',   value: smokingStats.outNow, icon: <Users className="w-4 h-4" />, color: 'text-destructive' },
              { label: 'Duración prom.', value: fmtDurationMins(smokingStats.avgMins), icon: <Clock className="w-4 h-4" />, color: 'text-primary' },
              { label: 'Más salidas', value: smokingStats.topEmployee ? `${smokingStats.topEmployee.nombre.split(' ')[0]} (${smokingStats.topEmployee.count})` : '—', icon: <Trophy className="w-4 h-4" />, color: 'text-muted-foreground' },
            ].map(({ label, value, icon, color }) => (
              <Card key={label} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className={`flex items-center gap-2 mb-1 ${color}`}>
                    {icon}
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                  </div>
                  <p className={`text-xl font-black truncate ${color}`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Table card */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2">
                  <Cigarette className="w-4 h-4 text-muted-foreground" /> Historial de fumadores
                </CardTitle>
                <CardDescription>
                  {smokeLoading ? 'Cargando…' : `${filteredSmoking.length} registros`}
                </CardDescription>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchSmoking} disabled={smokeLoading} title="Actualizar">
                  <RefreshCw className={`w-4 h-4 ${smokeLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setSmokeFilterOpen(true)}>
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filtrar</span>
                </Button>
                <Button variant="secondary" size="sm" className="gap-2" onClick={handleSmokeExcel} disabled={genSmokeXlsx || smokeLoading}>
                  {genSmokeXlsx ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-green-600" />}
                  <span className="hidden sm:inline">Excel</span>
                </Button>
                <Button variant="secondary" size="sm" className="gap-2" onClick={handleSmokePDF} disabled={genSmokePdf || smokeLoading}>
                  {genSmokePdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-red-600" />}
                  <span className="hidden sm:inline">PDF</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {smokeLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredSmoking.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground text-sm">
                No hay registros para el período seleccionado.
              </p>
            ) : (
              <>
                {/* Mobile view — simple list */}
                <div className="flex flex-col divide-y md:hidden">
                  {filteredSmoking.map(r => {
                    const mins = calcDurationMins(r.exitTime, r.returnTime)
                    const isLong = mins !== null && mins >= 15
                    return (
                      <button
                        key={r.id}
                        onClick={() => openSmokeDetail(r)}
                        className="px-4 py-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-tight">{r.nombre}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{r.puesto}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-medium tabular-nums ${isLong ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {fmtDurationMins(mins)}
                          </span>
                          {r.status === 'out' ? (
                            <Badge className="bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[11px] gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                            </Badge>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold">Empleado</TableHead>
                        <TableHead className="font-semibold">Departamento</TableHead>
                        <TableHead className="font-semibold">Turno</TableHead>
                        <TableHead className="font-semibold">Fecha</TableHead>
                        <TableHead className="font-semibold">Salida</TableHead>
                        <TableHead className="font-semibold">Regreso</TableHead>
                        <TableHead className="font-semibold">Duración</TableHead>
                        <TableHead className="font-semibold">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSmoking.map(r => {
                        const mins = calcDurationMins(r.exitTime, r.returnTime)
                        const isLong = mins !== null && mins >= 15
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <p className="font-semibold text-sm leading-tight">{r.nombre}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{r.puesto}</p>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{r.departamento}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{r.turno}</TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">{r.date}</TableCell>
                            <TableCell className="font-mono text-sm tabular-nums">
                              {r.exitTime?.toDate ? format(r.exitTime.toDate(), 'HH:mm') : '—'}
                            </TableCell>
                            <TableCell className="font-mono text-sm tabular-nums">
                              {r.returnTime?.toDate ? format(r.returnTime.toDate(), 'HH:mm') : '—'}
                            </TableCell>
                            <TableCell className={`text-sm font-medium tabular-nums ${isLong ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {fmtDurationMins(mins)}
                            </TableCell>
                            <TableCell>
                              {r.status === 'out' ? (
                                <Badge className="bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[11px] gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Fuera
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Regresó
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Filter Sheet */}
        {smokeFilterOpen && (
          <Sheet open onOpenChange={(o) => { if (!o) setSmokeFilterOpen(false) }}>
            <SheetContent
              onCloseAutoFocus={(e) => e.preventDefault()}
              className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden"
            >
              <div className="p-6 pb-0">
                <SheetHeader>
                  <SheetTitle className="text-xl">Filtrar fumadores</SheetTitle>
                  <SheetDescription>Ajusta el rango de fechas y departamento.</SheetDescription>
                </SheetHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 tracking-wider">
                    <CalendarRange className="w-3.5 h-3.5" /> Rango de fechas
                  </label>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground ml-1">Desde</p>
                      <Input type="date" value={smokeDateFrom} onChange={e => setSmokeDateFrom(e.target.value)} className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground ml-1">Hasta</p>
                      <Input type="date" value={smokeDateTo} onChange={e => setSmokeDateTo(e.target.value)} className="h-11 rounded-xl" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 tracking-wider">
                    <Building2 className="w-3.5 h-3.5" /> Departamento
                  </label>
                  <Input
                    placeholder="Buscar por departamento…"
                    value={smokeDeptFilter}
                    onChange={e => setSmokeDeptFilter(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <SheetFooter className="p-6 border-t bg-muted/10 mt-auto flex-col sm:flex-row gap-3">
                <Button variant="outline" className="w-full sm:w-auto h-11 rounded-xl"
                  onClick={() => { setSmokeDeptFilter(''); setSmokeFilterOpen(false) }}>
                  Limpiar
                </Button>
                <Button className="w-full sm:flex-1 h-11 rounded-xl font-bold"
                  onClick={() => setSmokeFilterOpen(false)}>
                  Aplicar ({filteredSmoking.length})
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}

        {/* Smoking detail dialog (mobile) */}
        {smokeDetailRecord && (
          <Dialog open={smokeDetailOpen} onOpenChange={(o) => { if (!o) setSmokeDetailRecord(null); setSmokeDetailOpen(o) }}>
            <DialogContent className="w-[95vw] max-w-sm rounded-2xl p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
              <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/50">
                <DialogTitle className="text-base">Detalles del registro</DialogTitle>
              </DialogHeader>

              <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Empleado */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empleado</label>
                  <p className="text-sm font-semibold">{smokeDetailRecord.nombre}</p>
                </div>

                {/* Puesto */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Puesto</label>
                  <p className="text-sm text-muted-foreground">{smokeDetailRecord.puesto}</p>
                </div>

                {/* Departamento */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Departamento</label>
                  <p className="text-sm text-muted-foreground">{smokeDetailRecord.departamento}</p>
                </div>

                {/* Turno */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Turno</label>
                  <p className="text-sm text-muted-foreground">{smokeDetailRecord.turno}</p>
                </div>

                {/* Fecha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</label>
                  <p className="text-sm text-muted-foreground font-mono">{smokeDetailRecord.date}</p>
                </div>

                {/* Salida */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salida</label>
                  <p className="text-sm font-mono">
                    {smokeDetailRecord.exitTime?.toDate ? format(smokeDetailRecord.exitTime.toDate(), 'HH:mm') : '—'}
                  </p>
                </div>

                {/* Regreso */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Regreso</label>
                  <p className="text-sm font-mono">
                    {smokeDetailRecord.returnTime?.toDate ? format(smokeDetailRecord.returnTime.toDate(), 'HH:mm') : '—'}
                  </p>
                </div>

                {/* Duración */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duración</label>
                  <p className="text-sm font-medium">
                    {fmtDurationMins(calcDurationMins(smokeDetailRecord.exitTime, smokeDetailRecord.returnTime))}
                  </p>
                </div>

                {/* Estado */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</label>
                  {smokeDetailRecord.status === 'out' ? (
                    <Badge className="w-fit bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[11px] gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Fuera
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="w-fit text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      Regresó
                    </Badge>
                  )}
                </div>
              </div>

              <div className="border-t border-border/50 p-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 rounded-lg"
                  onClick={() => setSmokeDetailOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

      </div>
      )}
      </motion.div>
    </AnimatePresence>

    </div>
  )
}
