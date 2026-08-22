export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { ftpDisconnect } from "@/lib/ftp"

export async function POST() {
  const result = ftpDisconnect()
  return NextResponse.json(result)
}
