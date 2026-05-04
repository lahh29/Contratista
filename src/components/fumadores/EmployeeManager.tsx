"use client"

import * as React from "react"
import {
  Search,
  Users,
  Loader2,
  Pencil,
  Hash,
  Building2,
  Briefcase,
  RefreshCw,
  X,
  AlertCircle,
  FileJson,
  UserPlus,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFirestore } from "@/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import { EditEmployeeDialog, type EmployeeData } from "@/components/fumadores/EditEmployeeDialog"
import { JsonImporterSheet } from "@/components/fumadores/JsonImporterSheet"
import { CreateEmployeeDialog } from "@/components/fumadores/CreateEmployeeDialog"

// ─── Component ────────────────────────────────────────────────────────────────

export function EmployeeManager() {
  const db = useFirestore()
  const { toast } = useToast()

  // ── Search state ──
  const [inputValue, setInputValue] = React.useState("")
  const debouncedId = useDebounce(inputValue, 400)
  const [employee, setEmployee] = React.useState<EmployeeData | null>(null)
  const [searching, setSearching] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)

  // ── Edit sheet state ──
  const [editOpen, setEditOpen] = React.useState(false)
  const [editEmployee, setEditEmployee] = React.useState<EmployeeData | null>(null)

  // ── Import / Create dialogs ──
  const [importOpen, setImportOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)

  // ── Recent edits (session only) ──
  const [recentEdits, setRecentEdits] = React.useState<EmployeeData[]>([])

  // ── Search employee by ID ──
  React.useEffect(() => {
    const id = debouncedId.trim()
    if (!db || !id) {
      setEmployee(null)
      setSearchError(null)
      return
    }

    setSearching(true)
    setSearchError(null)

    getDoc(doc(db, "empleados", id))
      .then((snap) => {
        if (!snap.exists()) {
          setEmployee(null)
          setSearchError("No se encontró un empleado con ese número")
        } else {
          const data = { employeeId: snap.id, ...snap.data() } as EmployeeData
          setEmployee(data)
        }
      })
      .catch(() => setSearchError("Error al buscar. Intenta de nuevo."))
      .finally(() => setSearching(false))
  }, [db, debouncedId])

  // ── Open edit sheet ──
  function handleEdit(emp: EmployeeData) {
    setEditEmployee(emp)
    setEditOpen(true)
  }

  // ── After update: refresh search ──
  function handleUpdated() {
    // Re-fetch the employee to show updated data
    if (employee && db) {
      getDoc(doc(db, "empleados", employee.employeeId))
        .then((snap) => {
          if (snap.exists()) {
            const updated = { employeeId: snap.id, ...snap.data() } as EmployeeData
            setEmployee(updated)
            // Add to recent edits
            setRecentEdits((prev) => {
              const filtered = prev.filter((e) => e.employeeId !== updated.employeeId)
              return [updated, ...filtered].slice(0, 5)
            })
          }
        })
        .catch(() => { })
    }
  }

  // ── After delete: clear search ──
  function handleDeleted() {
    const deletedId = employee?.employeeId
    setEmployee(null)
    setInputValue("")
    if (deletedId) {
      setRecentEdits((prev) => prev.filter((e) => e.employeeId !== deletedId))
    }
  }

  return (
    <>
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                Empleados
              </CardTitle>
              <CardDescription className="text-sm mt-1.5">
                Busca por número de empleado para editar sus datos o eliminarlo.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="responsiveSm"
                onClick={() => setCreateOpen(true)}
                aria-label="Nuevo empleado"
              >
                <UserPlus className="w-3.5 h-3.5 md:hidden" />
                <span className="hidden md:inline">Nuevo</span>
              </Button>
              <Button
                variant="outline"
                size="responsiveSm"
                onClick={() => setImportOpen(true)}
                aria-label="Importar JSON"
              >
                <FileJson className="w-3.5 h-3.5 md:hidden" />
                <span className="hidden md:inline">Importar JSON</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── Search bar ── */}
          <div className="relative">
            {searching ? (
              <RefreshCw
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                aria-hidden="true"
              />
            )}

            <Input
              placeholder="Número de empleado…"
              value={inputValue}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "")
                setInputValue(val)
              }}
              className="pl-9 pr-9 h-11"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Buscar por número de empleado"
              maxLength={10}
            />

            {inputValue && !searching && (
              <button
                onClick={() => { setInputValue(""); setEmployee(null); setSearchError(null) }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label="Limpiar búsqueda"
                type="button"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            )}
          </div>

          {/* ── Search error ── */}
          {searchError && debouncedId && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              {searchError}
            </p>
          )}

          {/* ── Employee result ── */}
          {employee && (
            <div className="p-4 bg-muted/40 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Hash className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm leading-tight">
                      {employee.Nombre} {employee.ApellidoPaterno} {employee.ApellidoMaterno}
                    </p>
                    <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5">
                      #{employee.employeeId}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{employee.Puesto}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 shrink-0" />
                      {employee.Departamento}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3 shrink-0" />
                      Área: {employee.Área}
                    </span>
                    <span className="flex items-center gap-1">
                      Turno: {employee.Turno}
                    </span>
                  </div>
                </div>
                <Button
                  size="responsiveSm"
                  variant="outline"
                  className="gap-1.5 shrink-0"
                  onClick={() => handleEdit(employee)}
                  aria-label="Editar empleado"
                >
                  <Pencil className="w-3.5 h-3.5 md:hidden" />
                  <span className="hidden md:inline">Editar</span>
                </Button>
              </div>
            </div>
          )}

          {/* ── Searching indicator ── */}
          {searching && !employee && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* ── Recent edits ── */}
          {recentEdits.length > 0 && !employee && !searching && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Editados recientemente
              </p>
              {recentEdits.map((emp) => (
                <div
                  key={emp.employeeId}
                  className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg min-w-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {emp.Nombre} {emp.ApellidoPaterno}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      #{emp.employeeId} · {emp.Departamento} · Turno {emp.Turno}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      setInputValue(emp.employeeId)
                    }}
                    aria-label={`Buscar ${emp.Nombre}`}
                  >
                    <Search className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* ── Empty state ── */}
          {!employee && !searching && !searchError && !inputValue && recentEdits.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <Search className="w-8 h-8 opacity-20" />
              <p className="text-sm">Ingresa un número de empleado para buscarlo.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <EditEmployeeDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={editEmployee}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />

      <JsonImporterSheet
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      <CreateEmployeeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  )
}
