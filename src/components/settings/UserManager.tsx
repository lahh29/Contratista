"use client"

import * as React from "react"
import { collection, setDoc, getDocs, doc, Firestore, DocumentData } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Trash2, Plus, Pencil, Users, Loader2, ShieldCheck, Shield, Briefcase, HardHat, Package, UserPlus, User, MoreHorizontal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppUser } from "@/hooks/use-app-user"
import { logAudit } from "@/app/actions/audit"
import { useConfirm } from "@/hooks/use-confirm"
import { CreateUserWizard } from "@/components/settings/CreateUserWizard"
import { deleteUser } from "@/app/actions/users"

interface UserManagerProps {
  db: Firestore | null
  companies: DocumentData[] | null | undefined
}

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  admin:      { label: "Admin",          icon: ShieldCheck, className: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400"       },
  guard:      { label: "Guardia",        icon: Shield,      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  contractor: { label: "Contratista",    icon: Briefcase,   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  seguridad:  { label: "Seg. e Higiene", icon: HardHat,     className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"   },
  logistica:  { label: "Logística",      icon: Package,     className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400"   },
  rys:        { label: "Reclutamiento",  icon: UserPlus,    className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"           },
}

export function UserManager({ db, companies }: UserManagerProps) {
  const [users,       setUsers]       = React.useState<DocumentData[]>([])
  const [loading,     setLoading]     = React.useState(true)
  const [editUid,     setEditUid]     = React.useState<string | null>(null)
  const [editUser,    setEditUser]    = React.useState<DocumentData | null>(null)
  const [editRole,    setEditRole]    = React.useState("contractor")
  const [editCompany, setEditCompany] = React.useState("")
  const [wizardOpen,  setWizardOpen]  = React.useState(false)
  const { toast } = useToast()
  const { appUser } = useAppUser()
  const { confirm: confirmDialog, ConfirmDialog: DeleteConfirmDialog } = useConfirm()

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

  const handleDeleteUser = async (u: DocumentData) => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    await new Promise<void>((r) => requestAnimationFrame(() => r()))

    const ok = await confirmDialog({
      title:        `¿Eliminar a "${u.name ?? u.email}"?`,
      description:  "Se eliminará su acceso a la plataforma y su registro de usuario. Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      variant:      "destructive",
    })
    if (!ok) return

    setUsers((prev) => prev.filter((x) => x.uid !== u.uid))

    const result = await deleteUser(u.uid)
    if (result.success) {
      toastRef.current({ title: "Usuario eliminado" })
    } else {
      setUsers((prev) => [...prev, u])
      toastRef.current({ variant: "destructive", title: "Error al eliminar", description: result.error })
    }
  }

  return (
    <>
      {DeleteConfirmDialog}
      <CreateUserWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={loadUsers}
        companies={companies}
      />
      <Card className="border-none shadow-sm overflow-hidden w-full">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              Usuarios del sistema
            </CardTitle>
            <Button size="sm" className="gap-1.5 h-8 px-3 shrink-0" onClick={() => setWizardOpen(true)}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-3 pt-0">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin usuarios registrados aún.</p>
          ) : (
            <div className="space-y-2 overflow-hidden">
              {users.map((u) => (
                <div key={u.uid} className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg group min-w-0">
                  {(() => {
                    const rc = ROLE_CONFIG[u.role]
                    const RoleIcon = rc?.icon ?? User
                    return (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${rc?.className ?? "bg-muted text-muted-foreground"}`}>
                        <RoleIcon className="w-4 h-4" />
                      </div>
                    )
                  })()}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">
                      {u.name ?? u.email ?? u.uid.slice(0, 12) + "…"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">
                      {u.role === "contractor" && u.companyId
                        ? (companies?.find((c) => c.id === u.companyId)?.name ?? u.email ?? "")
                        : (u.email ?? ROLE_CONFIG[u.role]?.label ?? u.role)}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Opciones">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => {
                        ;(document.activeElement as HTMLElement | null)?.blur()
                        requestAnimationFrame(() => startEdit(u))
                      }}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Editar rol
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteUser(u)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
