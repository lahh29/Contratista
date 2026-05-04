"use client"

import * as React from "react"
import { collection, addDoc, deleteDoc, doc, updateDoc, Firestore, DocumentData } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Trash2, Plus, Pencil, Check, X, MapPin, UserCog, MoreHorizontal, ShieldAlert } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppUser } from "@/hooks/use-app-user"
import { logAudit } from "@/app/actions/audit"
import { useConfirm } from "@/hooks/use-confirm"
import { SkeletonList } from "@/components/ui/skeletons"
import { truncStr, shortName } from "./helpers"

interface AreaManagerProps {
  db: Firestore | null
  areas: DocumentData[] | null | undefined
  supervisors: DocumentData[] | null | undefined
  loading: boolean
  onRefresh?: () => void
}

export function AreaManager({ db, areas, supervisors, loading, onRefresh }: AreaManagerProps) {
  const [newName, setNewName] = React.useState("")
  const [newSupervisorId, setNewSupervisorId] = React.useState("")
  const [editId, setEditId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editSupervisorId, setEditSupervisorId] = React.useState("")
  const { toast } = useToast()
  const { appUser } = useAppUser()
  const { confirm, ConfirmDialog } = useConfirm()

  const actor = () => ({
    actorUid: appUser?.uid ?? '',
    actorName: appUser?.name ?? appUser?.email ?? 'Admin',
    actorRole: appUser?.role ?? 'admin',
  })

  const handleAdd = async () => {
    if (!db || !newName.trim()) return
    try {
      const ref = await addDoc(collection(db, "areas"), {
        name: newName.trim(),
        supervisorId: newSupervisorId || null,
        restricted: false,
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
    const ok = await confirm({
      title: `¿Eliminar "${name}"?`,
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      variant: "destructive",
    })
    if (!ok) return
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
        name: editName.trim(),
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
    <>
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            Áreas Destino
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
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
              <Button onClick={handleAdd} disabled={!newName.trim()} size="responsive"
                className="shrink-0" aria-label="Agregar área">
                <Plus className="w-4 h-4 md:hidden" />
                <span className="hidden md:inline">Agregar</span>
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

          <div className="min-h-[80px]">
            {loading ? (
              <SkeletonList rows={3} />
            ) : areas?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {areas.map((item) => {
                  const linked = supervisors?.find((s) => s.id === item.supervisorId)
                  return (
                    <div key={item.id} className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg group min-w-0 border border-border/40 hover:bg-muted/60 transition-colors">
                      {editId === item.id ? (
                        <>
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                              className="h-8" autoFocus autoCapitalize="words"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdate(item.id)
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
                            <button
                              onClick={() => handleToggleRestricted(item.id, !!item.restricted)}
                              className={`flex items-center gap-1.5 text-[11px] mt-1 transition-colors ${item.restricted ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
                              aria-label={item.restricted ? "Quitar restricción" : "Marcar como restringida"}
                            >
                              <ShieldAlert className="w-3 h-3" />
                              {item.restricted ? "Zona restringida (toca para quitar)" : "Marcar como zona restringida"}
                            </button>
                          </div>
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-primary hover:text-primary hover:bg-primary/10"
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
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                <MapPin className="w-8 h-8 opacity-20" />
                <p className="text-sm">Sin áreas. Agrega la primera arriba.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card >
      {ConfirmDialog}
    </>
  )
}
