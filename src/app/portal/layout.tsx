"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, LogOut } from "lucide-react"
import { useAppUser } from "@/hooks/use-app-user"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { NotificationBanner } from "@/components/PWASetup"
import "./portal-meta.css"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { appUser, loading } = useAppUser()
  const router = useRouter()
  const auth = useAuth()

  useEffect(() => {
    if (loading) return
    if (!appUser) { router.push("/login"); return }
    if (appUser.role === 'admin') router.push("/dashboard")
  }, [appUser, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-[#0064e0]" />
      </div>
    )
  }

  if (!appUser || appUser.role === 'admin') return null

  return (
    <>
      <NotificationBanner />
      <div className="portal-meta min-h-screen">
        {/* Header — Meta style: clean white, hairline border, 64px height */}
        <header className="pm-header print:hidden">
          <div className="flex items-center gap-3 shrink-0">
            <span className="pm-caption-bold" style={{ color: 'var(--pm-slate)', letterSpacing: '0.08em' }}>
              VIÑOPLASTIC
            </span>
            <div className="w-px h-4 shrink-0" style={{ background: 'var(--pm-hairline-soft)' }} />
            <span className="pm-caption-bold" style={{ color: 'var(--pm-slate)', letterSpacing: '0.08em' }}>
              PLANTA QUERÉTARO
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <span className="pm-caption hidden sm:block" style={{ color: 'var(--pm-steel)' }}>
              {appUser.email}
            </span>
            <button
              className="pm-btn-icon"
              title="Cerrar sesión"
              onClick={() => {
                document.cookie = "vp_session=; path=/; max-age=0"
                auth && signOut(auth)
              }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </>
  )
}
