"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, LogOut } from "lucide-react"
import { useAppUser } from "@/hooks/use-app-user"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { NotificationBanner } from "@/components/PWASetup"
import Image from "next/image"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { appUser, loading } = useAppUser()
  const router = useRouter()
  const auth   = useAuth()

  useEffect(() => {
    if (loading) return
    if (!appUser) { router.push("/login"); return }
    if (appUser.role === 'admin') router.push("/dashboard")
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
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 print:hidden">

          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/logo-vino-plastic.png"
              alt="ViñoPlastic"
              width={26}
              height={26}
              className="object-contain"
            />
            <span className="text-sm font-bold tracking-tight text-foreground">VIÑOPLASTIC</span>
            <div className="w-px h-4 bg-border/80 shrink-0" />
            <span className="text-xs text-muted-foreground font-medium">PLANTA QUERÉTARO</span>
          </div>

          <div className="flex-1" />

          {/* Email + logout */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground hidden sm:block mr-2">{appUser.email}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors rounded-lg"
              title="Cerrar sesión"
              onClick={() => {
                document.cookie = "vp_session=; path=/; max-age=0"
                auth && signOut(auth)
              }}
            >
              <LogOut className="w-4 h-4" />
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
