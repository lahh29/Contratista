"use client"

import * as React from "react"
import { collection, addDoc, deleteDoc, doc, updateDoc, query, limit, setDoc, getDocs } from "firebase/firestore"
import { useFirestore, useCollection } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Pencil, Check, X, MapPin, UserCog, Settings2, Users, Loader2, ShieldAlert } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Firestore, DocumentData } from "firebase/firestore"

// ── CollectionManager ─────────────────────────────────────────────────────────
//
//  Cambios respecto al original:
//  • Sin tipos TypeScript (proyecto JS)
//  • Botones de acción siempre visibles en mobile (sm:opacity-0 solo aplica
//    en pantallas ≥ sm donde existe hover; en touch los botones son siempre
//    visibles para que el usuario pueda interactuar)
//  • Confirmación antes de borrar (ventana nativa confirm) — evita borrados
//    accidentales en mobile donde los taps son menos precisos
//  • Input con inputMode adecuado para mobile
//  • aria-label en botones icon-only para lectores de pantalla

interface CollectionManagerProps {
  title: string
  description: string
  icon: React.ElementType
  collectionName: string
  db: Firestore | null
  items: DocumentData[] | null | undefined
  loading: boolean
  showRestrictedToggle?: boolean
}

function CollectionManager({ title, description, icon: Icon, collectionName, db, items, loading, showRestrictedToggle }: CollectionManagerProps) {
  const [newName,  setNewName]  = React.useState("")
  const [editId,   setEditId]   = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState("")
  const { toast } = useToast()

  const handleAdd = async () => {
    if (!db || !newName.trim()) return
    try {
      const data: Record<string, unknown> = { name: newName.trim() }
      if (showRestrictedToggle) data.restricted = false
      await addDoc(collection(db, collectionName), data)
      setNewName("")
      toast({ title: "Agregado correctamente" })
    } catch {
      toast({ variant: "destructive", title: "Error al agregar" })
    }
  }

  const handleToggleRestricted = async (id: string, current: boolean) => {
    if (!db) return
    try {
      await updateDoc(doc(db, collectionName, id), { restricted: !current })
      toast({ title: !current ? "Área marcada como restringida" : "Área sin restricción" })
    } catch {
      toast({ variant: "destructive", title: "Error al actualizar" })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!db) return
    // Confirmación nativa: evita borrados accidentales en touch
    if (!window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteDoc(doc(db, collectionName, id))
      toast({ title: "Eliminado correctamente" })
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" })
    }
  }

  const handleUpdate = async (id: string) => {
    if (!db || !editName.trim()) return
    try {
      await updateDoc(doc(db, collectionName, id), { name: editName.trim() })
      setEditId(null)
      toast({ title: "Actualizado correctamente" })
    } catch {
      toast({ variant: "destructive", title: "Error al actualizar" })
    }
  }

  return (
    <Card className="border-none shadow-sm">
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
            placeholder={`Nuevo ${title.toLowerCase()}…`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="h-10"
            // inputMode="text" es el default pero lo dejamos explícito
            // para que quede documentado el patrón del proyecto
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
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-label="Cargando…" />
            </div>
          ) : items?.length ? (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg group"
              >
                {editId === item.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                      autoFocus
                      inputMode="text"
                      autoCapitalize="words"
                      onKeyDown={(e) => {
                        if (e.key === "Enter")  handleUpdate(item.id)
                        if (e.key === "Escape") setEditId(null)
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleUpdate(item.id)}
                      aria-label="Guardar cambio"
                    >
                      <Check className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setEditId(null)}
                      aria-label="Cancelar edición"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
                    {showRestrictedToggle && (
                      <button
                        onClick={() => handleToggleRestricted(item.id, !!item.restricted)}
                        title={item.restricted ? "Zona restringida (click para quitar)" : "Marcar como restringida"}
                        className="shrink-0"
                        aria-label={item.restricted ? "Quitar restricción" : "Marcar como restringida"}
                      >
                        <ShieldAlert
                          className={`w-4 h-4 transition-colors ${item.restricted ? "text-destructive" : "text-muted-foreground/30 hover:text-muted-foreground"}`}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                    {/*
                      Botones siempre visibles en mobile (touch no tiene hover).
                      En desktop (≥sm) se ocultan hasta hover para no saturar la UI.
                    */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                      onClick={() => { setEditId(item.id); setEditName(item.name) }}
                      aria-label={`Editar ${item.name}`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                      onClick={() => handleDelete(item.id, item.name)}
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <Icon className="w-8 h-8 opacity-20" aria-hidden="true" />
              <p className="text-sm">Sin registros. Agrega el primero arriba.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── UserManager ───────────────────────────────────────────────────────────────
//
//  Cambios respecto al original:
//  • Sin tipos TypeScript
//  • useCallback sin toast como dependencia — toast de shadcn no es estable
//    entre renders; incluirlo puede causar loops de efecto. Se saca de deps
//    y se referencia via ref estable para evitar el problema sin perder
//    la referencia actualizada
//  • Botones siempre visibles en mobile (mismo patrón que CollectionManager)
//  • aria-labels en todos los botones icon-only
//  • truncate + title en email para no romper layout en móviles con emails largos

interface UserManagerProps {
  db: Firestore | null
  companies: DocumentData[] | null | undefined
}

function UserManager({ db, companies }: UserManagerProps) {
  const [users,       setUsers]       = React.useState<DocumentData[]>([])
  const [loading,     setLoading]     = React.useState(true)
  const [editUid,     setEditUid]     = React.useState<string | null>(null)
  const [editRole,    setEditRole]    = React.useState("contractor")
  const [editCompany, setEditCompany] = React.useState("")
  const { toast } = useToast()

  // Ref estable para toast — evita que sea dependencia de useCallback
  // y prevenga loops de efecto sin perder la referencia actualizada
  const toastRef = React.useRef(toast)
  React.useEffect(() => { toastRef.current = toast }, [toast])

  const loadUsers = React.useCallback(async () => {
    if (!db) return
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, "users"))
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
      setUsers(list)
    } catch {
      toastRef.current({ variant: "destructive", title: "Error al cargar usuarios" })
    } finally {
      setLoading(false)
    }
  }, [db]) // toast fuera de deps — se accede via ref estable

  React.useEffect(() => { loadUsers() }, [loadUsers])

  const startEdit = (u: DocumentData) => {
    setEditUid(u.uid)
    setEditRole(u.role)
    setEditCompany(u.companyId ?? "")
  }

  const saveEdit = async (uid: string) => {
    if (!db) return
    try {
      await setDoc(
        doc(db, "users", uid),
        {
          role:      editRole,
          companyId: editRole === "contractor" ? editCompany || null : null,
        },
        { merge: true }
      )
      setEditUid(null)
      await loadUsers()
      toastRef.current({ title: "Usuario actualizado" })
    } catch {
      toastRef.current({ variant: "destructive", title: "Error al actualizar usuario" })
    }
  }

  return (
    <Card className="border-none shadow-sm md:col-span-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          Usuarios del sistema
        </CardTitle>
        <CardDescription>
          Asigna roles y empresa a cada usuario. Los contratistas acceden a su portal; los guardias solo al escáner.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-label="Cargando usuarios…" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sin usuarios registrados aún.
          </p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.uid}
                className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg flex-wrap group"
              >
                {editUid === u.uid ? (
                  <>
                    {/* Email — no editable, solo referencia */}
                    <span
                      className="text-sm font-medium flex-1 min-w-[120px] truncate"
                      title={u.email ?? u.uid}
                    >
                      {u.email ?? u.uid.slice(0, 12) + "…"}
                    </span>

                    <Select
                      value={editRole}
                      onValueChange={(v) => setEditRole(v)}
                    >
                      <SelectTrigger className="h-8 w-32" aria-label="Rol del usuario">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="contractor">Contratista</SelectItem>
                        <SelectItem value="guard">Guardia</SelectItem>
                      </SelectContent>
                    </Select>

                    {editRole === "contractor" && (
                      <Select value={editCompany} onValueChange={setEditCompany}>
                        <SelectTrigger className="h-8 w-40" aria-label="Empresa del contratista">
                          <SelectValue placeholder="Asignar empresa…" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-600 hover:text-green-700"
                      onClick={() => saveEdit(u.uid)}
                      aria-label="Guardar cambios del usuario"
                    >
                      <Check className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditUid(null)}
                      aria-label="Cancelar edición"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className="text-sm font-medium flex-1 min-w-[120px] truncate"
                      title={u.email ?? u.uid}
                    >
                      {u.email ?? u.uid.slice(0, 12) + "…"}
                    </span>

                    <Badge
                      variant={u.role === "admin" ? "default" : u.role === "guard" ? "outline" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {u.role === "admin" ? "Admin" : u.role === "guard" ? "Guardia" : "Contratista"}
                    </Badge>

                    {u.role === "contractor" && u.companyId && (
                      <span
                        className="text-xs text-muted-foreground truncate max-w-[120px]"
                        title={companies?.find((c) => c.id === u.companyId)?.name ?? u.companyId}
                      >
                        {companies?.find((c) => c.id === u.companyId)?.name ?? u.companyId.slice(0, 8) + "…"}
                      </span>
                    )}

                    {/* ml-auto empuja el botón al extremo derecho en todos los
                        tamaños. Siempre visible en mobile, hover en desktop. */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 ml-auto transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                      onClick={() => startEdit(u)}
                      aria-label={`Editar usuario ${u.email ?? u.uid}`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── SettingsPage ──────────────────────────────────────────────────────────────
//
//  Cambios respecto al original:
//  • Sin tipos TypeScript
//  • pb-safe-area: padding inferior para home indicator en iOS/Android
//  • h2 → h1 semántico (es el heading principal de la página)
//  • aria-hidden en el ícono decorativo del header

export default function SettingsPage() {
  const db = useFirestore()

  const areasQuery = React.useMemo(
    () => (db ? query(collection(db, "areas"),       limit(100)) : null),
    [db]
  )
  const supervisorsQuery = React.useMemo(
    () => (db ? query(collection(db, "supervisors"), limit(100)) : null),
    [db]
  )
  const companiesQuery = React.useMemo(
    () => (db ? query(collection(db, "companies"),   limit(200)) : null),
    [db]
  )

  const { data: areas,       loading: areasLoading }       = useCollection(areasQuery)
  const { data: supervisors, loading: supervisorsLoading } = useCollection(supervisorsQuery)
  const { data: companies }                                 = useCollection(companiesQuery)

  return (
    /*
      supports-[padding:env(safe-area-inset-bottom)] → padding para home
      indicator en iOS y Android. El layout padre puede no manejarlo,
      así que lo aseguramos aquí también.
    */
    <div className="
      space-y-6 md:space-y-8
      animate-in fade-in duration-500
      pb-8
      supports-[padding:env(safe-area-inset-bottom)]:pb-[max(2rem,env(safe-area-inset-bottom))]
    ">

      {/* User manager — ocupa las 2 columnas en desktop */}
      <UserManager db={db} companies={companies} />

      {/* Managers grid */}
      <div className="grid gap-5 md:gap-6 md:grid-cols-2">
        <CollectionManager
          title="Áreas Destino"
          description="Departamentos o zonas de la planta. Marca con el escudo las areas restringidas."
          icon={MapPin}
          collectionName="areas"
          db={db}
          items={areas}
          loading={areasLoading}
          showRestrictedToggle
        />
        <CollectionManager
          title="Encargados de Departamento"
          description="Encargados."
          icon={UserCog}
          collectionName="supervisors"
          db={db}
          items={supervisors}
          loading={supervisorsLoading}
        />
      </div>

    </div>
  )
}