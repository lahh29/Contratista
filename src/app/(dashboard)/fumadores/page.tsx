"use client"

import * as React from "react"
import {
  Search,
  LogOut,
  CornerDownLeft,
  Cigarette,
  User,
  Building2,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserPlus,
  X,
  UtensilsCrossed,
  ShieldAlert,
  Clock,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFirestore } from "@/firebase"
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  limit,
} from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useAppUser } from "@/hooks/use-app-user"
import { sendNotification } from "@/app/actions/notify"
import { CreateEmployeeDialog } from "@/components/fumadores/CreateEmployeeDialog"
import { useDebounce } from "@/hooks/use-debounce"
import { format, formatDistanceStrict } from "date-fns"
import { es } from "date-fns/locale"
import { getMealSchedule, isInMealTime, wasInMealTime } from "@/lib/meal-schedules"


// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  employeeId: string
  Nombre: string
  ApellidoPaterno: string
  ApellidoMaterno?: string
  Puesto: string
  Departamento: string
  Área: string
  Turno: string
}

interface SmokingRecord {
  id: string
  employeeId: string
  nombre: string
  puesto: string
  departamento: string
  area?: string
  turno: string
  exitTime: any
  returnTime: any | null
  date: string
  status: "out" | "returned"
  inMealTime?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDurationMins(mins: number): string {
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function toDate(ts: any): Date | null {
  if (!ts) return null
  if (ts?.toDate) return ts.toDate()
  if (ts instanceof Date) return ts
  return null
}

function fmtTime(ts: any) {
  const d = toDate(ts)
  return d ? format(d, "HH:mm") : "—"
}

function fmtDuration(exit: any, ret: any) {
  const e = toDate(exit)
  const r = toDate(ret)
  if (!e || !r) return null
  return formatDistanceStrict(r, e, { locale: es })
}

// ─── Live duration counter ────────────────────────────────────────────────────
// Se actualiza cada 30 s mientras el registro esté activo.

function LiveDuration({ exitTime }: { exitTime: any }) {
  const [now, setNow] = React.useState(() => new Date())

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const exit = toDate(exitTime)
  if (!exit) return <span className="text-muted-foreground">—</span>

  const diffMs = now.getTime() - exit.getTime()
  const totalMin = Math.floor(diffMs / 60_000)
  const hrs = Math.floor(totalMin / 60)
  const mins = totalMin % 60

  const label = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
  const isLong = totalMin >= 15

  return (
    <span className={isLong ? "text-destructive font-medium" : "text-amber-500"}>
      {label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FumadoresPage() {
  const db = useFirestore()
  const { appUser } = useAppUser()
  const { toast } = useToast()

  const today = format(new Date(), "yyyy-MM-dd")

  // ── Search state ───────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = React.useState("")
  const debouncedId = useDebounce(inputValue, 400)
  const [employee, setEmployee] = React.useState<Employee | null>(null)
  const [searching, setSearching] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)

  // In-session employee cache — evita releer Firebase si el guardia
  // busca el mismo empleado varias veces en el mismo turno.
  const employeeCache = React.useRef<Map<string, Employee | "not_found">>(new Map())

  // ── Records state (lectura única, no onSnapshot) ───────────────────────────
  const [todayRecords, setTodayRecords] = React.useState<SmokingRecord[]>([])
  const [recordsLoading, setRecordsLoading] = React.useState(false)
  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null)
  const [actionLoading, setActionLoading] = React.useState(false)

  // ── Load today's records (getDocs — lectura única) ─────────────────────────
  const loadRecords = React.useCallback(async () => {
    if (!db) return
    setRecordsLoading(true)
    try {
      const snap = await getDocs(
        query(
          collection(db, "fumadores"),
          where("date", "==", today),
          limit(200)
        )
      )
      const records = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as SmokingRecord))
        .sort((a, b) => {
          const ta = toDate(a.exitTime)?.getTime() ?? 0
          const tb = toDate(b.exitTime)?.getTime() ?? 0
          return tb - ta
        })
      setTodayRecords(records)
      setLastRefreshed(new Date())
    } catch {
      // silent — no critical
    } finally {
      setRecordsLoading(false)
    }
  }, [db, today])

  // Carga inicial única
  React.useEffect(() => {
    loadRecords()
  }, [loadRecords])

  // Active record for current employee (derivado del estado local, sin Firebase)
  const activeRecord = React.useMemo(() => {
    if (!employee) return null
    return (
      todayRecords.find(
        (r) => r.employeeId === employee.employeeId && r.status === "out"
      ) ?? null
    )
  }, [employee, todayRecords])

  // ── Employee search ────────────────────────────────────────────────────────
  // Usa getDoc (1 lectura directa por ID de documento) en lugar de
  // getDocs + where, que escanea la colección.
  // REQUISITO: employeeId debe ser el ID del documento en "empleados".
  React.useEffect(() => {
    const id = debouncedId.trim()
    if (!db || !id) {
      setEmployee(null)
      setSearchError(null)
      return
    }

    // Revisar caché antes de ir a Firebase
    const cached = employeeCache.current.get(id)
    if (cached === "not_found") {
      setEmployee(null)
      setSearchError("No se encontró un empleado con ese número")
      return
    }
    if (cached) {
      setEmployee(cached)
      setSearchError(null)
      return
    }

    setSearching(true)
    setSearchError(null)

    getDoc(doc(db, "empleados", id))
      .then((snap) => {
        if (!snap.exists()) {
          employeeCache.current.set(id, "not_found")
          setEmployee(null)
          setSearchError("No se encontró un empleado con ese número")
        } else {
          const data = snap.data() as Employee
          employeeCache.current.set(id, data)
          setEmployee(data)
        }
      })
      .catch(() => setSearchError("Error al buscar. Intenta de nuevo."))
      .finally(() => setSearching(false))
  }, [db, debouncedId])

  // ── Meal time validation ───────────────────────────────────────────────────
  const mealSchedule = employee ? getMealSchedule(employee.Departamento, employee.Turno) : null
  const mealStatus = employee ? isInMealTime(employee.Departamento, employee.Turno) : null
  // mealStatus: true = en comida, false = fuera de comida, null = sin horario configurado

  // Re-check meal status every 30s so the badge updates in real time
  const [, setMealTick] = React.useState(0)
  React.useEffect(() => {
    if (!mealSchedule) return
    const id = setInterval(() => setMealTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [mealSchedule])

  // Whether exit should be blocked (area has schedule AND currently outside meal time)
  const exitBlocked = mealStatus === false

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleExit = async () => {
    if (!db || !employee || !appUser) return

    // Block exit if outside meal time
    if (exitBlocked && mealSchedule) {
      toast({
        title: "Salida denegada",
        description: `${employee.Nombre} no puede salir a fumar. Su horario de comida es ${mealSchedule.label}.`,
        variant: "destructive",
      })
      // Notify admin & seguridad
      sendNotification({
        type: 'smoker_denied_meal',
        employeeName: `${employee.Nombre} ${employee.ApellidoPaterno}`,
        department: employee.Departamento,
        area: employee.Área,
        mealSchedule: mealSchedule.label,
      })
      return
    }

    setActionLoading(true)
    try {
      const currentlyInMeal = isInMealTime(employee.Departamento, employee.Turno)
      await addDoc(collection(db, "fumadores"), {
        employeeId: employee.employeeId,
        nombre: [employee.Nombre, employee.ApellidoPaterno, employee.ApellidoMaterno].filter(Boolean).join(' '),
        puesto: employee.Puesto,
        departamento: employee.Departamento,
        area: employee.Área,
        turno: employee.Turno,
        exitTime: serverTimestamp(),
        returnTime: null,
        date: today,
        status: "out",
        registeredBy: appUser.uid,
        inMealTime: currentlyInMeal ?? true,
      })
      toast({
        title: "Salida registrada",
        description: `${employee.Nombre} ${employee.ApellidoPaterno} salió a fumar.`,
      })
      sendNotification({
        type: 'smoker_exit',
        employeeName: `${employee.Nombre} ${employee.ApellidoPaterno}`,
        department: employee.Departamento,
      })
      await loadRecords()
    } catch {
      toast({
        title: "Error",
        description: "No se pudo registrar la salida.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReturn = async () => {
    if (!db || !activeRecord) return
    setActionLoading(true)
    // Calcular duración antes del update (exitTime ya está en el registro local)
    const exitDate = toDate(activeRecord.exitTime)
    const durationLabel = exitDate
      ? fmtDurationMins(Math.round((Date.now() - exitDate.getTime()) / 60_000))
      : '—'
    try {
      await updateDoc(doc(db, "fumadores", activeRecord.id), {
        returnTime: serverTimestamp(),
        status: "returned",
      })
      toast({
        title: "Regreso registrado",
        description: `${activeRecord.nombre.split(" ")[0]} ya está de vuelta.`,
      })
      sendNotification({
        type: 'smoker_return',
        employeeName: activeRecord.nombre.split(' ').slice(0, 2).join(' '),
        department: activeRecord.departamento,
        duration: durationLabel,
      })
      await loadRecords()
    } catch {
      toast({
        title: "Error",
        description: "No se pudo registrar el regreso.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const fullName = employee
    ? [employee.Nombre, employee.ApellidoPaterno, employee.ApellidoMaterno].filter(Boolean).join(' ')
    : ""

  const outCount = todayRecords.filter((r) => r.status === "out").length

  // ── Paginación local (mostrar de 20 en 20) ────────────────────────────────
  const PAGE_SIZE = 20
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE)

  // Resetear paginación al recargar registros
  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [todayRecords.length])

  const visibleRecords = todayRecords.slice(0, visibleCount)
  const hasMore = visibleCount < todayRecords.length

  // ── Create employee dialog ────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = React.useState(false)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Search bar ── */}
      <div className="flex items-center justify-between gap-4">
      <div className="relative max-w-[160px]">
          {searching ? (
            <RefreshCw
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
          )}

          <Input
            placeholder="No. Emp."
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setInputValue(val);
            }}
            className="pl-9 pr-9"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Buscar por número de empleado"
            role="searchbox"
            maxLength={10}
          />

          {inputValue && !searching && (
            <button
              onClick={() => setInputValue("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Limpiar búsqueda"
              type="button"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
        </div>

        {appUser?.role === "admin" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* ── Search error ── */}
      {searchError && debouncedId && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground -mt-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          {searchError}
        </p>
      )}

      {/* ── Employee card ── */}
      {employee && (
        <Card className="border-border/70">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-5 items-start">

              {/* Avatar */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg text-foreground leading-tight">
                    {fullName}
                  </h3>
                  <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5">
                    #{employee.employeeId}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{employee.Puesto}</p>
                <div className="flex flex-wrap gap-3 pt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    {employee.Departamento}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    Turno {employee.Turno}
                  </span>
                </div>
              </div>

              {/* Meal schedule info + Actions */}
              <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                {/* Meal time badge */}
                {mealSchedule && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {mealStatus === true ? (
                      <Badge className="bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-[11px] gap-1.5 font-medium">
                        <UtensilsCrossed className="w-3 h-3" />
                        En comida
                      </Badge>
                    ) : (
                      <Badge className="bg-destructive/10 dark:bg-destructive/15 text-destructive border border-destructive/20 text-[11px] gap-1.5 font-medium">
                        <ShieldAlert className="w-3 h-3" />
                        Fuera de horario
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {mealSchedule.label}
                    </span>
                  </div>
                )}

                {activeRecord ? (
                  <>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Fuera desde {fmtTime(activeRecord.exitTime)}
                      {" · "}
                      <LiveDuration exitTime={activeRecord.exitTime} />
                    </div>
                    <Button
                      onClick={handleReturn}
                      disabled={actionLoading}
                      size="sm"
                      className="gap-2 w-full sm:w-auto"
                    >
                      <CornerDownLeft className="w-4 h-4" />
                      Registrar regreso
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleExit}
                      disabled={actionLoading || exitBlocked}
                      size="sm"
                      variant={exitBlocked ? "destructive" : "outline"}
                      className="gap-2 w-full sm:w-auto"
                    >
                      {exitBlocked ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      {exitBlocked ? "Salida denegada" : "Registrar salida"}
                    </Button>
                    {exitBlocked && (
                      <p className="text-[11px] text-destructive/80 leading-tight">
                        No puede salir fuera de su horario de comida
                      </p>
                    )}
                  </>
                )}
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Today's records ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Cigarette className="w-4 h-4 text-muted-foreground" />
              Registros de hoy
            </CardTitle>

            <div className="flex items-center gap-2 ml-auto">
              {lastRefreshed && (
                <span className="text-[11px] text-muted-foreground/60 hidden sm:block">
                  Actualizado {format(lastRefreshed, "HH:mm")}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={loadRecords}
                disabled={recordsLoading}
                title="Actualizar lista"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recordsLoading ? "animate-spin" : ""}`} />
              </Button>
              <Badge variant="secondary" className="font-normal text-xs">
                {todayRecords.length}
              </Badge>
              {outCount > 0 && (
                <Badge className="bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[11px] gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {outCount} fuera
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {recordsLoading && todayRecords.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin opacity-40" />
              <p className="text-sm">Cargando…</p>
            </div>
          ) : todayRecords.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-muted-foreground">
              <Cigarette className="w-8 h-8 opacity-20" />
              <p className="text-sm">Sin registros por hoy</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Empleado</TableHead>
                    <TableHead className="hidden sm:table-cell">Departamento</TableHead>
                    <TableHead className="hidden md:table-cell">Turno</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead>Regreso</TableHead>
                    <TableHead className="hidden md:table-cell">Duración</TableHead>
                    <TableHead className="hidden sm:table-cell">Comida</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRecords.map((record) => {
                    const duration = fmtDuration(record.exitTime, record.returnTime)
                    const nameParts = record.nombre.trim().split(' ');
                    let displayName = record.nombre;
                    if (nameParts.length >= 2) {
                        const firstName = nameParts[0];
                        const paternalLastName = nameParts.length === 2 ? nameParts[1] : nameParts[nameParts.length - 2];
                        displayName = `${paternalLastName} ${firstName}`;
                    }
                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm leading-tight">
                              <span className="sm:hidden">{displayName}</span>
                              <span className="hidden sm:inline">{record.nombre}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{record.puesto}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {record.departamento}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {record.turno}
                        </TableCell>
                        <TableCell className="text-sm font-mono tabular-nums">
                          {fmtTime(record.exitTime)}
                        </TableCell>
                        <TableCell className="text-sm font-mono tabular-nums">
                          {fmtTime(record.returnTime)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm tabular-nums">
                          {record.status === "out"
                            ? <LiveDuration exitTime={record.exitTime} />
                            : <span className="text-muted-foreground">{duration ?? "—"}</span>
                          }
                        </TableCell>
                        {/* Columna Comida */}
                        <TableCell className="hidden sm:table-cell">
                          {(() => {
                            // Usar el campo guardado si existe, sino calcular del timestamp
                            const inMeal = record.inMealTime !== undefined
                              ? record.inMealTime
                              : wasInMealTime(record.departamento ?? "", record.turno ?? "", record.exitTime)

                            if (inMeal === null) {
                              return (
                                <span className="text-[11px] text-muted-foreground/50">—</span>
                              )
                            }
                            return inMeal ? (
                              <Badge
                                variant="outline"
                                className="text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                              >
                                <UtensilsCrossed className="w-3 h-3" />
                                <span className="hidden lg:inline">En horario</span>
                              </Badge>
                            ) : (
                              <Badge className="bg-destructive/10 dark:bg-destructive/15 text-destructive border border-destructive/20 text-[11px] gap-1 font-medium">
                                <ShieldAlert className="w-3 h-3" />
                                <span className="hidden lg:inline">Fuera</span>
                              </Badge>
                            )
                          })()}
                        </TableCell>
                        {/* Columna Estado */}
                        <TableCell>
                          {record.status === "out" ? (
                            <Badge className="bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[11px] gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Fuera
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Regresó
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

      {/* ── Ver más ── */}
          {hasMore && (
            <div className="flex justify-center py-4 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Ver más ({todayRecords.length - visibleCount} restantes)
              </Button>
            </div>
          )}
        </CardContent> {/* <-- FALTA ESTA ETIQUETA */}
      </Card>          {/* <-- Y FALTA ESTA ETIQUETA */}

      <CreateEmployeeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(emp: Employee) => {
          // Agrega al caché de sesión para búsqueda inmediata sin ir a Firebase
          employeeCache.current.set(emp.employeeId, emp)
        }}
      />

    </div>
  )
}
