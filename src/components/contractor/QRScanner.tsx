'use client'

import * as React from 'react'
import { Scan, AlertCircle, Loader2, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

interface QRScannerProps {
  onQRDetected: (text: string) => void
  isProcessing: boolean
}

export function QRScanner({ onQRDetected, isProcessing }: QRScannerProps) {
  const [scanning, setScanning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const scannerRef = React.useRef<any>(null)
  const containerId = 'html5-qr-reader'

  const startScanner = async () => {
    setError(null)
    setScanning(true)

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const html5Qrcode = new Html5Qrcode(containerId)
      scannerRef.current = html5Qrcode

      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText: string) => {
          stopScanner()
          onQRDetected(decodedText)
        },
        () => {/* ignore scan errors */}
      )
    } catch (err: any) {
      setScanning(false)
      if (err?.message?.includes('Permission')) {
        setError('Permiso de cámara denegado. Habilítalo en la configuración del navegador.')
      } else {
        setError('No se pudo iniciar la cámara. Intenta de nuevo.')
      }
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current = null
      } catch { /* ignore */ }
    }
    setScanning(false)
  }

  React.useEffect(() => {
    return () => { stopScanner() }
  }, [])

  return (
    <div className="max-w-sm mx-auto space-y-5 animate-in fade-in duration-500">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Escáner de Acceso</h2>
        <p className="text-muted-foreground text-sm">
          Apunta la cámara al código QR del contratista
        </p>
      </div>

      {/* Área del scanner */}
      <div className="relative bg-slate-950 rounded-3xl overflow-hidden aspect-square shadow-2xl">
        <div id={containerId} className="w-full h-full" />

        {/* Overlay cuando no está escaneando */}
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-48 h-48 border-2 border-white/20 rounded-2xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
              <Camera className="absolute inset-0 m-auto w-10 h-10 text-white/30" />
            </div>
          </div>
        )}

        {/* Línea de escaneo animada */}
        {scanning && (
          <div className="absolute inset-x-8 top-1/2 h-0.5 bg-primary/70 animate-pulse pointer-events-none" />
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de cámara</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        {!scanning ? (
          <Button
            onClick={startScanner}
            disabled={isProcessing}
            className="flex-1 h-14 text-base font-bold rounded-2xl gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Scan className="w-5 h-5" />
            )}
            {isProcessing ? 'Procesando...' : 'Iniciar Escaneo'}
          </Button>
        ) : (
          <Button
            onClick={stopScanner}
            variant="outline"
            className="flex-1 h-14 text-base font-bold rounded-2xl"
          >
            Cancelar
          </Button>
        )}
      </div>
    </div>
  )
}
