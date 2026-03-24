"use client"

import * as React from "react"
import { collection, addDoc, deleteDoc, doc, updateDoc, query, limit, setDoc, getDocs } from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Trash2, Plus, Pencil, Check, X, MapPin, UserCog, Users, Loader2, ShieldAlert, User, MoreHorizontal, ShieldCheck, Shield, Briefcase, HardHat, Package, UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppUser } from "@/hooks/use-app-user"
import { logAudit } from "@/app/actions/audit"
import { Firestore, DocumentData } from "firebase/firestore"

// ── Helpers ────────────────────────────────────────────────────────────────────
// "BRAVO GARCIA JESUS FERNANDO" → "Bravo Jesus"
// "HERNANDEZ GUDIÑO NOEMI"      → "Hernandez Noemi"
// "JUAN PEREZ"                  → "Juan Perez"   (≤2 words: show as-is title-cased)
function truncStr(s: string, max = 10): string {
  return s.length > max ? s.slice(0, max).trimEnd() + '…' : s
}

function shortName(full: string): string {
  const words = full.trim().split(/\s+/)
  const picked = words.length >= 3 ? [words[0], words[2]] : words
  return picked
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

// ── CollectionManager ──────────────────────────────────────────────────────────

interface CollectionManagerProps {
  title: string
  description: string
  icon: React.ElementType
  collectionName: string
  db: Firestore | null
  items: DocumentData[] | null | undefined
  loading: boolean
  placeholder?: string
  onRefresh?: () => void
}

function CollectionManager({ title, description, icon: Icon, collectionName, db, items, loading, placeholder, onRefresh }: CollectionManagerProps) {
  const [newName,  setNewName]  = React.useState("")
  const [editId,   setEditId]   = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState("")
  const { toast } = useToast()
  const { appUser } = useAppUser()

  const actor = () => ({
    actorUid:  appUser?.uid   ?? '',
    actorName: appUser?.name  ?? appUser?.email ?? 'Admin',
    actorRole: appUser?.role  ?? 'admin',
  })

  const handleAdd = async () => {
    if (!db || !newName.trim()) return
    try {
      const ref = await addDoc(collection(db, collectionName), { name: newName.trim() })
      logAudit({ action: `${collectionName.replace(/s$/, '')}.created`, ...actor(), targetType: collectionName.replace(/s$/, ''), targetId: ref.id, targetName: newName.trim() })
      setNewName("")
      toast({ title: "Agregado correctamente" })
      onRefresh?.()
    } catch {
      toast({ variant: "destructive", title: "Error al agregar" })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!db) return
    if (!window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteDoc(doc(db, collectionName, id))
      logAudit({ action: `${collectionName.replace(/s$/, '')}.deleted`, ...actor(), targetType: collectionName.replace(/s$/, ''), targetId: id, targetName: name })
      toast({ title: "Eliminado correctamente" })
      onRefresh?.()
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" })
    }
  }

  const handleUpdate = async (id: string) => {
    if (!db || !editName.trim()) return
    try {
      await updateDoc(doc(db, collectionName, id), { name: editName.trim() })
      logAudit({ action: `${collectionName.replace(/s$/, '')}.updated`, ...actor(), targetType: collectionName.replace(/s$/, ''), targetId: id, targetName: editName.trim() })
      setEditId(null)
      toast({ title: "Actualizado correctamente" })
      onRefresh?.()
    } catch {
      toast({ variant: "destructive", title: "Error al actualizar" })
    }
  }

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          {title}
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add row */}
        <div className="flex gap-2">
          <Input
            placeholder={placeholder ?? `Nuevo ${title.toLowerCase()}…`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="h-10"
            inputMode="text"
            autoCapitalize="words"
          />
          <Button
            onClick={handleAdd}
            disabled={!newName.trim()}
            size="sm"
            className="gap-1.5 shrink-0 h-10 px-3 md:px-4"
            aria-label={`Agregar ${title.toLowerCase()}`}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
        </div>

        {/* List */}
        <div className="space-y-2 min-h-[80px]">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : items?.length ? (
            items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg group min-w-0">
                {editId === item.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 flex-1"
                      autoFocus
                      autoCapitalize="words"
                      onKeyDown={(e) => {
                        if (e.key === "Enter")  handleUpdate(item.id)
                        if (e.key === "Escape") setEditId(null)
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/40"
                      onClick={() => handleUpdate(item.id)} aria-label="Guardar">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                      onClick={() => setEditId(null)} aria-label="Cancelar">
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 text-sm font-medium truncate" title={item.name}>{truncStr(shortName(item.name))}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Opciones">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => { setEditId(item.id); setEditName(item.name) }}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(item.id, item.name)}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <Icon className="w-8 h-8 opacity-20" />
              <p className="text-sm">Sin registros. Agrega el primero arriba.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── AreaManager ────────────────────────────────────────────────────────────────

interface AreaManagerProps {
  db: Firestore | null
  areas: DocumentData[] | null | undefined
  supervisors: DocumentData[] | null | undefined
  loading: boolean
  onRefresh?: () => void
}

function AreaManager({ db, areas, supervisors, loading, onRefresh }: AreaManagerProps) {
  const [newName,          setNewName]          = React.useState("")
  const [newSupervisorId,  setNewSupervisorId]  = React.useState("")
  const [editId,           setEditId]           = React.useState<string | null>(null)
  const [editName,         setEditName]         = React.useState("")
  const [editSupervisorId, setEditSupervisorId] = React.useState("")
  const { toast } = useToast()
  const { appUser } = useAppUser()

  const actor = () => ({
    actorUid:  appUser?.uid   ?? '',
    actorName: appUser?.name  ?? appUser?.email ?? 'Admin',
    actorRole: appUser?.role  ?? 'admin',
  })

  const handleAdd = async () => {
    if (!db || !newName.trim()) return
    try {
      const ref = await addDoc(collection(db, "areas"), {
        name:         newName.trim(),
        supervisorId: newSupervisorId || null,
        restricted:   false,
      })
      logAudit({ action: 'area.created', ...actor(), targetType: 'area', targetId: ref.id, targetName: newName.trim() })
      setNewName("")
      setNewSupervisorId("")
      toast({ title: "Área agregada" })
      onRefresh?.()
    } catch {
      toast({ variant: "destructive", title: "Error al agregar" })
    }
  }

  const handleToggleRestricted = async (id: string, current: boolean) => {
    if (!db) return
    try {
      await updateDoc(doc(db, "areas", id), { restricted: !current })
      onRefresh?.()
    } catch {
      toast({ variant: "destructive", title: "Error al actualizar" })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!db) return
    if (!window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteDoc(doc(db, "areas", id))
      logAudit({ action: 'area.deleted', ...actor(), targetType: 'area', targetId: id, targetName: name })
      toast({ title: "Eliminado correctamente" })
      onRefresh?.()
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" })
    }
  }

  const handleUpdate = async (id: string) => {
    if (!db || !editName.trim()) return
    try {
      await updateDoc(doc(db, "areas", id), {
        name:         editName.trim(),
        supervisorId: editSupervisorId === "__none__" ? null : editSupervisorId || null,
      })
      logAudit({ action: 'area.updated', ...actor(), targetType: 'area', targetId: id, targetName: editName.trim() })
      setEditId(null)
      toast({ title: "Actualizado correctamente" })
      onRefresh?.()
    } catch {
      toast({ variant: "destructive", title: "Error al actualizar" })
    }
  }

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          Áreas Destino
        </CardTitle>
        <CardDescription>
          Agrega las zonas de la planta y asigna el encargado. Se auto-selecciona al registrar visitas.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add form */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Nombre del área…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="h-10"
              autoCapitalize="words"
            />
            <Button onClick={handleAdd} disabled={!newName.trim()} size="sm"
              className="gap-1.5 shrink-0 h-10 px-3 md:px-4" aria-label="Agregar área">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Agregar</span>
            </Button>
          </div>
          <Select value={newSupervisorId} onValueChange={setNewSupervisorId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Encargado (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin encargado asignado</SelectItem>
              {supervisors?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="space-y-2 min-h-[80px]">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : areas?.length ? (
            areas.map((item) => {
              const linked = supervisors?.find((s) => s.id === item.supervisorId)
              return (
                <div key={item.id} className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg group min-w-0">
                  {editId === item.id ? (
                    <>
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                          className="h-8" autoFocus autoCapitalize="words"
                          onKeyDown={(e) => {
                            if (e.key === "Enter")  handleUpdate(item.id)
                            if (e.key === "Escape") setEditId(null)
                          }}
                        />
                        <Select value={editSupervisorId} onValueChange={setEditSupervisorId}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Encargado…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sin encargado</SelectItem>
                            {supervisors?.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Restricted toggle — solo en modo edición */}
                        <button
                          onClick={() => handleToggleRestricted(item.id, !!item.restricted)}
                          className={`flex items-center gap-1.5 text-[11px] mt-1 transition-colors ${item.restricted ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
                          aria-label={item.restricted ? "Quitar restricción" : "Marcar como restringida"}
                        >
                          <ShieldAlert className="w-3 h-3" />
                          {item.restricted ? "Zona restringida (toca para quitar)" : "Marcar como zona restringida"}
                        </button>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/40"
                        onClick={() => handleUpdate(item.id)} aria-label="Guardar">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                        onClick={() => setEditId(null)} aria-label="Cancelar">
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-medium truncate min-w-0" title={item.name}>{truncStr(item.name)}</p>
                          {item.restricted && (
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-destructive" aria-label="Zona restringida" />
                          )}
                        </div>
                        {linked ? (
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <UserCog className="w-3 h-3 shrink-0" />
                            {shortName(linked.name)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground/50 mt-0.5">Sin encargado</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Opciones">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => { setEditId(item.id); setEditName(item.name); setEditSupervisorId(item.supervisorId ?? "__none__") }}>
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(item.id, item.name)}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <MapPin className="w-8 h-8 opacity-20" />
              <p className="text-sm">Sin áreas. Agrega la primera arriba.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── UserManager ────────────────────────────────────────────────────────────────

interface UserManagerProps {
  db: Firestore | null
  companies: DocumentData[] | null | undefined
}

function UserManager({ db, companies }: UserManagerProps) {
  const [users,       setUsers]       = React.useState<DocumentData[]>([])
  const [loading,     setLoading]     = React.useState(true)
  const [editUid,     setEditUid]     = React.useState<string | null>(null)
  const [editUser,    setEditUser]    = React.useState<DocumentData | null>(null)
  const [editRole,    setEditRole]    = React.useState("contractor")
  const [editCompany, setEditCompany] = React.useState("")
  const { toast } = useToast()
  const { appUser } = useAppUser()

  const toastRef = React.useRef(toast)
  React.useEffect(() => { toastRef.current = toast }, [toast])

  const loadUsers = React.useCallback(async () => {
    if (!db) return
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, "users"))
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
    } catch {
      toastRef.current({ variant: "destructive", title: "Error al cargar usuarios" })
    } finally {
      setLoading(false)
    }
  }, [db])

  React.useEffect(() => { loadUsers() }, [loadUsers])

  const startEdit = (u: DocumentData) => {
    setEditUid(u.uid)
    setEditUser(u)
    setEditRole(u.role ?? "contractor")
    setEditCompany(u.companyId ?? "")
  }

  const saveEdit = async (uid: string) => {
    if (!db) return
    try {
      await setDoc(doc(db, "users", uid), {
        role:      editRole,
        companyId: editRole === "contractor" ? editCompany || null : null,
      }, { merge: true })
      logAudit({
        action: 'user.roleChanged',
        actorUid:  appUser?.uid   ?? '',
        actorName: appUser?.name  ?? appUser?.email ?? 'Admin',
        actorRole: appUser?.role  ?? 'admin',
        targetType: 'user',
        targetId:   uid,
        targetName: editUser?.name ?? editUser?.email ?? uid,
        details: { nuevoRol: editRole },
      })
      setEditUid(null)
      setEditUser(null)
      await loadUsers()
      toastRef.current({ title: "Usuario actualizado" })
    } catch {
      toastRef.current({ variant: "destructive", title: "Error al actualizar usuario" })
    }
  }

  const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    admin:      { label: "Admin",          icon: ShieldCheck, className: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400"       },
    guard:      { label: "Guardia",        icon: Shield,      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
    contractor: { label: "Contratista",    icon: Briefcase,   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
    seguridad:  { label: "Seg. e Higiene", icon: HardHat,     className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"   },
    logistica:  { label: "Logística",      icon: Package,     className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400"   },
    rys:        { label: "Reclutamiento",  icon: UserPlus,    className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"           },
  }

  return (
    <>
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            Usuarios del sistema
          </CardTitle>
          <CardDescription>
            Asigna roles y empresa. Los contratistas acceden a su portal; los guardias solo al escáner.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin usuarios registrados aún.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.uid} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg group">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {(() => {
                      const raw = u.role === "contractor" && u.companyId
                        ? (companies?.find((c) => c.id === u.companyId)?.name ?? u.name ?? u.email ?? u.uid.slice(0, 12) + "…")
                        : (u.name ?? u.email ?? u.uid.slice(0, 12) + "…")
                      return (
                        <p className="text-sm font-medium truncate" title={raw}>
                          {truncStr(raw, 14)}
                        </p>
                      )
                    })()}
                  </div>

                  {/* Role badge */}
                  {(() => {
                    const rc = ROLE_CONFIG[u.role]
                    const RoleIcon = rc?.icon ?? User
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${rc?.className ?? "bg-muted text-muted-foreground"}`}>
                        <RoleIcon className="w-3 h-3 shrink-0" />
                        {rc?.label ?? u.role}
                      </span>
                    )
                  })()}

                  {/* Edit */}
                  <Button size="icon" variant="ghost"
                    className="h-8 w-8 shrink-0 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => startEdit(u)} aria-label={`Editar ${u.name ?? u.email}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Sheet */}
      <Sheet open={!!editUid} onOpenChange={(open) => { if (!open) { setEditUid(null); setEditUser(null) } }}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <SheetHeader className="mb-5">
            <SheetTitle>{editUser?.name ?? editUser?.email ?? "Usuario"}</SheetTitle>
            <SheetDescription>Modifica el rol y empresa asignada.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Rol</p>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="seguridad">Seguridad e Higiene</SelectItem>
                  <SelectItem value="logistica">Logística</SelectItem>
                  <SelectItem value="guard">Guardia</SelectItem>
                  <SelectItem value="rys">Reclutamiento</SelectItem>
                  <SelectItem value="contractor">Contratista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editRole === "contractor" && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Empresa</p>
                <Select value={editCompany} onValueChange={setEditCompany}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Asignar empresa…" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <SheetFooter className="mt-6 flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setEditUid(null); setEditUser(null) }}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={() => editUid && saveEdit(editUid)}>
              Guardar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ── SettingsPage ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const db = useFirestore()
  const { appUser: currentUser } = useAppUser()

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <ShieldAlert className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">Acceso restringido a administradores.</p>
      </div>
    )
  }

  const [refreshKey,        setRefreshKey]        = React.useState(0)
  const [areas,             setAreas]             = React.useState<DocumentData[] | null>(null)
  const [supervisors,       setSupervisors]        = React.useState<DocumentData[] | null>(null)
  const [areasLoading,      setAreasLoading]       = React.useState(true)
  const [supervisorsLoading,setSupervisorsLoading] = React.useState(true)

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

  const handleRefresh = React.useCallback(() => setRefreshKey(k => k + 1), [])

  const [companies, setCompanies] = React.useState<DocumentData[] | null>(null)
  React.useEffect(() => {
    if (!db) return
    getDocs(query(collection(db, "companies"), limit(200)))
      .then(snap => setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setCompanies([]))
  }, [db])

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

  const areasCard = (
    <AreaManager db={db} areas={areas} supervisors={supervisors} loading={areasLoading} onRefresh={handleRefresh} />
  )

  const usersCard = (
    <UserManager db={db} companies={companies} />
  )

  return (
    <div className="
      animate-in fade-in duration-500 overflow-x-hidden w-full
      pb-8
      supports-[padding:env(safe-area-inset-bottom)]:pb-[max(2rem,env(safe-area-inset-bottom))]
    ">
      {/* ── Mobile: tabs ── */}
      <div className="md:hidden">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-5">
            <TabsTrigger value="users" className="text-xs">Usuarios</TabsTrigger>
            <TabsTrigger value="areas" className="text-xs">Áreas</TabsTrigger>
            <TabsTrigger value="supervisors" className="text-xs">Encargados</TabsTrigger>
          </TabsList>
          <TabsContent value="users"       className="mt-0">{usersCard}</TabsContent>
          <TabsContent value="areas"       className="mt-0">{areasCard}</TabsContent>
          <TabsContent value="supervisors" className="mt-0">{supervisorsCard}</TabsContent>
        </Tabs>
      </div>

      {/* ── Desktop: grid (sin cambios) ── */}
      <div className="hidden md:block space-y-6 md:space-y-8">
        {usersCard}
        <div className="grid gap-5 md:gap-6 md:grid-cols-2">
          {areasCard}
          {supervisorsCard}
        </div>
      </div>
    </div>
  )
}
