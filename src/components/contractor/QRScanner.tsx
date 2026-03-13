"use client"

import * as React from "react"
import { Scan, AlertCircle, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

interface QRScannerProps {
  onScan: () => void;
  isProcessing: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hasCameraPermission: boolean;
}

export function QRScanner({ onScan, isProcessing, videoRef, hasCameraPermission }: QRScannerProps) {
  return (
    <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Escáner de Acceso</h2>
        <p className="text-muted-foreground text-sm">Apunta la cámara al código QR del contratista</p>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-slate-950">
        <CardContent className="p-0 relative aspect-[3/4]">
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover opacity-60" 
            autoPlay 
            muted 
            playsInline
          />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent rounded-br-lg" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-accent/50 animate-pulse" />
            </div>
          </div>

          <div className="absolute bottom-8 left-0 right-0 px-6 space-y-4">
            {!hasCameraPermission && (
              <Alert variant="destructive" className="bg-destructive/90 text-white border-none">
                <AlertTitle>Cámara Requerida</AlertTitle>
                <AlertDescription>Habilita los permisos para continuar.</AlertDescription>
              </Alert>
            )}
            <Button 
              onClick={onScan}
              className="w-full bg-accent hover:bg-accent/90 text-white h-14 text-lg font-bold rounded-2xl gap-2 shadow-lg"
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Scan className="w-6 h-6" />}
              Escanear Ahora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
