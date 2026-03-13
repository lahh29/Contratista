import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Separator } from "@/components/ui/separator"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/50 backdrop-blur-md sticky top-0 z-10 px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              SecureConnect Pro Management
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold ring-2 ring-accent/20 ring-offset-2 ring-offset-background cursor-pointer hover:scale-110 transition-transform">
              AD
            </div>
          </div>
        </header>
        <main className="p-6 md:p-8 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}