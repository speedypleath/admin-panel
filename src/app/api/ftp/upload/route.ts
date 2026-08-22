export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { ftpUpload } from "@/lib/ftp"
import os from "os"
import path from "path"
import fs from "fs"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const remoteDir = formData.get("remoteDir") as string
    
    if (!file || !remoteDir) return NextResponse.json({ error: "missing params" }, { status: 400 })
    
    const tempPath = path.join(os.tmpdir(), `upload-${Date.now()}-${path.basename(file.name)}`)
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.promises.writeFile(tempPath, buffer)
    
    try {
      const remotePath = await ftpUpload(remoteDir, tempPath)
      return NextResponse.json({ ok: true, remotePath })
    } finally {
      await fs.promises.unlink(tempPath).catch(() => {})
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
