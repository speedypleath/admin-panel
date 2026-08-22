import { NextResponse } from "next/server"
import { ftpConnectDefault } from "@/lib/ftp"

export const dynamic = "force-dynamic"

export async function POST() {
  return NextResponse.json(await ftpConnectDefault())
}
