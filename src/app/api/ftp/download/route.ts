export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { ftpDownload } from "@/lib/ftp"

export async function POST(req: NextRequest) {
  try {
    const { remotePath, localDir } = await req.json()
    if (!remotePath || !localDir) return NextResponse.json({ error: "missing params" }, { status: 400 })
    
    const localPath = await ftpDownload(remotePath, localDir)
    return NextResponse.json({ ok: true, localPath })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
