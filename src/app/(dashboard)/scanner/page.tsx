"use client"

import * as React from "react"
import { 
  CheckCircle2, 
  Camera, 
  PenTool, 
  UserCheck, 
  MapPin, 
  Loader2 
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useFirestore } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, limit, getDocs } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { QRScanner } from "@/components/contractor/QRScanner"
import { ContractorDashboard } from "@/components/contractor/ContractorDashboard"

type ScannerMode = 'SCANNING' | 'VERIFYING' | 'ON_SITE'

export default function ScannerPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [mode, setMode] = React.useState<ScannerMode>('SCANNING')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [currentContractor, setCurrentContractor] = React.useState<any>(null)
  const [hasCameraPermission, setHasCameraPermission] = React.useState(false)
  const [selfieTaken, setSelfieTaken] = React.useState(false)
  
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        setHasCameraPermission(true)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (error) {
        setHasCameraPermission(false)
        toast({
          variant: 'destructive',
          title: 'Acceso a Cámara Denegado',
          description: 'Por favor, habilita los permisos de cámara.',
        })
      }
    }

    if (mode === 'SCANNING') {
      getCameraPermission()
    }
    
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [mode, toast])

  const handleSimulateScan = async () => {
    if (!db) return
    setIsProcessing(true)
    
    try {
      const q = query(collection(db, "companies"), limit(1))
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "QR No Reconocido",
          description: "No se encontró una empresa activa.",
        })
        setIsProcessing(false)
        return
      }

      const data = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }
      setCurrentContractor(data)
      setMode('VERIFYING')
    } catch (error) {
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmEntry = async () => {
    if (!db || !currentContractor) return
    setIsProcessing(true)

    const logData = {
      contractorId: currentContractor.id,
      contractorName: currentContractor.name,
      action: 'ENTRY',
      area: "Mantenimiento - Planta A",
      timestamp: serverTimestamp(),
      status: 'VERIFIED'
    }

    try {
      await addDoc(collection(db, "accessLogs"), logData)
      toast({
        title: "Acceso Autorizado",
        description: `Bienvenido, ${currentContractor.name}.`,
      })
      setMode('ON_SITE')
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: "accessLogs",
        operation: 'create',
        requestResourceData: logData,
      })
      errorEmitter.emit('permission-error', permissionError)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReportExit = () => {
    setMode('SCANNING')
    setCurrentContractor(null)
    setSelfieTaken(false)
    toast({ title: "Salida Registrada" })
  }

  if (mode === 'SCANNING') {
    return (
      <QRScanner 
        onScan={handleSimulateScan} 
        isProcessing={isProcessing} 
        videoRef={videoRef} 
        hasCameraPermission={hasCameraPermission} 
      />
    )
  }

  if (mode === 'VERIFYING') {
    return (
      <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-8 duration-500">
        <div className="bg-green-100 text-green-800 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8" />
          <div>
            <p className="font-bold text-lg">Contratista Autorizado</p>
            <p className="text-xs opacity-80 text-green-700 uppercase tracking-tighter font-bold">Válido hasta 18:00</p>
          </div>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black text-2xl border-4 border-white shadow-md">
                {currentContractor?.name?.[0]}
              </div>
              <div>
                <CardTitle className="text-xl">{currentContractor?.name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Mantenimiento - Ing. López
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className={`flex-col h-24 gap-2 rounded-2xl border-2 ${selfieTaken ? 'border-green-500 bg-green-50' : 'border-muted'}`}
                onClick={() => setSelfieTaken(true)}
              >
                <Camera className={`w-6 h-6 ${selfieTaken ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className="text-xs font-bold uppercase">Foto Selfie</span>
              </Button>
              <Button variant="outline" className="flex-col h-24 gap-2 rounded-2xl border-2 border-muted">
                <PenTool className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs font-bold uppercase">Firma Digital</span>
              </Button>
            </div>

            <Button 
              className="w-full bg-primary text-white h-16 text-xl font-black rounded-2xl gap-2 shadow-xl shadow-primary/20"
              onClick={handleConfirmEntry}
              disabled={!selfieTaken || isProcessing}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <UserCheck className="w-6 h-6" />}
              CONFIRMAR ENTRADA
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <ContractorDashboard contractor={currentContractor} onExit={handleReportExit} />
}
