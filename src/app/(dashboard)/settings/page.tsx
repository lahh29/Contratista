"use client"

import * as React from "react"
import { collection, query, limit, getDocs, DocumentData } from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { useCompanies } from "@/hooks/use-companies"
import { UserCog, ShieldAlert, Settings, Users, Briefcase, MapPin, Clock } from "lucide-react"
import { PillTabsBar, PillTabsContent } from "@/components/ui/pill-tabs"
import type { PillTab } from "@/components/ui/pill-tabs"
import { useAppUser } from "@/hooks/use-app-user"
import { EmployeeManager } from "@/components/fumadores/EmployeeManager"
import { MealSchedulesManager } from "@/components/settings/MealSchedulesManager"
import { CollectionManager } from "@/components/settings/CollectionManager"
import { AreaManager } from "@/components/settings/AreaManager"
import { UserManager } from "@/components/settings/UserManager"

// ── Mobile tab definitions ──────────────────────────────────────────────────

const MOBILE_TABS: PillTab[] = [
  { value: "users",       label: "Usuarios",   icon: <Users className="w-3.5 h-3.5" /> },
  { value: "employees",   label: "Empleados",  icon: <Briefcase className="w-3.5 h-3.5" /> },
  { value: "areas",       label: "Áreas",      icon: <MapPin className="w-3.5 h-3.5" /> },
  { value: "supervisors", label: "Encargados", icon: <UserCog className="w-3.5 h-3.5" /> },
  { value: "horarios",    label: "Horarios",   icon: <Clock className="w-3.5 h-3.5" /> },
]

// ── SettingsPage ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const db = useFirestore()
  const { appUser: currentUser } = useAppUser()

  const [refreshKey,         setRefreshKey]         = React.useState(0)
  const [areas,              setAreas]              = React.useState<DocumentData[] | null>(null)
  const [supervisors,        setSupervisors]        = React.useState<DocumentData[] | null>(null)
  const [areasLoading,       setAreasLoading]       = React.useState(true)
  const [supervisorsLoading, setSupervisorsLoading] = React.useState(true)
  const [activeTab,          setActiveTab]          = React.useState("users")

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

  const { companies } = useCompanies()

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

  const tabContent: Record<string, React.ReactNode> = {
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
        <PillTabsBar
          tabs={MOBILE_TABS}
          value={activeTab}
          onValueChange={setActiveTab}
          layoutId="settings-pill"
          className="mb-5"
        />
        <PillTabsContent value={activeTab}>
          {tabContent[activeTab]}
        </PillTabsContent>
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
