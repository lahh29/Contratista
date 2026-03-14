"use client"

import * as React from "react"
import {
  CheckCircle2,
  UserCheck,
  MapPin,
  Loader2,
  XCircle,
  Building2,
  Users,
  UserCog,
  LogOut,
  Car,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser } from "@/firebase"
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
  limit
} from "firebase/firestore"
import { QRScanner } from "@/components/contractor/QRScanner"
import { sendNotification } from '@/app/actions/notify'

type ScannerMode = 'SCANNING' | 'VERIFYING' | 'ON_SITE'

export default function ScannerPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [mode, setMode] = React.useState<ScannerMode>('SCANNING')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [currentCompany, setCurrentCompany] = React.useState<import('@/types').Company | null>(null)
  const [activeVisit, setActiveVisit] = React.useState<import('@/types').Visit | null>(null)
  const [selectedArea, setSelectedArea] = React.useState('')
  const [selectedSupervisor, setSelectedSupervisor] = React.useState('')
  const [vehiclePlates, setVehiclePlates] = React.useState('')
  const [confirmedPersonnel, setConfirmedPersonnel] = React.useState<number>(1)

  const areasQuery = React.useMemo(() => db ? query(collection(db, 'areas'), limit(100)) : null, [db])
  const supervisorsQuery = React.useMemo(() => db ? query(collection(db, 'supervisors'), limit(100)) : null, [db])
  const { data: areas } = useCollection(areasQuery)
  const { data: supervisors } = useCollection(supervisorsQuery)

  const handleQRDetected = async (qrText: string) => {
    if (!db) return
    setIsProcessing(true)

    try {
      // Buscar empresa por ID (el QR contiene el ID de la empresa)
      const companyRef = doc(db, 'companies', qrText.trim())
      const companySnap = await getDoc(companyRef)

      if (!companySnap.exists()) {
        toast({
          variant: 'destructive',
          title: 'QR no reconocido',
          description: 'No se encontró ninguna empresa con este código.',
        })
        setIsProcessing(false)
        return
      }

      const company = { id: companySnap.id, ...companySnap.data() }
      setCurrentCompany(company)
      setConfirmedPersonnel(Number(company.personnelCount) || 1)

      // Verificar si tiene una visita activa
      const activeVisitQuery = query(
        collection(db, 'visits'),
        where('companyId', '==', qrText.trim()),
        where('status', '==', 'Active')
      )
      const activeSnap = await getDocs(activeVisitQuery)
      if (!activeSnap.empty) {
        setActiveVisit({ id: activeSnap.docs[0].id, ...activeSnap.docs[0].data() })
      } else {
        setActiveVisit(null)
      }

      setMode('VERIFYING')
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al buscar empresa' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmEntry = async () => {
    if (!db || !currentCompany || !selectedArea || !selectedSupervisor || !vehiclePlates.trim()) return
    setIsProcessing(true)

    const area = areas?.find(a => a.id === selectedArea)
    const supervisor = supervisors?.find(s => s.id === selectedSupervisor)

    try {
      const visitRef = await addDoc(collection(db, 'visits'), {
        companyId: currentCompany.id,
        companyName: currentCompany.name,
        areaId: selectedArea,
        areaName: area?.name || '—',
        supervisorId: selectedSupervisor,
        supervisorName: supervisor?.name || '—',
        personnelCount: confirmedPersonnel,
        vehiclePlates: vehiclePlates.trim().toUpperCase(),
        status: 'Active',
        entryTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        qrCode: `VIS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      })
      toast({ title: 'Acceso autorizado', description: `${currentCompany.name} ha ingresado.` })
      setActiveVisit({
        id: visitRef.id,
        areaName: area?.name,
        supervisorName: supervisor?.name,
        personnelCount: confirmedPersonnel,
        vehiclePlates: vehiclePlates.trim().toUpperCase(),
      })
      setMode('ON_SITE')
      sendNotification({
        type: 'entry',
        companyName: currentCompany.name,
        areaName: area?.name || '—',
        personnelCount: confirmedPersonnel,
        vehiclePlates: vehiclePlates.trim().toUpperCase(),
      })
    } catch {
      toast({ variant: 'destructive', title: 'Error al registrar entrada' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRegisterExit = async () => {
    if (!db || !activeVisit) return
    setIsProcessing(true)
    try {
      await updateDoc(doc(db, 'visits', activeVisit.id), {
        status: 'Completed',
        exitTime: serverTimestamp(),
      })
      toast({ title: 'Salida registrada', description: `${currentCompany?.name} ha salido.` })
      sendNotification({
        type: 'exit',
        companyName: currentCompany?.name || '—',
        areaName: activeVisit.areaName || '—',
      })
      resetScanner()
    } catch {
      toast({ variant: 'destructive', title: 'Error al registrar salida' })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetScanner = () => {
    setMode('SCANNING')
    setCurrentCompany(null)
    setActiveVisit(null)
    setSelectedArea('')
    setSelectedSupervisor('')
    setVehiclePlates('')
    setConfirmedPersonnel(1)
  }

  // ── MODO: ESCANEANDO ──────────────────────────────────────────
  if (mode === 'SCANNING') {
    return (
      <QRScanner onQRDetected={handleQRDetected} isProcessing={isProcessing} />
    )
  }

  // ── MODO: VERIFICANDO / CONFIRMANDO ──────────────────────────
  if (mode === 'VERIFYING') {
    const isExpired = currentCompany?.sua?.status !== 'Valid'

    return (
      <div className="max-w-sm mx-auto space-y-4 animate-in slide-in-from-bottom-6 duration-400">
        {/* Estado SUA */}
        <div className={`p-4 rounded-2xl flex items-center gap-3 ${isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {isExpired
            ? <XCircle className="w-7 h-7 shrink-0" />
            : <CheckCircle2 className="w-7 h-7 shrink-0" />
          }
          <div>
            <p className="font-bold">{isExpired ? 'SUA Vencido o Pendiente' : 'Empresa Autorizada'}</p>
            <p className="text-xs opacity-75 font-semibold uppercase tracking-wide">
              SUA válido hasta: {currentCompany?.sua?.validUntil || 'N/A'}
            </p>
          </div>
        </div>

        {/* Info empresa */}
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl shrink-0">
                {currentCompany?.name?.[0]}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xl truncate">{currentCompany?.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3" />
                  Contacto: {currentCompany?.contact || '—'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {activeVisit ? (
              /* Ya tiene visita activa → mostrar opción de salida */
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-amber-800 font-semibold text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Ya tiene una visita activa
                </p>
                <div className="text-sm text-amber-700 space-y-1">
                  <p>Área: <span className="font-bold">{activeVisit.areaName}</span></p>
                  <p>Supervisor: <span className="font-bold">{activeVisit.supervisorName}</span></p>
                </div>
                <Button
                  className="w-full h-12 font-bold rounded-xl gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleRegisterExit}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <LogOut className="w-4 h-4" />}
                  Registrar Salida
                </Button>
              </div>
            ) : (
              /* Nueva entrada → capturar datos y confirmar */
              <div className="space-y-3">

                {/* Placas del vehículo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5" /> Placas del Vehículo
                  </label>
                  <Input
                    placeholder="Ej. ABC-123-D"
                    value={vehiclePlates}
                    onChange={(e) => setVehiclePlates(e.target.value.toUpperCase())}
                    className="h-11 font-mono tracking-widest uppercase"
                    maxLength={10}
                  />
                </div>

                {/* Confirmación de personal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Personas que Ingresan
                  </label>
                  {/* Registrado en el QR */}
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Registrado en QR:</span>
                    <span className="font-black text-primary">
                      {Number(currentCompany?.personnelCount) || 1}
                    </span>
                  </div>
                  {/* Contador para confirmar */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl text-lg shrink-0"
                      onClick={() => setConfirmedPersonnel(p => Math.max(1, p - 1))}
                    >−</Button>
                    <div className={`flex-1 h-11 rounded-xl border flex items-center justify-center text-xl font-black ${
                      confirmedPersonnel !== (Number(currentCompany?.personnelCount) || 1)
                        ? 'border-orange-400 bg-orange-50 text-orange-700'
                        : 'border-green-400 bg-green-50 text-green-700'
                    }`}>
                      {confirmedPersonnel}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl text-lg shrink-0"
                      onClick={() => setConfirmedPersonnel(p => p + 1)}
                    >+</Button>
                  </div>
                  {/* Alerta si el número no coincide */}
                  {confirmedPersonnel !== (Number(currentCompany?.personnelCount) || 1) && (
                    <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-700 font-medium">
                        La cantidad no coincide con el QR. Asegúrate de que sea correcta.
                      </p>
                    </div>
                  )}
                </div>

                {/* Área destino */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Área Destino
                  </label>
                  <Select onValueChange={setSelectedArea} value={selectedArea}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecciona un área" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas?.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Supervisor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <UserCog className="w-3.5 h-3.5" /> Supervisor Interno
                  </label>
                  <Select onValueChange={setSelectedSupervisor} value={selectedSupervisor}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecciona supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full h-14 text-lg font-black rounded-2xl gap-2 bg-primary text-white shadow-xl shadow-primary/20 mt-2"
                  onClick={handleConfirmEntry}
                  disabled={!selectedArea || !selectedSupervisor || !vehiclePlates.trim() || isProcessing}
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <UserCheck className="w-5 h-5" />}
                  CONFIRMAR ENTRADA
                </Button>
              </div>
            )}

            <Button variant="ghost" className="w-full text-muted-foreground" onClick={resetScanner}>
              Cancelar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── MODO: EN SITIO ────────────────────────────────────────────
  return (
    <div className="max-w-sm mx-auto space-y-6 animate-in zoom-in-95 duration-400">
      <div className="text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-accent mx-auto flex items-center justify-center text-white text-3xl font-black shadow-xl ring-4 ring-accent/20">
          {currentCompany?.name?.[0]}
        </div>
        <div>
          <h2 className="text-2xl font-black">¡Acceso Autorizado!</h2>
          <Badge className="mt-2 bg-green-100 text-green-700 hover:bg-green-100 px-4 py-1 text-xs font-bold">
            EN SITIO TRABAJANDO
          </Badge>
        </div>
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="pt-5 space-y-4">
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Área</p>
                <p className="font-bold">{activeVisit?.areaName || '—'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Supervisor</p>
              <p className="font-bold">{activeVisit?.supervisorName || '—'}</p>
            </div>
          </div>

          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Personal</p>
                <p className="font-bold">{activeVisit?.personnelCount ?? currentCompany?.personnelCount ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Placas</p>
                <p className="font-bold font-mono">{activeVisit?.vehiclePlates || '—'}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              SUA: {currentCompany?.sua?.validUntil || 'N/A'}
            </Badge>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-2 text-destructive border-red-100 hover:bg-red-50 gap-2 font-bold"
            onClick={handleRegisterExit}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Registrar Salida
          </Button>

          <Button variant="ghost" className="w-full text-muted-foreground" onClick={resetScanner}>
            Escanear otro
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
