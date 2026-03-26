"use client"

// ─── CreateUserWizard ─────────────────────────────────────────────────────────
// Modal wizard de 3 pasos para crear un usuario desde la plataforma.
//
// Paso 1 — Información básica : nombre + correo
// Paso 2 — Contraseña         : contraseña + confirmar
// Paso 3 — Acceso             : rol + empresa (si aplica)
//
// Usa firebase-admin via Server Action para no desloguear al admin actual.

import * as React from "react"
import { DocumentData } from "firebase/firestore"
import { createUser } from "@/app/actions/users"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button }  from "@/components/ui/button"
import { Input }   from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge }   from "@/components/ui/badge"
import {
  User,
  Lock,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Briefcase,
  HardHat,
  Shield,
  Package,
  UserPlus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  open:       boolean
  onClose:    () => void
  onCreated:  () => void
  companies:  DocumentData[] | null | undefined
}

const ROLES = [
  { value: "admin",      label: "Admin",           icon: ShieldCheck, color: "text-sky-600 dark:text-sky-400"       },
  { value: "seguridad",  label: "Seg. e Higiene",  icon: HardHat,     color: "text-yellow-600 dark:text-yellow-400" },
  { value: "logistica",  label: "Logística",       icon: Package,     color: "text-violet-600 dark:text-violet-400" },
  { value: "guard",      label: "Guardia",         icon: Shield,      color: "text-emerald-600 dark:text-emerald-400" },
  { value: "rys",        label: "Reclutamiento",   icon: UserPlus,    color: "text-rose-600 dark:text-rose-400"     },
  { value: "contractor", label: "Contratista",     icon: Briefcase,   color: "text-amber-600 dark:text-amber-400"   },
]

const TOTAL_STEPS = 3

// ─── Indicador de pasos ───────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const labels = ["Datos", "Contraseña", "Acceso"]
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {labels.map((label, i) => {
        const step     = i + 1
        const done     = step < current
        const active   = step === current
        const isLast   = i === labels.length - 1

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${done   ? "bg-primary text-primary-foreground"           : ""}
                ${active ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : ""}
                ${!done && !active ? "bg-muted text-muted-foreground"     : ""}
              `}>
                {done ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className={`text-[10px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {!isLast && (
              <div className={`w-10 h-px mb-5 mx-1 transition-all ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export function CreateUserWizard({ open, onClose, onCreated, companies }: Props) {
  const { toast } = useToast()

  // Form fields
  const [name,       setName]       = React.useState("")
  const [email,      setEmail]      = React.useState("")
  const [password,   setPassword]   = React.useState("")
  const [confirm,    setConfirm]    = React.useState("")
  const [role,       setRole]       = React.useState("")
  const [companyId,  setCompanyId]  = React.useState("")

  // UI
  const [step,        setStep]        = React.useState(1)
  const [showPwd,     setShowPwd]     = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [submitting,  setSubmitting]  = React.useState(false)
  const [fieldError,  setFieldError]  = React.useState<string | null>(null)

  // Reset on open/close
  React.useEffect(() => {
    if (!open) return
    setStep(1)
    setName(""); setEmail(""); setPassword(""); setConfirm("")
    setRole(""); setCompanyId("")
    setShowPwd(false); setShowConfirm(false)
    setFieldError(null); setSubmitting(false)
  }, [open])

  // ── Validación por paso ────────────────────────────────────────────────────

  function validateStep1(): string | null {
    if (!name.trim())             return "El nombre es obligatorio."
    if (!email.trim())            return "El correo es obligatorio."
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "El correo no tiene un formato válido."
    return null
  }

  function validateStep2(): string | null {
    if (password.length < 6)      return "La contraseña debe tener al menos 6 caracteres."
    if (password !== confirm)      return "Las contraseñas no coinciden."
    return null
  }

  function validateStep3(): string | null {
    if (!role)                    return "Selecciona un rol."
    if (role === "contractor" && !companyId) return "Selecciona la empresa del contratista."
    return null
  }

  // ── Navegación ────────────────────────────────────────────────────────────

  function handleNext() {
    const err =
      step === 1 ? validateStep1() :
      step === 2 ? validateStep2() :
      null
    if (err) { setFieldError(err); return }
    setFieldError(null)
    setStep((s) => s + 1)
  }

  function handleBack() {
    setFieldError(null)
    setStep((s) => s - 1)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const err = validateStep3()
    if (err) { setFieldError(err); return }
    setFieldError(null)
    setSubmitting(true)

    const result = await createUser({
      email, password, name: name.trim(), role,
      companyId: role === "contractor" ? companyId : null,
    })

    setSubmitting(false)

    if (!result.success) {
      setFieldError(result.error ?? "Error al crear el usuario.")
      return
    }

    toast({ title: "Usuario creado correctamente" })
    onCreated()
    onClose()
  }

  // ── Keyboard submit ───────────────────────────────────────────────────────

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return
    if (step < TOTAL_STEPS) handleNext()
    else handleSubmit()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedRole = ROLES.find((r) => r.value === role)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="w-full max-w-md rounded-2xl p-0 gap-0 overflow-hidden"
        onKeyDown={onKeyDown}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-semibold">Nuevo usuario</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            El usuario podrá iniciar sesión con las credenciales que configures.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-5 pb-6 space-y-0">
          <StepIndicator current={step} />

          {/* ── Paso 1: Datos básicos ── */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 h-11"
                    placeholder="Ej. Juan Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    autoCapitalize="words"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Correo electrónico
                </label>
                <Input
                  className="h-11"
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          {/* ── Paso 2: Contraseña ── */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 pr-10 h-11"
                    type={showPwd ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPwd((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className={`pl-9 pr-10 h-11 ${confirm && confirm !== password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repite la contraseña"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <p className="text-[11px] text-destructive">Las contraseñas no coinciden</p>
                )}
              </div>

              {/* Strength hint */}
              {password.length > 0 && (
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map((lvl) => (
                    <div key={lvl} className={`flex-1 h-1 rounded-full transition-colors ${
                      password.length >= lvl * 3
                        ? lvl <= 1 ? "bg-destructive"
                        : lvl <= 2 ? "bg-amber-400"
                        : "bg-emerald-500"
                        : "bg-muted"
                    }`} />
                  ))}
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {password.length < 4  ? "Muy corta" :
                     password.length < 7  ? "Débil"     :
                     password.length < 10 ? "Media"     : "Fuerte"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Paso 3: Rol y acceso ── */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Rol en el sistema
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => {
                    const Icon = r.icon
                    const active = role === r.value
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => { setRole(r.value); if (r.value !== "contractor") setCompanyId("") }}
                        className={`
                          flex items-center gap-2 p-3 rounded-xl border text-left text-sm font-medium transition-all
                          ${active
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          }
                        `}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? r.color : ""}`} />
                        {r.label}
                        {active && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {role === "contractor" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Empresa
                  </label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecciona la empresa…" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Resumen */}
              {role && (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1 text-xs">
                  <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Resumen</div>
                  <div><span className="text-muted-foreground">Nombre:</span> {name}</div>
                  <div><span className="text-muted-foreground">Correo:</span> {email}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Rol:</span>
                    {selectedRole && (
                      <Badge variant="outline" className="text-[10px] gap-1 py-0">
                        <selectedRole.icon className={`w-3 h-3 ${selectedRole.color}`} />
                        {selectedRole.label}
                      </Badge>
                    )}
                  </div>
                  {role === "contractor" && companyId && (
                    <div>
                      <span className="text-muted-foreground">Empresa:</span>{" "}
                      {companies?.find((c) => c.id === companyId)?.name ?? companyId}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {fieldError && (
            <p className="text-xs text-destructive mt-3 font-medium">{fieldError}</p>
          )}

          {/* Navegación */}
          <div className="flex gap-2 mt-8 pt-4 border-t border-border/50">
            {step > 1 && (
              <Button variant="outline" className="flex-1 gap-1.5" onClick={handleBack} disabled={submitting}>
                <ChevronLeft className="w-4 h-4" /> Atrás
              </Button>
            )}
            {step < TOTAL_STEPS ? (
              <Button className="flex-1 gap-1.5" onClick={handleNext}>
                Siguiente <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando…</>
                  : <><Check className="w-4 h-4" /> Crear usuario</>
                }
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
