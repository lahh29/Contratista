"use client"

import * as React from "react"
import QRCode from "react-qr-code"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Share2, QrCode } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ContractorQRDialogProps {
  company: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContractorQRDialog({ company, open, onOpenChange }: ContractorQRDialogProps) {
  const { toast } = useToast()
  const qrValue = company?.qrCode || company?.id || ""

  const downloadQR = () => {
    const svg = document.getElementById("contractor-qr-svg")
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const size = 400
    canvas.width = size
    canvas.height = size + 80
    const ctx = canvas.getContext("2d")!

    // Fondo blanco
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Dibujar SVG en canvas
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 20, 20, size - 40, size - 40)

      // Texto del nombre de empresa
      ctx.fillStyle = "#1e293b"
      ctx.font = "bold 18px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(company.name || "Contratista", size / 2, size - 10)

      ctx.font = "14px sans-serif"
      ctx.fillStyle = "#64748b"
      ctx.fillText("ViñoPlastic — Control de Acceso", size / 2, size + 14)

      // Descargar
      const link = document.createElement("a")
      link.download = `QR-${(company.name || "contratista").replace(/\s+/g, "_")}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()

      toast({ title: "QR descargado" })
    }
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
  }

  const shareQR = async () => {
    const text = `Código de acceso para *${company?.name}* en ViñoPlastic.\n\nPresenta este código al guardia al ingresar:\n🔑 ${qrValue}`

    if (navigator.share) {
      try {
        await navigator.share({ title: "Código de Acceso", text })
      } catch { /* cancelado por usuario */ }
    } else {
      // Fallback: copiar al portapapeles
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
        className="max-w-[95vw] sm:max-w-sm border-none shadow-2xl rounded-2xl p-5 sm:p-6"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Código QR de Acceso
          </DialogTitle>
          <DialogDescription>
            Comparte este QR con el contratista para que el guardia pueda escanearlo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* Tarjeta QR */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm w-full flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-xl border">
              <QRCode
                id="contractor-qr-svg"
                value={qrValue}
                size={200}
                bgColor="#ffffff"
                fgColor="#1e293b"
                level="H"
              />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-800 text-base">{company?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">ViñoPlastic — Control de Acceso</p>
              {company?.sua?.validUntil && (
                <p className="text-xs text-muted-foreground mt-1">
                  SUA válido hasta: <span className="font-semibold">{company.sua.validUntil}</span>
                </p>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="grid grid-cols-3 gap-2 w-full">
            <Button
              variant="outline"
              className="flex-col h-16 gap-1.5 rounded-xl text-xs font-bold"
              onClick={downloadQR}
            >
              <Download className="w-4 h-4" />
              Descargar
            </Button>
            <Button
              variant="outline"
              className="flex-col h-16 gap-1.5 rounded-xl text-xs font-bold text-green-600 border-green-200 hover:bg-green-50"
              onClick={shareWhatsApp}
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              className="flex-col h-16 gap-1.5 rounded-xl text-xs font-bold"
              onClick={shareQR}
            >
              <Share2 className="w-4 h-4" />
              Compartir
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground px-2">
            El guardia escanea este QR en la página <strong>Access Scanner</strong> para verificar y aprobar el ingreso.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
