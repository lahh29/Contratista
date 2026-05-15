"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2, LogOut, Moon, Sun, ChevronDown } from "lucide-react"
import { useAppUser } from "@/hooks/use-app-user"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { useTheme } from "next-themes"
import { NotificationBanner } from "@/components/PWASetup"
import { cn } from "@/lib/utils"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { appUser, loading } = useAppUser()
  const router = useRouter()
  const auth = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (loading) return
    if (!appUser) { router.push("/login"); return }
    if (appUser.role === 'admin') router.push("/dashboard")
  }, [appUser, loading, router])

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!appUser || appUser.role === 'admin') return null

  const isDark = mounted && resolvedTheme === 'dark'
  const userInitial = (appUser.name || appUser.email || "U")[0].toUpperCase()

  return (
    <>
      <NotificationBanner />
      <div className="min-h-screen bg-background flex flex-col">
        {/* ── Header ─ misma escala tipográfica que el login ─ */}
        <header className="print:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-3">
            {/* Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] font-medium tracking-[0.16em] uppercase text-foreground">
                ViñoPlastic
              </span>
              <span className="hidden sm:inline-block w-px h-3 bg-border" />
              <span className="hidden sm:inline text-[11px] tracking-[0.16em] uppercase text-muted-foreground">
                Planta Querétaro
              </span>
            </div>

            <div className="flex-1" />

            {/* User dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={cn(
                  "flex items-center gap-2 rounded-full border border-border px-2 py-1 transition-colors",
                  menuOpen ? "bg-muted/60" : "bg-background hover:bg-muted/40",
                )}
              >
                <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-semibold">
                  {userInitial}
                </div>
                <span className="hidden sm:inline text-xs text-foreground max-w-[160px] truncate">
                  {appUser.email}
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground transition-transform",
                    menuOpen && "rotate-180",
                  )}
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] min-w-[240px] rounded-xl border border-border bg-background shadow-md p-1 z-50">
                  <div className="px-3 py-2.5 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        {appUser.name && (
                          <p className="text-sm font-medium text-foreground truncate">
                            {appUser.name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">
                          {appUser.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setTheme(isDark ? 'light' : 'dark')
                      setMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted/60 rounded-lg transition-colors"
                  >
                    {mounted && isDark
                      ? <Sun className="w-4 h-4 text-muted-foreground" />
                      : <Moon className="w-4 h-4 text-muted-foreground" />
                    }
                    {mounted ? (isDark ? 'Tema claro' : 'Tema oscuro') : 'Cambiar tema'}
                  </button>

                  <div className="h-px bg-border my-1" />

                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      document.cookie = "vp_session=; path=/; max-age=0"
                      auth && signOut(auth)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </>
  )
}
