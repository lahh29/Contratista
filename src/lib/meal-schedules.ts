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

/**
 * Mapa de horarios de comida.
 * Clave = "DEPARTAMENTO|TURNO"
 */
const MEAL_SCHEDULES: Record<string, MealWindow> = {
  "CALIDAD|1":     { start: "11:00", end: "11:30", label: "11:00 – 11:30" },
  "CALIDAD|2":     { start: "18:00", end: "18:30", label: "18:00 – 18:30" },
  "ALMACÉN|1":     { start: "12:00", end: "12:30", label: "12:00 – 12:30" },
  "ALMACÉN|2":     { start: "18:00", end: "18:30", label: "18:00 - 18:30" },
}

/**
 * Obtiene el horario de comida configurado para un departamento y turno.
 * Retorna `null` si no tiene horario registrado.
 */
export function getMealSchedule(departamento: string, turno: string): MealWindow | null {
  const key = buildMealKey(departamento, turno)
  return MEAL_SCHEDULES[key] ?? null
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
  const schedule = getMealSchedule(departamento, turno)
  if (!schedule) return null

  // Convertir timestamp de Firestore a Date
  let date: Date | null = null
  if (timestamp?.toDate) date = timestamp.toDate()
  else if (timestamp instanceof Date) date = timestamp
  if (!date) return null

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
