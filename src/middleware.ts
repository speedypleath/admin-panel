import { NextResponse, type NextRequest } from "next/server"

/**
 * HTTP Basic auth for the whole panel.
 *
 * The panel has no login screen, so any credential the browser holds is also
 * readable by anyone who can load the page. Basic auth is therefore the only
 * boundary that actually keeps a tailnet or LAN neighbour out of `/api/actions`,
 * which executes shell commands.
 *
 * Enforced whenever PANEL_AUTH_USER and PANEL_AUTH_PASSWORD are both set. When
 * they are not set the panel stays open, but the action executor refuses to run
 * (see src/app/api/actions/route.ts) so the dangerous surface fails closed.
 */
const USER = process.env.PANEL_AUTH_USER
const PASSWORD = process.env.PANEL_AUTH_PASSWORD

export const authConfigured = Boolean(USER && PASSWORD)

/** Length-aware equality so a wrong-length guess exits the same way. */
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
  if (!authConfigured) return NextResponse.next()

  const header = req.headers.get("authorization") ?? ""
  if (!header.startsWith("Basic ")) return challenge()

  let decoded: string
  try {
    decoded = atob(header.slice(6))
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

// Everything except Next's own static output, which carries no panel data.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
