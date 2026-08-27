export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { HOME_DIR, listLocal } from "@/lib/fs"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pathParam = searchParams.get("path") || HOME_DIR
    const data = await listLocal(pathParam)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
