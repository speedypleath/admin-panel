import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

import type { ActionDefinition } from "@/config/actions"
import { loadRecords } from "@/lib/panel-store"

const execAsync = promisify(exec)

/** Hard stop so a hung command cannot pin the panel open indefinitely. */
const TIMEOUT_MS = 60_000
/** Cap captured output so a chatty command cannot exhaust memory. */
const MAX_OUTPUT_BYTES = 1024 * 1024

const authConfigured = Boolean(process.env.PANEL_AUTH_USER && process.env.PANEL_AUTH_PASSWORD)

export const dynamic = "force-dynamic"
export const revalidate = 0

/** Predefined action buttons. Commands are operator config, never source. */
export async function GET() {
  return NextResponse.json(await loadRecords<ActionDefinition>("actions"))
}

export async function POST(req: Request) {
  // The executor is the one route that can change the machine, so it fails
  // closed: without Basic auth configured there is nothing stopping a tailnet
  // or LAN neighbour from posting arbitrary shell commands here.
  if (!authConfigured) {
    return NextResponse.json(
      {
        error:
          "Command execution is disabled because the panel is unauthenticated. " +
          "Set PANEL_AUTH_USER and PANEL_AUTH_PASSWORD, then restart the panel.",
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
