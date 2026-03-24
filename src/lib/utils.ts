import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── SUA (Seguro de Accidentes) utilities ───────────────────────────────────────

export type SuaStatus = "Valid" | "Expired" | "Pending"

interface SuaInput {
  status?: string
  validUntil?: string
}

/**
 * Computes the effective SUA status for a company.
 * `validUntil` date takes precedence over the stored `status` field
 * so expired documents are caught even if the DB field wasn't updated.
 *
 * @example
 * getSuaStatus(company.sua)  // → "Valid" | "Expired" | "Pending"
 */
export function getSuaStatus(sua?: SuaInput): SuaStatus {
  if (!sua) return "Pending"
  if (sua.validUntil) {
    const today = new Date().toISOString().slice(0, 10)
    return sua.validUntil < today ? "Expired" : "Valid"
  }
  if (sua.status === "Valid" || sua.status === "Expired") return sua.status
  return "Pending"
}

/** Display config for each SUA status — colours, labels, badge variants */
export const SUA_CONFIG = {
  Valid: {
    label:        "Vigente",
    badgeVariant: "default"     as const,
    bg:           "bg-green-50 dark:bg-green-950/30",
    border:       "border-green-200 dark:border-green-800",
    text:         "text-green-800 dark:text-green-300",
    subtext:      "text-green-700 dark:text-green-400",
  },
  Expired: {
    label:        "Vencido",
    badgeVariant: "destructive" as const,
    bg:           "bg-red-50 dark:bg-red-950/30",
    border:       "border-red-200 dark:border-red-800",
    text:         "text-red-800 dark:text-red-300",
    subtext:      "text-red-700 dark:text-red-400",
  },
  Pending: {
    label:        "Pendiente",
    badgeVariant: "secondary"   as const,
    bg:           "bg-orange-50 dark:bg-orange-950/30",
    border:       "border-orange-200 dark:border-orange-800",
    text:         "text-orange-800 dark:text-orange-300",
    subtext:      "text-orange-700 dark:text-orange-400",
  },
} as const satisfies Record<SuaStatus, object>

/**
 * Divide un nombre completo en mayúsculas (formato mexicano) en apellidos y nombres.
 * Maneja apellidos compuestos con conectores: DE, LA, LOS, LAS, DEL, etc.
 *
 * @example
 * splitName("ZEPEDA MONTES DE OCA EMMANUEL ANTONIO")
 * // → { apellidos: "ZEPEDA MONTES DE OCA", nombres: "EMMANUEL ANTONIO" }
 *
 * splitName("RUIZ DE VICENTE JUANA ABIGAIL")
 * // → { apellidos: "RUIZ DE VICENTE", nombres: "JUANA ABIGAIL" }
 */
const NAME_CONNECTORS = new Set(['DE', 'LA', 'LOS', 'LAS', 'DEL', 'LES', 'EL', 'Y'])

export function splitName(fullName: string): { apellidos: string; nombres: string } {
  const words = fullName.trim().split(/\s+/)
  if (words.length <= 1) return { apellidos: fullName, nombres: '' }

  const groups: string[] = []
  let i = 0
  while (i < words.length) {
    if (NAME_CONNECTORS.has(words[i]) && groups.length > 0 && i + 1 < words.length) {
      groups[groups.length - 1] += ' ' + words[i] + ' ' + words[i + 1]
      i += 2
    } else {
      groups.push(words[i])
      i++
    }
  }

  if (groups.length <= 1) return { apellidos: fullName, nombres: '' }

  const firstIsCompound = groups[0].includes(' ')
  const splitAt = (firstIsCompound || groups.length === 2) ? 1 : 2

  return {
    apellidos: groups.slice(0, splitAt).join(' '),
    nombres:   groups.slice(splitAt).join(' '),
  }
}
