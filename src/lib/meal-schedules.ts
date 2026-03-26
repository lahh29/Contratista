// ─── Horarios de comida por Departamento + Turno ──────────────────────────────
// Zona horaria: America/Mexico_City (Querétaro)
//
// La clave del mapa es "DEPARTAMENTO|TURNO" (ambos en mayúsculas).
// Para agregar más departamentos, simplemente añade una entrada al mapa.

const TZ = "America/Mexico_City"

export interface MealWindow {
  /** Hora de inicio en formato "HH:mm" (24 h) */
  start: string
  /** Hora de fin en formato "HH:mm" (24 h) */
  end: string
  /** Etiqueta legible para la UI */
  label: string
}

/**
 * Construye la clave de búsqueda para el mapa de horarios.
 */
function buildMealKey(departamento: string, turno: string): string {
  return `${departamento.toUpperCase().trim()}|${turno.toUpperCase().trim()}`
}

// ─── Grupos de comida – Producción ────────────────────────────────────────────
// Clave = "TURNO|GRUPO" (ej. "1|1", "1|2", "2|1")
// Agrega/modifica grupos aquí sin tocar el resto del código.

export interface ProductionMealGroup {
  label: string
  employees: string[]   // employeeId como string
  meal: MealWindow
}

const PRODUCTION_GROUPS: Record<string, ProductionMealGroup> = {
  "1|1": {
    label: "Grupo 1 – Turno 1",
    employees: ["1444", "1539", "2315", "2545", "2934", "3780"],
    meal: { start: "09:00", end: "09:30", label: "09:00 – 09:30" },
  },
  "1|2": {
    label: "Grupo 2 – Turno 1",
    employees: ["1677", "3257", "3593", "3669", "3734", "3773"],
    meal: { start: "09:30", end: "10:00", label: "09:30 – 10:00" },
  },
  "1|3": {
    label: "Grupo 3 – Turno 1",
    employees: ["645", "3118", "3316", "3396", "3524", "3698"],
    meal: { start: "10:00", end: "10:30", label: "10:00 – 10:30" },
  },
  "1|4": {
    label: "Grupo 4 – Turno 1",
    employees: ["2154", "3538", "3600", "3883", "3954", "3965"],
    meal: { start: "10:30", end: "11:00", label: "10:30 – 11:00" },
  },
  "1|5": {
    label: "Grupo 5 – Turno 1",
    employees: ["3663", "3776", "3882", "3945", "3951", "4000"],
    meal: { start: "11:00", end: "11:30", label: "11:00 – 11:30" },
  },
  "1|6": {
    label: "Grupo 6 – Turno 1",
    employees: ["2365", "3983"],
    meal: { start: "11:30", end: "12:00", label: "11:30 – 12:00" },
  },
  // Agrega más grupos con el mismo patrón:
  // "2|1": { label: "Grupo 1 – Turno 2", employees: [...], meal: { start: "18:00", end: "18:30", label: "18:00 – 18:30" } },
}

/**
 * Retorna el horario de comida de un empleado de Producción según su grupo.
 * Retorna `null` si el empleado no está asignado a ningún grupo del turno dado.
 */
export function getProductionMealSchedule(employeeId: string, turno: string): MealWindow | null {
  const t = turno.toUpperCase().trim()
  for (const [key, group] of Object.entries(PRODUCTION_GROUPS)) {
    const [groupTurno] = key.split("|")
    if (groupTurno === t && group.employees.includes(String(employeeId))) {
      return group.meal
    }
  }
  return null
}

/**
 * Verifica si la hora actual está dentro del horario de comida asignado
 * al grupo de producción al que pertenece el empleado.
 */
export function isInProductionMealTime(employeeId: string, turno: string): boolean | null {
  const schedule = getProductionMealSchedule(employeeId, turno)
  if (!schedule) return null

  const { hours, minutes } = nowInMexico()
  const nowMin = hours * 60 + minutes
  const startMin = toMinutes(schedule.start)
  const endMin = toMinutes(schedule.end)

  return nowMin >= startMin && nowMin < endMin
}

/**
 * Verifica si un timestamp dado estaba dentro del horario de comida del grupo.
 */
export function wasInProductionMealTime(employeeId: string, turno: string, timestamp: any): boolean | null {
  let date: Date | null = null
  if (timestamp?.toDate) date = timestamp.toDate()
  else if (timestamp instanceof Date) date = timestamp
  if (!date) return null

  const schedule = getProductionMealSchedule(employeeId, turno)
  if (!schedule) return null

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date)

  const hours = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10)
  const minutes = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10)
  const totalMin = hours * 60 + minutes
  const startMin = toMinutes(schedule.start)
  const endMin = toMinutes(schedule.end)

  return totalMin >= startMin && totalMin < endMin
}

/**
 * Mapa de horarios de comida.
 * Clave = "DEPARTAMENTO|TURNO"
 */
const MEAL_SCHEDULES: Record<string, MealWindow> = {
  "CALIDAD|1":     { start: "11:00", end: "11:30", label: "11:00 – 11:30" },
  "CALIDAD|2":     { start: "18:00", end: "18:30", label: "18:00 – 18:30" },
  "ALMACÉN|1":     { start: "12:00", end: "12:30", label: "12:00 – 12:30" },
  "ALMACÉN|2":     { start: "18:00", end: "18:30", label: "18:00 - 18:30" },
  "METROLOGÍA|1": { start: "12:00", end: "12:30", label: "12:00 – 12:30" },
  "METROLOGÍA|2": { start: "19:00", end: "19:30", label: "19:00 – 19:30" },
  "METROLOGÍA|3": { start: "4:30", end: "5:00", label: "4:30 – 5:00" },
  "METROLOGÍA|MIXTO": { start: "12:00", end: "12:30", label: "12:00 – 12:30" },
  "TALLER DE MOLDES|1": { start: "11:00", end: "12:00", label: "11:30 – 12:00" },
  "TALLER DE MOLDES|2": { start: "19:00", end: "19:30", label: "19:00 – 19:30" },
  "TALLER DE MOLDES|MIXTO": { start: "13:00", end: "14:00", label: "13:00 – 14:00" },

}

/**
 * Obtiene el horario de comida configurado para un departamento y turno.
 * Retorna `null` si no tiene horario registrado.
 */
function resolveTurno(departamento: string, turno: string, date: Date): string {
  // Turno 4 es rotativo en función del día de la semana
  if (turno !== "4") return turno

  const dow = date.getDay() // 0=domingo, 1=lunes, ..., 6=sábado

  if (dow === 0) return "1"       // domingo → turno 1
  if (dow === 1 || dow === 2) return "2" // lunes/martes → turno 2
  if (dow === 3 || dow === 4) return "3" // miércoles/jueves → turno 3
  return "1" // viernes/sábado → fallback al turno 1 (ajusta si tienes otra regla)
}

function dayMatches(days: number[], dow: number): boolean {
  return days.includes(dow)
}

function timeInRange(hours: number, minutes: number, start: string, end: string): boolean {
  const now = hours * 60 + minutes
  const startMin = toMinutes(start)
  const endMin = toMinutes(end)

  if (startMin < endMin) {
    return now >= startMin && now < endMin
  }

  // Caso cruce de medianoche, ej. 22:00-06:00
  return now >= startMin || now < endMin
}

function turnoScheduleFromRule(turno: string): MealWindow | null {
  switch (turno) {
    case "1":
      return { start: "06:00", end: "14:00", label: "06:00 – 14:00" }
    case "2":
      return { start: "14:00", end: "22:00", label: "14:00 – 22:00" }
    case "3":
      return { start: "22:00", end: "06:00", label: "22:00 – 06:00" }
    case "MIXTO":
      return { start: "08:00", end: "18:00", label: "08:00 – 18:00" }
    default:
      return null
  }
}

export function getMealSchedule(departamento: string, turno: string, date = new Date()): MealWindow | null {
  const lookupKey = buildMealKey(departamento, turno)
  if (MEAL_SCHEDULES[lookupKey]) {
    return MEAL_SCHEDULES[lookupKey]
  }

  // Reglas generales de turnos
  const dow = date.getDay() // 0=domingo, 1=lunes, ..., 6=sábado

  if (turno === "4") {
    // Turno 4 rotativo según día y hora
    const { hours, minutes } = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(date).reduce(
      (acc, part) => {
        if (part.type === "hour") acc.hours = Number(part.value)
        if (part.type === "minute") acc.minutes = Number(part.value)
        return acc
      },
      { hours: 0, minutes: 0 }
    )

    if (dow === 1) {
      if (timeInRange(hours, minutes, "06:00", "14:00")) return turnoScheduleFromRule("1")
      if (timeInRange(hours, minutes, "14:00", "22:00")) return turnoScheduleFromRule("2")
    }
    if (dow === 2) {
      if (timeInRange(hours, minutes, "14:00", "22:00")) return turnoScheduleFromRule("2")
    }
    if (dow === 3 || dow === 4) {
      if (timeInRange(hours, minutes, "22:00", "06:00")) return turnoScheduleFromRule("3")
    }

    return null
  }

  if (turno === "1") {
    if (!dayMatches([1, 2, 3, 4, 5, 6], dow)) return null
    return turnoScheduleFromRule("1")
  }

  if (turno === "2") {
    if (!dayMatches([3, 4, 5, 6, 0], dow)) return null
    return turnoScheduleFromRule("2")
  }

  if (turno === "3") {
    if (!dayMatches([5, 6, 0, 1, 2, 3], dow)) return null
    return turnoScheduleFromRule("3")
  }

  if (turno === "MIXTO") {
    if (!dayMatches([1, 2, 3, 4, 5], dow)) return null
    return turnoScheduleFromRule("MIXTO")
  }

  return null
}

/**
 * Retorna la hora actual en la zona horaria de México/Querétaro
 * como { hours, minutes } en formato 24 h.
 */
function nowInMexico(): { hours: number; minutes: number } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now)

  const hours = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10)
  const minutes = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10)
  return { hours, minutes }
}

/**
 * Convierte "HH:mm" a minutos desde medianoche.
 */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

/**
 * Verifica si la hora actual (en zona horaria de México) está dentro
 * del horario de comida del departamento y turno indicados.
 *
 * @returns
 *  - `true`  → está dentro del horario de comida
 *  - `false` → está fuera del horario de comida
 *  - `null`  → no tiene horario configurado (no aplica validación)
 */
export function isInMealTime(departamento: string, turno: string): boolean | null {
  const schedule = getMealSchedule(departamento, turno)
  if (!schedule) return null

  const { hours, minutes } = nowInMexico()
  const nowMin = hours * 60 + minutes
  const startMin = toMinutes(schedule.start)
  const endMin = toMinutes(schedule.end)

  return nowMin >= startMin && nowMin < endMin
}

/**
 * Verifica si un timestamp dado (de Firestore) estaba dentro del horario
 * de comida. Útil para mostrar el estado histórico en la tabla.
 */
export function wasInMealTime(departamento: string, turno: string, timestamp: any): boolean | null {
  // Convertir timestamp de Firestore a Date
  let date: Date | null = null
  if (timestamp?.toDate) date = timestamp.toDate()
  else if (timestamp instanceof Date) date = timestamp
  if (!date) return null

  const schedule = getMealSchedule(departamento, turno, date)
  if (!schedule) return null

  // Obtener hora en zona horaria de México
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date)

  const hours = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10)
  const minutes = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10)
  const totalMin = hours * 60 + minutes
  const startMin = toMinutes(schedule.start)
  const endMin = toMinutes(schedule.end)

  return totalMin >= startMin && totalMin < endMin
}
