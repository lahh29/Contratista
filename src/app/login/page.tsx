"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { Loader2, Mail, Lock, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/firebase"
import { useUser } from "@/firebase/auth/use-user"
import Link from "next/link"
import { PWAInstallBanner } from "@/components/PWAInstallBanner"
import { logAudit } from "@/app/actions/audit"

const schema = z.object({
  email:    z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

export default function LoginPage() {
  const [loading,      setLoading]      = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [loginError,   setLoginError]   = React.useState<string | null>(null)
  const [resetMode,    setResetMode]    = React.useState(false)
  const [resetEmail,   setResetEmail]   = React.useState("")
  const [resetLoading, setResetLoading] = React.useState(false)
  const [resetSent,    setResetSent]    = React.useState(false)

  const auth                    = useAuth()
  const router                  = useRouter()
  const { user, loading: authLoading } = useUser()

  // Auto-redirect if already authenticated
  React.useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard")
    }
  }, [user, authLoading, router])

  const form = useForm({
    resolver:      zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: z.infer<typeof schema>) {
    if (!auth) return
    setLoading(true)
    setLoginError(null)
    try {
      const credential = await signInWithEmailAndPassword(auth, values.email, values.password)
      logAudit({
        action:     'user.login',
        actorUid:   credential.user.uid,
        actorName:  credential.user.displayName ?? values.email,
        actorRole:  'unknown',
        targetType: 'user',
        targetId:   credential.user.uid,
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
      // Don't reveal whether the email exists — always show success
    } finally {
      setResetSent(true)
      setResetLoading(false)
    }
  }

  // Blank screen while checking auth state to avoid flash
  if (authLoading || user) return null

  return (
    <div
      className="auth-bg relative min-h-screen min-h-dvh flex items-center justify-center overflow-hidden px-5"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop:    "env(safe-area-inset-top)",
      }}
    >
      <PWAInstallBanner />


      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-[380px]"
      >
        {/* Glass surface */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="px-8 py-10 space-y-7">

            {/* Brand */}
            <div className="flex flex-col items-center gap-3">
              <div className="text-center">
                <p className="font-black text-lg tracking-widest uppercase text-foreground leading-none">
                  ViñoPlastic
                </p>
                <p className="text-muted-foreground text-[11px] font-medium tracking-wider mt-1">
                  Control de acceso · Planta Querétaro
                </p>
              </div>
            </div>

            {resetMode ? (
              /* ── Recuperar contraseña ─────────────────────── */
              <div className="space-y-4">
                {resetSent ? (
                  <div className="flex flex-col items-center gap-3 py-2 text-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Correo enviado</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Si el correo está registrado, recibirás las instrucciones para restablecer tu contraseña.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-2xl mt-1"
                      onClick={() => { setResetMode(false); setResetSent(false); setResetEmail("") }}
                    >
                      Volver al inicio de sesión
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <p className="font-bold text-sm">Recuperar contraseña</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ingresa tu correo y te enviaremos el enlace de recuperación.
                      </p>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="correo@vinoplastic.com"
                        autoComplete="email"
                        inputMode="email"
                        className="h-11 rounded-2xl pl-10 bg-white/70 dark:bg-white/[0.07] border-white/80 dark:border-white/[0.14] text-foreground placeholder:text-muted-foreground focus-visible:bg-white/90 dark:focus-visible:bg-white/[0.11]"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handlePasswordReset()}
                      />
                    </div>
                    <Button
                      className="w-full h-11 rounded-2xl font-bold text-sm shadow-md shadow-primary/20"
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
                    >
                      ← Volver
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* ── Login form ───────────────────────────────── */
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                            <Input
                              type="email"
                              placeholder="correo@vinoplastic.com"
                              autoComplete="email"
                              inputMode="email"
                              className="h-11 rounded-2xl pl-10 bg-white/70 dark:bg-white/[0.07] border-white/80 dark:border-white/[0.14] text-foreground placeholder:text-muted-foreground focus-visible:bg-white/90 dark:focus-visible:bg-white/[0.11]"
                              {...field}
                              onChange={e => { field.onChange(e); setLoginError(null) }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs pl-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Contraseña"
                              autoComplete="current-password"
                              className="h-11 rounded-2xl pl-10 pr-11 bg-white/70 dark:bg-white/[0.07] border-white/80 dark:border-white/[0.14] text-foreground placeholder:text-muted-foreground focus-visible:bg-white/90 dark:focus-visible:bg-white/[0.11]"
                              {...field}
                              onChange={e => { field.onChange(e); setLoginError(null) }}
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                              onClick={() => setShowPassword(v => !v)}
                              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs pl-1" />
                      </FormItem>
                    )}
                  />

                  {/* Inline error */}
                  {loginError && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2">
                      <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400">{loginError}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-2xl font-bold text-sm mt-1 shadow-md shadow-primary/20"
                    disabled={loading}
                    aria-busy={loading}
                  >
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      : "Iniciar sesión"
                    }
                  </Button>

                  <div className="text-center pt-0.5">
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
            )}

            {!resetMode && (
              <div className="pt-1">
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-2xl text-sm font-semibold text-primary hover:bg-primary/8 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Registrarse como proveedor
                </Link>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-foreground/25 mt-5">
          <a
            href="https://vertxk.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground/50 transition-colors"
          >
            Vertx System Add-on
          </a>
        </p>
      </motion.div>
    </div>
  )
}
