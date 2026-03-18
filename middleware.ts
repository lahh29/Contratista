import { NextRequest, NextResponse } from "next/server"

const PROTECTED = ["/dashboard", "/contractors", "/scanner", "/reports", "/settings", "/portal"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
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
