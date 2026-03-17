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
  complianceRate: number;
  alertsCount: number;
}

export function DashboardStats({ activePeople, activeVisits, complianceRate, alertsCount }: StatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
      <Card className="border-none shadow-sm bg-blue-50/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase text-blue-600">Empresas Activas</CardTitle>
          <Building2 className="w-4 h-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-black">{activeVisits}</div>
          <p className="text-xs text-blue-600/70 mt-1 font-medium">En planta ahora</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-purple-50/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase text-purple-600">Personas en Planta</CardTitle>
          <Users className="w-4 h-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-black">{activePeople}</div>
          <p className="text-xs text-purple-600/70 mt-1 font-medium">Tiempo real</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-green-50/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase text-green-600">SUA Vigente</CardTitle>
          <ClipboardCheck className="w-4 h-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-black">{complianceRate}%</div>
          <p className="text-xs text-green-600/70 mt-1 font-medium">Empresas con SUA válido</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-orange-50/50 border-l-4 border-orange-500">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase text-orange-600">SUA Vencidos</CardTitle>
          <AlertCircle className="w-4 h-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-black">{alertsCount}</div>
          <p className="text-xs text-orange-600/70 mt-1 font-medium">SUA vencido o pendiente</p>
        </CardContent>
      </Card>
    </div>
  )
}
