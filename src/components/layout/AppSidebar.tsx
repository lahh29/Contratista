"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Users,
  QrCode,
  FileText,
  LogOut,
  ChevronRight,
  Settings,
  ShieldCheck,
  Shield,
  Briefcase,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "firebase/auth"
import { doc, deleteDoc, collection, query, where } from "firebase/firestore"
import { useAuth, useFirestore, useUser } from "@/firebase"
import { useCollection } from "@/firebase/firestore/use-collection"
import { getFCMToken } from "@/firebase/messaging"
import { useAppUser } from "@/hooks/use-app-user"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

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
            { name: "Configuración",     href: "/settings", icon: Settings, badge: null },
          ],
        },
      ]

  return (
    <Sidebar className="border-r-0 shadow-xl">
      <SidebarHeader className="p-6">
        <span className="text-lg font-black tracking-widest text-white uppercase">
          VIÑOPLASTIC
        </span>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-white/60 font-semibold px-4 py-2 uppercase tracking-wider text-[10px]">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      className="transition-all duration-200"
                    >
                      <Link href={item.href} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.badge != null && (
                            <span className="h-5 min-w-5 px-1 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                          {pathname === item.href && (
                            <ChevronRight className="w-3 h-3 text-white/50" />
                          )}
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 mt-auto border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-white">
            {appUser?.role === 'admin'      && <ShieldCheck className="w-4 h-4" />}
            {appUser?.role === 'guard'      && <Shield      className="w-4 h-4" />}
            {appUser?.role === 'contractor' && <Briefcase   className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {appUser?.name || appUser?.email?.split('@')[0] || '—'}
            </p>
            <p className="text-[11px] text-white/50 truncate leading-tight">
              {appUser?.position || (appUser?.role === 'admin' ? 'Administrador' : appUser?.role === 'guard' ? 'Guardia de Seguridad' : 'Contratista')}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
