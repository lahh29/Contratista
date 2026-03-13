
"use client"

import * as React from "react"
import { 
  Users, 
  Building2, 
  ClipboardCheck, 
  AlertCircle, 
  ArrowUpRight,
  LogOut,
  Plus,
  MoreHorizontal
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, orderBy, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

const COLORS = ['#2166AB', '#6E26D9', '#10B981', '#F59E0B', '#6366F1'];

export default function DashboardPage() {
  const db = useFirestore()
  
  const activeVisitsQuery = React.useMemo(() => {
    if (!db) return null
    return query(collection(db, "visits"), where("status", "==", "Active"), orderBy("entryTime", "desc"))
  }, [db])

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-blue-600">Empresas Activas</CardTitle>
            <Building2 className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">12</div>
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
            <div className="text-3xl font-black">{activeVisits?.reduce((acc, v) => acc + (v.personnelCount || 0), 0) || 0}</div>
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
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Personal</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Permanencia</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Cargando...</TableCell>
                </TableRow>
              ) : activeVisits && activeVisits.length > 0 ? (
                activeVisits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="font-bold">{visit.companyName}</TableCell>
                    <TableCell>{visit.supervisorId}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {visit.personnelCount || 1}
                      </Badge>
                    </TableCell>
                    <TableCell>{visit.areaName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-semibold">ACTIVO</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {visit.entryTime ? formatDistanceToNow(new Date(visit.entryTime.toDate()), { locale: es }) : '...'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleFinishVisit(visit.id)}
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No hay contratistas activos en este momento.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
