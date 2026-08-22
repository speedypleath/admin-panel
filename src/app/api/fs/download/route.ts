export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { Readable } from "stream"

function streamToReadableStream(stream: fs.ReadStream) {
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk))
      stream.on("end", () => controller.close())
      stream.on("error", (err) => controller.error(err))
    }
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reqPath = searchParams.get("path")
  if (!reqPath) return NextResponse.json({ error: "missing path" }, { status: 400 })
  
  try {
    const absPath = path.resolve(reqPath)
    const stat = await fs.promises.stat(absPath)
    if (!stat.isFile()) return NextResponse.json({ error: "not a file" }, { status: 400 })
    
    const stream = fs.createReadStream(absPath)
    const readable = streamToReadableStream(stream)
    
    return new NextResponse(readable, {
      headers: {
        "Content-Disposition": `attachment; filename="${path.basename(absPath)}"`,
        "Content-Length": stat.size.toString(),
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 })
  }
}
