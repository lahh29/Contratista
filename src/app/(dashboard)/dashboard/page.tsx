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
import { NewVisitModal } from "@/components/visits/NewVisitModal"
import { DashboardStats } from "@/components/admin/DashboardStats"
import { VisitsTable } from "@/components/admin/VisitsTable"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, query, where, limit, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

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
