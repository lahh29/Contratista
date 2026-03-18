
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Separator } from "@/components/ui/separator"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { NotificationBanner } from "@/components/PWASetup"
import { useAppUser } from "@/hooks/use-app-user"
import { NotificationBell } from "@/components/layout/NotificationBell"

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
    } else if (appUser.role === 'guard' && pathname !== '/scanner') {
      // Guards only have access to /scanner
      router.replace("/scanner")
    }
  }, [appUser, loading, router, pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!appUser || appUser.role === 'contractor') return null

  return (
    <>
    <NotificationBanner />
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/50 backdrop-blur-md sticky top-0 z-10 px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              ViñoPlastic
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {appUser.role !== 'guard' && <NotificationBell />}
          </div>
        </header>
        <main className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
    </>
  )
}
