// ─── Horarios de comida ────────────────────────────────────────────────────────
// Zona horaria: America/Mexico_City (Querétaro)
//
// API pública (3 funciones):
//   getMealWindow(employeeId, departamento, turno)   → horario asignado
//   isInMealTime(employeeId, departamento, turno)    → ¿está en horario ahora?
//   wasInMealTime(employeeId, departamento, turno, timestamp) → ¿estaba en horario?
//
// Para agregar horarios: edita PRODUCTION_GROUPS o MEAL_SCHEDULES.

const TZ = "America/Mexico_City"

export interface MealWindow {
  start: string  // "HH:mm" 24 h
  end:   string  // "HH:mm" 24 h
  label: string  // texto para la UI
}

export interface ProductionMealGroup {
  label:     string
  employees: string[]  // employeeId como string
  meal:      MealWindow
}

// ─── Grupos de comida – Producción ───────────────────────────────────────────
// Clave = "TURNO|GRUPO"  (ej. "1|1", "2|1")
// Cada empleado de producción pertenece a exactamente un grupo por turno.

const PRODUCTION_GROUPS: Record<string, ProductionMealGroup> = {
  "1|1": {
    label:     "Grupo 1 – Turno 1",
    employees: ["1444", "1539", "2315", "2545", "2934", "3780"],
    meal:      { start: "09:00", end: "09:30", label: "09:00 – 09:30" },
  },
  "1|2": {
    label:     "Grupo 2 – Turno 1",
    employees: ["1677", "3257", "3593", "3669", "3734", "3773"],
    meal:      { start: "09:30", end: "10:00", label: "09:30 – 10:00" },
  },
  "1|3": {
    label:     "Grupo 3 – Turno 1",
    employees: ["645", "3118", "3316", "3396", "3524", "3698"],
    meal:      { start: "10:00", end: "10:30", label: "10:00 – 10:30" },
  },
  "1|4": {
    label:     "Grupo 4 – Turno 1",
    employees: ["2154", "3538", "3600", "3883", "3954", "3965"],
    meal:      { start: "10:30", end: "11:00", label: "10:30 – 11:00" },
  },
  "1|5": {
    label:     "Grupo 5 – Turno 1",
    employees: ["3663", "3776", "3882", "3945", "3951", "4000"],
    meal:      { start: "11:00", end: "11:30", label: "11:00 – 11:30" },
  },
  "1|6": {
    label:     "Grupo 6 – Turno 1",
    employees: ["2365", "3983"],
    meal:      { start: "11:30", end: "12:00", label: "11:30 – 12:00" },
  },
  // Para agregar turno 2: "2|1": { label: "Grupo 1 – Turno 2", employees: [...], meal: { ... } },
}

// ─── Horarios fijos por Departamento + Turno ──────────────────────────────────
// Clave = "DEPARTAMENTO|TURNO"  (ambos en mayúsculas)

const MEAL_SCHEDULES: Record<string, MealWindow> = {
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
  "RECURSOS HUMANOS|MIXTO":     { start: "15:00", end: "16:00", label: "15:00 – 16:00" },
  "RECURSOS HUMANOS|1":         { start: "11:30", end: "12:00", label: "11:30 – 12:00" },
  "RECURSOS HUMANOS|2":         { start: "15:30", end: "16:00", label: "15:30 – 16:00" },
  "RECURSOS HUMANOS|3":         { start: "3:30", end: "4:00", label: "3:30 – 4:00" },
}

// ─── Helpers privados ─────────────────────────────────────────────────────────

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

function isProductionDept(dept: string): boolean {
  return dept.toUpperCase().trim().includes("PRODUCC")
}

/** Ventana de turno genérica (para deptos sin horario específico en MEAL_SCHEDULES). */
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
 * Producción → busca grupo en PRODUCTION_GROUPS, si no tiene grupo usa MEAL_SCHEDULES.
 * Otros deptos → busca en MEAL_SCHEDULES, si no está usa la ventana genérica del turno.
 *
 * Retorna `null` si no hay horario configurado.
 */
export function getMealWindow(
  employeeId:  string,
  departamento: string,
  turno:        string,
  date = new Date(),
): MealWindow | null {
  const dept = departamento.toUpperCase().trim()
  const t    = turno.toUpperCase().trim()

  if (isProductionDept(dept)) {
    // 1) Grupo específico
    for (const [key, group] of Object.entries(PRODUCTION_GROUPS)) {
      if (key.split("|")[0] === t && group.employees.includes(String(employeeId))) {
        return group.meal
      }
    }
    // 2) Fallback general de producción
    return MEAL_SCHEDULES[`${dept}|${t}`] ?? null
  }

  // Departamento con horario fijo
  const specific = MEAL_SCHEDULES[`${dept}|${t}`]
  if (specific) return specific

  // Ventana genérica del turno
  if (t === "4") return turno4Window(date)
  if (!TURNO_DAYS[t]?.includes(date.getDay())) return null
  return turnoWindow(t)
}

/**
 * ¿Está el empleado dentro de su horario de comida en este momento?
 * Retorna `null` si no tiene horario configurado.
 */
export function isInMealTime(
  employeeId:  string,
  departamento: string,
  turno:        string,
): boolean | null {
  const schedule = getMealWindow(employeeId, departamento, turno)
  if (!schedule) return null
  return windowContains(schedule, mexicoMinutes(new Date()))
}

/**
 * ¿Estaba el empleado dentro de su horario de comida en el timestamp dado?
 * Acepta Firestore Timestamp o Date. Retorna `null` si no hay horario o timestamp inválido.
 */
export function wasInMealTime(
  employeeId:  string,
  departamento: string,
  turno:        string,
  timestamp:   any,
): boolean | null {
  let date: Date | null = null
  if (timestamp?.toDate)        date = timestamp.toDate()
  else if (timestamp instanceof Date) date = timestamp
  if (!date) return null

  const schedule = getMealWindow(employeeId, departamento, turno, date)
  if (!schedule) return null
  return windowContains(schedule, mexicoMinutes(date))
}
