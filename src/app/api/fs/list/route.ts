export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { listLocal } from "@/lib/fs"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pathParam = searchParams.get("path") || "/"
    const data = await listLocal(pathParam)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
