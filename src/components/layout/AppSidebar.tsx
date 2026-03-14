
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
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "firebase/auth"
import { useAuth } from "@/firebase"

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

const navigation = [
  {
    title: "General",
    items: [
      { name: "Panel de Control", href: "/dashboard", icon: LayoutDashboard },
      { name: "Contratistas", href: "/contractors", icon: Users },
    ],
  },
  {
    title: "Operaciones",
    items: [
      { name: "Escáner de Acceso", href: "/scanner", icon: QrCode },
      { name: "Reportes", href: "/reports", icon: FileText },
      { name: "Configuración", href: "/settings", icon: Settings },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const auth = useAuth()

  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth)
      } catch (error) {
        console.error("Error signing out:", error)
      }
    }
  }

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
                        {pathname === item.href && (
                          <ChevronRight className="w-3 h-3 text-white/50" />
                        )}
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="hover:bg-destructive/10 hover:text-destructive text-white/80"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
