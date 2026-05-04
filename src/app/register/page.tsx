"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, collection, query, where, limit, getDocs } from "firebase/firestore"
import { Loader2, Mail, Lock, Building2, CheckCircle2, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth, useFirestore } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { AuthLayout } from "@/components/auth/AuthLayout"

type Step = 'email' | 'password' | 'success'

export default function RegisterPage() {
  const [step, setStep] = React.useState<Step>('email')
  const [email, setEmail] = React.useState('')
  const [emailError, setEmailError] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [passError, setPassError] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [company, setCompany] = React.useState<{ id: string; name: string } | null>(null)

  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const handleEmailNext = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Ingresa un correo válido')
      return
    }
    setEmailError('')
    setLoading(true)

    setEmail(trimmed)
    setLoading(false)
    setStep('password')
  }

  const handleRegister = async () => {
    if (password.length < 6) {
      setPassError('Mínimo 6 caracteres')
      return
    }
    if (password !== confirm) {
      setPassError('Las contraseñas no coinciden')
      return
    }

    setPassError('')
    if (!auth || !db) return
    setLoading(true)

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      const uid = credential.user.uid

      let companyId: string | undefined
      let companyName: string | undefined

      try {
        const q = query(
          collection(db, 'companies'),
          where('email', '==', email),
          limit(1)
        )
        const snap = await getDocs(q)
        if (!snap.empty) {
          companyId = snap.docs[0].id
          companyName = snap.docs[0].data().name as string
        }
      } catch { }

      await setDoc(doc(db, 'users', uid), {
        email,
        role: 'contractor',
        ...(companyId ? { companyId } : {}),
      })

      if (companyName) setCompany({ id: companyId!, name: companyName })
      setStep('success')

      setTimeout(() => {
        document.cookie = "vp_session=1; path=/; SameSite=Strict"
        router.push('/portal')
      }, 2000)

    } catch (err: any) {
      const code = err?.code ?? ''
      toast({
        variant: 'destructive',
        title: 'Error al registrarse',
        description:
          code === 'auth/email-already-in-use'
            ? 'Este correo ya tiene una cuenta. Inicia sesión.'
            : 'Ocurrió un error. Intenta de nuevo.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="glass-card max-lg:bg-background/85 max-lg:backdrop-blur-2xl overflow-hidden rounded-3xl">
        <div className="px-8 py-10 space-y-7">

          {/* Brand */}
          <div className="text-center">
            <p className="font-black text-lg tracking-widest uppercase text-foreground">
              ViñoPlastic
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Portal Contratista · Registro
            </p>
          </div>

          <AnimatePresence mode="wait">

            {/* STEP 1 */}
            {step === 'email' && (
              <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Correo electrónico
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usa el correo registrado con tu empresa
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="correo@empresa.com"
                      className="h-11 rounded-lg pl-10 bg-white/70 dark:bg-white/[0.06] border-black/[0.08] dark:border-white/[0.10] text-foreground placeholder:text-muted-foreground"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleEmailNext()}
                    />
                  </div>

                  {emailError && (
                    <p className="text-xs text-destructive">{emailError}</p>
                  )}

                  <Button className="w-full h-11" onClick={handleEmailNext} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Continuar'}
                  </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  ¿Ya tienes cuenta?{" "}
                  <button onClick={() => router.push('/login')} className="text-primary hover:underline">
                    Inicia sesión
                  </button>
                </p>

              </motion.div>
            )}

            {/* STEP 2 */}
            {step === 'password' && (
              <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

                <div className="flex items-center gap-2">
                  <button onClick={() => setStep('email')} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Crea tu contraseña
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Contraseña"
                      className="h-11 rounded-lg pl-10 bg-white/70 dark:bg-white/[0.06] border-black/[0.08] dark:border-white/[0.10]"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setPassError('') }}
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Confirmar contraseña"
                      className="h-11 rounded-lg pl-10 bg-white/70 dark:bg-white/[0.06] border-black/[0.08] dark:border-white/[0.10]"
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setPassError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleRegister()}
                    />
                  </div>

                  {passError && (
                    <p className="text-xs text-destructive">{passError}</p>
                  )}

                  <Button className="w-full h-11" onClick={handleRegister} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Crear cuenta'}
                  </Button>
                </div>

              </motion.div>
            )}

            {/* STEP 3 */}
            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">

                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>

                <p className="font-bold text-base text-foreground">
                  ¡Cuenta creada!
                </p>

                {company ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span>Vinculado a <span className="text-foreground font-semibold">{company.name}</span></span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Redirigiendo al portal…
                  </p>
                )}

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Entrando al portal…
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </AuthLayout>
  )
}
