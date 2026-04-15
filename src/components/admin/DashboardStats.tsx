"use client"

import { Card, CardContent } from "@/components/ui/card"

interface StatsProps {
  activePeople: number
  activeVisits: number
  complianceRate: number
  alertsCount: number
}

const STATS = (p: StatsProps) => [
  {
    label: "En Planta Ahora",
    value: p.activeVisits,
    suffix: "",
  },
  {
    label: "Personas en Planta",
    value: p.activePeople,
    suffix: "",
  },
  {
    label: "Empresas con SUA vigente",
    value: p.complianceRate,
    suffix: "%",
  },
  {
    label: "Empresas con SUA vencido",
    value: p.alertsCount,
    suffix: "",
  },
]

export function DashboardStats({ activePeople, activeVisits, complianceRate, alertsCount }: StatsProps) {
  const stats = STATS({ activePeople, activeVisits, complianceRate, alertsCount })

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="border-none shadow-sm bg-card">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate leading-tight">
                {s.label}
              </p>
              <p className="text-2xl font-black leading-none mt-0.5 text-foreground">
                {s.value}{s.suffix}
              </p>

            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
