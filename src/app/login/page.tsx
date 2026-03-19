"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { signInWithEmailAndPassword } from "firebase/auth"
import { Loader2, Mail, Lock } from "lucide-react"
import { motion } from "framer-motion"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { PWAInstallBanner } from "@/components/PWAInstallBanner"
import { recordLogin } from "@/app/actions/audit"

const schema = z.object({
  email:    z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

export default function LoginPage() {
  const [loading, setLoading] = React.useState(false)
  const auth      = useAuth()
  const router    = useRouter()
  const { toast } = useToast()

  const form = useForm({
    resolver:      zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: z.infer<typeof schema>) {
    if (!auth) return
    setLoading(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, values.email, values.password)
      recordLogin(credential.user.uid, values.email)
      document.cookie = "vp_session=1; path=/; SameSite=Strict"
      router.push("/dashboard")
    } catch {
      toast({
        variant:     "destructive",
        title:       "Credenciales incorrectas",
        description: "Verifica tu correo y contraseña.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen min-h-dvh flex items-center justify-center overflow-hidden px-5"
      style={{
        background: "linear-gradient(135deg, hsl(214,80%,96%) 0%, hsl(220,70%,98%) 40%, hsl(210,90%,94%) 100%)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop:    "env(safe-area-inset-top)",
      }}
    >
      <PWAInstallBanner />

      {/* Background orbs — give glass something to blur */}
      <div aria-hidden="true" className="pointer-events-none select-none absolute inset-0 overflow-hidden">
        {/* Top-right large orb */}
        <div
          className="absolute rounded-full"
          style={{
            top: "-12%", right: "-8%",
            width: "55vmax", height: "55vmax",
            maxWidth: 600, maxHeight: 600,
            background: "radial-gradient(circle, hsl(216,90%,65%) 0%, hsl(216,80%,72%) 40%, transparent 70%)",
            opacity: 0.22,
            filter: "blur(60px)",
          }}
        />
        {/* Bottom-left orb */}
        <div
          className="absolute rounded-full"
          style={{
            bottom: "-10%", left: "-8%",
            width: "45vmax", height: "45vmax",
            maxWidth: 480, maxHeight: 480,
            background: "radial-gradient(circle, hsl(200,85%,60%) 0%, hsl(210,80%,68%) 40%, transparent 70%)",
            opacity: 0.18,
            filter: "blur(70px)",
          }}
        />
        {/* Center accent */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "30vmax", height: "30vmax",
            maxWidth: 360, maxHeight: 360,
            background: "radial-gradient(circle, hsl(220,75%,70%) 0%, transparent 65%)",
            opacity: 0.10,
            filter: "blur(50px)",
          }}
        />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-[380px]"
      >
        {/* Glass surface */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            backdropFilter:         "blur(32px) saturate(180%)",
            WebkitBackdropFilter:   "blur(32px) saturate(180%)",
            background:             "rgba(255, 255, 255, 0.62)",
            border:                 "1px solid rgba(255, 255, 255, 0.75)",
            boxShadow:              "0 8px 40px rgba(30, 80, 180, 0.10), 0 1.5px 0 rgba(255,255,255,0.9) inset, 0 -1px 0 rgba(180,200,255,0.15) inset",
          }}
        >
          <div className="px-8 py-10 space-y-7">

            {/* Brand */}
            <div className="flex flex-col items-center gap-3">
              <Image
                src="/logo-vino-plastic.png"
                alt="ViñoPlastic"
                width={52}
                height={52}
                sizes="52px"
                className="object-contain drop-shadow-sm"
                priority
              />
              <div className="text-center">
                <p className="font-black text-lg tracking-widest uppercase text-foreground leading-none">
                  ViñoPlastic
                </p>
                <p className="text-muted-foreground text-[11px] font-medium tracking-wider mt-1">
                  Control de acceso · Planta Querétaro
                </p>
              </div>
            </div>

            {/* Form */}
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
                            className="h-11 rounded-2xl pl-10 bg-white/70 border-white/80 focus-visible:bg-white/90"
                            {...field}
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
                            type="password"
                            placeholder="Contraseña"
                            autoComplete="current-password"
                            className="h-11 rounded-2xl pl-10 bg-white/70 border-white/80 focus-visible:bg-white/90"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs pl-1" />
                    </FormItem>
                  )}
                />

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

              </form>
            </Form>

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
