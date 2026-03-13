"use client"

import * as React from "react"
import { 
  Plus 
} from "lucide-react"
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
import { collection, query, where, orderBy, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

const COLORS = ['#2166AB', '#6E26D9', '#10B981', '#F59E0B', '#6366F1'];

export default function DashboardPage() {
  const db = useFirestore()
  const { user } = useUser()
  
  const activeVisitsQuery = React.useMemo(() => {
    // Solo ejecutamos la consulta si hay un usuario autenticado y la DB está lista
    if (!db || !user) return null
    return query(
      collection(db, "visits"), 
      where("status", "==", "Active"), 
      orderBy("entryTime", "desc")
    )
  }, [db, user])

  const { data: activeVisits, loading } = useCollection(activeVisitsQuery)

  const handleFinishVisit = (visitId: string) => {
    if (!db) return
    const visitRef = doc(db, "visits", visitId)
    const updateData = {
      status: "Completed",
      exitTime: serverTimestamp()
    }

    updateDoc(visitRef, updateData)
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: visitRef.path,
          operation: 'update',
          requestResourceData: updateData,
        })
        errorEmitter.emit('permission-error', permissionError)
      })
  }

  const activePeople = activeVisits?.reduce((acc, v) => acc + (v.personnelCount || 0), 0) || 0

  const areaData = [
    { name: "Mantenimiento", value: 12 },
    { name: "Eléctrico", value: 8 },
    { name: "IT", value: 5 },
    { name: "Limpieza", value: 15 },
    { name: "Seguridad", value: 4 },
  ]

  const hourlyData = [
    { hour: '08:00', entries: 4 },
    { hour: '09:00', entries: 12 },
    { hour: '10:00', entries: 8 },
    { hour: '11:00', entries: 15 },
    { hour: '12:00', entries: 20 },
    { hour: '13:00', entries: 10 },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Panel de Control</h2>
          <p className="text-muted-foreground mt-1">Monitoreo en tiempo real de accesos y cumplimiento.</p>
        </div>
        <div className="flex gap-2">
          <NewVisitModal trigger={
            <Button className="bg-primary text-white gap-2">
              <Plus className="w-4 h-4" /> Nueva Visita
            </Button>
          } />
        </div>
      </div>

      <DashboardStats activePeople={activePeople} activeVisits={activeVisits?.length || 0} />

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Ingresos por Hora</CardTitle>
            <CardDescription>Flujo de personal en el transcurso del día.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyData}>
                <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="entries" stroke="#2166AB" strokeWidth={3} dot={{ fill: '#2166AB' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Distribución por Áreas</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
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
                  {areaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Contratistas Activos</CardTitle>
            <CardDescription>Personal trabajando actualmente en sitio.</CardDescription>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {activeVisits?.length || 0} Empresas trabajando
          </Badge>
        </CardHeader>
        <CardContent>
          <VisitsTable 
            visits={activeVisits} 
            loading={loading} 
            onFinishVisit={handleFinishVisit} 
          />
        </CardContent>
      </Card>
    </div>
  )
}