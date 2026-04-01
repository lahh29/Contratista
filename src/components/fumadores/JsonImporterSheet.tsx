"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { useFirestore } from "@/firebase"
import { doc, writeBatch } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeRecord {
  employeeId: string
  Nombre: string
  ApellidoPaterno: string
  ApellidoMaterno?: string
  Puesto: string
  Departamento: string
  Área?: string
  Turno: string
  [key: string]: any
}

interface InvalidRecord {
  index: number
  record: any
  errors: string[]
}

interface ParsedResult {
  valid: EmployeeRecord[]
  invalid: InvalidRecord[]
}

// ─── Validation ───────────────────────────────────────────────────────────────

const REQUIRED: string[] = [
  "employeeId", "Nombre", "ApellidoPaterno", "Puesto", "Departamento", "Turno",
]

function validate(raw: any[]): ParsedResult {
  const valid: EmployeeRecord[] = []
  const invalid: InvalidRecord[] = []

  raw.forEach((record, index) => {
    const errors: string[] = []
    if (typeof record !== "object" || record === null) {
      invalid.push({ index, record, errors: ["No es un objeto válido"] })
      return
    }
    for (const field of REQUIRED) {
      if (!record[field] || String(record[field]).trim() === "") {
        errors.push(field)
      }
    }
    if (errors.length > 0) {
      invalid.push({ index, record, errors: errors.map(e => `Falta: ${e}`) })
    } else {
      valid.push({ ...record, employeeId: String(record.employeeId).trim() })
    }
  })

  return { valid, invalid }
}

// ─── Firestore batch upload (chunks of 499) ───────────────────────────────────

async function batchUpload(
  db: any,
  records: EmployeeRecord[],
  onProgress: (uploaded: number) => void,
): Promise<void> {
  const CHUNK = 499
  for (let i = 0; i < records.length; i += CHUNK) {
    const batch = writeBatch(db)
    const chunk = records.slice(i, i + CHUNK)
    for (const record of chunk) {
      batch.set(doc(db, "empleados", record.employeeId), record)
    }
    await batch.commit()
    onProgress(i + chunk.length)
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface JsonImporterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JsonImporterSheet({ open, onOpenChange }: JsonImporterSheetProps) {
  const db = useFirestore()
  const { toast } = useToast()

  const [jsonText, setJsonText]         = React.useState("")
  const [parsed,   setParsed]           = React.useState<ParsedResult | null>(null)
  const [parseError, setParseError]     = React.useState<string | null>(null)
  const [uploading, setUploading]       = React.useState(false)
  const [progress, setProgress]         = React.useState(0)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ── Parse JSON whenever text changes (debounced 400 ms) ──────────────────

  React.useEffect(() => {
    if (!jsonText.trim()) {
      setParsed(null)
      setParseError(null)
      return
    }
    const id = setTimeout(() => {
      try {
        const raw = JSON.parse(jsonText)
        if (!Array.isArray(raw)) {
          setParseError("El JSON debe ser un arreglo [ { … }, { … } ]")
          setParsed(null)
          return
        }
        setParsed(validate(raw))
        setParseError(null)
      } catch (e: any) {
        setParseError(`JSON inválido: ${e.message}`)
        setParsed(null)
      }
    }, 400)
    return () => clearTimeout(id)
  }, [jsonText])

  // ── File upload ───────────────────────────────────────────────────────────

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setJsonText(ev.target?.result as string ?? "")
    reader.readAsText(file, "utf-8")
    e.target.value = ""
  }

  // ── Upload to Firestore ───────────────────────────────────────────────────

  async function handleUpload() {
    if (!db || !parsed || parsed.valid.length === 0) return
    setUploading(true)
    setProgress(0)
    try {
      await batchUpload(db, parsed.valid, setProgress)
      toast({
        title: "Importación completada",
        description: `${parsed.valid.length} empleados cargados correctamente.`,
      })
      onOpenChange(false)
      setJsonText("")
      setParsed(null)
    } catch (err: any) {
      toast({
        title: "Error al subir",
        description: err?.message ?? "Intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const validCount   = parsed?.valid.length   ?? 0
  const invalidCount = parsed?.invalid.length ?? 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0 overflow-hidden"
      >
        {/* ── Header ── */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/50 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileJson className="w-4 h-4 text-primary" />
            Importar empleados desde JSON
          </SheetTitle>
          <SheetDescription className="text-xs">
            Carga un archivo .json o pega el contenido directamente. El arreglo debe tener objetos
            con al menos: <code className="font-mono text-[11px]">employeeId, Nombre, ApellidoPaterno, Puesto, Departamento, Turno</code>.
          </SheetDescription>
        </SheetHeader>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">

          {/* File + status row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              Cargar archivo .json
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFile}
            />

            {/* Badges de validación */}
            {parsed && (
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-[11px] gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {validCount} válidos
                </Badge>
                {invalidCount > 0 && (
                  <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-[11px] gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {invalidCount} con errores
                  </Badge>
                )}
              </div>
            )}

            {parseError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {parseError}
              </p>
            )}
          </div>

          {/* Editor */}
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={'[\n  {\n    "employeeId": "1234",\n    "Nombre": "JUAN",\n    "ApellidoPaterno": "GARCIA",\n    "Puesto": "OPERADOR",\n    "Departamento": "PRODUCCIÓN",\n    "Turno": "1"\n  }\n]'}
            className="font-mono text-xs min-h-[180px] resize-y"
            spellCheck={false}
          />

          {/* Preview tabs */}
          {parsed && (
            <Tabs defaultValue="validos">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="validos" className="text-xs gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Válidos ({validCount})
                </TabsTrigger>
                <TabsTrigger value="errores" className="text-xs gap-1.5" disabled={invalidCount === 0}>
                  <AlertCircle className="w-3 h-3" />
                  Con errores ({invalidCount})
                </TabsTrigger>
              </TabsList>

              {/* Valid records */}
              <TabsContent value="validos" className="mt-3">
                {validCount === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin registros válidos</p>
                ) : (
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs">ID</TableHead>
                            <TableHead className="text-xs">Nombre</TableHead>
                            <TableHead className="text-xs">Departamento</TableHead>
                            <TableHead className="text-xs">Puesto</TableHead>
                            <TableHead className="text-xs">Turno</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsed.valid.slice(0, 100).map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs font-mono">{r.employeeId}</TableCell>
                              <TableCell className="text-xs">
                                {[r.Nombre, r.ApellidoPaterno, r.ApellidoMaterno].filter(Boolean).join(" ")}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{r.Departamento}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{r.Puesto}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{r.Turno}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {validCount > 100 && (
                      <p className="text-[11px] text-muted-foreground text-center py-2 border-t border-border/50">
                        Mostrando primeros 100 de {validCount}
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Invalid records */}
              <TabsContent value="errores" className="mt-3">
                <div className="space-y-2">
                  {parsed.invalid.map(({ index, record, errors }) => (
                    <div key={index} className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-2 font-medium text-destructive">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Registro #{index + 1}
                        {record?.employeeId && (
                          <span className="font-mono text-muted-foreground">· ID: {record.employeeId}</span>
                        )}
                      </div>
                      <ul className="pl-5 space-y-0.5 text-muted-foreground list-disc">
                        {errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-border/50 shrink-0 space-y-2">
          {/* Progress bar */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subiendo…</span>
                <span>{progress} / {validCount}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${validCount > 0 ? (progress / validCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleUpload}
              disabled={uploading || validCount === 0 || !db}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {uploading ? "Subiendo…" : `Subir ${validCount} empleados`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
