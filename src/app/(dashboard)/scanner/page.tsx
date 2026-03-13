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
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useFirestore } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

export default function ScannerPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [lastScanned, setLastScanned] = React.useState<any>(null)
  const [isScanning, setIsScanning] = React.useState(false)

  const handleScan = async (action: 'ENTRY' | 'EXIT') => {
    if (!db) return
    setIsScanning(true)
    
    try {
      // Simulamos la obtención de un ID de contratista (en una app real vendría del QR)
      // Para efectos del demo, buscamos el primer contratista de la lista
      const contractorsRef = collection(db, "contractors")
      const q = query(contractorsRef, limit(1))
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Error de Escaneo",
          description: "No hay contratistas registrados en el sistema.",
        })
        setIsScanning(false)
        return
      }

      const contractor = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as any
      
      const logData = {
        contractorId: contractor.id,
        contractorName: contractor.name,
        action: action,
        area: "Almacén Central",
        timestamp: serverTimestamp(),
        status: contractor.suaStatus === 'Active' ? 'VERIFIED' : 'DENIED'
      }

      const logsRef = collection(db, "accessLogs")
      
      addDoc(logsRef, logData)
        .then(() => {
          setLastScanned({
            ...logData,
            timestamp: new Date().toLocaleTimeString()
          })
          
          toast({
            title: `${action === 'ENTRY' ? 'Entrada' : 'Salida'} Registrada`,
            description: `${contractor.name} registrado exitosamente.`,
          })
        })
        .catch(async (error) => {
          const permissionError = new FirestorePermissionError({
            path: logsRef.path,
            operation: 'create',
            requestResourceData: logData,
          })
          errorEmitter.emit('permission-error', permissionError)
        })
        .finally(() => setIsScanning(false))

    } catch (error) {
      console.error(error)
      setIsScanning(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Escáner de Acceso</h2>
        <p className="text-muted-foreground">Escanee el código QR del contratista para registrar eventos.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-none shadow-lg overflow-hidden bg-primary text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5" /> Escáner en Vivo
            </CardTitle>
            <CardDescription className="text-white/70">
              Interfaz de escaneo móvil optimizada
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 flex flex-col items-center justify-center space-y-8">
            <div className="w-64 h-64 bg-white rounded-2xl flex items-center justify-center relative overflow-hidden group">
              {isScanning ? (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-sm">
                   <Loader2 className="w-16 h-16 animate-spin text-primary" />
                </div>
              ) : (
                <QrCode className="w-48 h-48 text-primary opacity-20 group-hover:scale-105 transition-transform" />
              )}
              <div className="absolute top-0 left-0 right-0 h-1 bg-accent shadow-[0_0_15px_rgba(110,38,217,0.8)] animate-bounce" />
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <Button 
                onClick={() => handleScan('ENTRY')}
                className="bg-white text-primary hover:bg-white/90 py-6 text-lg font-bold gap-2"
                disabled={isScanning}
              >
                <UserCheck className="w-5 h-5" /> Entrada
              </Button>
              <Button 
                onClick={() => handleScan('EXIT')}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 py-6 text-lg font-bold gap-2"
                disabled={isScanning}
              >
                <UserMinus className="w-5 h-5" /> Salida
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-4 h-4" /> Último Evento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastScanned ? (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                        {lastScanned.contractorName[0]}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{lastScanned.contractorName}</p>
                        <p className="text-sm text-muted-foreground">Acceso verificado</p>
                      </div>
                    </div>
                    <Badge variant={lastScanned.status === 'VERIFIED' ? 'default' : 'destructive'}>
                      {lastScanned.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-xl text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-bold">Tipo</p>
                      <p className="font-medium">{lastScanned.action === 'ENTRY' ? 'ENTRADA' : 'SALIDA'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-bold">Hora</p>
                      <p className="font-medium">{lastScanned.timestamp}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs uppercase font-bold">Área</p>
                      <p className="font-medium">{lastScanned.area}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground space-y-2">
                  <Info className="w-8 h-8 mx-auto opacity-20" />
                  <p>Listo para escanear</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
