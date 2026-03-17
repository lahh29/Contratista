import jsPDF from 'jspdf'
import type { Visit, Company } from '@/types'

function fmt(d: Date) {
  return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

function duration(entry: Date, exit: Date) {
  const ms = exit.getTime() - entry.getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function generateVoucherPDF(visit: Visit, company: Company) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })
  const pageW = 148

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(79, 70, 229) // primary indigo
  doc.rect(0, 0, pageW, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('ViñoPlastic', pageW / 2, 13, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(200, 200, 255)
  doc.text('VOUCHER DE ACCESO A INSTALACIONES', pageW / 2, 21, { align: 'center' })

  // ── Company name ─────────────────────────────────────────
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(company.name ?? '—', pageW / 2, 43, { align: 'center' })

  // ── Divider ───────────────────────────────────────────────
  doc.setDrawColor(230, 230, 230)
  doc.line(15, 48, pageW - 15, 48)

  // ── Fields ────────────────────────────────────────────────
  const entryDate = visit.entryTime ? visit.entryTime.toDate() : null
  const exitDate  = visit.exitTime  ? visit.exitTime.toDate()  : null

  const rows: [string, string][] = [
    ['Área de acceso',    visit.areaName       ?? '—'],
    ['Supervisor',        visit.supervisorName ?? '—'],
    ['Personal en planta', String(visit.personnelCount ?? 1)],
    ['Placas vehículo',   visit.vehiclePlates  ?? 'N/A'],
    ['Hora de entrada',   entryDate ? fmt(entryDate) : '—'],
    ['Hora de salida',    exitDate  ? fmt(exitDate)  : '—'],
    ['Duración',          entryDate && exitDate ? duration(entryDate, exitDate) : '—'],
    ['Estado',            visit.status === 'Completed' ? 'Completada' : 'Activa'],
  ]

  let y = 58
  doc.setFontSize(9)
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text(label, 15, y)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(value, pageW - 15, y, { align: 'right' })

    doc.setDrawColor(240, 240, 240)
    doc.line(15, y + 3, pageW - 15, y + 3)
    y += 12
  }

  // ── Folio ─────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setTextColor(170, 170, 170)
  doc.text(`Folio: ${visit.id.slice(0, 12).toUpperCase()}`, pageW / 2, y + 6, { align: 'center' })
  doc.text(`Generado el ${new Date().toLocaleDateString('es-MX')}`, pageW / 2, y + 12, { align: 'center' })

  doc.save(`voucher-${visit.id.slice(0, 8)}.pdf`)
}
