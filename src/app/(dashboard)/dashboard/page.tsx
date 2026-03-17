"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from "recharts"
import { NewVisitModal } from "@/components/visits/NewVisitModal"
import { DashboardStats } from "@/components/admin/DashboardStats"
import { VisitsTable } from "@/components/admin/VisitsTable"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, query, where, limit, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

const COLORS = ['#2166AB', '#6E26D9', '#10B981', '#F59E0B', '#6366F1'];

export default function DashboardPage() {
  const db = useFirestore()
  const { user, loading: authLoading } = useUser()

  const activeVisitsQuery = React.useMemo(() => {
    if (!db || !user || authLoading) return null
    return query(collection(db, "visits"), where("status", "==", "Active"), limit(200))
  }, [db, user, authLoading])

  const companiesQuery = React.useMemo(() => {
    if (!db || !user || authLoading) return null
    return query(collection(db, "companies"), limit(500))
  }, [db, user, authLoading])

  const { data: activeVisits, loading: dataLoading } = useCollection(activeVisitsQuery)
  const { data: companies } = useCollection(companiesQuery)

  const handleFinishVisit = (visitId: string) => {
    if (!db) return
    const visitRef = doc(db, "visits", visitId)
    const updateData = { status: "Completed", exitTime: serverTimestamp() }
    updateDoc(visitRef, updateData).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: visitRef.path,
        operation: 'update',
        requestResourceData: updateData,
      })
      errorEmitter.emit('permission-error', permissionError)
    })
  }

  const activePeople = React.useMemo(
    () => activeVisits?.reduce((acc, v) => acc + (Number(v.personnelCount) || 0), 0) || 0,
    [activeVisits]
  )

  const complianceRate = React.useMemo(() => {
    if (!companies?.length) return 0
    const valid = companies.filter(c => c.sua?.status === 'Valid').length
    return Math.round((valid / companies.length) * 100)
  }, [companies])

  const alertsCount = React.useMemo(() => {
    if (!companies?.length) return 0
    return companies.filter(c => c.sua?.status !== 'Valid').length
  }, [companies])

  const areaData = React.useMemo(() => {
    if (!activeVisits?.length) return []
    const counts: Record<string, number> = {}
    activeVisits.forEach(v => {
      const area = v.areaName || 'Sin área'
      counts[area] = (counts[area] || 0) + (Number(v.personnelCount) || 1)
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [activeVisits])

  const hourlyData = React.useMemo(() => {
    if (!activeVisits?.length) return []
    const counts: Record<string, number> = {}
    activeVisits.forEach(v => {
      if (v.entryTime) {
        const hour = new Date(v.entryTime.toDate()).getHours()
        const key = `${hour.toString().padStart(2, '0')}:00`
        counts[key] = (counts[key] || 0) + (Number(v.personnelCount) || 1)
      }
    })
    return Object.entries(counts).sort().map(([hour, entries]) => ({ hour, entries }))
  }, [activeVisits])

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Panel de Control</h2>
          <p className="text-muted-foreground mt-1">Monitoreo en tiempo real de accesos.</p>
        </div>
        <div className="flex gap-2">
          <NewVisitModal trigger={
            <Button className="bg-primary text-white gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" /> Nueva Visita
            </Button>
          } />
        </div>
      </div>

      <DashboardStats
        activePeople={activePeople}
        activeVisits={activeVisits?.length || 0}
        complianceRate={complianceRate}
        alertsCount={alertsCount}
      />

      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="md:col-span-2 lg:col-span-4 border-none shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Ingresos por Hora</CardTitle>
            <CardDescription>Flujo de personal en el transcurso del día.</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] md:h-[300px]">
            {hourlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData}>
                  <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="entries" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sin datos para graficar
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3 border-none shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Distribución por Departamentos</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] md:h-[300px]">
            {areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={areaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {areaData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sin datos para graficar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Contratistas</CardTitle>
            <CardDescription>Personal trabajando actualmente en planta.</CardDescription>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 self-start sm:self-auto">
            {activeVisits?.length || 0} En Planta
          </Badge>
        </CardHeader>
        <CardContent>
          <VisitsTable
            visits={activeVisits}
            loading={dataLoading || authLoading}
            onFinishVisit={handleFinishVisit}
          />
        </CardContent>
      </Card>
    </div>
  )
}
