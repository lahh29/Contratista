"use client"

import * as React from "react"
import { DashboardStats } from "@/components/admin/DashboardStats"
import { VisitsTable } from "@/components/admin/VisitsTable"
import { VisitsCalendar } from "@/components/admin/VisitsCalendar"
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

  const visitsForRole = React.useMemo(() => {
    if (!allVisits) return null
    if (appUser?.role === 'logistica') return allVisits.filter(v => v.companyType === 'cliente')
    return allVisits
  }, [allVisits, appUser?.role])

  const activeVisits = React.useMemo(() => visitsForRole?.filter(v => v.status === "Activa") ?? null, [visitsForRole])
  const scheduledVisits = React.useMemo(() => visitsForRole?.filter(v => v.status === "Programada") ?? null, [visitsForRole])
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

  const isRestrictedRole = appUser?.role === 'guard'

  if (isRestrictedRole) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <VisitsCalendar
          db={db}
          activeVisits={visitsForRole}
          loading={dataLoading || authLoading}
          onFinishVisit={handleFinishVisit}
          onEditVisit={setEditingVisit}
          canEdit={false}
          scheduledOnly
        />
        <EditVisitSheet
          visit={editingVisit}
          open={!!editingVisit}
          onOpenChange={(open) => { if (!open) setEditingVisit(null) }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <DashboardStats
        activePeople={activePeople}
        activeVisits={activeVisits?.length || 0}
        complianceRate={complianceRate}
        alertsCount={alertsCount}
      />

      <VisitsCalendar
        db={db}
        activeVisits={visitsForRole}
        loading={dataLoading || authLoading}
        onFinishVisit={handleFinishVisit}
        onEditVisit={setEditingVisit}
        canEdit={appUser?.role !== 'guard'}
      />

      <EditVisitSheet
        visit={editingVisit}
        open={!!editingVisit}
        onOpenChange={(open) => { if (!open) setEditingVisit(null) }}
      />
    </div>
  )
}
