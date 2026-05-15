"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, collection, query, where, limit, getDocs } from "firebase/firestore"
import { Loader2, Mail, Lock, Building2, CheckCircle2, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth, useFirestore } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { toastError } from "@/lib/toast-helpers"
type Step = "email" | "password" | "success"

export default function RegisterPage() {
  const [step, setStep] = React.useState<Step>("email")
  const [email, setEmail] = React.useState("")
  const [emailError, setEmailError] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [passError, setPassError] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [company, setCompany] = React.useState<{ id: string; name: string } | null>(null)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const handleEmailNext = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Ingresa un correo válido")
      return
    }
    setEmailError("")
    setLoading(true)
    setEmail(trimmed)
    setLoading(false)
    setStep("password")
  }

  const handleRegister = async () => {
    if (password.length < 6) {
      setPassError("Mínimo 6 caracteres")
      return
    }
    if (password !== confirm) {
      setPassError("Las contraseñas no coinciden")
      return
    }

    setPassError("")
    if (!auth || !db) return
    setLoading(true)

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      const uid = credential.user.uid

      let companyId: string | undefined
      let companyName: string | undefined

      try {
        const q = query(collection(db, "companies"), where("email", "==", email), limit(1))
        const snap = await getDocs(q)
        if (!snap.empty) {
          companyId = snap.docs[0].id
          companyName = snap.docs[0].data().name as string
        }
      } catch { }

      await setDoc(doc(db, "users", uid), {
        email,
        role: "contractor",
        ...(companyId ? { companyId } : {}),
      })

      if (companyName) setCompany({ id: companyId!, name: companyName })
      setStep("success")

      setTimeout(() => {
        document.cookie = "vp_session=1; path=/; SameSite=Strict"
        router.push("/portal")
      }, 2000)
    } catch (err: any) {
      const code = err?.code ?? ""
      toastError("Error al registrarse", code === "auth/email-already-in-use"
        ? "Este correo ya tiene una cuenta. Inicia sesión."
        : "Ocurrió un error. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[760px] flex rounded-xl border border-border overflow-hidden shadow-sm">

        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="hidden sm:flex w-[200px] shrink-0 flex-col justify-between bg-muted/40 border-r border-border p-8">
          <div>
            <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-foreground">
              ViñoPlastic
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 tracking-wide">
              Planta Querétaro
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed flex items-center gap-2">
              <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/40" />
              Registro de proveedores
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed flex items-center gap-2">
              <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/40" />
              Acceso al portal externo
            </p>
          </div>
        </aside>

        {/* ── Main panel ──────────────────────────────── */}
        <main className="flex-1 px-8 py-10 bg-background">

          {/* Brand — mobile only */}
          <div className="sm:hidden mb-8 text-center">
            <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-foreground">
              ViñoPlastic
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Planta Querétaro</p>
          </div>

          <AnimatePresence mode="wait">

            {/* STEP 1 — Email */}
            {step === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="space-y-5"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">Crear cuenta</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usa el correo con el que tu empresa está registrada.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                    Correo
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="correo@empresa.com"
                      className="h-10 pl-9 text-sm"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailError("") }}
                      onKeyDown={e => e.key === "Enter" && handleEmailNext()}
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-destructive">{emailError}</p>
                  )}
                </div>

                <Button className="w-full h-10 text-sm" onClick={handleEmailNext} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Continuar"}
                </Button>

                <div className="border-t border-border" />

                <p className="text-center text-xs text-muted-foreground">
                  ¿Ya tienes cuenta?{" "}
                  <button
                    onClick={() => router.push("/login")}
                    className="text-foreground hover:underline underline-offset-2 transition-colors"
                  >
                    Inicia sesión
                  </button>
                </p>
              </motion.div>
            )}

            {/* STEP 2 — Password */}
            {step === "password" && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="space-y-5"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setStep("email")}
                    className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Volver"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-foreground">Crea tu contraseña</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">{email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        className="h-10 pl-9 pr-10 text-sm"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setPassError("") }}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                      Confirmar contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Repite tu contraseña"
                        className="h-10 pl-9 pr-10 text-sm"
                        value={confirm}
                        onChange={e => { setConfirm(e.target.value); setPassError("") }}
                        onKeyDown={e => e.key === "Enter" && handleRegister()}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowConfirm(v => !v)}
                        aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {passError && (
                    <p className="text-xs text-destructive">{passError}</p>
                  )}
                </div>

                <Button className="w-full h-10 text-sm" onClick={handleRegister} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Crear cuenta"}
                </Button>
              </motion.div>
            )}

            {/* STEP 3 — Success */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center text-center gap-4 py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </motion.div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">¡Cuenta creada!</p>
                  {company ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5" />
                      Vinculado a{" "}
                      <span className="text-foreground font-medium">{company.name}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Redirigiendo al portal…</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Entrando al portal…
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
