
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Loader2, Wrench, HardHat, ShieldOff } from "lucide-react"
import { NotificationBanner } from "@/components/PWASetup"
import { useAppUser } from "@/hooks/use-app-user"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { motion, AnimatePresence } from "framer-motion"
import { useMaintenance } from "@/hooks/use-maintenance"
import { MealConfigProvider } from "@/hooks/use-meal-config"

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
    <MealConfigProvider>
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
            <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
              <div className="w-full max-w-md">
                <div className="rounded-3xl border border-border/60 bg-card shadow-sm dark:shadow-none p-8 sm:p-10 flex flex-col items-center gap-8 text-center">

                  {/* Íconos animados */}
                  <div className="flex items-end justify-center gap-3 sm:gap-4">
                    {/* Llave — principal */}
                    <div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center shadow-sm animate-bounce"
                      style={{ animationDelay: '0ms', animationDuration: '1.2s' }}
                    >
                      <Wrench className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600 dark:text-amber-400" />
                    </div>

                    {/* Casco */}
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-muted/80 dark:bg-muted/40 border border-border/60 flex items-center justify-center shadow-sm animate-bounce"
                      style={{ animationDelay: '180ms', animationDuration: '1.2s' }}
                    >
                      <HardHat className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground" />
                    </div>

                    {/* Bloqueo */}
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-muted/50 dark:bg-muted/20 border border-border/40 flex items-center justify-center shadow-sm animate-bounce"
                      style={{ animationDelay: '360ms', animationDuration: '1.2s' }}
                    >
                      <ShieldOff className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground/50" />
                    </div>
                  </div>

                  {/* Texto */}
                  <div className="space-y-3">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">En mantenimiento</h2>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      Esta sección está temporalmente fuera de servicio.
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      Vuelve en unos momentos.
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="w-12 h-px bg-border/60" />

                  {/* Badge */}
                  <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Mantenimiento
                  </span>

                </div>
              </div>
            </div>
          ) : children}
        </main>
      </SidebarInset>
    </SidebarProvider>
    </MealConfigProvider>
  )
}
