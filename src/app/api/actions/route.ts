import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(req: Request) {
  try {
    const { command } = await req.json()
    
    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "Invalid command" }, { status: 400 })
    }

    const { stdout, stderr } = await execAsync(command)
    return NextResponse.json({ stdout, stderr })
  } catch (err: unknown) {
    const e = err as Error & { stderr?: string }
    return NextResponse.json(
      { error: e.message || "Failed to execute command", stderr: e.stderr || "" },
      { status: 500 }
    )
  }
}
