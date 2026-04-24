/** Truncate string with ellipsis. */
export function truncStr(s: string, max = 10): string {
  return s.length > max ? s.slice(0, max).trimEnd() + "\u2026" : s
}

/**
 * Shorten a full name:
 *   "BRAVO GARCIA JESUS FERNANDO" → "Bravo Jesus"
 *   "JUAN PEREZ"                  → "Juan Perez"
 */
export function shortName(full: string): string {
  const words = full.trim().split(/\s+/)
  const picked = words.length >= 3 ? [words[0], words[2]] : words
  return picked
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}
