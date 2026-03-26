
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Loader2, Wrench } from "lucide-react"
import { NotificationBanner } from "@/components/PWASetup"
import { useAppUser } from "@/hooks/use-app-user"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { motion, AnimatePresence } from "framer-motion"
import { useMaintenance } from "@/hooks/use-maintenance"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { appUser, loading } = useAppUser()
  const router         = useRouter()
  const pathname       = usePathname()
  const disabledPages  = useMaintenance()

  useEffect(() => {
    if (loading) return
    if (!appUser) {
      router.push("/login")
    } else if (appUser.role === 'contractor') {
      router.push("/portal")
    } else if (appUser.role === 'guard' && pathname !== '/scanner' && pathname !== '/dashboard' && pathname !== '/bajas') {
      router.replace("/scanner")
    } else if (appUser.role === 'rys' && pathname !== '/bajas') {
      router.replace("/bajas")
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
      '/bajas':            'Personal de Baja',
      '/fumadores':        'Fumadores',
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

  const isPageDisabled = appUser.role !== 'admin' && disabledPages.includes(pathname)

  const contractorsTitle = appUser?.role === 'admin' ? 'Empresas' : appUser?.role === 'logistica' ? 'Clientes' : 'Proveedores'
  const PAGE_TITLES: Record<string, string> = {
    '/dashboard':        'Inicio',
    '/contractors':      contractorsTitle,
    '/contractors/new':  'Nueva Empresa',
    '/scanner':          'Escáner de Acceso',
    '/reports':          'Reportes',
    '/settings':         'Configuración',
    '/bitacora':         'Logs',
    '/contratos':        'Contratos',
    '/bajas':            'Personal de Baja',
    '/fumadores':        'Fumadores',
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
            <NotificationBell />
          </div>
        </motion.header>

        <main className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {isPageDisabled ? (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
              <div className="w-full max-w-sm">
                <div className="rounded-3xl border border-border/60 bg-card shadow-sm p-8 sm:p-10 flex flex-col items-center gap-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center">
                    <Wrench className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-black tracking-tight text-foreground">En mantenimiento</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Esta sección está temporalmente fuera de servicio.<br />Vuelve en unos momentos.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-full bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    No disponible
                  </span>
                </div>
              </div>
            </div>
          ) : children}
        </main>
      </SidebarInset>
    </SidebarProvider>
    </>
  )
}
