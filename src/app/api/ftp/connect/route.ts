export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { ftpConnect } from "@/lib/ftp"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await ftpConnect(body)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
