// ─── Horarios de comida ────────────────────────────────────────────────────────
// Zona horaria: America/Mexico_City (Querétaro)
//
// API pública (4 funciones):
//   getMealWindow(employeeId, departamento, turno, date?, config?)  → horario asignado
//   isInMealTime(employeeId, departamento, turno, config?)          → ¿está en horario ahora?
//   wasInMealTime(employeeId, departamento, turno, timestamp, config?) → ¿estaba en horario?
//   isInShift(turno, date?)                                         → ¿está en turno ahora?
//
// Configuración dinámica (Firestore):
//   Los datos se cargan desde las colecciones `mealSchedules` y `employeeGroups`.
//   Mientras no haya datos en Firestore, se usan los valores de STATIC_CONFIG.
//   Para migrar: usa el botón "Inicializar desde defaults" en Ajustes → Horarios.

const TZ = "America/Mexico_City"

// ─── Interfaces públicas ───────────────────────────────────────────────────────

export interface MealWindow {
  start: string  // "HH:mm" 24 h
  end:   string  // "HH:mm" 24 h
  label: string  // texto para la UI
}

/**
 * Grupo de empleados con un horario de comida común.
 * Puede pertenecer a cualquier departamento (no solo Producción).
 */
export interface EmployeeGroup {
  id?:          string      // ID del documento en Firestore (omitir en datos estáticos)
  departamento: string      // Ej. "PRODUCCIÓN", "CALIDAD"
  turno:        string      // "1", "2", "3", "MIXTO"
  grupo:        string      // Número de grupo: "1", "2", …
  label:        string      // Texto para la UI
  employees:    string[]    // Array de employeeId (como string)
  meal:         MealWindow
}

/**
 * Configuración completa de horarios.
 * Puede venir de Firestore o de STATIC_CONFIG como fallback.
 */
export interface MealConfig {
  /** Horarios fijos por departamento+turno. Clave = "DEPT|TURNO" en mayúsculas. */
  schedules: Record<string, MealWindow>
  /** Grupos de empleados con ventanas específicas (cualquier departamento). */
  groups:    EmployeeGroup[]
}

// ─── Configuración estática (fallback mientras Firestore no tiene datos) ───────

export const STATIC_CONFIG: MealConfig = {
  schedules: {
    "CALIDAD|1":              { start: "11:00", end: "11:30", label: "11:00 – 11:30" },
    "CALIDAD|2":              { start: "18:00", end: "18:30", label: "18:00 – 18:30" },
    "ALMACÉN|1":              { start: "12:00", end: "12:30", label: "12:00 – 12:30" },
    "ALMACÉN|2":              { start: "18:00", end: "18:30", label: "18:00 – 18:30" },
    "METROLOGÍA|1":           { start: "12:00", end: "12:30", label: "12:00 – 12:30" },
    "METROLOGÍA|2":           { start: "19:00", end: "19:30", label: "19:00 – 19:30" },
    "METROLOGÍA|3":           { start: "04:30", end: "05:00", label: "04:30 – 05:00" },
    "METROLOGÍA|MIXTO":       { start: "12:00", end: "12:30", label: "12:00 – 12:30" },
    "TALLER DE MOLDES|1":     { start: "11:30", end: "12:00", label: "11:30 – 12:00" },
    "TALLER DE MOLDES|2":     { start: "19:00", end: "19:30", label: "19:00 – 19:30" },
    "TALLER DE MOLDES|MIXTO": { start: "13:00", end: "14:00", label: "13:00 – 14:00" },
    "RECURSOS HUMANOS|MIXTO": { start: "15:00", end: "16:00", label: "15:00 – 16:00" },
    "RECURSOS HUMANOS|1":     { start: "11:30", end: "12:00", label: "11:30 – 12:00" },
    "RECURSOS HUMANOS|2":     { start: "15:30", end: "16:00", label: "15:30 – 16:00" },
    "RECURSOS HUMANOS|3":     { start: "03:30", end: "04:00", label: "03:30 – 04:00" },
  },
  groups: [
    {
      departamento: "PRODUCCIÓN", turno: "1", grupo: "1",
      label:     "Grupo 1 – Turno 1 – Producción",
      employees: ["1444", "1539", "2315", "2545", "2934", "3780"],
      meal:      { start: "09:00", end: "09:30", label: "09:00 – 09:30" },
    },
    {
      departamento: "PRODUCCIÓN", turno: "1", grupo: "2",
      label:     "Grupo 2 – Turno 1 – Producción",
      employees: ["1677", "3257", "3593", "3669", "3734", "3773"],
      meal:      { start: "09:30", end: "10:00", label: "09:30 – 10:00" },
    },
    {
      departamento: "PRODUCCIÓN", turno: "1", grupo: "3",
      label:     "Grupo 3 – Turno 1 – Producción",
      employees: ["645", "3118", "3316", "3396", "3524", "3698"],
      meal:      { start: "10:00", end: "10:30", label: "10:00 – 10:30" },
    },
    {
      departamento: "PRODUCCIÓN", turno: "1", grupo: "4",
      label:     "Grupo 4 – Turno 1 – Producción",
      employees: ["2154", "3538", "3600", "3883", "3954", "3965"],
      meal:      { start: "10:30", end: "11:00", label: "10:30 – 11:00" },
    },
    {
      departamento: "PRODUCCIÓN", turno: "1", grupo: "5",
      label:     "Grupo 5 – Turno 1 – Producción",
      employees: ["3663", "3776", "3882", "3945", "3951", "4000"],
      meal:      { start: "11:00", end: "11:30", label: "11:00 – 11:30" },
    },
    {
      departamento: "PRODUCCIÓN", turno: "1", grupo: "6",
      label:     "Grupo 6 – Turno 1 – Producción",
      employees: ["2365", "3983"],
      meal:      { start: "11:30", end: "12:00", label: "11:30 – 12:00" },
    },
  ],
}

// ─── Utilidades internas ───────────────────────────────────────────────────────

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

/** Minutos desde medianoche para una fecha en zona horaria de México. */
function mexicoMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(date)
  const h = parseInt(parts.find(p => p.type === "hour")?.value   ?? "0", 10)
  const m = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10)
  return h * 60 + m
}

/** Soporta ventanas que cruzan medianoche (ej. 22:00–06:00). */
function windowContains(schedule: MealWindow, totalMin: number): boolean {
  const s = toMinutes(schedule.start)
  const e = toMinutes(schedule.end)
  return s <= e
    ? totalMin >= s && totalMin < e          // ventana normal
    : totalMin >= s || totalMin < e          // cruce de medianoche
}

/** Ventana de turno genérica (para deptos sin horario específico). */
function turnoWindow(turno: string): MealWindow | null {
  switch (turno) {
    case "1":     return { start: "06:00", end: "14:00", label: "06:00 – 14:00" }
    case "2":     return { start: "14:00", end: "22:00", label: "14:00 – 22:00" }
    case "3":     return { start: "22:00", end: "06:00", label: "22:00 – 06:00" }
    case "MIXTO": return { start: "08:00", end: "18:00", label: "08:00 – 18:00" }
    default:      return null
  }
}

/** Turno 4 rota: el horario depende del día y la hora exacta. */
function turno4Window(date: Date): MealWindow | null {
  const dow      = date.getDay()
  const totalMin = mexicoMinutes(date)

  if (dow === 1) {
    if (windowContains({ start: "06:00", end: "14:00", label: "" }, totalMin)) return turnoWindow("1")
    if (windowContains({ start: "14:00", end: "22:00", label: "" }, totalMin)) return turnoWindow("2")
  }
  if (dow === 2 && windowContains({ start: "14:00", end: "22:00", label: "" }, totalMin)) return turnoWindow("2")
  if ((dow === 3 || dow === 4) && windowContains({ start: "22:00", end: "06:00", label: "" }, totalMin)) return turnoWindow("3")
  return null
}

// Días activos por turno (dow: 0=dom … 6=sáb)
const TURNO_DAYS: Record<string, number[]> = {
  "1":     [1, 2, 3, 4, 5, 6],
  "2":     [3, 4, 5, 6, 0],
  "3":     [5, 6, 0, 1, 2, 3],
  "MIXTO": [1, 2, 3, 4, 5],
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * ¿Está el empleado dentro de su ventana de turno en este momento?
 * Solo compara la hora actual — no el día de semana — para evitar
 * falsos negativos en turnos que cruzan medianoche (ej. turno 3: 22:00–06:00).
 * Retorna `null` si el turno no tiene ventana definida.
 */
export function isInShift(turno: string, date = new Date()): boolean | null {
  const t = turno.toUpperCase().trim()
  if (t === "4") return turno4Window(date) !== null
  const w = turnoWindow(t)
  if (!w) return null
  return windowContains(w, mexicoMinutes(date))
}

/**
 * Retorna la ventana de comida asignada al empleado.
 *
 * Orden de búsqueda:
 *   1. Grupos de empleados (`config.groups`) — cualquier departamento
 *   2. Horarios fijos por departamento+turno (`config.schedules`)
 *   3. Ventana genérica del turno como último recurso
 *
 * Si no se pasa `config`, usa `STATIC_CONFIG` como fallback.
 * Retorna `null` si no hay horario configurado.
 */
export function getMealWindow(
  employeeId:   string,
  departamento: string,
  turno:        string,
  date          = new Date(),
  config?:      MealConfig,
): MealWindow | null {
  const cfg  = config ?? STATIC_CONFIG
  const dept = departamento.toUpperCase().trim()
  const t    = turno.toUpperCase().trim()

  // 1) Grupo específico (cualquier departamento)
  const group = cfg.groups.find(g =>
    g.departamento.toUpperCase() === dept &&
    g.turno.toUpperCase()        === t    &&
    g.employees.includes(String(employeeId))
  )
  if (group) return group.meal

  // 2) Horario fijo por departamento + turno
  const specific = cfg.schedules[`${dept}|${t}`]
  if (specific) return specific

  // 3) Ventana genérica del turno
  if (t === "4") return turno4Window(date)
  if (!TURNO_DAYS[t]?.includes(date.getDay())) return null
  return turnoWindow(t)
}

/**
 * ¿Está el empleado dentro de su horario de comida en este momento?
 * Retorna `null` si no tiene horario configurado.
 */
export function isInMealTime(
  employeeId:   string,
  departamento: string,
  turno:        string,
  config?:      MealConfig,
): boolean | null {
  const schedule = getMealWindow(employeeId, departamento, turno, new Date(), config)
  if (!schedule) return null
  return windowContains(schedule, mexicoMinutes(new Date()))
}

/**
 * ¿Estaba el empleado dentro de su horario de comida en el timestamp dado?
 * Acepta Firestore Timestamp o Date. Retorna `null` si no hay horario o timestamp inválido.
 */
export function wasInMealTime(
  employeeId:   string,
  departamento: string,
  turno:        string,
  timestamp:    any,
  config?:      MealConfig,
): boolean | null {
  let date: Date | null = null
  if (timestamp?.toDate)          date = timestamp.toDate()
  else if (timestamp instanceof Date) date = timestamp
  if (!date) return null

  const schedule = getMealWindow(employeeId, departamento, turno, date, config)
  if (!schedule) return null
  return windowContains(schedule, mexicoMinutes(date))
}
