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

  // ── Step 1: validate email & find company ──────────────────
  const handleEmailNext = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Ingresa un correo válido')
      return
    }
    setEmailError('')
    setLoading(true)

    // We attempt to find the company AFTER creating auth, so here we just
    // validate format and move on. Company lookup happens at account creation.
    setEmail(trimmed)
    setLoading(false)
    setStep('password')
  }

  // ── Step 2: create account ─────────────────────────────────
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
      // 1. Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      const uid = credential.user.uid

      // 2. Look up company by email (now we're authenticated)
      let companyId: string | undefined
      let companyName: string | undefined
      try {
        const q = query(
          collection(db, 'companies'),
          where('email', '==', email),
          limit(1),
        )
        const snap = await getDocs(q)
        if (!snap.empty) {
          companyId = snap.docs[0].id
          companyName = snap.docs[0].data().name as string
        }
      } catch { /* non-critical */ }

      // 3. Create Firestore user document
      await setDoc(doc(db, 'users', uid), {
        email,
        role: 'contractor',
        ...(companyId ? { companyId } : {}),
      })

      if (companyName) setCompany({ id: companyId!, name: companyName })
      setStep('success')

      // Redirect after 2 s
      setTimeout(() => {
        document.cookie = "vp_session=1; path=/; SameSite=Strict"
        router.push('/portal')
      }, 2000)

    } catch (err: any) {
      const code = err?.code ?? ''
      toast({
        variant: 'destructive',
        title: 'Error al registrarse',
        description: code === 'auth/email-already-in-use'
          ? 'Este correo ya tiene una cuenta. Inicia sesión.'
          : 'Ocurrió un error. Intenta de nuevo.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="auth-bg relative min-h-dvh flex items-center justify-center overflow-hidden px-5"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-[380px]"
      >
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="px-8 py-10 space-y-7">

            {/* Brand */}
            <div className="text-center">
              <p className="font-black text-lg tracking-widest uppercase text-foreground leading-none">ViñoPlastic</p>
              <p className="text-muted-foreground text-[11px] font-medium tracking-wider mt-1">Portal Contratista · Registro</p>
            </div>

            <AnimatePresence mode="wait">

              {/* ── Step 1: Email ── */}
              {step === 'email' && (
                <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold mb-1">Correo electrónico</p>
                    <p className="text-xs text-muted-foreground">Usa el correo registrado con tu empresa</p>
                  </div>
                  <div className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="correo@empresa.com"
                        autoComplete="email"
                        inputMode="email"
                        className="h-11 rounded-2xl pl-10 bg-white/70 dark:bg-white/[0.07] border-white/80 dark:border-white/[0.14] text-foreground placeholder:text-muted-foreground focus-visible:bg-white/90 dark:focus-visible:bg-white/[0.11]"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setEmailError('') }}
                        onKeyDown={e => e.key === 'Enter' && handleEmailNext()}
                        disabled={loading}
                      />
                    </div>
                    {emailError && <p className="text-xs text-destructive pl-1">{emailError}</p>}
                    <Button className="w-full h-11 rounded-2xl font-bold shadow-md shadow-primary/20" onClick={handleEmailNext} disabled={loading || !email.trim()}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continuar'}
                    </Button>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    ¿Ya tienes cuenta?{' '}
                    <button onClick={() => router.push('/login')} className="text-primary font-semibold hover:underline">Inicia sesión</button>
                  </p>
                </motion.div>
              )}

              {/* ── Step 2: Password ── */}
              {step === 'password' && (
                <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setStep('email')} className="text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <p className="text-sm font-semibold">Crea tu contraseña</p>
                      <p className="text-xs text-muted-foreground truncate">{email}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                      <Input
                        type="password"
                        placeholder="Contraseña (mín. 6 caracteres)"
                        autoComplete="new-password"
                        className="h-11 rounded-2xl pl-10 bg-white/70 dark:bg-white/[0.07] border-white/80 dark:border-white/[0.14] text-foreground placeholder:text-muted-foreground focus-visible:bg-white/90 dark:focus-visible:bg-white/[0.11]"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setPassError('') }}
                        disabled={loading}
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                      <Input
                        type="password"
                        placeholder="Confirmar contraseña"
                        autoComplete="new-password"
                        className="h-11 rounded-2xl pl-10 bg-white/70 dark:bg-white/[0.07] border-white/80 dark:border-white/[0.14] text-foreground placeholder:text-muted-foreground focus-visible:bg-white/90 dark:focus-visible:bg-white/[0.11]"
                        value={confirm}
                        onChange={e => { setConfirm(e.target.value); setPassError('') }}
                        onKeyDown={e => e.key === 'Enter' && handleRegister()}
                        disabled={loading}
                      />
                    </div>
                    {passError && <p className="text-xs text-destructive pl-1">{passError}</p>}
                    <Button className="w-full h-11 rounded-2xl font-bold shadow-md shadow-primary/20" onClick={handleRegister} disabled={loading || !password || !confirm}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear cuenta'}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Success ── */}
              {step === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="space-y-4 text-center">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-base">¡Cuenta creada!</p>
                    {company ? (
                      <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span>Vinculado a <span className="font-semibold text-foreground">{company.name}</span></span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">Redirigiendo al portal…</p>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Entrando al portal…
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-[11px] text-foreground/25 mt-5">
          <a href="https://vertxk.xyz/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground/50 transition-colors">
            Vertx System Add-on
          </a>
        </p>
      </motion.div>
    </div>
  )
}
