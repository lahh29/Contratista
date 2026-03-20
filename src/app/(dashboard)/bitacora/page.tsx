"use client"

import * as React from "react"
import {
  Lock,
  Eye,
  EyeOff,
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
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirestore } from "@/firebase"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { verifyAuditPassword } from "@/app/actions/audit"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import type { AuditEntry } from "@/types"
import { cn } from "@/lib/utils"

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

const FILTER_OPTIONS = [
  { value: "all",        label: "Todos" },
  { value: "visit",      label: "Visitas" },
  { value: "company",    label: "Empresas" },
  { value: "user",       label: "Usuarios" },
  { value: "area",       label: "Áreas" },
  { value: "supervisor", label: "Encargados" },
]

// ── Audit Entry Row ───────────────────────────────────────────────────────────
function AuditRow({ entry, showDateSeparator }: { entry: AuditEntry; showDateSeparator?: boolean }) {
  const cfg = ACTION_CONFIG[entry.action]
  const ActionIcon = cfg?.Icon ?? ClipboardList
  const ts = entry.timestamp as unknown as { toDate?: () => Date }
  const date = ts?.toDate ? ts.toDate() : null

  // Fix redundancy: if actor and target are same, or it's a login, hide target
  const showTarget = entry.targetName && 
                    entry.targetName !== entry.actorName && 
                    entry.action !== 'user.login'

  return (
    <div className="flex flex-col w-full">
      {showDateSeparator && date && (
        <div className="bg-muted/30 px-4 py-1.5 border-y border-border/40">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {format(date, "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
      )}
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors group">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-active:scale-95",
          cfg?.bg ?? "bg-muted"
        )}>
          <ActionIcon className={cn("w-4 h-4", cfg?.color ?? "text-muted-foreground")} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-2 overflow-hidden">
            <p className={cn("text-xs font-bold truncate", cfg?.color ?? "text-foreground")}>
              {cfg?.label ?? entry.action}
            </p>
            {date && (
              <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums shrink-0">
                {format(date, "HH:mm")}
              </span>
            )}
          </div>
          
          <div className="flex items-center text-[10px] text-muted-foreground mt-0.5 overflow-hidden">
            <span className="truncate font-medium text-foreground/70 max-w-[150px] sm:max-w-none">
              {entry.actorName}
            </span>
            {showTarget && (
              <>
                <span className="mx-1 shrink-0 opacity-40">→</span>
                <span className="truncate">{entry.targetName}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

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
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Acceso Restringido</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ingresa la contraseña para continuar
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Input
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false) }}
              className={cn(
                "pr-10 h-11 text-center tracking-[0.5em] text-lg font-mono rounded-xl",
                error && "border-red-500 focus-visible:ring-red-500 bg-red-50/50"
              )}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              tabIndex={-1}
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center font-bold">Contraseña incorrecta</p>
          )}

          <Button type="submit" className="w-full h-11 rounded-xl shadow-md active:scale-[0.98] transition-transform" disabled={loading || !password}>
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            Desbloquear
          </Button>
        </form>
      </div>
    </div>
  )
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
function AuditLog() {
  const db           = useFirestore()
  const [filter, setFilter] = React.useState("all")
  const [entries, setEntries] = React.useState<AuditEntry[] | null>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchEntries = React.useCallback(async () => {
    if (!db) return
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, "auditLog"), orderBy("timestamp", "desc"), limit(200)))
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })) as unknown as AuditEntry[])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [db])

  React.useEffect(() => { fetchEntries() }, [fetchEntries])

  const filtered = React.useMemo(() => {
    if (!entries) return []
    if (filter === "all") return entries
    return entries.filter(e => e.targetType === filter)
  }, [entries, filter])

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Tabs defaultValue="registro" className="w-full">
        <TabsList className="w-full grid grid-cols-2 p-1 h-11 bg-muted/40 rounded-xl mb-4">
          <TabsTrigger value="registro" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ClipboardList className="w-4 h-4 mr-2" /> 
            <span className="font-semibold text-xs uppercase tracking-wide">Registro</span>
          </TabsTrigger>
          <TabsTrigger value="accesos" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Clock className="w-4 h-4 mr-2" /> 
            <span className="font-semibold text-xs uppercase tracking-wide">Accesos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registro" className="mt-0 space-y-4 outline-none">
          <div className="flex items-center gap-2 px-1">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="flex-1 h-10 rounded-xl bg-background shadow-sm border-border/40 text-xs">
                <SelectValue placeholder="Todos los eventos" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {FILTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="h-10 px-3 flex items-center bg-muted/30 rounded-xl border border-border/40 text-[10px] font-bold text-muted-foreground whitespace-nowrap">
               {filtered.length} TOTAL
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={fetchEntries} disabled={loading} title="Actualizar">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
              <RefreshCw className="w-6 h-6 animate-spin opacity-50" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Cargando...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center opacity-60">
              <ClipboardList className="w-12 h-12 text-muted-foreground/30" />
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase">Sin registros</p>
                <p className="text-[10px] text-muted-foreground">No hay eventos para este filtro</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card overflow-hidden shadow-sm divide-y divide-border/30">
              {filtered.map((entry, idx) => {
                const currentDate = (entry.timestamp as any)?.toDate?.()?.toDateString()
                const prevDate = idx > 0 ? (filtered[idx - 1].timestamp as any)?.toDate?.()?.toDateString() : null
                const isNewDay = currentDate !== prevDate

                return (
                  <AuditRow 
                    key={entry.id} 
                    entry={entry} 
                    showDateSeparator={isNewDay}
                  />
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accesos" className="mt-0 outline-none">
          <LastAccess />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Last Access ───────────────────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; avatar: string; chip: string }> = {
  admin:      { label: "Admin",      avatar: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",    chip: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900"    },
  guard:      { label: "Guardia",    avatar: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400", chip: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900" },
  contractor: { label: "Contratista",avatar: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400",    chip: "bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900"    },
}

function AccessRow({ u }: { u: AccessUser }) {
  const meta  = ROLE_META[u.role ?? ''] ?? { label: u.role ?? '—', avatar: "bg-muted text-muted-foreground", chip: "bg-muted text-muted-foreground border-border" }
  const date  = u.lastLoginAt?.toDate?.()
  const label = u.name ?? u.email ?? u.uid.slice(0, 8)

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black shadow-inner",
        meta.avatar
      )}>
        {label[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold truncate leading-none">{label}</p>
        <span className={cn(
          "inline-flex items-center mt-1.5 text-[9px] font-black px-2 py-0.5 rounded-full border tracking-tighter uppercase",
          meta.chip
        )}>
          {meta.label}
        </span>
      </div>

      <div className="text-right shrink-0">
        {date ? (
          <div className="flex flex-col items-end">
            <p className="text-[11px] font-black text-foreground/90 leading-none">
              {formatDistanceToNow(date, { addSuffix: true, locale: es })}
            </p>
            <p className="text-[9px] text-muted-foreground mt-1 tabular-nums">
              {format(date, "d MMM, HH:mm", { locale: es })}
            </p>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground/30 italic uppercase">Sin acceso</span>
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
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
      <RefreshCw className="w-6 h-6 animate-spin opacity-50" />
      <span className="text-[11px] font-bold uppercase tracking-widest">Cargando...</span>
    </div>
  )

  return (
    <div className="space-y-6 pb-8">
      {withAccess.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
            Actividad Reciente
          </p>
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm divide-y divide-border/30">
            {withAccess.map(u => <AccessRow key={u.uid} u={u} />)}
          </div>
        </div>
      )}

      {withoutAccess.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
            Sin Actividad
          </p>
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm divide-y divide-border/30 opacity-50 grayscale-[0.5]">
            {withoutAccess.map(u => <AccessRow key={u.uid} u={u} />)}
          </div>
        </div>
      )}
    </div>
  )
}

type AccessUser = {
  uid: string
  name?: string
  email?: string
  role?: string
  lastLoginAt?: { toDate: () => Date }
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
