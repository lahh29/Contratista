"use client"

import * as React from "react"
import { collection, addDoc, deleteDoc, doc, updateDoc, Firestore, DocumentData } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Trash2, Plus, Pencil, Check, X, MoreHorizontal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppUser } from "@/hooks/use-app-user"
import { logAudit } from "@/app/actions/audit"
import { useConfirm } from "@/hooks/use-confirm"
import { SkeletonList } from "@/components/ui/skeletons"
import { truncStr, shortName } from "./helpers"

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

export function CollectionManager({ title, description, icon: Icon, collectionName, db, items, loading, placeholder, onRefresh }: CollectionManagerProps) {
  const [newName,  setNewName]  = React.useState("")
  const [editId,   setEditId]   = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState("")
  const { toast } = useToast()
  const { appUser } = useAppUser()
  const { confirm, ConfirmDialog } = useConfirm()

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
    const ok = await confirm({
      title: `¿Eliminar "${name}"?`,
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      variant: "destructive",
    })
    if (!ok) return
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
    <>
      {ConfirmDialog}
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

        <div className="space-y-2 min-h-[80px]">
          {loading ? (
            <SkeletonList rows={3} />
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
    </>
  )
}
