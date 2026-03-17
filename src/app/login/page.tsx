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
import { MorphingText } from "@/components/ui/morphing-text"
import { PWAInstallBanner } from "@/components/PWAInstallBanner"

// ── Schema ────────────────────────────────────────────────────────────────────
const schema = z.object({
  email:    z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

// ── Textos del morphing — fuera del componente para no re-crear el array
//    en cada render y que MorphingText no reinicie la animación ───────────────
const MORPHING_TEXTS = ["VIÑOPLASTIC", "CONTRATISTAS", "INICIA SESIÓN"]

// ── Variantes de animación — fuera del componente para no re-crearlas ────────
const panelLeft = {
  initial:    { opacity: 0, x: -24 },
  animate:    { opacity: 1, x: 0 },
  transition: { duration: 0.45, ease: "easeOut" },
}
const panelRight = {
  initial:    { opacity: 0, x: 24 },
  animate:    { opacity: 1, x: 0 },
  transition: { duration: 0.45, ease: "easeOut", delay: 0.08 },
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [loading, setLoading] = React.useState(false)
  const auth      = useAuth()
  const router    = useRouter()
  const { toast } = useToast()

  const form = useForm({
    resolver:      zodResolver(schema),
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
        variant:     "destructive",
        title:       "Credenciales incorrectas",
        description: "Verifica tu correo y contraseña.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    /*
      overflow-hidden  → evita scroll horizontal en mobile
      min-h-dvh        → usa dynamic viewport height en mobile (evita el
                         salto del browser chrome en iOS/Android)
      bg-background    → respeta el theme-color del PWA manifest y dark mode
                         en lugar de hardcodear bg-white
      safe-area insets → padding para notch / home indicator en iOS y Android
    */
    <div className="
      min-h-screen min-h-dvh flex overflow-hidden
      bg-background
      supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]
    ">
      <PWAInstallBanner />

      {/* ── Panel izquierdo — logo (solo desktop) ───────────────────────── */}
      <motion.div
        className="hidden lg:flex flex-1 items-center justify-center bg-background"
        {...panelLeft}
      >
        <div className="flex flex-col items-center gap-6 px-16">
          <Image
            src="/logo-vino-plastic.png"
            alt="Logotipo ViñoPlastic"
            width={280}
            height={280}
            /*
              sizes le dice a Next.js exactamente qué tan grande se renderizará
              la imagen → genera el srcset correcto y evita descargar una imagen
              de 560px en una pantalla de 280px
            */
            sizes="280px"
            className="object-contain"
            priority
          />
        </div>
      </motion.div>

      {/* ── Separador punteado animado (solo desktop) ────────────────────── */}
      {/*
        aria-hidden: puramente decorativo.
        Sin esto los lectores de pantalla anuncian un SVG vacío.
        El stroke usa var(--border) en lugar de #e2e8f0 hardcodeado
        → respeta dark mode y el tema del sistema.
      */}
      <div
        className="hidden lg:flex flex-col items-center justify-center w-px py-16"
        aria-hidden="true"
      >
        <svg height="100%" width="2" className="overflow-visible">
          <motion.line
            x1="1" y1="0" x2="1" y2="100%"
            stroke="var(--border)"
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
      <motion.div
        className="
          flex flex-1 items-center justify-center bg-background
          px-6 py-12
          pt-[max(3rem,env(safe-area-inset-top))]
        "
        {...panelRight}
      >
        <div className="w-full max-w-sm space-y-8">

          {/* Logo mobile — decorativo, oculto en desktop y de lectores
              de pantalla (el h1 ya describe la página) */}
          <div className="flex lg:hidden justify-center" aria-hidden="true">
            <Image
              src="/logo-vino-plastic.png"
              alt=""
              width={88}
              height={88}
              sizes="88px"
              className="object-contain"
              priority
            />
          </div>

          {/* Heading accesible:
              - h1 con sr-only anuncia la página a lectores de pantalla
              - MorphingText es aria-hidden (animación visual, no semántica)
              - MORPHING_TEXTS definido fuera → no reinicia la animación
                al re-render del componente padre */}
          <div className="space-y-1">
            <h1 className="sr-only">Viñoplastic Qro — Iniciar sesión</h1>
            <MorphingText
              texts={MORPHING_TEXTS}
              className="h-8 md:h-8 text-2xl lg:text-2xl font-bold tracking-tight"
              aria-hidden="true"
            />
          </div>

          {/* noValidate → delega validación a zod/RHF.
              El validador nativo del browser es inconsistente entre plataformas
              y no respeta el diseño del sistema. */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      Correo electrónico
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="usuario@vinoplastic.com"
                        autoComplete="email"
                        /*
                          inputMode="email" abre el teclado correcto en iOS y
                          Android (muestra @ y .com, sin barra espaciadora
                          prominente) independientemente del atributo type
                        */
                        inputMode="email"
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

              <Button
                type="submit"
                className="w-full h-11 font-semibold text-base rounded-xl mt-2"
                disabled={loading}
                /*
                  aria-busy comunica el estado de carga a tecnologías de
                  asistencia sin depender solo del spinner visual
                */
                aria-busy={loading}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  : "Iniciar sesión"
                }
              </Button>
            </form>
          </Form>

          <p className="text-center text-xs text-muted-foreground/50">
            <a
              href="https://vertxk.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground transition-colors"
            >
              Vertx System Add-on
            </a>
          </p>

        </div>
      </motion.div>

    </div>
  )
}