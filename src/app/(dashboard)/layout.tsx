
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { NotificationBanner } from "@/components/PWASetup"
import { useAppUser } from "@/hooks/use-app-user"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { motion, AnimatePresence } from "framer-motion"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { appUser, loading } = useAppUser()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!appUser) {
      router.push("/login")
    } else if (appUser.role === 'contractor') {
      router.push("/portal")
    } else if (appUser.role === 'guard' && pathname !== '/scanner' && pathname !== '/dashboard') {
      router.replace("/scanner")
    }
  }, [appUser, loading, router, pathname])

  useEffect(() => {
    const PAGE_TITLES: Record<string, string> = {
      '/dashboard':        'Inicio',
      '/contractors':      'Proveedores',
      '/contractors/new':  'Nueva Empresa',
      '/scanner':          'Escáner de Acceso',
      '/reports':          'Reportes',
      '/settings':         'Configuración',
      '/bitacora':         'Bitácora',
    }
    document.title = PAGE_TITLES[pathname]
      ? `${PAGE_TITLES[pathname]} — ViñoPlastic`
      : 'ViñoPlastic'
  }, [pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!appUser || appUser.role === 'contractor') return null

  const PAGE_TITLES: Record<string, string> = {
    '/dashboard':        'Inicio',
    '/contractors':      'Proveedores',
    '/contractors/new':  'Nueva Empresa',
    '/scanner':          'Escáner de Acceso',
    '/reports':          'Reportes',
    '/settings':         'Configuración',
    '/bitacora':         'Logs',
  }
  const pageTitle = PAGE_TITLES[pathname] ?? 'ViñoPlastic'

  return (
    <>
    <NotificationBanner />
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <motion.header
          initial={{ y: -4, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-10 px-4"
        >
          {/* Sidebar toggle */}
          <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" />
          </motion.div>

          {/* Divider */}
          <div className="w-px h-4 bg-border/80 shrink-0" />

          {/* Dynamic page title */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1
                key={pathname}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="text-sm font-semibold text-foreground/70 uppercase tracking-wider truncate"
              >
                {pageTitle}
              </motion.h1>
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {appUser.role !== 'contractor' && <NotificationBell />}
          </div>
        </motion.header>

        <main className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
    </>
  )
}
