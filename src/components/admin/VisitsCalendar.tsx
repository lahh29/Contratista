"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, Plus, LogOut, Pencil, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NewVisitModal } from "@/components/visits/NewVisitModal"
import { cn } from "@/lib/utils"

// ── Timezone: Querétaro — America/Mexico_City (UTC-6, sin horario de verano desde 2023) ──

function toQroDateStr(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

function qroToday(): Date {
  // Mediodía local evita bordes de medianoche
  return new Date(toQroDateStr() + 'T12:00:00')
}

// ──────────────────────────────────────────────────────────────────────────────

const DAY_ABBR = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SÁ']

const STATUS_CONFIG: Record<string, { label: string; border: string; bg: string; dot: string; textColor: string }> = {
  Programada: {
    label:     'Programada',
    border:    'border-l-blue-400',
    bg:        'hover:bg-blue-50/60 dark:hover:bg-blue-950/20',
    dot:       'bg-blue-500',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  Activa: {
    label:     'En planta',
    border:    'border-l-emerald-400',
    bg:        'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20',
    dot:       'bg-emerald-500 animate-pulse',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  Completada: {
    label:     'Completada',
    border:    'border-l-border',
    bg:        'hover:bg-muted/30',
    dot:       'bg-muted-foreground/30',
    textColor: 'text-muted-foreground',
  },
  Completed: {
    label:     'Completada',
    border:    'border-l-border',
    bg:        'hover:bg-muted/30',
    dot:       'bg-muted-foreground/30',
    textColor: 'text-muted-foreground',
  },
}

// ──────────────────────────────────────────────────────────────────────────────

interface VisitsCalendarProps {
  db:                any
  activeVisits:      any[] | null   // real-time: Activa + Programada
  loading:           boolean
  onFinishVisit:     (id: string) => void
  onEditVisit:       (visit: any) => void
  canEdit?:          boolean
  /** Si true solo muestra Programada (vista guardia) */
  scheduledOnly?:    boolean
  /** Filtra por companyType (p.ej. 'cliente' para logística) */
  companyTypeFilter?: string
}

export function VisitsCalendar({
  db,
  activeVisits,
  loading,
  onFinishVisit,
  onEditVisit,
  canEdit = true,
  scheduledOnly = false,
  companyTypeFilter,
}: VisitsCalendarProps) {
  const today    = useMemo(() => qroToday(), [])
  const todayStr = toQroDateStr(today)

  const [selectedDate, setSelectedDate] = useState(today)
  const [fetchedVisits, setFetchedVisits]   = useState<any[]>([])
  const [fetching,      setFetching]        = useState(false)

  const selectedDateStr = toQroDateStr(selectedDate)
  const isToday         = selectedDateStr === todayStr

  // Strip: 3 días anteriores + hoy + 6 futuros = 10 pastillas
  const days = useMemo(
    () => Array.from({ length: 10 }, (_, i) => addDays(today, i - 3)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayStr],
  )

  // Puntito indicador: qué días tienen visitas (de datos en tiempo real)
  const dotDays = useMemo(() => {
    const s = new Set<string>()
    activeVisits?.forEach(v => { if (v.scheduledDate) s.add(v.scheduledDate) })
    return s
  }, [activeVisits])

  // Consulta puntual por fecha (historial de completadas y programadas pasadas)
  const fetchForDate = useCallback(async (dateStr: string) => {
    if (!db) return
    setFetching(true)
    try {
      const snap = await getDocs(
        query(collection(db, 'visits'), where('scheduledDate', '==', dateStr))
      )
      setFetchedVisits(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch {
      setFetchedVisits([])
    } finally {
      setFetching(false)
    }
  }, [db])

  useEffect(() => {
    fetchForDate(selectedDateStr)
  }, [selectedDateStr, fetchForDate])

  // Combinar datos en tiempo real + puntales; el real-time gana ante duplicados
  const visitsForDay = useMemo(() => {
    const map = new Map<string, any>()
    // Primero datos puntuales (base)
    fetchedVisits
      .filter(v => !companyTypeFilter || v.companyType === companyTypeFilter)
      .forEach(v => map.set(v.id, v))
    // Luego real-time sobreescribe (más actualizado)
    activeVisits
      ?.filter(v => v.scheduledDate === selectedDateStr || (isToday && !v.scheduledDate))
      .forEach(v => map.set(v.id, v))

    const list = Array.from(map.values())

    if (scheduledOnly) return list.filter(v => v.status === 'Programada')

    // Orden: Activa > Programada > Completada, luego por scheduledTime
    const order: Record<string, number> = { Activa: 0, Programada: 1, Completada: 2, Completed: 2 }
    return list.sort((a, b) => {
      const oa = order[a.status] ?? 3
      const ob = order[b.status] ?? 3
      if (oa !== ob) return oa - ob
      return (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? '')
    })
  }, [fetchedVisits, activeVisits, selectedDateStr, isToday, scheduledOnly, companyTypeFilter])

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

      {/* Encabezado */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div>
          <p className="text-base font-semibold">
            {scheduledOnly ? 'Visitas Programadas' : 'Detalle'}
          </p>
          <p className="text-xs text-muted-foreground">
            {/* Solo capitaliza la primera letra */}
            {(() => {
              const s = format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
              return s.charAt(0).toUpperCase() + s.slice(1)
            })()}
            {visitsForDay.length > 0 && (
              <span className="ml-1.5 font-semibold text-foreground/70">
                · {visitsForDay.length}
              </span>
            )}
          </p>
        </div>

        {canEdit && (
          <NewVisitModal trigger={
            <Button size="sm" className="h-9 w-9 p-0 shadow-sm shadow-primary/20">
              <Plus className="w-4 h-4" />
            </Button>
          } />
        )}
      </div>

      {/* Tira de fechas */}
      <div className="flex gap-1 px-3 py-3 overflow-x-auto scrollbar-none bg-muted/20 border-b border-border/40">
        {days.map((day, i) => {
          const dStr   = toQroDateStr(day)
          const isT    = dStr === todayStr
          const isSel  = dStr === selectedDateStr
          const hasDot = dotDays.has(dStr)
          // days[3] = hoy (offset 3 desde el inicio). En móvil solo ±1
          const hiddenOnMobile = i < 2 || i > 4

          return (
            <button
              key={dStr}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "flex flex-col items-center gap-0.5 min-w-[3.25rem] py-2.5 px-1 rounded-xl transition-all duration-200 shrink-0 select-none active:scale-95",
                hiddenOnMobile && "hidden sm:flex",
                isSel
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : isT
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/60 text-muted-foreground",
              )}
            >
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wide leading-none",
                isSel && "text-primary-foreground/70",
              )}>
                {isT ? 'HOY' : DAY_ABBR[day.getDay()]}
              </span>
              <span className="text-xl font-black leading-tight">
                {day.getDate()}
              </span>
              {/* Indicador de visitas */}
              <span className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                hasDot
                  ? isSel ? "bg-primary-foreground/60" : "bg-primary/70"
                  : "bg-transparent",
              )} />
            </button>
          )
        })}
      </div>

      {/* Lista de visitas — altura responsiva */}
      <div className="divide-y divide-border/50 max-h-[min(26rem,55vh)] overflow-y-auto">
        {loading || fetching ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visitsForDay.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Calendar className="w-7 h-7 opacity-25" />
            <p className="text-sm">Sin visitas para este día</p>
          </div>
        ) : (
          visitsForDay.map(visit => {
            const sc         = STATUS_CONFIG[visit.status] ?? STATUS_CONFIG.Programada
            const isActive   = visit.status === 'Activa'
            const isDone     = visit.status === 'Completada' || visit.status === 'Completed'

            return (
              <div
                key={visit.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 border-l-[3px] transition-colors",
                  sc.border,
                  sc.bg,
                )}
              >
                {/* Dot estado */}
                <span className={cn("w-2 h-2 rounded-full shrink-0", sc.dot)} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Nombre — en desktop lleva el badge inline */}
                  <div className="flex items-center gap-2 min-w-0">
                    <p className={cn(
                      "text-sm font-semibold truncate min-w-0",
                      isDone && "line-through opacity-50",
                    )}>
                      {visit.companyName}
                    </p>
                    {visit.companyType && (
                      <span className={cn(
                        "hidden sm:inline-flex shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize",
                        visit.companyType === 'cliente'
                          ? "bg-gradient-to-r from-blue-500/20 to-blue-500/5 border-blue-300/60 text-blue-700 dark:from-blue-500/30 dark:to-blue-500/5 dark:border-blue-600/40 dark:text-blue-300"
                          : "bg-gradient-to-r from-orange-500/20 to-orange-500/5 border-orange-300/60 text-orange-700 dark:from-orange-500/30 dark:to-orange-500/5 dark:border-orange-600/40 dark:text-orange-300",
                      )}>
                        {visit.companyType}
                      </span>
                    )}
                  </div>
                  {/* Metadata — en móvil incluye el badge aquí */}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {visit.companyType && (
                      <span className={cn(
                        "sm:hidden shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize",
                        visit.companyType === 'cliente'
                          ? "bg-gradient-to-r from-blue-500/20 to-blue-500/5 border-blue-300/60 text-blue-700"
                          : "bg-gradient-to-r from-orange-500/20 to-orange-500/5 border-orange-300/60 text-orange-700",
                      )}>
                        {visit.companyType}
                      </span>
                    )}
                    {visit.scheduledTime && (
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {visit.scheduledTime}
                      </span>
                    )}
                    {visit.areaName && (
                      <span className="text-xs text-muted-foreground">{visit.areaName}</span>
                    )}
                    <span className={cn("text-[10px] font-bold uppercase tracking-wide", sc.textColor)}>
                      {sc.label}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                {!isDone && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {canEdit && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted"
                        onClick={() => onEditVisit(visit)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {isActive && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
                        onClick={() => onFinishVisit(visit.id)}
                        title="Registrar salida"
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
