"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Loader2, ClipboardList, LogIn, LogOut } from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"

import type { Company } from "@/types"

interface CompanyVisitsSheetProps {
  company: Company
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CompanyVisitsSheet({ company, open, onOpenChange }: CompanyVisitsSheetProps) {
  const db = useFirestore()

  const visitsQuery = React.useMemo(() => {
    if (!db || !company || !open) return null
    return query(
      collection(db, "visits"),
      where("companyId", "==", company.id),
      orderBy("entryTime", "desc"),
      limit(100)
    )
  }, [db, company, open])

  const { data: visits, loading } = useCollection(visitsQuery)

  if (!company) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md overflow-y-auto"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="mb-6">
          <SheetTitle>Historial de Visitas</SheetTitle>
          <SheetDescription>{company.name}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : !visits || visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <ClipboardList className="w-10 h-10 opacity-30" />
            <p className="text-sm">Sin visitas registradas</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">
              {visits.length} visita{visits.length !== 1 ? 's' : ''} en total
            </p>
            {visits.map((visit) => {
              const isActive = visit.status === 'Active'
              const entryDate = visit.entryTime?.toDate ? visit.entryTime.toDate() : null
              const exitDate = visit.exitTime?.toDate ? visit.exitTime.toDate() : null
              return (
                <div key={visit.id} className="rounded-xl border p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{visit.areaName || 'Área no especificada'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {visit.supervisorName || visit.supervisorId || 'Sin supervisor'}
                      </p>
                    </div>
                    <Badge
                      variant={isActive ? 'default' : 'secondary'}
                      className="rounded-md text-xs shrink-0"
                    >
                      {isActive ? (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          Activo
                        </span>
                      ) : 'Completado'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {entryDate && (
                      <span className="flex items-center gap-1">
                        <LogIn className="w-3 h-3" />
                        {format(entryDate, "dd MMM, HH:mm", { locale: es })}
                      </span>
                    )}
                    {exitDate && (
                      <span className="flex items-center gap-1">
                        <LogOut className="w-3 h-3" />
                        {format(exitDate, "dd MMM, HH:mm", { locale: es })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {visit.personnelCount || 1} persona{(visit.personnelCount || 1) !== 1 ? 's' : ''}
                    </span>
                    {entryDate && (
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(entryDate, { locale: es, addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
