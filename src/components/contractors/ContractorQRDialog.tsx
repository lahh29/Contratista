"use client"

import * as React from "react"
import QRCode from "react-qr-code"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Download, Share2, CheckCircle2, XCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ContractorQRDialogProps {
  company: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SuaStatus = "valid" | "expired" | "pending"

function getEffectiveSuaStatus(sua?: { status?: string; validUntil?: string }): SuaStatus {
  if (sua?.validUntil) {
    const today = new Date().toISOString().slice(0, 10)
    return sua.validUntil < today ? "expired" : "valid"
  }
  if (sua?.status === "Valid") return "valid"
  if (sua?.status === "Expired") return "expired"
  return "pending"
}

const SUA_CONFIG: Record<SuaStatus, {
  label: string
  icon: React.ElementType
  headerBg: string
}> = {
  valid: {
    label: "Válido",
    icon: CheckCircle2,
    headerBg: "linear-gradient(135deg, #0064e0 0%, #0143b5 100%)",
  },
  expired: {
    label: "Vencido",
    icon: XCircle,
    headerBg: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
  },
  pending: {
    label: "Pendiente",
    icon: Clock,
    headerBg: "linear-gradient(135deg, #5f6368 0%, #3c4043 100%)",
  },
}

/** Resuelve una CSS variable y retorna hsl() con comas — formato requerido por la Canvas API */
function resolveCssColor(variable: string, fallback: string): string {
  if (typeof window === "undefined") return fallback
  const val = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  if (!val) return fallback
  // Las variables del tema usan "H S% L%" (sin comas). Canvas necesita "hsl(H, S%, L%)"
  const parts = val.split(/\s+/)
  return parts.length === 3
    ? `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`
    : `hsl(${val})`
}

export function ContractorQRDialog({ company, open, onOpenChange }: ContractorQRDialogProps) {
  const { toast } = useToast()
  const qrValue = company?.qrCode || company?.id || ""
  const status = getEffectiveSuaStatus(company?.sua)
  const config = SUA_CONFIG[status]
  const StatusIcon = config.icon
  const initial = (company?.name || "?")[0].toUpperCase()

  // QR siempre negro sobre blanco — los lectores ópticos necesitan alto contraste
  const qrFgColor = "#000000"
  const qrBgColor = "#ffffff"

  const downloadQR = () => {
    const svg = document.getElementById("contractor-qr-svg")
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)

    // Colores resueltos desde el tema en el momento de la descarga
    const headerColor   = resolveCssColor(status === "expired" ? "--destructive" : "--primary", "#1e3a5f")
    const headerFg      = resolveCssColor("--primary-foreground", "#ffffff")
    const cardBg        = resolveCssColor("--card", "#ffffff")
    const fgColor       = resolveCssColor("--foreground", "#0f172a")
    const mutedFg       = resolveCssColor("--muted-foreground", "#64748b")

    const W = 480
    const HEADER_H = 140
    const QR_SIZE = 300
    const PADDING = 40
    const FOOTER_H = 80
    const H = HEADER_H + PADDING + QR_SIZE + PADDING + FOOTER_H

    const canvas = document.createElement("canvas")
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext("2d")!

    // Convierte "hsl(H, S%, L%)" → "hsla(H, S%, L%, alpha)" para canvas
    const withAlpha = (hsl: string, alpha: number) =>
      hsl.replace(/^hsl\((.+)\)$/, (_, inner) => `hsla(${inner}, ${alpha})`)

    // — Header con gradiente —
    const grad = ctx.createLinearGradient(0, 0, W, HEADER_H)
    grad.addColorStop(0, headerColor)
    grad.addColorStop(1, withAlpha(headerColor, 0.8))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 20)
    ctx.fill()

    // — Cuerpo blanco con esquinas inferiores redondeadas —
    ctx.fillStyle = cardBg
    ctx.fillRect(0, HEADER_H - 10, W, H - HEADER_H + 10)
    ctx.beginPath()
    ctx.roundRect(0, HEADER_H - 10, W, H - HEADER_H + 10, [0, 0, 20, 20])
    ctx.fill()

    // — Avatar con inicial —
    const avatarX = 36
    const avatarY = 30
    const avatarSize = 52
    ctx.fillStyle = withAlpha(headerFg, 0.2)
    ctx.beginPath()
    ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 12)
    ctx.fill()
    ctx.fillStyle = headerFg
    ctx.font = "bold 26px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText((company?.name || "?")[0].toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2)

    // — Nombre empresa —
    const textX = avatarX + avatarSize + 16
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
    ctx.fillStyle = headerFg
    ctx.font = "bold 20px sans-serif"
    const maxNameWidth = W - textX - 20
    let name = company?.name || "Contratista"
    while (ctx.measureText(name).width > maxNameWidth && name.length > 3) name = name.slice(0, -1)
    if (name !== company?.name) name += "…"
    ctx.fillText(name, textX, avatarY + 26)
    ctx.font = "13px sans-serif"
    ctx.fillStyle = withAlpha(headerFg, 0.7)
    ctx.fillText("ViñoPlastic — Control de Acceso", textX, avatarY + 46)

    // — Badge estado SUA —
    const badgeLabel = `SUA ${config.label}${company?.sua?.validUntil ? `  ·  ${company.sua.validUntil}` : ""}`
    ctx.font = "bold 13px sans-serif"
    const badgeW = ctx.measureText(badgeLabel).width + 28
    const badgeX = 36
    const badgeY = avatarY + avatarSize + 12
    ctx.fillStyle = withAlpha(headerFg, 0.2)
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeW, 28, 14)
    ctx.fill()
    ctx.fillStyle = headerFg
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillText(badgeLabel, badgeX + 14, badgeY + 14)

    // — QR Code —
    const qrImg = new Image()
    qrImg.onload = () => {
      const qrX = (W - QR_SIZE) / 2
      const qrY = HEADER_H + PADDING
      ctx.drawImage(qrImg, qrX, qrY, QR_SIZE, QR_SIZE)

      // — Footer —
      const footerY = qrY + QR_SIZE + 18
      ctx.textAlign = "center"
      ctx.textBaseline = "alphabetic"
      ctx.fillStyle = fgColor
      ctx.font = "bold 15px sans-serif"
      ctx.fillText(company?.name || "Contratista", W / 2, footerY)
      ctx.font = "12px sans-serif"
      ctx.fillStyle = mutedFg
      ctx.fillText("ViñoPlastic — Control de Acceso", W / 2, footerY + 20)

      const link = document.createElement("a")
      link.download = `QR-${(company.name || "contratista").replace(/\s+/g, "_")}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      toast({ title: "QR descargado" })
    }
    qrImg.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
  }

  const shareQR = async () => {
    const text = `Código de acceso para *${company?.name}* en ViñoPlastic.\n\nPresenta este código al guardia al ingresar:\n🔑 ${qrValue}`
    if (navigator.share) {
      try {
        await navigator.share({ title: "Código de Acceso", text })
      } catch { /* cancelado por el usuario */ }
    } else {
      await navigator.clipboard.writeText(text)
      toast({ title: "Código copiado al portapapeles" })
    }
  }

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hola, aquí está tu código de acceso para ViñoPlastic:\n\n*${company?.name}*\nCódigo: ${qrValue}\n\nPresenta el código QR al guardia de seguridad al ingresar.`
    )
    window.open(`https://wa.me/?text=${text}`, "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-sm p-0 overflow-hidden rounded-2xl border-none shadow-2xl"
        onCloseAutoFocus={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Código QR de Acceso — {company?.name}</DialogTitle>
          <DialogDescription>
            Código QR para verificar el acceso de {company?.name} en ViñoPlastic.
          </DialogDescription>
        </VisuallyHidden>

        {/* Encabezado tipo credencial — Meta design */}
        <div style={{ background: config.headerBg, padding: '24px 20px 20px' }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{initial}</span>
            </div>
            <div className="min-w-0">
              <p style={{ fontWeight: 700, fontSize: 16, color: '#fff', lineHeight: 1.2 }} className="truncate">
                {company?.name}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                ViñoPlastic — Control de Acceso
              </p>
            </div>
          </div>

          {/* Badge de estado SUA — pill shape */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '6px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 700, color: '#fff' }}>
            <StatusIcon style={{ width: 14, height: 14 }} />
            SUA {config.label}
            {company?.sua?.validUntil && (
              <span style={{ opacity: 0.75 }}>· {company.sua.validUntil}</span>
            )}
          </div>
        </div>

        {/* Cuerpo: QR + acciones — Meta design */}
        <div style={{ background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', gap: '16px' }}>
          {/* Código QR */}
          <div style={{ borderRadius: 16, border: '1px solid #e8e8ec', background: '#ffffff', padding: 16, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <QRCode
              id="contractor-qr-svg"
              value={qrValue}
              size={200}
              bgColor={qrBgColor}
              fgColor={qrFgColor}
              level="H"
            />
          </div>

          {/* Botones de acción — pill style */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%' }}>
            <button
              onClick={downloadQR}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, height: 56, background: '#ffffff', border: '1px solid #e8e8ec', borderRadius: 16, fontSize: 12, fontWeight: 700, color: '#0a1317', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
            >
              <Download style={{ width: 16, height: 16 }} />
              Descargar
            </button>
            <button
              onClick={shareWhatsApp}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, height: 56, background: '#ffffff', border: '1px solid #e8e8ec', borderRadius: 16, fontSize: 12, fontWeight: 700, color: '#0a1317', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
            >
              <Share2 style={{ width: 16, height: 16 }} />
              WhatsApp
            </button>
            <button
              onClick={shareQR}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, height: 56, background: '#ffffff', border: '1px solid #e8e8ec', borderRadius: 16, fontSize: 12, fontWeight: 700, color: '#0a1317', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
            >
              <Share2 style={{ width: 16, height: 16 }} />
              Compartir
            </button>
          </div>

          <p style={{ fontSize: 12, textAlign: 'center', color: '#80868b', paddingBottom: 4 }}>
            El guardia escanea este QR en la página{" "}
            <strong style={{ color: '#0a1317' }}>Escáner de QR</strong>{" "}
            para verificar el ingreso.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
