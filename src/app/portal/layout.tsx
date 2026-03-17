"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldCheck } from "lucide-react"
import { useAppUser } from "@/hooks/use-app-user"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { NotificationBanner } from "@/components/PWASetup"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { appUser, loading } = useAppUser()
  const router = useRouter()
  const auth   = useAuth()

  useEffect(() => {
    if (loading) return
    if (!appUser) {
      router.push("/login")
      return
    }
    // Admins don't belong in the portal
    if (appUser.role === 'admin') {
      router.push("/dashboard")
    }
  }, [appUser, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!appUser || appUser.role === 'admin') return null

  return (
    <>
      <NotificationBanner />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-black tracking-wide uppercase text-foreground">ViñoPlastic</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Portal Contratista</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{appUser.email}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
              onClick={() => auth && signOut(auth)}
            >
              Cerrar sesión
            </Button>
          </div>
        </header>
        <main className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
          {children}
        </main>
      </div>
    </>
  )
}
