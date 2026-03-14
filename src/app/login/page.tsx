"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { signInWithEmailAndPassword } from "firebase/auth"
import { Loader2, ShieldCheck } from "lucide-react"
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

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: z.infer<typeof schema>) {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">

      {/* Card container */}
      <div className="w-full max-w-sm space-y-8">

        {/* Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div className="text-center space-y-0.5">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Control Contratistas
            </h1>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              ViñoPlastic
            </p>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Correo electrónico
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="usuario@vinoplastic.com"
                      autoComplete="email"
                      className="h-11 bg-muted/40 border-transparent focus-visible:bg-background focus-visible:border-primary/40 transition-all"
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
                  <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Contraseña
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="h-11 bg-muted/40 border-transparent focus-visible:bg-background focus-visible:border-primary/40 transition-all"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 font-bold text-base rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 mt-2"
              disabled={loading}
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : "Iniciar sesión"
              }
            </Button>
          </form>
        </Form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60">
          Acceso restringido a personal autorizado
        </p>
      </div>
    </div>
  )
}
