"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2, LogOut, Moon, Sun, ChevronDown } from "lucide-react"
import { useAppUser } from "@/hooks/use-app-user"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { useTheme } from "next-themes"
import { NotificationBanner } from "@/components/PWASetup"
import "./portal-meta.css"

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
      <div className="portal-meta min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#0064e0]" />
      </div>
    )
  }

  if (!appUser || appUser.role === 'admin') return null

  const isDark = mounted && resolvedTheme === 'dark'
  const userInitial = (appUser.name || appUser.email || "U")[0].toUpperCase()

  return (
    <>
      <NotificationBanner />
      <div className="portal-meta min-h-screen">
        <header className="pm-header print:hidden">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="pm-caption-bold" style={{ color: 'var(--pm-slate)', letterSpacing: '0.08em' }}>
              VIÑOPLASTIC
            </span>
            <div className="w-px h-4 shrink-0" style={{ background: 'var(--pm-hairline-soft)' }} />
            <span className="pm-caption-bold hidden sm:inline" style={{ color: 'var(--pm-slate)', letterSpacing: '0.08em' }}>
              PLANTA QUERÉTARO
            </span>
          </div>

          <div className="flex-1" />

          {/* User dropdown trigger */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2"
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--pm-rounded-full)',
                border: '1px solid var(--pm-hairline-soft)',
                background: menuOpen ? 'var(--pm-surface-soft)' : 'var(--pm-canvas)',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--pm-ink-deep)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pm-on-ink-button)' }}>{userInitial}</span>
              </div>
              <span className="pm-body-sm hidden sm:block" style={{ color: 'var(--pm-ink)', maxWidth: 160 }} >
                {appUser.email}
              </span>
              <ChevronDown
                className="w-3.5 h-3.5"
                style={{
                  color: 'var(--pm-steel)',
                  transition: 'transform 0.2s',
                  transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)',
                }}
              />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 220,
                  background: 'var(--pm-canvas)',
                  border: '1px solid var(--pm-hairline-soft)',
                  borderRadius: 'var(--pm-rounded-xl)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
                  padding: '8px 0',
                  zIndex: 50,
                  overflow: 'hidden',
                }}
              >
                {/* User info */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--pm-hairline-soft)' }}>
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'var(--pm-ink-deep)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--pm-on-ink-button)' }}>{userInitial}</span>
                    </div>
                    <div className="min-w-0">
                      {appUser.name && (
                        <p className="pm-body-sm-bold truncate" style={{ color: 'var(--pm-ink-deep)' }}>
                          {appUser.name}
                        </p>
                      )}
                      <p className="pm-caption truncate" style={{ color: 'var(--pm-steel)' }}>
                        {appUser.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Theme toggle */}
                <button
                  onClick={() => {
                    setTheme(isDark ? 'light' : 'dark')
                    setMenuOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--pm-ink)',
                    fontFamily: 'var(--pm-font)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--pm-surface-soft)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  {mounted && isDark
                    ? <Sun className="w-4 h-4" style={{ color: 'var(--pm-steel)' }} />
                    : <Moon className="w-4 h-4" style={{ color: 'var(--pm-steel)' }} />
                  }
                  {mounted ? (isDark ? 'Tema claro' : 'Tema oscuro') : 'Cambiar tema'}
                </button>

                {/* Divider */}
                <div style={{ height: 1, background: 'var(--pm-hairline-soft)', margin: '4px 0' }} />

                {/* Logout */}
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    document.cookie = "vp_session=; path=/; max-age=0"
                    auth && signOut(auth)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--pm-critical)',
                    fontFamily: 'var(--pm-font)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220,38,38,0.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </>
  )
}
