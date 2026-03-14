"use client"

import * as React from "react"
import { collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { useFirestore, useCollection } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Trash2, Plus, Pencil, Check, X, MapPin, UserCog, Settings2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
                    {/*
                      On mobile (touch): always visible
                      On desktop: show on hover via group-hover
                    */}
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

export default function SettingsPage() {
  const db = useFirestore()

  const areasQuery = React.useMemo(() => (db ? collection(db, "areas") : null), [db])
  const supervisorsQuery = React.useMemo(
    () => (db ? collection(db, "supervisors") : null),
    [db]
  )

  const { data: areas, loading: areasLoading } = useCollection(areasQuery)
  const { data: supervisors, loading: supervisorsLoading } = useCollection(supervisorsQuery)

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

      {/* Managers grid */}
      <div className="grid gap-5 md:gap-6 md:grid-cols-2">
        <CollectionManager
          title="Áreas Destino"
          description="Zonas a las que puede ingresar el personal contratista."
          icon={MapPin}
          collectionName="areas"
          db={db}
          items={areas}
          loading={areasLoading}
        />
        <CollectionManager
          title="Supervisores Internos"
          description="Encargados internos que supervisan el trabajo contratado."
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
