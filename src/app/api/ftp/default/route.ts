import { NextResponse } from "next/server"
import { getDefaultFtpInfo } from "@/lib/ftp"

export const dynamic = "force-dynamic"

export async function GET() {
  const info = getDefaultFtpInfo()
  if (!info) return NextResponse.json({ error: "no default connection configured" }, { status: 404 })
  return NextResponse.json(info)
}
