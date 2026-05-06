"use client"

import * as React from "react"
import QRCode from "react-qr-code"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"
import { Download, Share2, CheckCircle2, XCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

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
  badgeClass: string
  headerClass: string
}> = {
  valid: {
    label: "Válido",
    icon: CheckCircle2,
    badgeClass: "bg-white/20 text-primary-foreground",
    headerClass: "from-primary to-primary/80",
  },
  expired: {
    label: "Vencido",
    icon: XCircle,
    badgeClass: "bg-white/20 text-destructive-foreground",
    headerClass: "from-destructive to-destructive/80",
  },
  pending: {
    label: "Pendiente",
    icon: Clock,
    badgeClass: "bg-white/20 text-primary-foreground",
    headerClass: "from-muted-foreground to-muted-foreground/70",
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

        {/* Encabezado tipo credencial */}
        <div className={cn("bg-gradient-to-br text-primary-foreground px-5 pt-6 pb-5", config.headerClass)}>
          <div className="flex items-center gap-3">
            {/* Avatar con inicial */}
            <div className="size-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-primary-foreground">{initial}</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-base text-primary-foreground truncate leading-tight">
                {company?.name}
              </p>
              <p className="text-xs text-primary-foreground/70 mt-0.5">
                ViñoPlastic — Control de Acceso
              </p>
            </div>
          </div>

          {/* Badge de estado SUA */}
          <div className={cn(
            "inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-xs font-semibold",
            config.badgeClass
          )}>
            <StatusIcon className="size-3.5 shrink-0" />
            SUA {config.label}
            {company?.sua?.validUntil && (
              <span className="opacity-75">· {company.sua.validUntil}</span>
            )}
          </div>
        </div>

        {/* Cuerpo: QR + acciones */}
        <div className="bg-white dark:bg-neutral-900 flex flex-col items-center px-5 pt-5 pb-4 gap-4">
          {/* Código QR */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 shadow-sm w-full flex justify-center">
            <QRCode
              id="contractor-qr-svg"
              value={qrValue}
              size={200}
              bgColor={qrBgColor}
              fgColor={qrFgColor}
              level="H"
            />
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-3 gap-2 w-full">
            <Button
              variant="outline"
              className="flex-col h-14 gap-1 rounded-xl text-xs font-semibold border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              onClick={downloadQR}
            >
              <Download className="size-4" />
              Descargar
            </Button>
            <Button
              variant="outline"
              className="flex-col h-14 gap-1 rounded-xl text-xs font-semibold border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              onClick={shareWhatsApp}
            >
              <Share2 className="size-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              className="flex-col h-14 gap-1 rounded-xl text-xs font-semibold border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              onClick={shareQR}
            >
              <Share2 className="size-4" />
              Compartir
            </Button>
          </div>

          <p className="text-xs text-center text-neutral-500 dark:text-neutral-400 pb-1">
            El guardia escanea este QR en la página{" "}
            <strong className="text-neutral-900 dark:text-neutral-100">Escáner de QR</strong>{" "}
            para verificar el ingreso.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
