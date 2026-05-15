"use client"

import Link from "next/link"
import { Compass, Home, ArrowLeft } from "lucide-react"

import { StatusShell } from "@/components/status/StatusShell"

export default function NotFound() {
  return (
    <StatusShell
      eyebrow="ViñoPlastic"
      tone="muted"
      icon={<Compass className="w-6 h-6" />}
      title="Página no encontrada"
      description="La ruta que buscas no existe o fue movida. Verifica el enlace o vuelve al inicio."
    >
      <Link
        href="/dashboard"
        className="flex items-center justify-center gap-2 w-full h-10 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Home className="w-4 h-4" />
        Ir al inicio
      </Link>
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 w-full h-10 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio de sesión
      </Link>
    </StatusShell>
  )
}
