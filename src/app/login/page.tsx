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
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

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
              Control de acceso · Planta Querétaro
            </p>
          </div>

          {/* Form */}
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
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(v => !v)}
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
              {loginError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-xs text-red-600">{loginError}</p>
                </div>
              )}

              {/* Submit */}
              <Button className="w-full h-11">
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Iniciar sesión"}
              </Button>

              {/* Forgot */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

            </form>
          </Form>

          {/* Register */}
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 w-full h-10 rounded-full border border-primary text-primary text-sm hover:underline"
          >
            <UserPlus className="w-4 h-4" />
            Registrarse como proveedor
          </Link>

        </div>
      </div>
    </AuthLayout>
  )
}
