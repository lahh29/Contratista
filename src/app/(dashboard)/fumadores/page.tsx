"use client"

import * as React from "react"
import {
  Search,
  LogOut,
  CornerDownLeft,
  Cigarette,
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
  ChevronDown,
  FileJson,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { JsonImporterSheet } from "@/components/fumadores/JsonImporterSheet"
import { useDebounce } from "@/hooks/use-debounce"
import { format, formatDistanceStrict } from "date-fns"
import { es } from "date-fns/locale"
import { getMealWindow, isInMealTime, wasInMealTime, isInShift } from "@/lib/meal-schedules"
import { useMealConfig } from "@/hooks/use-meal-config"


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
  const { config: mealConfig } = useMealConfig()

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
  const mealSchedule = employee
    ? getMealWindow(employee.employeeId, employee.Departamento, employee.Turno, undefined, mealConfig)
    : null
  const mealStatus = employee
    ? isInMealTime(employee.employeeId, employee.Departamento, employee.Turno, mealConfig)
    : null
  // mealStatus: true = en comida, false = fuera de comida, null = sin horario configurado
  const shiftStatus = employee ? isInShift(employee.Turno) : null
  // shiftStatus: true = dentro del turno, false = fuera del turno, null = turno sin ventana definida

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
      const currentlyInMeal = isInMealTime(employee.employeeId, employee.Departamento, employee.Turno, mealConfig)
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

  // ── Expanded record (mobile detail view) ─────────────────────────────────
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  // ── Create employee dialog ────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = React.useState(false)

  // ── JSON importer ─────────────────────────────────────────────────────────
  const [importerOpen, setImporterOpen] = React.useState(false)

  // ── Panels (shared between mobile tabs and desktop grid) ─────────────────

  const buscadorPanel = (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          <span className="flex-1">Registrar salida / regreso</span>
          {appUser?.role === "admin" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setImporterOpen(true)}
                aria-label="Importar empleados desde JSON"
                title="Importar JSON"
              >
                <FileJson className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setCreateOpen(true)}
                aria-label="Agregar empleado"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search input */}
        <div className="relative">
          {searching ? (
            <RefreshCw className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" aria-hidden="true" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          )}
          <Input
            placeholder="No. de Empleado"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ""))}
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

        {/* Search error */}
        {searchError && debouncedId && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            {searchError}
          </p>
        )}

        {/* Employee result */}
        {employee && (
          <div className="p-4 bg-muted/40 rounded-xl space-y-3">
            {/* Name */}
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-sm leading-tight">{fullName}</span>
                <Badge variant="outline" className="text-[11px] font-mono px-1.5 py-0">
                  #{employee.employeeId}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{employee.Puesto}</p>
            </div>

            {/* Dept + turno */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                {employee.Departamento}
              </span>
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                Turno {employee.Turno}
              </span>
              {/* Badge de turno activo */}
              {shiftStatus === true && (
                <Badge className="bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50 text-[11px] gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  En turno
                </Badge>
              )}
              {shiftStatus === false && (
                <Badge variant="outline" className="text-[11px] gap-1 text-muted-foreground border-border/60 font-normal">
                  <Clock className="w-3 h-3" />
                  Fuera de turno
                </Badge>
              )}
            </div>

            {/* Meal badge */}
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

            {/* Actions */}
            {activeRecord ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Fuera desde {fmtTime(activeRecord.exitTime)}
                  {" · "}
                  <LiveDuration exitTime={activeRecord.exitTime} />
                </div>
                <Button onClick={handleReturn} disabled={actionLoading} size="sm" className="gap-2 w-full">
                  <CornerDownLeft className="w-4 h-4" />
                  Registrar regreso
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Button
                  onClick={handleExit}
                  disabled={actionLoading || exitBlocked}
                  size="sm"
                  variant={exitBlocked ? "destructive" : "outline"}
                  className="gap-2 w-full"
                >
                  {exitBlocked ? <ShieldAlert className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                  {exitBlocked ? "Salida denegada" : "Registrar salida"}
                </Button>
                {exitBlocked && (
                  <p className="text-[11px] text-destructive/80 leading-tight text-center">
                    No puede salir fuera de su horario de comida
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const registrosPanel = (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Cigarette className="w-4 h-4 text-primary" />
            </div>
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
          <>
            {/* ── Mobile: expandable cards ──────────────────────────────── */}
            <div className="lg:hidden divide-y divide-border/40">
              {visibleRecords.map((record) => {
                const nameParts = record.nombre.trim().split(' ')
                let displayName = record.nombre
                if (nameParts.length >= 2) {
                  const firstName = nameParts[0]
                  const paternalLastName = nameParts.length === 2 ? nameParts[1] : nameParts[nameParts.length - 2]
                  displayName = `${paternalLastName} ${firstName}`
                }

                const inMeal = record.inMealTime !== undefined
                  ? record.inMealTime
                  : wasInMealTime(record.employeeId, record.departamento ?? "", record.turno ?? "", record.exitTime, mealConfig)

                const isExpanded = expandedId === record.id

                return (
                  <div key={record.id}>
                    {/* Main row — tappable */}
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors active:bg-muted/50"
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    >
                      {/* Name + time */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-tight truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          {fmtTime(record.exitTime)}
                          <span className="mx-0.5">→</span>
                          {record.status === "out"
                            ? <LiveDuration exitTime={record.exitTime} />
                            : fmtTime(record.returnTime)
                          }
                        </p>
                      </div>

                      {/* Comida badge */}
                      {inMeal === null ? (
                        <span className="text-[11px] text-muted-foreground/40">—</span>
                      ) : inMeal ? (
                        <Badge variant="outline" className="text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 shrink-0">
                          <UtensilsCrossed className="w-3 h-3" />
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive/10 dark:bg-destructive/15 text-destructive border border-destructive/20 text-[11px] gap-1 font-medium shrink-0">
                          <ShieldAlert className="w-3 h-3" />
                        </Badge>
                      )}

                      {/* Estado badge */}
                      {record.status === "out" ? (
                        <Badge className="bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[11px] gap-1 font-medium shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Fuera
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          Regresó
                        </Badge>
                      )}

                      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/50 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-1 bg-muted/20 space-y-1.5 text-xs text-muted-foreground border-t border-border/30">
                        <p className="font-medium text-foreground">{record.puesto}</p>
                        <div className="flex flex-wrap gap-3">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            {record.departamento}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 shrink-0" />
                            Turno {record.turno}
                          </span>
                        </div>
                        {inMeal !== null && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {getMealWindow(record.employeeId, record.departamento ?? "", record.turno ?? "", undefined, mealConfig)?.label ?? "—"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Desktop: full table ───────────────────────────────────── */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="min-w-[580px]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Salida</TableHead>
                      <TableHead>Regreso</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Comida</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRecords.map((record) => {
                      const duration = fmtDuration(record.exitTime, record.returnTime)
                      const inMeal = record.inMealTime !== undefined
                        ? record.inMealTime
                        : wasInMealTime(record.employeeId, record.departamento ?? "", record.turno ?? "", record.exitTime, mealConfig)
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <p className="font-medium text-sm leading-tight">{record.nombre}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{record.puesto}</p>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{record.departamento}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{record.turno}</TableCell>
                          <TableCell className="text-sm font-mono tabular-nums">{fmtTime(record.exitTime)}</TableCell>
                          <TableCell className="text-sm font-mono tabular-nums">{fmtTime(record.returnTime)}</TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {record.status === "out"
                              ? <LiveDuration exitTime={record.exitTime} />
                              : <span className="text-muted-foreground">{duration ?? "—"}</span>
                            }
                          </TableCell>
                          <TableCell>
                            {inMeal === null ? (
                              <span className="text-[11px] text-muted-foreground/50">—</span>
                            ) : inMeal ? (
                              <Badge variant="outline" className="text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50">
                                <UtensilsCrossed className="w-3 h-3" />
                                En horario
                              </Badge>
                            ) : (
                              <Badge className="bg-destructive/10 dark:bg-destructive/15 text-destructive border border-destructive/20 text-[11px] gap-1 font-medium">
                                <ShieldAlert className="w-3 h-3" />
                                Fuera
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.status === "out" ? (
                              <Badge className="bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[11px] gap-1.5 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Fuera
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
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
            </div>
          </>
        )}

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
      </CardContent>
    </Card>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in duration-500 overflow-x-hidden w-full pb-8 supports-[padding:env(safe-area-inset-bottom)]:pb-[max(2rem,env(safe-area-inset-bottom))]">

      {/* ── Mobile: tabs ── */}
      <div className="lg:hidden">
        <Tabs defaultValue="buscar" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-5">
            <TabsTrigger value="buscar" className="gap-2 text-xs">
              <Search className="w-3.5 h-3.5" />
              Buscar
            </TabsTrigger>
            <TabsTrigger value="registros" className="gap-2 text-xs">
              <Cigarette className="w-3.5 h-3.5" />
              Registros
              {outCount > 0 && (
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[10px] px-1.5 py-0 font-medium ml-1">
                  {outCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="buscar" className="mt-0">{buscadorPanel}</TabsContent>
          <TabsContent value="registros" className="mt-0">{registrosPanel}</TabsContent>
        </Tabs>
      </div>

      {/* ── Desktop: side-by-side grid ── */}
      <div className="hidden lg:grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        {buscadorPanel}
        {registrosPanel}
      </div>

      <CreateEmployeeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(emp: Employee) => {
          employeeCache.current.set(emp.employeeId, emp)
        }}
      />
      <JsonImporterSheet open={importerOpen} onOpenChange={setImporterOpen} />
    </div>
  )
}
