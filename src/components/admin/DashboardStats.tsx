"use client"

import { 
  Users, 
  Building2, 
  ClipboardCheck, 
  AlertCircle, 
  ArrowUpRight 
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatsProps {
  activePeople: number;
  activeVisits: number;
}

export function DashboardStats({ activePeople, activeVisits }: StatsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-none shadow-sm bg-blue-50/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase text-blue-600">Empresas Activas</CardTitle>
          <Building2 className="w-4 h-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black">{activeVisits}</div>
          <p className="text-xs text-blue-600/70 mt-1 font-medium flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +20% hoy
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-purple-50/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase text-purple-600">Personas en Sitio</CardTitle>
          <Users className="w-4 h-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black">{activePeople}</div>
          <p className="text-xs text-purple-600/70 mt-1 font-medium">Tiempo real</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-green-50/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase text-green-600">Cumplimiento OK</CardTitle>
          <ClipboardCheck className="w-4 h-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black">87%</div>
          <p className="text-xs text-green-600/70 mt-1 font-medium">Sistemas verificados</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-orange-50/50 border-l-4 border-orange-500">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase text-orange-600">Alertas</CardTitle>
          <AlertCircle className="w-4 h-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black">3</div>
          <p className="text-xs text-orange-600/70 mt-1 font-medium">Requieren atención</p>
        </CardContent>
      </Card>
    </div>
  )
}
