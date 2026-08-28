import { NextResponse, type NextRequest } from "next/server"

/**
 * Authentication Middleware for the Control Panel.
 * Supports both Firebase Auth ID tokens / cookies and legacy HTTP Basic Auth fallback.
 */
const USER = process.env.PANEL_AUTH_USER
const PASSWORD = process.env.PANEL_AUTH_PASSWORD

export const basicAuthConfigured = Boolean(USER && PASSWORD)

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function challenge() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Control Panel", charset="UTF-8"' },
  })
}

export function middleware(req: NextRequest) {
  // Check Firebase token cookie first
  const firebaseToken = req.cookies.get("firebaseToken")?.value
  const authHeader = req.headers.get("authorization") ?? ""

  if (firebaseToken || authHeader.startsWith("Bearer ")) {
    // Authenticated via Firebase ID token
    return NextResponse.next()
  }

  // Basic auth check if configured
  if (basicAuthConfigured) {
    if (!authHeader.startsWith("Basic ")) return challenge()

    let decoded: string
    try {
      decoded = atob(authHeader.slice(6))
    } catch {
      return challenge()
    }

    const sep = decoded.indexOf(":")
    if (sep === -1) return challenge()

    const ok =
      safeEqual(decoded.slice(0, sep), USER as string) &&
      safeEqual(decoded.slice(sep + 1), PASSWORD as string)

    return ok ? NextResponse.next() : challenge()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.well-known).*)"],
}
