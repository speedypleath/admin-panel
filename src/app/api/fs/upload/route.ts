export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const dir = formData.get("dir") as string
    
    if (!file || !dir) return NextResponse.json({ error: "missing file or dir" }, { status: 400 })
    
    const absDir = path.resolve(dir)
    const destPath = path.join(absDir, path.basename(file.name))
    
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.promises.writeFile(destPath, buffer)
    
    return NextResponse.json({ ok: true, path: destPath })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
