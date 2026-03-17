"use client"

import { LogOut } from "lucide-react"
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
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface VisitsTableProps {
  visits: any[] | null;
  loading: boolean;
  onFinishVisit: (id: string) => void;
}

export function VisitsTable({ visits, loading, onFinishVisit }: VisitsTableProps) {
  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead className="hidden sm:table-cell">Responsable</TableHead>
            <TableHead>Personal</TableHead>
            <TableHead className="hidden md:table-cell">Área</TableHead>
            <TableHead className="hidden sm:table-cell">Estado</TableHead>
            <TableHead className="hidden lg:table-cell">Permanencia</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">Cargando...</TableCell>
            </TableRow>
          ) : visits && visits.length > 0 ? (
            visits.map((visit) => (
              <TableRow key={visit.id}>
                <TableCell className="font-bold">
                  <div>{visit.companyName}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">
                    {visit.areaName} · {visit.entryTime ? formatDistanceToNow(new Date(visit.entryTime.toDate()), { locale: es }) : '...'}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{visit.supervisorName || visit.supervisorId}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono">
                    {visit.personnelCount || 1}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{visit.areaName}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-semibold uppercase">Activo</span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell font-mono text-xs">
                  {visit.entryTime ? formatDistanceToNow(new Date(visit.entryTime.toDate()), { locale: es }) : '...'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => onFinishVisit(visit.id)}
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
    </div>
  )
}
