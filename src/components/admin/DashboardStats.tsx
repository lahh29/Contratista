"use client"

import { 
  Users, 
  Building2, 
  ClipboardCheck, 
  AlertCircle 
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
      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">Empresas Activas</CardTitle>
          <Building2 className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-black text-foreground">{activeVisits}</div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 font-medium italic">En planta ahora</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">Personas en Planta</CardTitle>
          <Users className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-black text-foreground">{activePeople}</div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 font-medium italic">Tiempo real</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">SUA Vigente</CardTitle>
          <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-black text-foreground">{complianceRate}%</div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 font-medium italic">Empresas con SUA válido</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-card border-l-4 border-foreground/10">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">SUA Vencidos</CardTitle>
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-black text-foreground">{alertsCount}</div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 font-medium italic">Pendientes de renovación</p>
        </CardContent>
      </Card>
    </div>
  )
}
