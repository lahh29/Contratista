"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { Loader2, Mail, Lock, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence, type Transition } from "framer-motion"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/firebase"
import { useUser } from "@/firebase/auth/use-user"
import Link from "next/link"
import { logAudit } from "@/app/actions/audit"
import {
  ProviderRegistrationTutorial,
  ProviderTutorialLink,
  type ProviderRegistrationTutorialHandle,
} from "@/components/auth/ProviderRegistrationTutorial"

const schema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

const panelTransition: Transition = { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }

export default function LoginPage() {
  const [loading, setLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [loginError, setLoginError] = React.useState<string | null>(null)
  const [resetMode, setResetMode] = React.useState(false)
  const [resetEmail, setResetEmail] = React.useState("")
  const [resetLoading, setResetLoading] = React.useState(false)
  const [resetSent, setResetSent] = React.useState(false)

  const auth = useAuth()
  const router = useRouter()
  const { user, loading: authLoading } = useUser()
  const tutorialRef = React.useRef<ProviderRegistrationTutorialHandle>(null)
  const openTutorial = React.useCallback(() => tutorialRef.current?.open(), [])

  React.useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard")
    }
  }, [user, authLoading, router])

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: z.infer<typeof schema>) {
    if (!auth) return
    setLoading(true)
    setLoginError(null)
    try {
      const credential = await signInWithEmailAndPassword(auth, values.email, values.password)

      logAudit({
        action: "user.login",
        actorUid: credential.user.uid,
        actorName: credential.user.displayName ?? values.email,
        actorRole: "unknown",
        targetType: "user",
        targetId: credential.user.uid,
        targetName: credential.user.displayName ?? values.email,
      })

      document.cookie = "vp_session=1; path=/; SameSite=Strict"
      router.push("/dashboard")
    } catch {
      setLoginError("Correo o contraseña incorrectos.")
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordReset() {
    if (!auth || !resetEmail) return
    setResetLoading(true)
    try {
      await sendPasswordResetEmail(auth, resetEmail)
    } catch {
      // No revelar si el correo existe — siempre mostrar éxito
    } finally {
      setResetSent(true)
      setResetLoading(false)
    }
  }

  if (authLoading || user) return null

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
              Portal interno
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed flex items-center gap-2">
              <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/40" />
              Solo personal autorizado
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
            {resetMode ? (

              /* ── Recuperar contraseña ─────────────────── */
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={panelTransition}
              >
                {resetSent ? (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </motion.div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Correo enviado</p>
                      <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
                        Si el correo está registrado, recibirás las instrucciones para restablecer tu contraseña.
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Revisa tu carpeta de spam si no lo encuentras.
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 rounded-lg text-xs h-8"
                      onClick={() => { setResetMode(false); setResetSent(false); setResetEmail("") }}
                    >
                      Volver al inicio de sesión
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium text-foreground">Recuperar acceso</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Te enviaremos el enlace de recuperación.
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
                          placeholder="correo@vinoplastic.com"
                          autoComplete="email"
                          inputMode="email"
                          className="h-10 pl-9 text-sm"
                          value={resetEmail}
                          onChange={e => setResetEmail(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handlePasswordReset()}
                        />
                      </div>
                    </div>

                    <Button
                      className="w-full h-10 text-sm"
                      disabled={resetLoading || !resetEmail}
                      onClick={handlePasswordReset}
                    >
                      {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar enlace"}
                    </Button>

                    <button
                      type="button"
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setResetMode(false)}
                    >
                      ← Volver
                    </button>
                  </div>
                )}
              </motion.div>

            ) : (

              /* ── Login form ───────────────────────────── */
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={panelTransition}
                className="space-y-5"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">Bienvenido</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ingresa con tus credenciales
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                            Correo
                          </label>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <Input
                                {...field}
                                type="email"
                                placeholder="correo@vinoplastic.com"
                                className="h-10 pl-9 text-sm"
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {/* Password */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                            Contraseña
                          </label>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="h-10 pl-9 pr-10 text-sm"
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setShowPassword(v => !v)}
                                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                              >
                                {showPassword
                                  ? <EyeOff className="w-4 h-4" />
                                  : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {/* Error */}
                    <AnimatePresence>
                      {loginError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {loginError}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <Button className="w-full h-10 text-sm" disabled={loading}>
                      {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Iniciar sesión"}
                    </Button>

                    {/* Forgot */}
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setResetMode(true)}
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  </form>
                </Form>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Register */}
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Registrarse como proveedor
                </Link>

                {/* Inline trigger del tutorial (C) */}
                <div className="flex justify-center">
                  <ProviderTutorialLink onOpen={openTutorial} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </div>

      {/* Tutorial flotante de registro de proveedor */}
      <ProviderRegistrationTutorial ref={tutorialRef} />
    </div>
  )
}
