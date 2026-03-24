"use client"

import { Users, Building2, ClipboardCheck, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatsProps {
  activePeople: number
  activeVisits: number
  complianceRate: number
  alertsCount: number
}

const STATS = (p: StatsProps) => [
  {
    label: "Empresas Activas",
    value: p.activeVisits,
    suffix: "",
    sub: "En planta ahora",
    Icon: Building2,
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-blue-500 dark:text-blue-400",
    valueColor: "text-blue-600 dark:text-blue-400",
  },
  {
    label: "Personas en Planta",
    value: p.activePeople,
    suffix: "",
    sub: "Tiempo real",
    Icon: Users,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconColor: "text-emerald-500 dark:text-emerald-400",
    valueColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "SUA Vigente",
    value: p.complianceRate,
    suffix: "%",
    sub: "Empresas con SUA válido",
    Icon: ClipboardCheck,
    iconBg: "bg-green-50 dark:bg-green-950/40",
    iconColor: "text-green-500 dark:text-green-400",
    valueColor: "text-green-600 dark:text-green-400",
  },
  {
    label: "SUA Vencidos",
    value: p.alertsCount,
    suffix: "",
    sub: "Pendientes de renovación",
    Icon: AlertCircle,
    iconBg: p.alertsCount > 0 ? "bg-red-50 dark:bg-red-950/40"      : "bg-slate-50 dark:bg-slate-800/40",
    iconColor: p.alertsCount > 0 ? "text-red-500 dark:text-red-400"   : "text-slate-400 dark:text-slate-500",
    valueColor: p.alertsCount > 0 ? "text-red-600 dark:text-red-400"  : "text-foreground",
  },
]

export function DashboardStats({ activePeople, activeVisits, complianceRate, alertsCount }: StatsProps) {
  const stats = STATS({ activePeople, activeVisits, complianceRate, alertsCount })

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="border-none shadow-sm bg-card">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>
              <s.Icon className={`w-5 h-5 ${s.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate leading-tight">
                {s.label}
              </p>
              <p className={`text-2xl font-black leading-none mt-0.5 ${s.valueColor}`}>
                {s.value}{s.suffix}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 italic truncate">{s.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
