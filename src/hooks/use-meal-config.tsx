"use client"

// ─── MealConfig: Context + Provider + Hook ────────────────────────────────────
//
// Carga `mealSchedules` y `employeeGroups` desde Firestore en tiempo real.
// Mientras las colecciones estén vacías, usa STATIC_CONFIG como fallback.
//
// Uso:
//   1. Envuelve el layout con <MealConfigProvider>
//   2. En cualquier componente: const { config, loading } = useMealConfig()
//   3. Pasa `config` a getMealWindow / isInMealTime / wasInMealTime

import * as React from "react"
import {
  collection,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore"
import { useFirestore } from "@/firebase"
import {
  STATIC_CONFIG,
  type MealConfig,
  type MealWindow,
  type EmployeeGroup,
} from "@/lib/meal-schedules"

// ─── Context ──────────────────────────────────────────────────────────────────

interface MealConfigCtxValue {
  config:  MealConfig
  loading: boolean
}

const MealConfigCtx = React.createContext<MealConfigCtxValue>({
  config:  STATIC_CONFIG,
  loading: true,
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function MealConfigProvider({ children }: { children: React.ReactNode }) {
  const db = useFirestore()

  const [config,  setConfig]  = React.useState<MealConfig>(STATIC_CONFIG)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }

    // Merge state across two parallel subscriptions
    let schedulesReady = false
    let groupsReady    = false
    let latestSchedules: Record<string, MealWindow> | null = null
    let latestGroups:    EmployeeGroup[]             | null = null

    function tryMerge() {
      if (!schedulesReady || !groupsReady) return
      setConfig({
        schedules: latestSchedules ?? STATIC_CONFIG.schedules,
        groups:    latestGroups    ?? STATIC_CONFIG.groups,
      })
      setLoading(false)
    }

    const unsubSchedules: Unsubscribe = onSnapshot(
      collection(db, "mealSchedules"),
      (snap) => {
        if (snap.empty) {
          latestSchedules = null  // vacío → fallback estático
        } else {
          const map: Record<string, MealWindow> = {}
          snap.docs.forEach((d) => {
            const data = d.data() as {
              departamento: string
              turno:        string
              start:        string
              end:          string
              label:        string
            }
            const key = `${data.departamento.toUpperCase().trim()}|${data.turno.toUpperCase().trim()}`
            map[key] = { start: data.start, end: data.end, label: data.label }
          })
          latestSchedules = map
        }
        schedulesReady = true
        tryMerge()
      },
      () => {
        // Error de permisos u otro: usar fallback
        latestSchedules = null
        schedulesReady  = true
        tryMerge()
      },
    )

    const unsubGroups: Unsubscribe = onSnapshot(
      collection(db, "employeeGroups"),
      (snap) => {
        if (snap.empty) {
          latestGroups = null  // vacío → fallback estático
        } else {
          latestGroups = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<EmployeeGroup, "id">),
          }))
        }
        groupsReady = true
        tryMerge()
      },
      () => {
        latestGroups = null
        groupsReady  = true
        tryMerge()
      },
    )

    return () => {
      unsubSchedules()
      unsubGroups()
    }
  }, [db])

  return (
    <MealConfigCtx.Provider value={{ config, loading }}>
      {children}
    </MealConfigCtx.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Retorna la configuración de horarios cargada desde Firestore.
 * Mientras `loading` es `true` (o las colecciones están vacías), usa STATIC_CONFIG.
 */
export function useMealConfig(): MealConfigCtxValue {
  return React.useContext(MealConfigCtx)
}
