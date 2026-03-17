"use client"

import { useMemo } from "react"
import { doc } from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { useDoc } from "@/firebase/firestore/use-doc"
import { useAppUser } from "@/hooks/use-app-user"
import { useNotifications } from "@/hooks/use-notifications"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Bell,
  BellOff,
  Calendar,
  Hash,
  Phone,
  User,
  Building2,
  Loader2,
  AlertTriangle,
  Clock,
} from "lucide-react"
import type { Company } from "@/types"

function SuaStatusCard({ company }: { company: Company }) {
  const status    = company.sua?.status
  const validUntil = company.sua?.validUntil

  const config = {
    Valid:   { bg: 'bg-green-50',   border: 'border-green-200',  text: 'text-green-800',   muted: 'text-green-600',  label: 'Vigente',   icon: ShieldCheck  },
    Expired: { bg: 'bg-red-50',     border: 'border-red-200',    text: 'text-red-800',     muted: 'text-red-600',    label: 'Vencido',   icon: ShieldX      },
    Pending: { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-800',  muted: 'text-orange-600', label: 'Pendiente', icon: ShieldAlert  },
  }[status ?? 'Pending']

  const Icon = config.icon

  const daysLeft = useMemo(() => {
    if (!validUntil) return null
    const today  = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(validUntil + 'T00:00:00')
    return Math.round((expiry.getTime() - today.getTime()) / 864e5)
  }, [validUntil])

  const daysLabel = daysLeft === null ? null
    : daysLeft > 0  ? `Vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`
    : daysLeft === 0 ? 'Vence hoy'
    : `Venció hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? 's' : ''}`

  return (
    <Card className={`border ${config.border} ${config.bg} shadow-none`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm shrink-0">
              <Icon className={`w-8 h-8 ${config.text}`} />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${config.muted}`}>Estado SUA</p>
              <p className={`text-3xl font-black ${config.text} leading-tight`}>{config.label}</p>
              {daysLabel && (
                <div className={`flex items-center gap-1.5 mt-1 ${config.muted}`}>
                  <Clock className="w-3.5 h-3.5" />
                  <p className="text-sm font-medium">{daysLabel}</p>
                </div>
              )}
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <Badge
              variant={status === 'Valid' ? 'default' : status === 'Expired' ? 'destructive' : 'secondary'}
              className="text-sm px-4 py-1.5 rounded-xl"
            >
              {status ?? 'N/A'}
            </Badge>
            {validUntil && (
              <p className={`text-xs ${config.muted}`}>hasta {validUntil}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold mt-0.5 truncate">{value}</p>
      </div>
    </div>
  )
}

export default function PortalPage() {
  const { appUser } = useAppUser()
  const db = useFirestore()
  const { permission, supported, requestPermission } = useNotifications()

  const companyRef = useMemo(
    () => appUser?.companyId && db ? doc(db, 'companies', appUser.companyId) : null,
    [appUser, db],
  )
  const { data: company, loading } = useDoc<Company>(companyRef)

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!appUser?.companyId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border-orange-200 bg-orange-50 max-w-md w-full">
          <CardContent className="p-6 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-800">Sin empresa asignada</p>
              <p className="text-sm text-orange-700 mt-1">
                Tu cuenta no tiene una empresa vinculada. Contacta al administrador de ViñoPlastic.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border-destructive/30 bg-destructive/5 max-w-md w-full">
          <CardContent className="p-6 flex gap-3 items-start">
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Empresa no encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                No se pudo cargar la información de tu empresa. Intenta más tarde.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Header empresa */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl md:text-3xl shrink-0 border border-primary/20">
          {company.name?.[0]}
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">{company.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Panel de cumplimiento contratista</p>
        </div>
      </div>

      {/* SUA status — full width, prominente */}
      <SuaStatusCard company={company} />

      {/* 2 columnas en desktop, 1 en mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Datos de la empresa */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Información de la empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-0">
            <InfoRow icon={Building2} label="Razón Social"       value={company.name} />
            <InfoRow icon={User}      label="Contacto Principal" value={company.contact} />
            <InfoRow icon={Phone}     label="Teléfono"           value={company.phone} />
          </CardContent>
        </Card>

        {/* Datos SUA */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Datos SUA / Póliza
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-0">
            <InfoRow icon={Hash}     label="N° de Póliza / SUA" value={company.sua?.number} />
            <InfoRow icon={Calendar} label="Vencimiento SUA"    value={company.sua?.validUntil} />
          </CardContent>
        </Card>

        {/* Notificaciones — full width en ambos breakpoints */}
        {supported && (
          <Card className="border-none shadow-sm lg:col-span-2">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${permission === 'granted' ? 'bg-green-100' : 'bg-muted'}`}>
                  {permission === 'granted'
                    ? <Bell   className="w-5 h-5 text-green-700" />
                    : <BellOff className="w-5 h-5 text-muted-foreground" />
                  }
                </div>
                <div>
                  <p className="font-semibold">
                    {permission === 'granted' ? 'Notificaciones activas' : 'Activar notificaciones push'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {permission === 'granted'
                      ? 'Recibirás alertas de vencimiento de SUA en este dispositivo'
                      : 'Recibe alertas cuando tu SUA esté por vencer o haya vencido'}
                  </p>
                </div>
              </div>
              {permission !== 'granted' ? (
                <Button onClick={requestPermission} className="shrink-0">
                  Activar
                </Button>
              ) : (
                <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200 px-3 py-1.5">
                  Activo
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
