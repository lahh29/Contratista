"use client"

import { 
  MoreHorizontal, 
  LogOut 
} from "lucide-react"
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
        ) : visits && visits.length > 0 ? (
          visits.map((visit) => (
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
                  <span className="text-xs font-semibold uppercase">Activo</span>
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
  )
}
