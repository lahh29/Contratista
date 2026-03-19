"use client"

import * as React from "react"
import {
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  ClipboardList,
  RefreshCw,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  UserCog,
  Building2,
  LayoutGrid,
  Users,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirestore } from "@/firebase"
import { useCollection } from "@/firebase/firestore/use-collection"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { verifyAuditPassword } from "@/app/actions/audit"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import type { AuditEntry } from "@/types"

const STORAGE_KEY = "vp_audit_unlocked"

// ── Action config ─────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, {
  label: string
  color: string
  bg: string
  Icon: React.ElementType
}> = {
  "visit.created":        { label: "Visita creada",          color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20",   Icon: LogIn      },
  "visit.completed":      { label: "Visita completada",      color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-900/20",         Icon: LogOut     },
  "company.created":      { label: "Empresa creada",         color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-900/20",     Icon: Plus       },
  "company.blocked":      { label: "Empresa bloqueada",      color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-900/20",           Icon: ShieldAlert},
  "company.unblocked":    { label: "Empresa desbloqueada",   color: "text-yellow-600 dark:text-yellow-400",   bg: "bg-yellow-50 dark:bg-yellow-900/20",     Icon: Building2  },
  "company.deleted":      { label: "Empresa eliminada",      color: "text-red-700 dark:text-red-500",         bg: "bg-red-50 dark:bg-red-900/20",           Icon: Trash2     },
  "user.roleChanged":     { label: "Rol cambiado",           color: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-900/20",     Icon: UserCog    },
  "area.created":         { label: "Área creada",            color: "text-teal-600 dark:text-teal-400",       bg: "bg-teal-50 dark:bg-teal-900/20",         Icon: Plus       },
  "area.updated":         { label: "Área actualizada",       color: "text-teal-600 dark:text-teal-400",       bg: "bg-teal-50 dark:bg-teal-900/20",         Icon: Pencil     },
  "area.deleted":         { label: "Área eliminada",         color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-900/20",           Icon: Trash2     },
  "supervisor.created":   { label: "Encargado creado",       color: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-50 dark:bg-indigo-900/20",     Icon: Plus       },
  "supervisor.updated":   { label: "Encargado actualizado",  color: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-50 dark:bg-indigo-900/20",     Icon: Pencil     },
  "supervisor.deleted":   { label: "Encargado eliminado",    color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-900/20",           Icon: Trash2     },
  "user.login":           { label: "Inicio de sesión",        color: "text-slate-600 dark:text-slate-400",     bg: "bg-slate-50 dark:bg-slate-900/20",       Icon: LogIn      },
}

const TARGET_ICONS: Record<string, React.ElementType> = {
  visit:      LogIn,
  company:    Building2,
  user:       Users,
  area:       LayoutGrid,
  supervisor: UserCog,
}

const FILTER_OPTIONS = [
  { value: "all",        label: "Todos" },
  { value: "visit",      label: "Visitas" },
  { value: "company",    label: "Empresas" },
  { value: "user",       label: "Usuarios" },
  { value: "area",       label: "Áreas" },
  { value: "supervisor", label: "Encargados" },
]

// ── Password Gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = React.useState("")
  const [showPwd, setShowPwd]   = React.useState(false)
  const [error, setError]       = React.useState(false)
  const [loading, setLoading]   = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError(false)
    const ok = await verifyAuditPassword(password)
    if (ok) {
      sessionStorage.setItem(STORAGE_KEY, "1")
      onUnlock()
    } else {
      setError(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Icon */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Acceso Restringido</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ingresa la contraseña para ver los logs de auditoría
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Input
              type={showPwd ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false) }}
              className={`pr-10 h-11 text-center tracking-widest text-lg font-mono ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center">Contraseña incorrecta</p>
          )}

          <Button type="submit" className="w-full h-11" disabled={loading || !password}>
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  )
}

// ── Audit Entry Row ───────────────────────────────────────────────────────────
function AuditRow({ entry }: { entry: AuditEntry }) {
  const cfg = ACTION_CONFIG[entry.action]
  const ActionIcon = cfg?.Icon ?? ClipboardList
  const ts = entry.timestamp as unknown as { toDate?: () => Date }
  const date = ts?.toDate ? ts.toDate() : null

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg?.bg ?? "bg-muted"}`}>
        <ActionIcon className={`w-4 h-4 ${cfg?.color ?? "text-muted-foreground"}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-tight ${cfg?.color ?? "text-foreground"}`}>
          {cfg?.label ?? entry.action}
        </p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {entry.targetName ? `${entry.targetName} · ` : ""}
          {entry.actorName}
        </p>
      </div>

      {/* Time */}
      {date && (
        <div className="text-right shrink-0">
          <p className="text-xs font-medium text-foreground/60 leading-tight">
            {format(date, "dd MMM", { locale: es })}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {format(date, "HH:mm")}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
function AuditLog() {
  const db           = useFirestore()
  const [filter, setFilter] = React.useState("all")

  const auditQuery = React.useMemo(() => {
    if (!db) return null
    return query(
      collection(db, "auditLog"),
      orderBy("timestamp", "desc"),
      limit(200)
    )
  }, [db])

  const { data: entries, loading } = useCollection(auditQuery)

  const filtered = React.useMemo(() => {
    if (!entries) return []
    if (filter === "all") return entries as unknown as AuditEntry[]
    return (entries as unknown as AuditEntry[]).filter(e => e.targetType === filter)
  }, [entries, filter])

  return (
    <div className="space-y-4">
      <Tabs defaultValue="registro">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="registro" className="flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Registro
          </TabsTrigger>
          <TabsTrigger value="accesos" className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Últimos Accesos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registro" className="mt-4 space-y-3">
          {/* Filtro */}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm">Cargando…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
              <ClipboardList className="w-7 h-7 opacity-25" />
              <p className="text-sm">Sin registros todavía</p>
              <p className="text-[11px] opacity-50">Las acciones del sistema aparecerán aquí</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground px-0.5">
                {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
              </p>
              <div className="rounded-xl border bg-card divide-y divide-border/60">
                {filtered.map(entry => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="accesos" className="mt-4">
          <LastAccess />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Last Access ───────────────────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; avatar: string; chip: string }> = {
  admin:      { label: "Admin",      avatar: "bg-blue-100 text-blue-700",    chip: "bg-blue-50 text-blue-700 border-blue-200"    },
  guard:      { label: "Guardia",    avatar: "bg-orange-100 text-orange-700", chip: "bg-orange-50 text-orange-700 border-orange-200" },
  contractor: { label: "Contratista",avatar: "bg-teal-100 text-teal-700",    chip: "bg-teal-50 text-teal-700 border-teal-200"    },
}

type AccessUser = {
  uid: string
  name?: string
  email?: string
  role?: string
  lastLoginAt?: { toDate: () => Date }
}

function AccessRow({ u }: { u: AccessUser }) {
  const meta  = ROLE_META[u.role ?? ''] ?? { label: u.role ?? '—', avatar: "bg-muted text-muted-foreground", chip: "bg-muted text-muted-foreground border-border" }
  const date  = u.lastLoginAt?.toDate?.()
  const label = u.name ?? u.email ?? u.uid.slice(0, 8)

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${meta.avatar}`}>
        {label[0].toUpperCase()}
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate leading-tight">{label}</p>
        <span className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-px rounded-full border ${meta.chip}`}>
          {meta.label}
        </span>
      </div>

      {/* Time */}
      <div className="text-right shrink-0">
        {date ? (
          <>
            <p className="text-xs font-medium text-foreground/70 leading-tight">
              {formatDistanceToNow(date, { addSuffix: true, locale: es })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {format(date, "dd/MM/yy · HH:mm")}
            </p>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground/50 italic">Sin acceso</span>
        )}
      </div>
    </div>
  )
}

function LastAccess() {
  const db = useFirestore()
  const [users, setUsers] = React.useState<AccessUser[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!db) return
    getDocs(collection(db, "users")).then(snap => {
      const data = snap.docs.map(d => ({ uid: d.id, ...d.data() })) as AccessUser[]
      data.sort((a, b) => {
        const ta = a.lastLoginAt?.toDate?.()?.getTime() ?? 0
        const tb = b.lastLoginAt?.toDate?.()?.getTime() ?? 0
        return tb - ta
      })
      setUsers(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [db])

  const withAccess    = users.filter(u => u.lastLoginAt)
  const withoutAccess = users.filter(u => !u.lastLoginAt)

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
      <span className="text-sm">Cargando…</span>
    </div>
  )

  if (users.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
      <Clock className="w-8 h-8 opacity-30" />
      <p className="text-sm">Sin registros todavía</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Usuarios con acceso */}
      {withAccess.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-1">
            Accedieron recientemente
          </p>
          <div className="divide-y divide-border/60">
            {withAccess.map(u => <AccessRow key={u.uid} u={u} />)}
          </div>
        </div>
      )}

      {/* Usuarios sin acceso */}
      {withoutAccess.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden opacity-70">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-1">
            Sin acceso registrado
          </p>
          <div className="divide-y divide-border/60">
            {withoutAccess.map(u => <AccessRow key={u.uid} u={u} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BitacoraPage() {
  const [unlocked, setUnlocked] = React.useState(false)
  const [checked, setChecked]   = React.useState(false)

  React.useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") setUnlocked(true)
    setChecked(true)
  }, [])

  if (!checked) return null

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  return <AuditLog />
}
