"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  collection, getDocs, doc, setDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { useAppUser } from "@/hooks/use-app-user"
import { UserX, Plus, Trash2, Search, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Baja {
  id:         string
  noEmpleado: string
  nombre:     string
  fechaBaja:  string
}

const EMPTY_FORM = { noEmpleado: '', nombre: '', fechaBaja: '' }

export default function BajasPage() {
  const db          = useFirestore()
  const { appUser } = useAppUser()
  const { toast }   = useToast()
  const isAdmin     = appUser?.role === 'admin' || appUser?.role === 'rys'

  const [bajas,    setBajas]    = useState<Baja[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [openAdd,  setOpenAdd]  = useState(false)
  const [toDelete, setToDelete] = useState<Baja | null>(null)

  const fetchBajas = useCallback(async () => {
    if (!db) return
    setLoading(true)
    try {
      const snap = await getDocs(
        query(collection(db, 'bajas'), orderBy('fechaBaja', 'desc'))
      )
      setBajas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Baja)))
    } finally {
      setLoading(false)
    }
  }, [db])

  useEffect(() => { fetchBajas() }, [fetchBajas])

  const filtered = useMemo(() =>
    bajas.filter(b =>
      b.nombre.toLowerCase().includes(search.toLowerCase()) ||
      b.noEmpleado.toLowerCase().includes(search.toLowerCase())
    ), [bajas, search])

  async function handleAdd() {
    if (!db || !form.noEmpleado.trim() || !form.nombre.trim() || !form.fechaBaja) return
    setSaving(true)
    try {
      const newRef = doc(collection(db, 'bajas'))
      await setDoc(newRef, {
        noEmpleado: form.noEmpleado.trim(),
        nombre:     form.nombre.trim(),
        fechaBaja:  form.fechaBaja,
        creadoPor:  appUser?.uid ?? '',
        createdAt:  serverTimestamp(),
      })
      toast({ title: 'Empleado registrado', description: form.nombre.trim() })
      setOpenAdd(false)
      setForm(EMPTY_FORM)
      await fetchBajas()
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!db || !toDelete) return
    try {
      await deleteDoc(doc(db, 'bajas', toDelete.id))
      toast({ title: 'Registro eliminado' })
      setToDelete(null)
      await fetchBajas()
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Acciones */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nombre o No. empleado…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 bg-muted/30 border-none focus-visible:ring-1"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={fetchBajas}
          title="Actualizar lista"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>

        {isAdmin && (
          <Button
            size="sm"
            className="h-10 w-10 p-0 shrink-0"
            onClick={() => setOpenAdd(true)}
            title="Registrar baja"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">

        {/* Encabezado — solo desktop */}
        <div className={cn(
          "hidden md:grid gap-4 px-5 py-3 border-b border-border/60 bg-muted/30",
          isAdmin ? "grid-cols-[7rem_1fr_9rem_2.5rem]" : "grid-cols-[7rem_1fr_9rem]"
        )}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">No. Empleado</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre Completo</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha de Baja</p>
          {isAdmin && <span />}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <UserX className="w-8 h-8 opacity-30" />
            <p className="text-sm">
              {search ? 'Sin resultados para esa búsqueda' : 'Sin registros de baja'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map(baja => (
              <div key={baja.id} className="hover:bg-muted/30 transition-colors">

                {/* Mobile: card layout */}
                <div className="md:hidden flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{baja.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        No.&nbsp;{baja.noEmpleado}
                      </span>
                      <span className="text-muted-foreground/40 text-xs">·</span>
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {baja.fechaBaja}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
                      onClick={() => setToDelete(baja)}
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Desktop: table row */}
                <div className={cn(
                  "hidden md:grid gap-4 items-center px-5 py-3.5",
                  isAdmin ? "grid-cols-[7rem_1fr_9rem_2.5rem]" : "grid-cols-[7rem_1fr_9rem]"
                )}>
                  <p className="text-sm font-mono font-semibold text-muted-foreground tabular-nums">
                    {baja.noEmpleado}
                  </p>
                  <p className="text-sm font-semibold truncate">{baja.nombre}</p>
                  <p className="text-sm text-muted-foreground font-mono tabular-nums">
                    {baja.fechaBaja}
                  </p>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setToDelete(baja)}
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: agregar */}
      <Dialog open={openAdd} onOpenChange={o => { setOpenAdd(o); if (!o) setForm(EMPTY_FORM) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Personal de Baja</DialogTitle>
            <DialogDescription>Completa los datos del empleado dado de baja.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                No. Empleado
              </label>
              <Input
                placeholder="ej. 00123"
                value={form.noEmpleado}
                onChange={e => setForm(f => ({ ...f, noEmpleado: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nombre Completo
              </label>
              <Input
                placeholder="Nombre completo del empleado"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Fecha de Baja
              </label>
              <Input
                type="date"
                value={form.fechaBaja}
                onChange={e => setForm(f => ({ ...f, fechaBaja: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenAdd(false); setForm(EMPTY_FORM) }}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving || !form.noEmpleado.trim() || !form.nombre.trim() || !form.fechaBaja}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: confirmar eliminación */}
      {toDelete && (
        <AlertDialog open onOpenChange={o => { if (!o) setToDelete(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará el registro de <strong>{toDelete.nombre}</strong> (No.&nbsp;{toDelete.noEmpleado}).
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
