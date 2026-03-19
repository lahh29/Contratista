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
import { EditVisitSheet } from "@/components/admin/EditVisitSheet"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, query, where, limit, updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { logAudit } from "@/app/actions/audit"
import { useAppUser } from "@/hooks/use-app-user"

export default function DashboardPage() {
  const db = useFirestore()
  const { user, loading: authLoading } = useUser()
  const { appUser } = useAppUser()
  const [editingVisit, setEditingVisit] = React.useState<any | null>(null)

  const activeVisitsQuery = React.useMemo(() => {
    if (!db || !user || authLoading) return null
    return query(collection(db, "visits"), where("status", "in", ["Activa", "Programada"]), limit(200))
  }, [db, user, authLoading])

  const companiesQuery = React.useMemo(() => {
    if (!db || !user || authLoading) return null
    return query(collection(db, "companies"), limit(500))
  }, [db, user, authLoading])

  const { data: allVisits, loading: dataLoading } = useCollection(activeVisitsQuery)
  const activeVisits = React.useMemo(() => allVisits?.filter(v => v.status === "Activa") ?? null, [allVisits])
  const scheduledVisits = React.useMemo(() => allVisits?.filter(v => v.status === "Programada") ?? null, [allVisits])
  const { data: companies } = useCollection(companiesQuery)

  const handleFinishVisit = async (visitId: string) => {
    if (!db || !appUser) return
    
    // Obtener datos de la visita antes de cerrarla para la auditoría
    const visitSnap = await getDoc(doc(db, "visits", visitId))
    const visitData = visitSnap.data()

    const visitRef = doc(db, "visits", visitId)
    const updateData = { status: "Completed", exitTime: serverTimestamp() }
    
    updateDoc(visitRef, updateData)
      .then(() => {
        // Registrar Auditoría de Salida
        logAudit({
          action: "visit.completed",
          actorUid: appUser.uid,
          actorName: appUser.name || appUser.email || "Usuario",
          actorRole: appUser.role,
          targetType: "visit",
          targetId: visitId,
          targetName: visitData?.companyName || "Visita",
        })
      })
      .catch(async () => {
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

  const isSuaExpired = (c: any) => {
    if (c.sua?.validUntil) {
      const today = new Date().toISOString().slice(0, 10)
      return c.sua.validUntil < today
    }
    return c.sua?.status !== 'Valid'
  }

  const complianceRate = React.useMemo(() => {
    if (!companies?.length) return 0
    const valid = companies.filter(c => !isSuaExpired(c)).length
    return Math.round((valid / companies.length) * 100)
  }, [companies])

  const alertsCount = React.useMemo(() => {
    if (!companies?.length) return 0
    return companies.filter(isSuaExpired).length
  }, [companies])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <DashboardStats
        activePeople={activePeople}
        activeVisits={activeVisits?.length || 0}
        complianceRate={complianceRate}
        alertsCount={alertsCount}
      />

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3 py-3 px-4 md:px-6">
          <div>
            <CardTitle className="text-base font-semibold">Proveedores en planta</CardTitle>
            <CardDescription className="text-xs">Personal trabajando actualmente.</CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(activeVisits?.length ?? 0) > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-2.5 py-0.5 text-xs font-semibold">
                {activeVisits!.length} En Planta
              </Badge>
            )}
            <NewVisitModal trigger={
              <Button size="sm" className="bg-primary text-white h-8 w-8 p-0 shadow-sm shadow-primary/20">
                <Plus className="w-4 h-4" />
              </Button>
            } />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <VisitsTable
            visits={activeVisits}
            loading={dataLoading || authLoading}
            onFinishVisit={handleFinishVisit}
            onEditVisit={setEditingVisit}
          />
        </CardContent>
      </Card>
      {(scheduledVisits?.length ?? 0) > 0 && (
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3 py-3 px-4 md:px-6">
            <div>
              <CardTitle className="text-base font-semibold">Visitas Programadas</CardTitle>
              <CardDescription className="text-xs">Próximas visitas agendadas.</CardDescription>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-2.5 py-0.5 text-xs font-semibold shrink-0">
              {scheduledVisits!.length} Programada{scheduledVisits!.length !== 1 ? "s" : ""}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <VisitsTable
              visits={scheduledVisits}
              loading={dataLoading || authLoading}
              onFinishVisit={handleFinishVisit}
              onEditVisit={setEditingVisit}
            />
          </CardContent>
        </Card>
      )}

      <EditVisitSheet
        visit={editingVisit}
        open={!!editingVisit}
        onOpenChange={(open) => { if (!open) setEditingVisit(null) }}
      />
    </div>
  )
}
