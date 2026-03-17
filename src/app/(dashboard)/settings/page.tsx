"use client"

import * as React from "react"
import { collection, addDoc, deleteDoc, doc, updateDoc, query, limit, setDoc, getDocs } from "firebase/firestore"
import { useFirestore, useCollection } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Pencil, Check, X, MapPin, UserCog, Settings2, Users, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Company } from "@/types"

function CollectionManager({
  title,
  description,
  icon: Icon,
  collectionName,
  db,
  items,
  loading,
}: {
  title: string
  description: string
  icon: React.ElementType
  collectionName: string
  db: any
  items: any[] | null
  loading: boolean
}) {
  const [newName, setNewName] = React.useState("")
  const [editId, setEditId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState("")
  const { toast } = useToast()

  const handleAdd = async () => {
    if (!db || !newName.trim()) return
    try {
      await addDoc(collection(db, collectionName), { name: newName.trim() })
      setNewName("")
      toast({ title: "Agregado correctamente" })
    } catch {
      toast({ variant: "destructive", title: "Error al agregar" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!db) return
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
            <Icon className="w-4 h-4 text-primary" />
          </div>
          {title}
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add input */}
        <div className="flex gap-2">
          <Input
            placeholder={`Nuevo ${title.toLowerCase()}...`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="h-10"
          />
          <Button
            onClick={handleAdd}
            disabled={!newName.trim()}
            size="sm"
            className="gap-1.5 shrink-0 h-10 px-3 md:px-4"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
        </div>

        {/* Items list */}
        <div className="space-y-2 min-h-[80px]">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(item.id)
                        if (e.key === "Escape") setEditId(null)
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleUpdate(item.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setEditId(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{item.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setEditId(item.id)
                        setEditName(item.name)
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

// ── User Manager ─────────────────────────────────────────────────────────────

interface UserProfile {
  uid: string
  email: string | null
  role: 'admin' | 'contractor'
  companyId?: string
  displayName?: string
}

function UserManager({ db, companies }: { db: any; companies: Company[] | null }) {
  const [users, setUsers]       = React.useState<UserProfile[]>([])
  const [loading, setLoading]   = React.useState(true)
  const [editUid, setEditUid]   = React.useState<string | null>(null)
  const [editRole, setEditRole] = React.useState<'admin' | 'contractor'>('contractor')
  const [editCompany, setEditCompany] = React.useState<string>('')
  const { toast } = useToast()

  const loadUsers = React.useCallback(async () => {
    if (!db) return
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'users'))
      const list: UserProfile[] = snap.docs.map(d => ({
        uid: d.id,
        ...(d.data() as Omit<UserProfile, 'uid'>),
      }))
      setUsers(list)
    } catch {
      toast({ variant: 'destructive', title: 'Error al cargar usuarios' })
    } finally {
      setLoading(false)
    }
  }, [db, toast])

  React.useEffect(() => { loadUsers() }, [loadUsers])

  const startEdit = (u: UserProfile) => {
    setEditUid(u.uid)
    setEditRole(u.role)
    setEditCompany(u.companyId ?? '')
  }

  const saveEdit = async (uid: string) => {
    if (!db) return
    try {
      await setDoc(doc(db, 'users', uid), {
        role:      editRole,
        companyId: editRole === 'contractor' ? editCompany || null : null,
      }, { merge: true })
      setEditUid(null)
      await loadUsers()
      toast({ title: 'Usuario actualizado' })
    } catch {
      toast({ variant: 'destructive', title: 'Error al actualizar usuario' })
    }
  }

  return (
    <Card className="border-none shadow-sm md:col-span-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-primary" />
          </div>
          Usuarios del sistema
        </CardTitle>
        <CardDescription>
          Asigna roles y empresa a cada usuario. Los contratistas solo verán su portal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sin usuarios registrados aún.
          </p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.uid} className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg flex-wrap group">
                {editUid === u.uid ? (
                  <>
                    <span className="text-sm font-medium flex-1 min-w-[140px]">
                      {u.email ?? u.uid.slice(0, 12) + '…'}
                    </span>
                    <Select value={editRole} onValueChange={(v) => setEditRole(v as 'admin' | 'contractor')}>
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="contractor">Contratista</SelectItem>
                      </SelectContent>
                    </Select>
                    {editRole === 'contractor' && (
                      <Select value={editCompany} onValueChange={setEditCompany}>
                        <SelectTrigger className="h-8 w-44">
                          <SelectValue placeholder="Asignar empresa…" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies?.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700"
                      onClick={() => saveEdit(u.uid)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => setEditUid(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium flex-1 min-w-[140px] truncate">
                      {u.email ?? u.uid.slice(0, 12) + '…'}
                    </span>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {u.role === 'admin' ? 'Admin' : 'Contratista'}
                    </Badge>
                    {u.role === 'contractor' && u.companyId && (
                      <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {companies?.find(c => c.id === u.companyId)?.name ?? u.companyId.slice(0, 8) + '…'}
                      </span>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      onClick={() => startEdit(u)}>
                      <Pencil className="w-4 h-4" />
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

// ── Settings Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const db = useFirestore()

  const areasQuery = React.useMemo(() => (db ? query(collection(db, "areas"), limit(100)) : null), [db])
  const supervisorsQuery = React.useMemo(
    () => (db ? query(collection(db, "supervisors"), limit(100)) : null),
    [db]
  )
  const companiesQuery = React.useMemo(() => (db ? query(collection(db, "companies"), limit(200)) : null), [db])

  const { data: areas,      loading: areasLoading }      = useCollection(areasQuery)
  const { data: supervisors, loading: supervisorsLoading } = useCollection(supervisorsQuery)
  const { data: companiesRaw } = useCollection(companiesQuery)
  const companies = companiesRaw as Company[] | null

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Settings2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Configuración</h2>
          <p className="text-muted-foreground mt-0.5 text-sm md:text-base">
            Administra las áreas destino y supervisores internos del sistema.
          </p>
        </div>
      </div>

      {/* User manager */}
      <UserManager db={db} companies={companies} />

      {/* Managers grid */}
      <div className="grid gap-5 md:gap-6 md:grid-cols-2">
        <CollectionManager
          title="Áreas Destino"
          description="Departamentos."
          icon={MapPin}
          collectionName="areas"
          db={db}
          items={areas}
          loading={areasLoading}
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
