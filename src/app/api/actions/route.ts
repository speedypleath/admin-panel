import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import { cookies, headers } from "next/headers"

import type { ActionDefinition } from "@/config/actions"
import { loadRecords } from "@/lib/panel-store"
import { verifyFirebaseToken } from "@/lib/firebase-admin"

const execAsync = promisify(exec)

/** Hard stop so a hung command cannot pin the panel open indefinitely. */
const TIMEOUT_MS = 60_000
/** Cap captured output so a chatty command cannot exhaust memory. */
const MAX_OUTPUT_BYTES = 1024 * 1024

const basicAuthConfigured = Boolean(process.env.PANEL_AUTH_USER && process.env.PANEL_AUTH_PASSWORD)

export const dynamic = "force-dynamic"
export const revalidate = 0

/** Predefined action buttons. Commands are operator config, never source. */
export async function GET() {
  return NextResponse.json(await loadRecords<ActionDefinition>("actions"))
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const firebaseCookieToken = cookieStore.get("firebaseToken")?.value
  const authHeader = headerStore.get("authorization") ?? ""
  let isAuthorized = false

  if (firebaseCookieToken) {
    const decoded = await verifyFirebaseToken(firebaseCookieToken)
    if (decoded) isAuthorized = true
  } else if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const decoded = await verifyFirebaseToken(token)
    if (decoded) isAuthorized = true
  } else if (basicAuthConfigured && authHeader.startsWith("Basic ")) {
    isAuthorized = true
  }

  // Fall back to allowing if basic auth or Firebase client env is set up
  if (!isAuthorized && !basicAuthConfigured && !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return NextResponse.json(
      {
        error:
          "Command execution is disabled because the panel is unauthenticated. " +
          "Configure Firebase Auth or set PANEL_AUTH_USER and PANEL_AUTH_PASSWORD.",
      },
      { status: 503 },
    )
  }

  try {
    const { command } = await req.json()

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "Invalid command" }, { status: 400 })
    }

    const { stdout, stderr } = await execAsync(command, {
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
    })
    return NextResponse.json({ stdout, stderr })
  } catch (err: unknown) {
    const e = err as Error & { stderr?: string; killed?: boolean; code?: string }
    const message = e.killed
      ? `Command timed out after ${TIMEOUT_MS / 1000}s`
      : e.message || "Failed to execute command"
    return NextResponse.json({ error: message, stderr: e.stderr || "" }, { status: 500 })
  }
}
