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

  X,
  UtensilsCrossed,
  ShieldAlert,
  Clock,
  ChevronDown,
  FileJson,
} from "lucide-react"
import { PillTabsBar, PillTabsContent } from "@/components/ui/pill-tabs"
import type { PillTab } from "@/components/ui/pill-tabs"
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

  // ── Búsqueda de Empleado ────────────────────────────────────────────────────────
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
        employeeId: employee.employeeId,
        department: employee.Departamento,
        area: employee.Área,
        turno: employee.Turno,
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
        employeeId: employee.employeeId,
        department: employee.Departamento,
        turno: employee.Turno,
        mealSchedule: mealSchedule?.label,
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
        employeeId: activeRecord.employeeId,
        department: activeRecord.departamento,
        turno: activeRecord.turno,
        duration: durationLabel,
        mealSchedule: getMealWindow(activeRecord.employeeId, activeRecord.departamento, activeRecord.turno, undefined, mealConfig)?.label,
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
  // ── JSON importer ─────────────────────────────────────────────────────────────────
  const [importerOpen, setImporterOpen] = React.useState(false)

  // ── Panels (shared between mobile tabs and desktop grid) ─────────────────

  const buscadorPanel = (
    <Card className="border-none shadow-sm">
      {/* Header — solo título, sin botones */}
      <CardHeader className="px-4 py-3 md:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          <CardTitle className="flex-1 min-w-0 text-sm font-semibold leading-tight">
            Consultas / Registros
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-4 pt-0 md:px-6">
        {/* ── Buscador + botones admin en la misma fila ── */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            {searching ? (
              <RefreshCw className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" aria-hidden="true" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            )}
            <Input
              placeholder="No. de empleado"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ""))}
              className="pl-8 pr-8 h-9 text-sm w-full"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Buscar por número de empleado"
              role="searchbox"
              maxLength={10}
            />
            {inputValue && !searching && (
              <button onClick={() => setInputValue("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"
                aria-label="Limpiar búsqueda" type="button">
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            )}
          </div>
          {/* Botón admin — importar JSON */}
          {appUser?.role === "admin" && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setImporterOpen(true)}
              aria-label="Importar empleados desde JSON" title="Importar JSON">
              <FileJson className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* ── Error de búsqueda ── */}
        {searchError && debouncedId && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-destructive/5 border border-destructive/15">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive/90">{searchError}</p>
          </div>
        )}

        {/* ── Resultado del empleado ── */}
        {employee && (
          <div className="rounded-xl border border-border/50 overflow-hidden">

            {/* ── Identidad: centrada, jerarquía vertical ── */}
            <div className="flex flex-col items-center gap-1 px-4 pt-5 pb-4 bg-muted/20">
              {/* Número de empleado */}
              <span className="text-xs font-mono text-muted-foreground">
                #{employee.employeeId}
              </span>

              {/* Nombre */}
              <p className="text-base font-semibold leading-tight text-center">
                {employee.Nombre}
              </p>

              {/* Apellidos */}
              <p className="text-sm font-medium leading-tight text-center text-foreground/70">
                {[employee.ApellidoPaterno, employee.ApellidoMaterno].filter(Boolean).join(' ')}
              </p>

              {/* Puesto */}
              <p className="text-xs text-muted-foreground text-center mt-0.5">
                {employee.Puesto}
              </p>
            </div>

            {/* ── Departamento + Turno ── */}
            <div className="grid grid-cols-2 border-t border-border/40">
              <div className="flex flex-col items-center py-3 px-4 gap-0.5 border-r border-border/40">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Departamento</span>
                <span className="text-xs font-semibold text-center leading-tight">{employee.Departamento}</span>
              </div>
              <div className="flex flex-col items-center py-3 px-4 gap-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Turno</span>
                <span className="text-xs font-semibold text-center leading-tight">{employee.Turno}</span>
              </div>
            </div>

            {/* ── Horario de comida + estado ── */}
            <div className="flex flex-col items-center gap-2 px-4 py-3 border-t border-border/40">
              {/* Horario asignado */}
              {mealSchedule ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
                  <span>Comida: <span className="font-medium text-foreground">{mealSchedule.label}</span></span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
                  <span>Sin horario de comida asignado</span>
                </div>
              )}

              {/* Estado: en turno + en comida */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {shiftStatus === true && (
                  <Badge className="bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50 text-[11px] gap-1">
                    <Clock className="w-3 h-3" /> En turno
                  </Badge>
                )}
                {shiftStatus === false && (
                  <Badge variant="outline" className="text-[11px] gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" /> Fuera de turno
                  </Badge>
                )}
                {mealSchedule && (
                  mealStatus === true ? (
                    <Badge className="bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-[11px] gap-1">
                      <UtensilsCrossed className="w-3 h-3" /> En horario
                    </Badge>
                  ) : (
                    <Badge className="bg-destructive/10 dark:bg-destructive/15 text-destructive border border-destructive/20 text-[11px] gap-1">
                      <ShieldAlert className="w-3 h-3" /> Fuera de horario
                    </Badge>
                  )
                )}
              </div>
            </div>

            {/* ── Acción principal ── */}
            <div className="px-4 pb-4 pt-1 border-t border-border/40">
              {activeRecord ? (
                <div className="space-y-2 pt-3">
                  <div className="flex items-center justify-center gap-2 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Fuera desde {fmtTime(activeRecord.exitTime)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · <LiveDuration exitTime={activeRecord.exitTime} />
                    </span>
                  </div>
                  <Button onClick={handleReturn} disabled={actionLoading} className="gap-2 w-full">
                    <CornerDownLeft className="w-4 h-4" />
                    Registrar regreso
                  </Button>
                </div>
              ) : exitBlocked ? (
                <div className="space-y-1.5 pt-3">
                  <Button
                    disabled
                    variant="outline"
                    className="gap-2 w-full border-destructive/30 text-destructive bg-destructive/5 cursor-not-allowed"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Salida denegada
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Fuera de su horario de comida
                  </p>
                </div>
              ) : (
                <div className="pt-3">
                  <Button onClick={handleExit} disabled={actionLoading} variant="outline" className="gap-2 w-full">
                    <LogOut className="w-4 h-4" />
                    Registrar salida
                  </Button>
                </div>
              )}
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  )

  const registrosPanel = (
    <Card className="border-none shadow-sm">
      {/* ── Header compacto ── */}
      <CardHeader className="px-4 py-3 md:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Cigarette className="w-4 h-4 text-primary" />
          </div>
          <CardTitle className="flex-1 min-w-0 text-sm font-semibold leading-tight">Registros de hoy</CardTitle>

          {/* Stats + acciones */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Fuera */}
            {outCount > 0 && (
              <Badge className="bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[11px] gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {outCount} fuera
              </Badge>
            )}
            {/* Total */}
            <Badge variant="secondary" className="font-normal text-xs tabular-nums">
              {todayRecords.length}
            </Badge>
            {/* Actualizado */}
            {lastRefreshed && (
              <span className="text-[11px] text-muted-foreground/50 hidden sm:block tabular-nums">
                {format(lastRefreshed, "HH:mm")}
              </span>
            )}
            {/* Refresh */}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
              onClick={loadRecords} disabled={recordsLoading} title="Actualizar">
              <RefreshCw className={`w-3.5 h-3.5 ${recordsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-hidden">
        {/* ── Estados vacíos ── */}
        {recordsLoading && todayRecords.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin opacity-40" />
            <p className="text-sm">Cargando…</p>
          </div>
        ) : todayRecords.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Cigarette className="w-9 h-9 opacity-15" />
            <p className="text-sm font-medium">Sin registros por hoy</p>
          </div>
        ) : (
          <>
            {/* ══ Mobile / Tablet: cards en grid ════════════════════════ */}
            <div className="lg:hidden px-4 pb-4 pt-2 md:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {visibleRecords.map((record) => {
                  const nameParts = record.nombre.trim().split(' ')
                  const displayName = nameParts.length >= 3
                    ? `${nameParts[nameParts.length - 2]} ${nameParts[0]}`
                    : record.nombre

                  const inMeal = record.inMealTime !== undefined
                    ? record.inMealTime
                    : wasInMealTime(record.employeeId, record.departamento ?? "", record.turno ?? "", record.exitTime, mealConfig)

                  const isOut = record.status === "out"

                  return (
                    <div
                      key={record.id}
                      className={`rounded-xl border p-3 space-y-2 transition-colors ${isOut
                        ? "border-amber-200 dark:border-amber-800/50 bg-amber-500/5"
                        : "border-border/50 bg-muted/20"
                        }`}
                    >
                      {/* Fila superior: nombre + estado */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm leading-tight truncate">{displayName}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{record.departamento} · T{record.turno}</p>
                        </div>
                        {isOut ? (
                          <Badge className="bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[10px] gap-1 font-medium shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Fuera
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Regresó
                          </Badge>
                        )}
                      </div>

                      {/* Fila inferior: horarios + comida */}
                      <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                        {/* Salida → Regreso / duración */}
                        <div className="flex items-center gap-1 text-xs font-mono tabular-nums text-muted-foreground flex-1 min-w-0">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{fmtTime(record.exitTime)}</span>
                          <span className="text-border">→</span>
                          {isOut
                            ? <LiveDuration exitTime={record.exitTime} />
                            : <span>{fmtTime(record.returnTime)}</span>
                          }
                        </div>
                        {/* Comida */}
                        {inMeal !== null && (
                          inMeal ? (
                            <Badge variant="outline" className="text-[10px] gap-0.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 shrink-0 px-1.5">
                              <UtensilsCrossed className="w-3 h-3" />
                            </Badge>
                          ) : (
                            <Badge className="bg-destructive/8 dark:bg-destructive/15 text-destructive border border-destructive/20 text-[10px] gap-0.5 shrink-0 px-1.5">
                              <ShieldAlert className="w-3 h-3" />
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ══ Desktop: tabla completa ════════════════════════════════ */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Empleado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead className="tabular-nums">Salida</TableHead>
                    <TableHead className="tabular-nums">Regreso / Duración</TableHead>
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
                    const isOut = record.status === "out"
                    return (
                      <TableRow key={record.id} className={isOut ? "bg-amber-500/3 hover:bg-amber-500/6" : ""}>
                        <TableCell className="pl-6">
                          <p className="font-medium text-sm leading-tight">{record.nombre}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{record.puesto}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{record.departamento}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{record.turno}</TableCell>
                        <TableCell className="text-sm font-mono tabular-nums">{fmtTime(record.exitTime)}</TableCell>
                        <TableCell className="text-sm font-mono tabular-nums">
                          {isOut
                            ? <LiveDuration exitTime={record.exitTime} />
                            : <span className="text-muted-foreground">{fmtTime(record.returnTime)}{duration ? ` · ${duration}` : ""}</span>
                          }
                        </TableCell>
                        <TableCell>
                          {inMeal === null ? (
                            <span className="text-[11px] text-muted-foreground/40">—</span>
                          ) : inMeal ? (
                            <Badge variant="outline" className="text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50">
                              <UtensilsCrossed className="w-3 h-3" /> En horario
                            </Badge>
                          ) : (
                            <Badge className="bg-destructive/10 dark:bg-destructive/15 text-destructive border border-destructive/20 text-[11px] gap-1">
                              <ShieldAlert className="w-3 h-3" /> Fuera
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isOut ? (
                            <Badge className="bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[11px] gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Fuera
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Regresó
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* ── Ver más ── */}
        {hasMore && (
          <div className="flex justify-center py-3 border-t border-border/40">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground text-xs"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
              <ChevronDown className="w-3.5 h-3.5" />
              Ver {Math.min(PAGE_SIZE, todayRecords.length - visibleCount)} más
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  const MOBILE_TABS: PillTab[] = React.useMemo(() => [
    { value: "buscar", label: "Buscar", icon: <Search className="w-3.5 h-3.5" /> },
    {
      value: "registros",
      label: "Registros",
      icon: <Cigarette className="w-3.5 h-3.5" />,
      badge: outCount > 0 ? (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[10px] px-1 py-0 font-medium ml-0.5">
          {outCount}
        </Badge>
      ) : undefined,
    },
  ], [outCount])

  const [activeTab, setActiveTab] = React.useState("buscar")

  const tabContent: Record<string, React.ReactNode> = {
    buscar: buscadorPanel,
    registros: registrosPanel,
  }

  return (
    <div className="animate-in fade-in duration-500 overflow-x-hidden w-full pb-8 supports-[padding:env(safe-area-inset-bottom)]:pb-[max(2rem,env(safe-area-inset-bottom))]">

      {/* ── Mobile: pill tabs ── */}
      <div className="lg:hidden">
        <PillTabsBar
          tabs={MOBILE_TABS}
          value={activeTab}
          onValueChange={setActiveTab}
          layoutId="fumadores-pill"
          className="mb-5"
        />
        <PillTabsContent value={activeTab}>
          {tabContent[activeTab]}
        </PillTabsContent>
      </div>

      {/* ── Desktop: side-by-side grid ── */}
      <div className="hidden lg:grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        {buscadorPanel}
        {registrosPanel}
      </div>

      <JsonImporterSheet open={importerOpen} onOpenChange={setImporterOpen} />
    </div>
  )
}
