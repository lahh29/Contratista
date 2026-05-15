import { NextRequest, NextResponse } from "next/server"

const PROTECTED = ["/dashboard", "/contractors", "/scanner", "/reports", "/settings", "/portal"]

/**
 * Rutas que SIEMPRE deben pasar incluso en modo mantenimiento:
 * - /maintenance (la propia página)
 * - assets / pwa
 * - /api/* (matcher ya excluye, pero se deja explícito por claridad)
 */
const MAINTENANCE_ALLOWLIST = [
  "/maintenance",
  "/icons",
  "/manifest",
  "/favicon",
  "/_next",
]

function isMaintenanceMode(): boolean {
  const flag = process.env.MAINTENANCE_MODE ?? process.env.NEXT_PUBLIC_MAINTENANCE_MODE
  return flag === "1" || flag === "true"
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Modo mantenimiento ──────────────────────────────────────────────
  // Activar con env: MAINTENANCE_MODE=1 (o NEXT_PUBLIC_MAINTENANCE_MODE=1)
  if (isMaintenanceMode()) {
    const isAllowed = MAINTENANCE_ALLOWLIST.some(p => pathname.startsWith(p))
    if (!isAllowed) {
      const url = req.nextUrl.clone()
      url.pathname = "/maintenance"
      url.search = ""
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // Si NO está en mantenimiento pero alguien intenta entrar a /maintenance,
  // mejor mandarlo al inicio para no confundir a usuarios.
  if (pathname === "/maintenance") {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // ── Auth gating ─────────────────────────────────────────────────────
  const isAuthed     = req.cookies.has("vp_session")
  const isProtected  = PROTECTED.some(p => pathname === p || pathname.startsWith(p + "/"))

  if (isProtected && !isAuthed) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  // Logged-in users that hit /login are sent to the app
  if (pathname === "/login" && isAuthed) {
    const from = req.nextUrl.searchParams.get("from")
    const url  = req.nextUrl.clone()
    url.pathname = from && PROTECTED.some(p => from.startsWith(p)) ? from : "/dashboard"
    url.searchParams.delete("from")
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icons|manifest|guia-usuario|favicon).*)"],
}
