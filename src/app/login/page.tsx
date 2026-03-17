"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { signInWithEmailAndPassword } from "firebase/auth"
import { Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/firebase"
import { useToast } from "@/hooks/use-toast"

const schema = z.object({
  email:    z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

export default function LoginPage() {
  const [loading, setLoading] = React.useState(false)
  const auth    = useAuth()
  const router  = useRouter()
  const { toast } = useToast()

  // ── Sin genéricos TypeScript (proyecto JS) ───────────────────────────
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values) {
    if (!auth) return
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password)
      router.push("/dashboard")
    } catch {
      toast({
        variant: "destructive",
        title: "Credenciales incorrectas",
        description: "Verifica tu correo y contraseña.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white">

      {/* ── Panel izquierdo — logo ───────────────────────────────────────── */}
      <motion.div
        className="hidden lg:flex flex-1 items-center justify-center bg-white"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex flex-col items-center gap-6 px-16">
          <Image
            src="/logo-vino-plastic.png"
            alt="ViñoPlastic"
            width={280}
            height={280}
            className="object-contain"
            priority
          />
        </div>
      </motion.div>

      {/* ── Separador punteado animado ───────────────────────────────────── */}
      <div className="hidden lg:flex flex-col items-center justify-center w-px py-16">
        <svg height="100%" width="2" className="overflow-visible">
          <motion.line
            x1="1" y1="0" x2="1" y2="100%"
            stroke="#e2e8f0"
            strokeWidth="2"
            strokeDasharray="6 8"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
          />
        </svg>
      </div>

      {/* ── Panel derecho — form ─────────────────────────────────────────── */}
      {/* Quitado max-w del panel, ahora vive solo en el div interior */}
      <motion.div
        className="flex flex-1 items-center justify-center bg-white px-6 py-12"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
      >
        <div className="w-full max-w-sm space-y-8">

          {/* Logo mobile */}
          <div className="flex lg:hidden justify-center">
            <Image
              src="/logo-vino-plastic.png"
              alt="ViñoPlastic"
              width={100}
              height={100}
              className="object-contain"
              priority
            />
          </div>

          {/* Título — peso reducido, sin mayúsculas forzadas */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">VIÑOPLASTIC</h1>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    {/* Labels en sentence case, sin uppercase decorativo */}
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      Correo electrónico
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="usuario@vinoplastic.com"
                        autoComplete="email"
                        className="h-11 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      Contraseña
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="h-11 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Altura unificada con los inputs */}
              <Button
                type="submit"
                className="w-full h-11 font-semibold text-base rounded-xl mt-2"
                disabled={loading}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : "Iniciar sesión"
                }
              </Button>
            </form>
          </Form>

          <p className="text-center text-xs text-muted-foreground/50">
            <a href="https://vertxk.xyz/" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">
              Vertx System Add-on
            </a>
          </p>
        </div>
      </motion.div>

    </div>
  )
}