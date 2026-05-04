"use client"

// ─── MealSchedulesManager ─────────────────────────────────────────────────────
//
// Panel de administración para configurar horarios de comida desde la plataforma.
// Gestiona dos colecciones en Firestore:
//   • mealSchedules  → horario fijo por departamento + turno
//   • employeeGroups → grupos de empleados con ventana específica (cualquier depto)
//
// Admins pueden:
//   - Agregar / editar / eliminar horarios
//   - Agregar / editar / eliminar grupos con lista de empleados
//   - Inicializar desde los datos estáticos con un solo clic

import * as React from "react"
import {
  collection,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { STATIC_CONFIG, type EmployeeGroup } from "@/lib/meal-schedules"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  UtensilsCrossed,
  Users,
  Loader2,
  DatabaseZap,
  Check,
  X,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useConfirm } from "@/hooks/use-confirm"
import { SkeletonList } from "@/components/ui/skeletons"

// ─── Types locales ────────────────────────────────────────────────────────────

interface ScheduleDoc {
  id:           string   // doc id = "DEPT|TURNO"
  departamento: string
  turno:        string
  start:        string
  end:          string
  label:        string
}

interface GroupDoc extends EmployeeGroup {
  id: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TURNOS = ["1", "2", "3", "4", "MIXTO"]

function makeLabel(start: string, end: string) {
  return `${start} – ${end}`
}

// ─── ScheduleDialog ───────────────────────────────────────────────────────────

interface ScheduleDialogProps {
  open:     boolean
  initial:  ScheduleDoc | null   // null = modo agregar
  onClose:  () => void
  onSaved:  () => void
}

function ScheduleDialog({ open, initial, onClose, onSaved }: ScheduleDialogProps) {
  const db = useFirestore()
  const { toast } = useToast()

  const [dept,    setDept]    = React.useState("")
  const [turno,   setTurno]   = React.useState("")
  const [start,   setStart]   = React.useState("")
  const [end,     setEnd]     = React.useState("")
  const [saving,  setSaving]  = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setDept(initial?.departamento  ?? "")
    setTurno(initial?.turno        ?? "")
    setStart(initial?.start        ?? "")
    setEnd(initial?.end            ?? "")
    setSaving(false)
  }, [open, initial])

  const isEdit  = !!initial
  const canSave = (isEdit || (dept.trim() && turno)) && start && end

  const handleSave = async () => {
    if (!db || !canSave) return
    setSaving(true)
    const id    = isEdit ? initial!.id : `${dept.trim().toUpperCase()}|${turno.toUpperCase()}`
    const label = makeLabel(start, end)
    try {
      await setDoc(doc(db, "mealSchedules", id), {
        departamento: isEdit ? initial!.departamento : dept.trim().toUpperCase(),
        turno:        isEdit ? initial!.turno        : turno.toUpperCase(),
        start, end, label,
      }, { merge: isEdit })
      toast({ title: isEdit ? "Horario actualizado" : "Horario guardado" })
      onSaved()
      onClose()
    } catch {
      toast({ variant: "destructive", title: "Error al guardar" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-sm rounded-2xl p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/50">
          <DialogTitle className="text-base">
            {isEdit ? `Editar horario` : "Agregar horario"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3">
          {/* Departamento — solo editable al crear */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Departamento</label>
            {isEdit ? (
              <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-muted/40 text-sm font-medium">
                {initial!.departamento}
                <Badge variant="outline" className="text-[10px] ml-auto">T{initial!.turno}</Badge>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Ej. CALIDAD"
                  value={dept}
                  onChange={(e) => setDept(e.target.value.toUpperCase())}
                  className="h-9 text-sm"
                  autoCapitalize="characters"
                  autoFocus
                />
                <Select value={turno} onValueChange={setTurno}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Turno" />
                  </SelectTrigger>
                  <SelectContent>
                    {TURNOS.map((t) => (
                      <SelectItem key={t} value={t}>Turno {t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Horario */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Horario de comida</label>
            <div className="flex items-center gap-2">
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 text-sm flex-1" autoFocus={isEdit} />
              <span className="text-muted-foreground text-sm shrink-0">–</span>
              <Input type="time" value={end}   onChange={(e) => setEnd(e.target.value)}   className="h-9 text-sm flex-1" />
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={!canSave || saving} aria-label={isEdit ? "Guardar" : "Agregar"}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin md:hidden" /> : <Check className="w-4 h-4 md:hidden" />}
            <span className="hidden md:inline">{isEdit ? "Guardar" : "Agregar"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── HorariosTab ──────────────────────────────────────────────────────────────

function HorariosTab() {
  const db = useFirestore()
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()

  const [items,        setItems]        = React.useState<ScheduleDoc[] | null>(null)
  const [loading,      setLoading]      = React.useState(true)
  const [dialogOpen,   setDialogOpen]   = React.useState(false)
  const [dialogTarget, setDialogTarget] = React.useState<ScheduleDoc | null>(null)

  const load = React.useCallback(async () => {
    if (!db) return
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, "mealSchedules"))
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ScheduleDoc))
      docs.sort((a, b) => a.departamento.localeCompare(b.departamento) || a.turno.localeCompare(b.turno))
      setItems(docs)
    } catch {
      toast({ variant: "destructive", title: "Error al cargar horarios" })
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [db, toast])

  React.useEffect(() => { load() }, [load])

  const openAdd  = () => { setDialogTarget(null); setDialogOpen(true) }
  const openEdit = (item: ScheduleDoc) => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    requestAnimationFrame(() => { setDialogTarget(item); setDialogOpen(true) })
  }

  const handleDelete = async (item: ScheduleDoc) => {
    if (!db) return
    ;(document.activeElement as HTMLElement | null)?.blur()
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    const ok = await confirm({
      title:        `¿Eliminar "${item.id}"?`,
      description:  "Si no hay otro horario para este departamento/turno, se usará el valor predeterminado del sistema.",
      confirmLabel: "Eliminar",
      variant:      "destructive",
    })
    if (!ok) return
    try {
      await deleteDoc(doc(db, "mealSchedules", item.id))
      toast({ title: "Horario eliminado" })
      load()
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" })
    }
  }

  return (
    <>
      {ConfirmDialog}
      <ScheduleDialog
        open={dialogOpen}
        initial={dialogTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />

      <div className="space-y-4">
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={openAdd} aria-label="Agregar horario">
          <Plus className="w-4 h-4 md:hidden" />
          <span className="hidden md:inline">Agregar horario</span>
        </Button>

        <div className="space-y-2 min-h-[80px]">
          {loading ? (
            <SkeletonList rows={4} />
          ) : items?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <UtensilsCrossed className="w-8 h-8 opacity-20" />
              <p className="text-sm">Sin horarios configurados. Agrega el primero o inicializa desde los datos predeterminados.</p>
            </div>
          ) : (
            items?.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg min-w-0">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{item.departamento}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">T{item.turno}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem onClick={() => openEdit(item)}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(item)}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ─── GroupSheet ───────────────────────────────────────────────────────────────

interface GroupSheetProps {
  open:     boolean
  initial:  Partial<GroupDoc> | null
  onClose:  () => void
  onSaved:  () => void
}

function GroupSheet({ open, initial, onClose, onSaved }: GroupSheetProps) {
  const db = useFirestore()
  const { toast } = useToast()

  const [dept,      setDept]      = React.useState("")
  const [turno,     setTurno]     = React.useState("")
  const [grupo,     setGrupo]     = React.useState("")
  const [label,     setLabel]     = React.useState("")
  const [employees, setEmployees] = React.useState("")
  const [start,     setStart]     = React.useState("")
  const [end,       setEnd]       = React.useState("")
  const [saving,    setSaving]    = React.useState(false)

  // Populate when editing
  React.useEffect(() => {
    if (!open) return
    setDept(initial?.departamento ?? "")
    setTurno(initial?.turno        ?? "")
    setGrupo(initial?.grupo        ?? "")
    setLabel(initial?.label        ?? "")
    setEmployees((initial?.employees ?? []).join("\n"))
    setStart(initial?.meal?.start  ?? "")
    setEnd(initial?.meal?.end      ?? "")
  }, [open, initial])

  const handleSave = async () => {
    if (!db || !dept.trim() || !turno || !grupo.trim() || !start || !end) return
    setSaving(true)
    try {
      const ids = employees
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)

      const data: Omit<EmployeeGroup, "id"> = {
        departamento: dept.trim().toUpperCase(),
        turno:        turno.toUpperCase(),
        grupo:        grupo.trim(),
        label:        label.trim() || `Grupo ${grupo.trim()} – T${turno} – ${dept.trim().toUpperCase()}`,
        employees:    ids,
        meal:         { start, end, label: makeLabel(start, end) },
      }

      if (initial?.id) {
        // Update existing
        await setDoc(doc(db, "employeeGroups", initial.id), data, { merge: false })
      } else {
        await addDoc(collection(db, "employeeGroups"), data)
      }
      toast({ title: initial?.id ? "Grupo actualizado" : "Grupo creado" })
      onSaved()
      onClose()
    } catch {
      toast({ variant: "destructive", title: "Error al guardar el grupo" })
    } finally {
      setSaving(false)
    }
  }

  const canSave = dept.trim() && turno && grupo.trim() && start && end

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/50">
          <SheetTitle className="text-base">
            {initial?.id ? "Editar grupo" : "Nuevo grupo de empleados"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Define el departamento, turno, número de grupo, empleados y su horario de comida.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Departamento + Turno */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Departamento</label>
              <Input
                placeholder="PRODUCCIÓN"
                value={dept}
                onChange={(e) => setDept(e.target.value.toUpperCase())}
                className="h-9 text-sm"
                autoCapitalize="characters"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Turno</label>
              <Select value={turno} onValueChange={setTurno}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Turno" />
                </SelectTrigger>
                <SelectContent>
                  {TURNOS.map((t) => (
                    <SelectItem key={t} value={t}>Turno {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grupo + Label */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nº de grupo</label>
              <Input
                placeholder="1"
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Etiqueta (opcional)</label>
              <Input
                placeholder="Grupo 1 – Turno 1"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Horario */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Horario de comida</label>
            <div className="flex items-center gap-2">
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 text-sm flex-1" />
              <span className="text-muted-foreground text-sm shrink-0">–</span>
              <Input type="time" value={end}   onChange={(e) => setEnd(e.target.value)}   className="h-9 text-sm flex-1" />
            </div>
          </div>

          {/* Empleados */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              IDs de empleados
            </label>
            <p className="text-[11px] text-muted-foreground">Un ID por línea (o separados por coma)</p>
            <Textarea
              value={employees}
              onChange={(e) => setEmployees(e.target.value)}
              placeholder={"1444\n1539\n2315\n2545"}
              className="font-mono text-xs min-h-[120px] resize-y"
              spellCheck={false}
            />
            {employees.trim() && (
              <p className="text-[11px] text-muted-foreground">
                {employees.split(/[\n,]+/).filter((s) => s.trim()).length} empleados
              </p>
            )}
          </div>
        </div>

        <SheetFooter className="px-5 py-4 border-t border-border/50 flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={!canSave || saving} aria-label={initial?.id ? "Guardar cambios" : "Crear grupo"}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin md:hidden" /> : <Check className="w-4 h-4 md:hidden" />}
            <span className="hidden md:inline">{initial?.id ? "Guardar cambios" : "Crear grupo"}</span>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── GruposTab ────────────────────────────────────────────────────────────────

function GruposTab() {
  const db = useFirestore()
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()

  const [items,   setItems]   = React.useState<GroupDoc[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [sheetOpen,   setSheetOpen]   = React.useState(false)
  const [sheetInitial, setSheetInitial] = React.useState<Partial<GroupDoc> | null>(null)

  const load = React.useCallback(async () => {
    if (!db) return
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, "employeeGroups"))
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupDoc))
      docs.sort((a, b) =>
        a.departamento.localeCompare(b.departamento) ||
        a.turno.localeCompare(b.turno) ||
        a.grupo.localeCompare(b.grupo, undefined, { numeric: true })
      )
      setItems(docs)
    } catch {
      toast({ variant: "destructive", title: "Error al cargar grupos" })
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [db, toast])

  React.useEffect(() => { load() }, [load])

  const openNew  = () => { setSheetInitial(null); setSheetOpen(true) }
  const openEdit = (g: GroupDoc) => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    requestAnimationFrame(() => { setSheetInitial(g); setSheetOpen(true) })
  }

  const handleDelete = async (g: GroupDoc) => {
    if (!db) return
    ;(document.activeElement as HTMLElement | null)?.blur()
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    const ok = await confirm({
      title:        `¿Eliminar "${g.label}"?`,
      description:  "Se eliminarán los empleados de este grupo. La acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      variant:      "destructive",
    })
    if (!ok) return
    try {
      await deleteDoc(doc(db, "employeeGroups", g.id))
      toast({ title: "Grupo eliminado" })
      load()
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" })
    }
  }

  return (
    <>
      {ConfirmDialog}
      <GroupSheet
        open={sheetOpen}
        initial={sheetInitial}
        onClose={() => setSheetOpen(false)}
        onSaved={load}
      />

      <div className="space-y-4">
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={openNew} aria-label="Agregar grupo">
          <Plus className="w-4 h-4 md:hidden" />
          <span className="hidden md:inline">Agregar grupo</span>
        </Button>

        <div className="space-y-2 min-h-[80px]">
          {loading ? (
            <SkeletonList rows={4} />
          ) : items?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <Users className="w-8 h-8 opacity-20" />
              <p className="text-sm">Sin grupos configurados.</p>
            </div>
          ) : (
            items?.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg min-w-0">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{item.departamento}</Badge>
                    <Badge variant="outline" className="text-[10px]">T{item.turno}</Badge>
                    <span className="text-[11px] text-muted-foreground">{item.meal?.label}</span>
                    <span className="text-[11px] text-muted-foreground">· {item.employees?.length ?? 0} empleados</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem onClick={() => openEdit(item)}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(item)}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ─── MealSchedulesManager ─────────────────────────────────────────────────────

export function MealSchedulesManager() {
  const db = useFirestore()
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [seeding, setSeeding] = React.useState(false)

  const handleSeedDefaults = async () => {
    if (!db) return
    const ok = await confirm({
      title:        "¿Inicializar desde datos predeterminados?",
      description:  "Esto sobreescribirá todos los horarios y grupos actuales con los valores predefinidos del sistema. No se puede deshacer.",
      confirmLabel: "Inicializar",
      variant:      "destructive",
    })
    if (!ok) return

    setSeeding(true)
    try {
      // Seed schedules (setDoc por ID determinista)
      const scheduleBatch = writeBatch(db)
      for (const [key, win] of Object.entries(STATIC_CONFIG.schedules)) {
        const [departamento, turno] = key.split("|")
        scheduleBatch.set(doc(db, "mealSchedules", key), {
          departamento, turno,
          start: win.start, end: win.end, label: win.label,
        })
      }
      await scheduleBatch.commit()

      // Seed groups (addDoc porque IDs son auto)
      // Primero borra los existentes
      const existingSnap = await getDocs(collection(db, "employeeGroups"))
      const deleteBatch  = writeBatch(db)
      existingSnap.docs.forEach((d) => deleteBatch.delete(d.ref))
      await deleteBatch.commit()

      const addBatch = writeBatch(db)
      STATIC_CONFIG.groups.forEach((g) => {
        const ref = doc(collection(db, "employeeGroups"))
        addBatch.set(ref, {
          departamento: g.departamento,
          turno:        g.turno,
          grupo:        g.grupo,
          label:        g.label,
          employees:    g.employees,
          meal:         g.meal,
        })
        // Firestore batch limit: 500 ops; grupos estáticos son pocos, no hay riesgo
      })
      await addBatch.commit()

      toast({ title: "Horarios inicializados correctamente" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al inicializar", description: err?.message })
    } finally {
      setSeeding(false)
    }
  }

  return (
    <>
      {ConfirmDialog}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
            </div>
            Horarios de Comida
          </CardTitle>
          <CardDescription className="text-sm">
            Configura los horarios por departamento y los grupos de empleados sin tocar el código.
            Los cambios aplican en tiempo real.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Initialize from defaults */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
            <DatabaseZap className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Primera vez aquí</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Carga los datos predeterminados del sistema para empezar a editarlos.
              </p>
            </div>
            <Button
              size="responsiveSm"
              variant="outline"
              className="shrink-0"
              onClick={handleSeedDefaults}
              disabled={seeding}
              aria-label="Inicializar datos predeterminados"
            >
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin md:hidden" /> : <DatabaseZap className="w-3.5 h-3.5 md:hidden" />}
              <span className="hidden md:inline">Inicializar</span>
            </Button>
          </div>

          {/* Tabs: Horarios / Grupos */}
          <Tabs defaultValue="horarios">
            <TabsList className="grid h-12 w-full grid-cols-2 md:h-10">
              <TabsTrigger value="horarios" className="h-10 gap-2 text-sm md:h-auto md:text-xs">
                <UtensilsCrossed className="h-4 w-4 md:hidden" />
                <span className="hidden md:inline">Por departamento</span>
              </TabsTrigger>
              <TabsTrigger value="grupos" className="h-10 gap-2 text-sm md:h-auto md:text-xs">
                <Users className="h-4 w-4 md:hidden" />
                <span className="hidden md:inline">Grupos</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="horarios" className="mt-4">
              <HorariosTab />
            </TabsContent>
            <TabsContent value="grupos" className="mt-4">
              <GruposTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  )
}
