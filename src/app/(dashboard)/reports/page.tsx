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
  Car,
  Users,
  Building2,
  TrendingUp,
  CalendarRange,
} from "lucide-react"
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
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
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
    'Fecha Entrada':  fmtDateTime(v.entryTime),
    'Empresa':        v.companyName      || '—',
    'Área':           v.areaName         || '—',
    'Supervisor':     v.supervisorName   || '—',
    'Personal':       v.personnelCount   ?? 1,
    'Placas':         v.vehiclePlates    || '—',
    'Estado':         v.status === 'Active' ? 'Activo' : 'Completado',
    'Fecha Salida':   fmtDateTime(v.exitTime),
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
    head: [['Fecha', 'Empresa', 'Área', 'Supervisor', 'Personal', 'Placas', 'Estado', 'Salida']],
    body: visits.map(v => [
      fmtDate(v.entryTime),
      v.companyName    || '—',
      v.areaName       || '—',
      v.supervisorName || '—',
      String(v.personnelCount ?? 1),
      v.vehiclePlates  || '—',
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
    ['Empresa',      visit.companyName    || '—'],
    ['Área',         visit.areaName       || '—'],
    ['Supervisor',   visit.supervisorName || '—'],
    ['Personal',     String(visit.personnelCount ?? 1)],
    ['Placas',       visit.vehiclePlates  || '—'],
    ['Fecha Entrada',fmtDateTime(visit.entryTime)],
    ['Fecha Salida', fmtDateTime(visit.exitTime)],
    ['Estado',       visit.status === 'Active' ? 'Activo' : 'Completado'],
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
  const visitsQuery = React.useMemo(() => {
    if (!db || !user || authLoading) return null
    return query(collection(db, "visits"), orderBy("entryTime", "desc"), limit(200))
  }, [db, user, authLoading])
  const { data: visits, loading } = useCollection(visitsQuery)

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

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Reportes y Auditoría</h2>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Historial de accesos y cumplimiento de contratistas.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="gap-2 relative" onClick={() => setFilterOpen(true)}>
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </Button>
          <Button className="bg-primary text-white gap-2" onClick={handleAll} disabled={genAll || loading}>
            {genAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">Descargar todo</span>
          </Button>
        </div>
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <Card className="border-none shadow-sm hover:ring-2 hover:ring-primary/20 transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" /> Exportar Excel
            </CardTitle>
            <CardDescription className="text-xs">Registros detallados en formato .xlsx.</CardDescription>
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
              <FileText className="w-5 h-5 text-red-600" /> Auditoría PDF
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
              <BarChart3 className="w-5 h-5 text-accent" /> Resumen Mensual
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Accesos</CardTitle>
              <CardDescription>
                {loading ? 'Cargando...' : `${filteredVisits.length} visitas`}
              </CardDescription>
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
              {/* Mobile cards */}
              <div className="flex flex-col divide-y md:hidden">
                {filteredVisits.map(visit => (
                  <div key={visit.id} className="px-4 py-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm">{visit.companyName || '—'}</span>
                      <Badge className={`text-xs rounded-md shrink-0 ${
                        visit.status === 'Active'
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                      }`}>
                        {visit.status === 'Active' ? 'Activo' : 'Completado'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{fmtDate(visit.entryTime)}</span>
                      {visit.areaName && <span>{visit.areaName}</span>}
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{visit.personnelCount ?? 1}</span>
                      {visit.vehiclePlates && <span className="flex items-center gap-1"><Car className="w-3 h-3" />{visit.vehiclePlates}</span>}
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => handleRowPDF(visit)} disabled={genRow === visit.id}>
                        {genRow === visit.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                        Comprobante
                      </Button>
                    </div>
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
                          <Badge className={`rounded-md ${visit.status === 'Active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}`}>
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
  )
}
