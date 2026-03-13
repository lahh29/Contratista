
"use client"

import * as React from "react"
import { 
  QrCode, 
  Scan, 
  UserCheck, 
  UserMinus, 
  ShieldAlert,
  History,
  Info,
  Loader2,
  Camera,
  PenTool,
  Phone,
  LogOut,
  CheckCircle2,
  MapPin,
  Clock,
  Users
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useFirestore } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, limit, getDocs, doc, updateDoc } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

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

  // Camera Permission Effect
  React.useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        setHasCameraPermission(true)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error('Error accessing camera:', error)
        setHasCameraPermission(false)
        toast({
          variant: 'destructive',
          title: 'Acceso a Cámara Denegado',
          description: 'Por favor, habilita los permisos de cámara para usar el escáner.',
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
      // Simulamos detección de QR buscando un contratista
      const q = query(collection(db, "contractors"), limit(1))
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "QR No Reconocido",
          description: "El código no pertenece a un contratista registrado.",
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
      status: 'VERIFIED',
      hasSelfie: true,
      hasSignature: true
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
    toast({
      title: "Salida Registrada",
      description: "¡Que tengas un buen día!",
    })
    setMode('SCANNING')
    setCurrentContractor(null)
    setSelfieTaken(false)
  }

  if (mode === 'SCANNING') {
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
            
            {/* QR Overlay UI */}
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
                onClick={handleSimulateScan}
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
                onClick={() => {
                  setSelfieTaken(true)
                  toast({ title: "Selfie Capturada" })
                }}
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

  // mode === 'ON_SITE' (Personal Dashboard)
  return (
    <div className="max-w-md mx-auto space-y-8 animate-in zoom-in-95 duration-500">
      <div className="text-center space-y-4">
        <div className="w-24 h-24 rounded-full bg-accent mx-auto flex items-center justify-center text-white text-4xl font-black border-4 border-white shadow-xl ring-4 ring-accent/20">
          {currentContractor?.name?.[0]}
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight">¡Bienvenido, {currentContractor?.name?.split(' ')[0]}!</h2>
          <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700 hover:bg-green-100 px-4 py-1 text-xs font-bold">
            EN SITIO TRABAJANDO
          </Badge>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-start justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Área Asignada</p>
                <p className="font-bold text-slate-800">Mantenimiento Central</p>
              </div>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Encargado</p>
               <p className="font-bold text-slate-800">Ing. López</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-accent" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Entrada</p>
                <p className="font-bold">14:15</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-accent" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Personal</p>
                <p className="font-bold">5 / 7</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="h-16 rounded-2xl border-2 gap-2 font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700">
            <Phone className="w-5 h-5" /> Llamar
          </Button>
          <Button 
            variant="ghost" 
            className="h-16 rounded-2xl border-2 border-red-100 text-red-600 hover:bg-red-50 gap-2 font-bold"
            onClick={handleReportExit}
          >
            <LogOut className="w-5 h-5" /> Salir
          </Button>
        </div>
      </div>
    </div>
  )
}
