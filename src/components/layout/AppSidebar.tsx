"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Users,
  QrCode,
  FileText,
  LogOut,
  Settings,
  ShieldCheck,
  Shield,
  Briefcase,
  ClipboardList,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "firebase/auth"
import { doc, deleteDoc, collection, query, where } from "firebase/firestore"
import { useAuth, useFirestore, useUser } from "@/firebase"
import { useCollection } from "@/firebase/firestore/use-collection"
import { getFCMToken } from "@/firebase/messaging"
import { useAppUser } from "@/hooks/use-app-user"
import { motion, useMotionValue, useTransform } from "framer-motion"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { AnimatePresence } from "framer-motion"
import type { AppUser } from "@/types"

// ── Role config ───────────────────────────────────────────────
const ROLE_CONFIG = {
  admin:      { Icon: ShieldCheck, ring: 'ring-blue-400/60',  glow: 'shadow-blue-500/30',  label: 'Administrador'      },
  guard:      { Icon: Shield,      ring: 'ring-green-400/60', glow: 'shadow-green-500/30', label: 'Guardia de Seguridad' },
  contractor: { Icon: Briefcase,   ring: 'ring-orange-400/60',glow: 'shadow-orange-500/30',label: 'Contratista'        },
} as const

// ── UserCard ──────────────────────────────────────────────────
function UserCard({ appUser, onLogout }: { appUser: AppUser | null; onLogout: () => void }) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const mouseX  = useMotionValue(0)
  const mouseY  = useMotionValue(0)

  // Shimmer position — tracks mouse inside the card
  const shimmerBg = useTransform(
    [mouseX, mouseY],
    ([x, y]) =>
      `radial-gradient(120px circle at ${x}px ${y}px, rgba(255,255,255,0.07), transparent 70%)`,
  )

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  const role   = appUser?.role ?? 'admin'
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.admin
  const { Icon } = config

  const displayName = appUser?.name || appUser?.email?.split('@')[0] || '—'
  const displayRole = appUser?.position || config.label

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2.5 flex items-center gap-3 group"
    >
      {/* Liquid glass shimmer — follows cursor */}
      <motion.span
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: shimmerBg }}
      />

      {/* Role avatar */}
      <motion.div
        whileHover={{ scale: 1.08 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={`relative w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-white ring-2 ${config.ring} shadow-lg ${config.glow}`}
      >
        <Icon className="w-4 h-4" />
      </motion.div>

      {/* Name + role */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate leading-tight">
          {displayName}
        </p>
        <p className="text-[11px] text-white/50 truncate leading-tight">
          {displayRole}
        </p>
      </div>

      {/* Logout */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={onLogout}
        title="Cerrar sesión"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
      >
        <LogOut className="w-3.5 h-3.5" />
      </motion.button>
    </motion.div>
  )
}

export function AppSidebar() {
  const pathname       = usePathname()
  const auth           = useAuth()
  const db             = useFirestore()
  const { user }       = useUser()
  const { appUser }    = useAppUser()
  const isGuard        = appUser?.role === 'guard'

  const activeVisitsQuery = React.useMemo(() => {
    if (!db) return null
    return query(collection(db, 'visits'), where('status', '==', 'Active'))
  }, [db])

  const { data: activeVisits } = useCollection(activeVisitsQuery)
  const activeCount = activeVisits?.length ?? 0

  const handleLogout = async () => {
    if (!auth) return
    try {
      if (db && user) {
        const token = await getFCMToken().catch(() => null)
        if (token) {
          await deleteDoc(doc(db, 'users', user.uid, 'fcmTokens', token)).catch(() => {})
        }
      }
      document.cookie = "vp_session=; path=/; max-age=0"
      sessionStorage.removeItem('vp_login_recorded')
      sessionStorage.removeItem('vp_audit_unlocked')
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const navigation = isGuard
    ? [
        {
          title: "Acceso",
          items: [
            { name: "Escáner de QR", href: "/scanner", icon: QrCode, badge: null },
          ],
        },
      ]
    : [
        {
          title: "General",
          items: [
            { name: "Inicio", href: "/dashboard",   icon: LayoutDashboard, badge: activeCount || null },
            { name: "Proveedores",     href: "/contractors", icon: Users,            badge: null },
          ],
        },
        {
          title: "Operaciones",
          items: [
            { name: "Escáner de QR", href: "/scanner",  icon: QrCode,   badge: null },
            { name: "Reportes",          href: "/reports",  icon: FileText, badge: null },
            { name: "Configuración",     href: "/settings",  icon: Settings,       badge: null },
            { name: "Logs",          href: "/bitacora",  icon: ClipboardList,  badge: null },
          ],
        },
      ]

  return (
    <Sidebar className="border-r-0 shadow-xl">
      <div data-sidebar="header" className="flex flex-row items-center h-14 px-5 border-b border-white/10 shrink-0">
        <motion.span
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-base font-black tracking-widest text-white uppercase"
        >
          ViñoPlastic
        </motion.span>
      </div>

      <SidebarContent className="px-2">
        <motion.nav
          variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
          initial="hidden"
          animate="visible"
        >
          {navigation.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel className="text-white/40 font-bold px-3 pb-1 uppercase tracking-widest text-[9px]">
                {group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <motion.div
                        key={item.name}
                        variants={{
                          hidden:  { opacity: 0, x: -10 },
                          visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
                        }}
                      >
                        <Link
                          href={item.href}
                          className="relative flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer select-none outline-none"
                        >
                          {/* Sliding active pill */}
                          {isActive && (
                            <motion.span
                              layoutId="nav-active-pill"
                              className="absolute inset-0 rounded-xl bg-white/15"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}

                          {/* Hover layer */}
                          <motion.span
                            className="absolute inset-0 rounded-xl bg-white/0"
                            whileHover={{ backgroundColor: isActive ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,0.06)' }}
                            transition={{ duration: 0.15 }}
                          />

                          {/* Icon */}
                          <motion.span
                            className={`relative z-10 shrink-0 ${isActive ? 'text-white' : 'text-white/55'}`}
                            whileHover={{ scale: 1.12 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          >
                            <item.icon className="w-4 h-4" />
                          </motion.span>

                          {/* Label */}
                          <span className={`relative z-10 flex-1 text-sm font-medium truncate transition-colors duration-150 ${isActive ? 'text-white' : 'text-white/60'}`}>
                            {item.name}
                          </span>

                          {/* Badge */}
                          <AnimatePresence>
                            {item.badge != null && (
                              <motion.span
                                key="badge"
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.6, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className="relative z-10 h-5 min-w-5 px-1.5 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center leading-none tabular-nums"
                              >
                                {item.badge > 99 ? '99+' : item.badge}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </motion.nav>
      </SidebarContent>

      <SidebarFooter className="p-3 mt-auto border-t border-white/10">
        <UserCard appUser={appUser} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
