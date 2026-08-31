import { NextResponse, type NextRequest } from "next/server"

/**
 * Authentication Middleware for the Control Panel.
 * Supports both integrated Firebase Auth (ID tokens / cookies) and legacy HTTP Basic Auth fallback.
 *
 * Does NOT emit `WWW-Authenticate: Basic` header so browsers will never force the native Basic Auth popup.
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

function verifyBasicAuth(header: string): boolean {
  if (!basicAuthConfigured || !header.startsWith("Basic ")) return false
  try {
    const decoded = atob(header.slice(6))
    const sep = decoded.indexOf(":")
    if (sep === -1) return false
    return (
      safeEqual(decoded.slice(0, sep), USER as string) &&
      safeEqual(decoded.slice(sep + 1), PASSWORD as string)
    )
  } catch {
    return false
  }
}

export function middleware(req: NextRequest) {
  const firebaseToken = req.cookies.get("firebaseToken")?.value
  const authHeader = req.headers.get("authorization") ?? ""

  // 1. Authenticated via Firebase ID token (cookie or Bearer header)
  if (firebaseToken || authHeader.startsWith("Bearer ")) {
    return NextResponse.next()
  }

  // 2. Authenticated via Basic Auth header
  if (authHeader.startsWith("Basic ")) {
    if (verifyBasicAuth(authHeader)) {
      return NextResponse.next()
    }
    return NextResponse.json({ error: "Invalid Basic Auth credentials" }, { status: 401 })
  }

  // 3. For API routes, enforce auth if configured
  const pathname = req.nextUrl.pathname
  if (pathname.startsWith("/api/")) {
    const isAuthRequired = basicAuthConfigured || Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
    if (isAuthRequired) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in via Firebase Auth or supply Basic Auth credentials." },
        { status: 401 }
      )
    }
  }

  // 4. For page routes, render HTML so user can log in via Firebase Auth UI
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.well-known).*)"],
}

