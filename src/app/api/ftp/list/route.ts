export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { ftpList } from "@/lib/ftp"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const reqPath = searchParams.get("path") || "/"
    const result = await ftpList(reqPath)
    return NextResponse.json(result)
  } catch (err: any) {
    if (err.message === "not connected") {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
