import { NextResponse } from "next/server"
import {
  getAllBookmarks,
  saveBookmark,
  deleteBookmark,
  fetchUrlMetadata,
  triggerBookmarkWebhook,
} from "@/lib/bookmarks"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const bookmarks = await getAllBookmarks()
    return NextResponse.json({ bookmarks })
  } catch (error) {
    console.error("[GET /api/bookmarks error]", error)
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawUrl = body.url?.trim()
    if (!rawUrl) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    let normalizedUrl = rawUrl
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl
    }

    let name = body.name?.trim()
    let description = body.description?.trim()
    let category = body.category?.trim()

    // Auto-generate metadata via webhook/parser if name or description is missing or explicitly requested
    if (!name || !description || body.autoGenerate) {
      const meta = await fetchUrlMetadata(normalizedUrl)
      if (!name) name = meta.name
      if (!description) description = meta.description
      if (!category) category = meta.category
    }

    if (!category) category = "General"

    // Generate clean unique ID from hostname / title
    const id =
      body.id?.trim() ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 32) ||
      `bm-${Date.now().toString(36)}`

    const newBookmark = {
      id,
      name,
      url: normalizedUrl,
      description,
      category,
    }

    const saved = await saveBookmark(newBookmark)

    // Trigger webhook notification if webhookUrl provided in request or env
    await triggerBookmarkWebhook("created", saved, body.webhookUrl)

    return NextResponse.json({
      success: true,
      bookmark: saved,
    })
  } catch (error) {
    console.error("[POST /api/bookmarks error]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save bookmark" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    let id = searchParams.get("id")

    if (!id) {
      try {
        const body = await request.json()
        id = body.id
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: "Bookmark ID is required" }, { status: 400 })
    }

    const deleted = await deleteBookmark(id)
    return NextResponse.json({ success: deleted, id })
  } catch (error) {
    console.error("[DELETE /api/bookmarks error]", error)
    return NextResponse.json({ error: "Failed to delete bookmark" }, { status: 500 })
  }
}
