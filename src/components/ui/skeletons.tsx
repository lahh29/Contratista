/**
 * Reusable skeleton loading components.
 * Use these instead of a centered spinner whenever a list or table is loading
 * — they preserve layout and give a better perceived-performance experience.
 */

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// ── Table skeleton ─────────────────────────────────────────────────────────────
// Mirrors a data table: avatar column + N text columns + actions column.

interface SkeletonTableProps {
  rows?: number
  /** Number of text columns AFTER the avatar (actions not counted) */
  cols?: number
  className?: string
}

export function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn("divide-y divide-border/40", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          {/* Avatar */}
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          {/* Text columns */}
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className="h-4 rounded-md"
              style={{ flex: j === 0 ? 2 : 1, maxWidth: j === 0 ? 220 : 130 }}
            />
          ))}
          {/* Actions placeholder */}
          <Skeleton className="w-16 h-7 rounded-md ml-auto shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ── Mobile rows skeleton ────────────────────────────────────────────────────────
// Compact row skeleton used in mobile card/list views.

interface SkeletonRowsProps {
  rows?: number
  className?: string
}

export function SkeletonRows({ rows = 4, className }: SkeletonRowsProps) {
  return (
    <div className={cn("divide-y divide-border/40", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-2/3 rounded-md" />
            <Skeleton className="h-3 w-1/3 rounded-md" />
          </div>
          <Skeleton className="w-16 h-5 rounded-full shrink-0" />
          <Skeleton className="w-8 h-8 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ── List skeleton ───────────────────────────────────────────────────────────────
// Used in settings panels (areas, supervisors) and bitácora row lists.

interface SkeletonListProps {
  rows?: number
  className?: string
}

export function SkeletonList({ rows = 4, className }: SkeletonListProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
          <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
          <Skeleton className="h-4 flex-1 max-w-[180px] rounded-md" />
          <Skeleton className="w-8 h-8 rounded-md shrink-0 ml-auto" />
        </div>
      ))}
    </div>
  )
}

// ── Stat card skeleton ──────────────────────────────────────────────────────────
// For dashboard KPI cards.

export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-16 rounded-md" />
      <Skeleton className="h-3 w-32 rounded-md" />
    </div>
  )
}
