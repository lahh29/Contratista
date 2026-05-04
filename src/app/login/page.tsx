"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { Loader2, Mail, Lock, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/firebase"
import { useUser } from "@/firebase/auth/use-user"
import Link from "next/link"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { logAudit } from "@/app/actions/audit"

const schema = z.object({
  email:    z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

// Stagger children for form field entrance
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}
const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

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
    <AuthLayout>
      {/* Glass surface */}
      <div className="glass-card max-lg:bg-background/85 max-lg:backdrop-blur-2xl lg:bg-transparent lg:border-0 lg:shadow-none lg:backdrop-blur-none overflow-hidden">
        <div className="px-8 py-10 space-y-7">

          {/* Brand */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-center">
              <motion.p
                initial={{ opacity: 0, letterSpacing: '0.3em' }}
                animate={{ opacity: 1, letterSpacing: '0.05em' }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="font-black text-lg tracking-widest uppercase text-foreground max-lg:text-white leading-none"
              >
                ViñoPlastic
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-muted-foreground max-lg:text-white/50 text-caption mt-2"
              >
                Control de acceso · Planta Querétaro
              </motion.p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {resetMode ? (
              /* ── Recuperar contraseña ─────────────────────── */
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {resetSent ? (
                  <div className="flex flex-col items-center gap-3 py-2 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </motion.div>
                    <div>
                      <p className="font-bold text-sm">Correo enviado</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Si el correo está registrado, recibirás las instrucciones para restablecer tu contraseña.
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
                        className="h-11 rounded-lg pl-10 bg-white/60 dark:bg-white/[0.06] border-black/[0.06] dark:border-white/[0.10] text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handlePasswordReset()}
                      />
                    </div>
                    <Button
                      className="w-full h-11 rounded-lg font-medium text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
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
              </motion.div>
            ) : (
              /* ── Login form ───────────────────────────────── */
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.25 }}
              >
                <Form {...form}>
                  <motion.form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-3"
                    noValidate
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >

                    <motion.div variants={staggerItem}>
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
                                  className="h-11 rounded-lg pl-10 bg-white/60 dark:bg-white/[0.06] border-black/[0.06] dark:border-white/[0.10] text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                                  {...field}
                                  onChange={e => { field.onChange(e); setLoginError(null) }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs pl-1" />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                    <motion.div variants={staggerItem}>
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
                                  className="h-11 rounded-lg pl-10 pr-11 bg-white/60 dark:bg-white/[0.06] border-black/[0.06] dark:border-white/[0.10] text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
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
                    </motion.div>

                    {/* Inline error */}
                    <AnimatePresence>
                      {loginError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2">
                            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                            <p className="text-xs text-red-600 dark:text-red-400">{loginError}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div variants={staggerItem}>
                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          className="w-full h-11 rounded-lg font-medium text-sm mt-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                          disabled={loading}
                          aria-busy={loading}
                        >
                          {loading
                            ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            : "Iniciar sesión"
                          }
                        </Button>
                      </motion.div>
                    </motion.div>

                    <motion.div variants={staggerItem} className="text-center pt-0.5">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground max-lg:text-white/50 hover:text-foreground max-lg:hover:text-white transition-colors"
                        onClick={() => setResetMode(true)}
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </motion.div>

                  </motion.form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>

          {!resetMode && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="pt-1"
            >
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-full border border-primary max-lg:border-white/30 text-sm font-normal text-primary max-lg:text-white/80 hover:underline transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Registrarse como proveedor
                </Link>
              </motion.div>
            </motion.div>
          )}

        </div>
      </div>
    </AuthLayout>
  )
}
