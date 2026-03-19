"use client"

import { LogOut, Pencil, Calendar, Clock } from "lucide-react"
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
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface VisitsTableProps {
  visits: any[] | null
  loading: boolean
  onFinishVisit: (id: string) => void
  onEditVisit: (visit: any) => void
}

function formatScheduledTime(timeStr: string) {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  const date = new Date()
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10))
  return format(date, 'h:mm a')
}

export function VisitsTable({ visits, loading, onFinishVisit, onEditVisit }: VisitsTableProps) {
  return (
    <TooltipProvider>
      <div className="overflow-x-auto -mx-6 px-6">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead className="hidden sm:table-cell">Responsable</TableHead>
              <TableHead className="hidden lg:table-cell">Programación</TableHead>
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
                <TableRow key={visit.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="py-3">
                    <div className="font-bold text-sm sm:text-base">{visit.companyName}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {visit.companyType || 'proveedor'}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{visit.supervisorName || visit.supervisorId}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {visit.scheduledDate ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">
                          {format(new Date(visit.scheduledDate), "d MMM yyyy", { locale: es })}
                        </span>
                        {visit.scheduledTime && (
                           <span className="text-muted-foreground">{formatScheduledTime(visit.scheduledTime)}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin programar</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{visit.areaName}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-semibold uppercase">Activo</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-xs">
                    {visit.entryTime
                      ? formatDistanceToNow(new Date(visit.entryTime.toDate()), { locale: es })
                      : '...'}
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost" size="icon"
                            className="h-9 w-9 text-muted-foreground hover:bg-muted rounded-full"
                            onClick={() => onEditVisit(visit)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar visita</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost" size="icon"
                            className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-full"
                            onClick={() => onFinishVisit(visit.id)}
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Registrar Salida</TooltipContent>
                      </Tooltip>
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
    </TooltipProvider>
  )
}
