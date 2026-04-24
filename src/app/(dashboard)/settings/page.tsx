"use client"

import * as React from "react"
import { collection, query, limit, getDocs, DocumentData } from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { UserCog, ShieldAlert, Settings } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAppUser } from "@/hooks/use-app-user"
import { EmployeeManager } from "@/components/fumadores/EmployeeManager"
import { MealSchedulesManager } from "@/components/settings/MealSchedulesManager"
import { CollectionManager } from "@/components/settings/CollectionManager"
import { AreaManager } from "@/components/settings/AreaManager"
import { UserManager } from "@/components/settings/UserManager"

// ── Mobile tab definitions ──────────────────────────────────────────────────

const MOBILE_TABS = [
  { value: "users",       label: "Usuarios"   },
  { value: "employees",   label: "Empleados"  },
  { value: "areas",       label: "Áreas"      },
  { value: "supervisors", label: "Encargados" },
  { value: "horarios",    label: "Horarios"   },
] as const

type TabValue = typeof MOBILE_TABS[number]["value"]

// ── SettingsPage ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const db = useFirestore()
  const { appUser: currentUser } = useAppUser()

  const [refreshKey,         setRefreshKey]         = React.useState(0)
  const [areas,              setAreas]              = React.useState<DocumentData[] | null>(null)
  const [supervisors,        setSupervisors]        = React.useState<DocumentData[] | null>(null)
  const [companies,          setCompanies]          = React.useState<DocumentData[] | null>(null)
  const [areasLoading,       setAreasLoading]       = React.useState(true)
  const [supervisorsLoading, setSupervisorsLoading] = React.useState(true)
  const [activeTab,          setActiveTab]          = React.useState<TabValue>("users")

  React.useEffect(() => {
    if (!db) return
    setAreasLoading(true)
    getDocs(query(collection(db, "areas"), limit(100)))
      .then(snap => setAreas(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setAreas([]))
      .finally(() => setAreasLoading(false))
  }, [db, refreshKey])

  React.useEffect(() => {
    if (!db) return
    setSupervisorsLoading(true)
    getDocs(query(collection(db, "supervisors"), limit(100)))
      .then(snap => setSupervisors(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setSupervisors([]))
      .finally(() => setSupervisorsLoading(false))
  }, [db, refreshKey])

  React.useEffect(() => {
    if (!db) return
    getDocs(query(collection(db, "companies"), limit(200)))
      .then(snap => setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setCompanies([]))
  }, [db])

  const handleRefresh = React.useCallback(() => setRefreshKey(k => k + 1), [])

  // Gate: admin only (after all hooks)
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <ShieldAlert className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">Acceso restringido a administradores.</p>
      </div>
    )
  }

  // ── Card instances ──────────────────────────────────────────────────────────

  const usersCard       = <UserManager db={db} companies={companies} />
  const employeesCard   = <EmployeeManager />
  const areasCard       = <AreaManager db={db} areas={areas} supervisors={supervisors} loading={areasLoading} onRefresh={handleRefresh} />
  const mealSchedules   = <MealSchedulesManager />

  const supervisorsCard = (
    <CollectionManager
      title="Encargados de Departamento"
      description="Personas responsables de recibir a los contratistas en cada área."
      icon={UserCog}
      collectionName="supervisors"
      placeholder="Nombre del encargado…"
      db={db}
      items={supervisors}
      loading={supervisorsLoading}
      onRefresh={handleRefresh}
    />
  )

  const tabContent: Record<TabValue, React.ReactNode> = {
    users:       usersCard,
    employees:   employeesCard,
    areas:       areasCard,
    supervisors: supervisorsCard,
    horarios:    mealSchedules,
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="
      animate-in fade-in duration-500 w-full
      pb-8
      supports-[padding:env(safe-area-inset-bottom)]:pb-[max(2rem,env(safe-area-inset-bottom))]
    ">
      {/* Page description — desktop only */}
      <div className="hidden md:flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Configuración del sistema</h2>
          <p className="text-sm text-muted-foreground">
            Administra usuarios, áreas, encargados y horarios de la planta.
          </p>
        </div>
      </div>

      {/* ── Mobile: pill tabs ── */}
      <div className="md:hidden">
        <div className="mb-5 border-b border-border/40">
          <div className="flex flex-wrap gap-1.5 py-2">
            {MOBILE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className="relative shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-full outline-none transition-colors"
              >
                {activeTab === tab.value && (
                  <motion.div
                    layoutId="settings-pill"
                    className="absolute inset-0 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className={`relative z-10 transition-colors duration-150 ${
                  activeTab === tab.value
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
                }`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {tabContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Desktop: grid ── */}
      <div className="hidden md:block space-y-6 md:space-y-8">
        <div className="grid gap-5 md:gap-6 md:grid-cols-2">
          {usersCard}
          {employeesCard}
        </div>
        <div className="grid gap-5 md:gap-6 md:grid-cols-2">
          {areasCard}
          {supervisorsCard}
        </div>
        <div>
          {mealSchedules}
        </div>
      </div>
    </div>
  )
}
