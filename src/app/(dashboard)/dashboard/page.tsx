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
import { collection, query, where, limit, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

export default function DashboardPage() {
  const db = useFirestore()
  const { user, loading: authLoading } = useUser()
  const [editingVisit, setEditingVisit] = React.useState<any | null>(null)

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
      <EditVisitSheet
        visit={editingVisit}
        open={!!editingVisit}
        onOpenChange={(open) => { if (!open) setEditingVisit(null) }}
      />
    </div>
  )
}
