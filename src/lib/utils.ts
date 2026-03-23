import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
