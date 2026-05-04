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
import { AuthLayout } from "@/components/auth/AuthLayout"
import { logAudit } from "@/app/actions/audit"

const schema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

/** Shared transition for panel swaps */
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
        action: 'user.login',
        actorUid: credential.user.uid,
        actorName: credential.user.displayName ?? values.email,
        actorRole: 'unknown',
        targetType: 'user',
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
    <AuthLayout>
      <div className="glass-card max-lg:bg-background/85 max-lg:backdrop-blur-2xl overflow-hidden">
        <div className="px-8 py-10 space-y-7">

          {/* Brand */}
          <div className="text-center">
            <p className="font-black text-lg tracking-widest uppercase text-foreground">
              ViñoPlastic
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Planta Querétaro
            </p>
          </div>

          <AnimatePresence mode="wait">
            {resetMode ? (
              /* ── Recuperar contraseña ─────────────────────── */
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={panelTransition}
                className="space-y-4"
              >
                {resetSent ? (
                  <div className="flex flex-col items-center gap-3 py-2 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="success-icon-circle w-12 h-12"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                    </motion.div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Correo enviado</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Si el correo está registrado, recibirás las instrucciones para restablecer tu contraseña.
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1.5">
                        Revisa tu bandeja de spam o correo no deseado si no lo encuentras.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg mt-1"
                      onClick={() => { setResetMode(false); setResetSent(false); setResetEmail("") }}
                    >
                      Volver al inicio de sesión
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <p className="font-bold text-sm text-foreground">Recuperar contraseña</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ingresa tu correo y te enviaremos el enlace de recuperación.
                      </p>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="correo@vinoplastic.com"
                        autoComplete="email"
                        inputMode="email"
                        className="h-11 pl-10"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handlePasswordReset()}
                      />
                    </div>
                    <Button
                      className="w-full h-11"
                      disabled={resetLoading || !resetEmail}
                      onClick={handlePasswordReset}
                    >
                      {resetLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : "Enviar enlace"
                      }
                    </Button>
                    <button
                      type="button"
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setResetMode(false)}
                      aria-label="Volver al login"
                    >
                      ← Volver
                    </button>
                  </>
                )}
              </motion.div>
            ) : (
              /* ── Login form ───────────────────────────────── */
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={panelTransition}
              >
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                {...field}
                                type="email"
                                placeholder="correo@vinoplastic.com"
                                className="h-11 pl-10"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Password */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Contraseña"
                                className="h-11 pl-10 pr-11"
                              />
                              <button
                                type="button"
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setShowPassword(v => !v)}
                                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Error */}
                    <AnimatePresence>
                      {loginError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="alert-error">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <p className="text-xs">{loginError}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <Button className="w-full h-11" disabled={loading}>
                      {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Iniciar sesión"}
                    </Button>

                    {/* Forgot */}
                    <div className="text-center">
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Register */}
          {!resetMode && (
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 w-full h-10 rounded-full border border-primary text-primary text-sm hover:bg-primary/5 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Registrarse como proveedor
            </Link>
          )}

        </div>
      </div>
    </AuthLayout>
  )
}
