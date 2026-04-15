"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, getDocs } from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { CheckCircle2, Clock, Loader2, FileText, Printer, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ContratoRow {
  companyId:    string
  companyName:  string
  contact:      string
  status:       'firmado' | 'pendiente'
  fechaFirma:   Date | null
  signatureImg: string | null
}

export default function ContratosPage() {
  const db = useFirestore()
  const [rows, setRows]           = useState<ContratoRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<ContratoRow | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!db) return
    ;(async () => {
      // 2 lecturas en batch en lugar de 1 + N lecturas individuales
      const [companiesSnap, contratosSnap] = await Promise.all([
        getDocs(collection(db, 'companies')),
        getDocs(collection(db, 'contratos')),
      ])

      const contratosMap = new Map(contratosSnap.docs.map(d => [d.id, d.data()]))

      const results: ContratoRow[] = companiesSnap.docs.map(compDoc => {
        const company = compDoc.data()
        const contrato = contratosMap.get(compDoc.id)

        let status:      'firmado' | 'pendiente' = 'pendiente'
        let fechaFirma:  Date | null = null

        if (contrato?.status === 'firmado') {
          status = 'firmado'
          if (contrato.fechaFirma?.toDate) fechaFirma = contrato.fechaFirma.toDate()
        }

        return {
          companyId:   compDoc.id,
          companyName: company.name ?? compDoc.id,
          contact:     company.contact ?? company.email ?? '—',
          status,
          fechaFirma,
          signatureImg: null,
        }
      })

      setRows(results.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'firmado' ? -1 : 1
        return a.companyName.localeCompare(b.companyName)
      }))
      setLoading(false)
    })()
  }, [db])

  // Carga lazy de firma solo al ver el detalle
  const handleSelectRow = async (row: ContratoRow) => {
    if (!db || row.status !== 'firmado') { setSelected(row); return }
    setLoadingDetail(true)
    try {
      const firmasSnap = await getDocs(collection(db, 'contratos', row.companyId, 'firmas'))
      const signatureImg = firmasSnap.docs[0]?.data().canvasData ?? null
      setSelected({ ...row, signatureImg })
    } catch {
      setSelected(row)
    } finally {
      setLoadingDetail(false)
    }
  }

  const filtered = useMemo(() =>
    rows.filter(r =>
      r.companyName.toLowerCase().includes(search.toLowerCase()) ||
      r.contact.toLowerCase().includes(search.toLowerCase())
    ), [rows, search])

  const firmados  = rows.filter(r => r.status === 'firmado').length
  const pendientes = rows.filter(r => r.status === 'pendiente').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // ── Vista de detalle ────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3 print:hidden">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            ← Volver
          </Button>
          <div className="flex-1" />
          <Button size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm p-8 space-y-6 print:shadow-none print:border-none print:p-6">
          {/* Encabezado */}
          <div className="text-center space-y-1 border-b border-border pb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">ViñoPlastic Inyección</p>
            <h1 className="text-base font-black uppercase tracking-wide">Reglamento para Contratistas, Subcontratistas, Proveedores y Clientes</h1>
            <p className="text-xs text-muted-foreground">Acuse de recibo y aceptación</p>
          </div>

          {/* Confirmación */}
          <div className="flex items-start gap-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
              Acepto y me comprometo a cumplir con lo estipulado en el presente reglamento.
            </p>
          </div>

          {/* Datos */}
          <div className="space-y-4">
            <DetailRow label="Nombre de la compañía contratista" value={selected.companyName} />
            <DetailRow label="Nombre del representante legal"    value={selected.contact} />

            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Firma del representante legal</p>
              <div className="rounded-xl border border-border bg-muted/20 flex items-center justify-center" style={{ height: 120 }}>
                {selected.signatureImg
                  ? <img src={selected.signatureImg} alt="Firma" className="max-h-full max-w-full object-contain" />
                  : <p className="text-xs text-muted-foreground">Sin imagen de firma</p>
                }
              </div>
              <div className="h-px bg-border/60" />
            </div>

            <DetailRow
              label="Fecha de firma"
              value={selected.fechaFirma
                ? selected.fechaFirma.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
                  + ' · '
                  + selected.fechaFirma.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                : '—'
              }
            />
          </div>

          <p className="text-[11px] text-muted-foreground text-center border-t border-border/60 pt-4">
            Este documento es un comprobante digital generado por ViñoPlastic Inyección.
          </p>
        </div>
      </div>
    )
  }

  // ── Lista ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Contratos</h1>
        <p className="text-sm text-muted-foreground mt-1">Reglamentos firmados por contratistas y proveedores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-black text-foreground">{firmados}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Firmados</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-black text-foreground">{pendientes}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Pendientes</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar empresa o contacto…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Header — desktop: 4 cols / mobile: 3 cols */}
        <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-border/60 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empresa</p>
          <p className="hidden md:block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"></p>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <FileText className="w-8 h-8 opacity-30" />
            <p className="text-sm">Sin resultados</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map(row => (
              <div
                key={row.companyId}
                className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <p className="text-sm font-semibold truncate">{row.companyName}</p>
                <p className="hidden md:block text-sm text-muted-foreground truncate">{row.contact}</p>

                {/* Badge estado — desktop con texto / mobile solo ícono */}
                <div className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold',
                  'px-2.5 py-1 md:px-2.5',
                  row.status === 'firmado'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                )}>
                  {row.status === 'firmado'
                    ? <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /><span className="hidden md:inline">Firmado</span></>
                    : <><Clock        className="w-3.5 h-3.5 shrink-0" /><span className="hidden md:inline">Pendiente</span></>
                  }
                </div>

                {/* Acción */}
                {row.status === 'firmado' ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    title="Ver contrato"
                    onClick={() => handleSelectRow(row)}
                    disabled={loadingDetail}
                  >
                    {loadingDetail ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  </Button>
                ) : (
                  <span className="w-8" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <div className="h-px bg-border/60" />
    </div>
  )
}
