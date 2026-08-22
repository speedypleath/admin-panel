import { NextResponse } from "next/server"
import { fetchUrlMetadata, saveBookmark, triggerBookmarkWebhook } from "@/lib/bookmarks"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  return NextResponse.json({
    name: "Bookmark Generation Webhook API",
    description: "Webhook to parse URLs, generate name & short description, and register bookmarks into admin panel",
    endpoint: "POST /api/webhook/bookmark",
    sample_payload: {
      url: "https://firebase.google.com/docs",
      category: "Dev", // optional
      webhookUrl: "https://your-webhook-target.com/callback", // optional callback
      persist: true // optional, default true
    },
    curl_example: `curl -X POST http://127.0.0.1:8096/api/webhook/bookmark -H "Content-Type: application/json" -d '{"url":"https://firebase.google.com/docs"}'`
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawUrl = body.url || body.link || body.targetUrl
    if (!rawUrl) {
      return NextResponse.json({ error: "URL ('url') is required in JSON payload" }, { status: 400 })
    }

    let normalizedUrl = rawUrl.trim()
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl
    }

    // Generate metadata (name & short description)
    const meta = await fetchUrlMetadata(normalizedUrl)

    const name = body.name?.trim() || meta.name
    const description = body.description?.trim() || meta.description
    const category = body.category?.trim() || meta.category || "General"

    const id =
      body.id?.trim() ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 32) ||
      `bm-${Date.now().toString(36)}`

    const bookmark = {
      id,
      name,
      url: normalizedUrl,
      description,
      category,
    }

    const persist = body.persist !== false
    let saved = bookmark
    if (persist) {
      saved = await saveBookmark(bookmark)
    }

    // Forward/trigger external webhook if provided
    if (body.webhookUrl) {
      await triggerBookmarkWebhook("generated", saved, body.webhookUrl)
    }

    return NextResponse.json({
      success: true,
      generated: {
        name: saved.name,
        description: saved.description,
        category: saved.category,
        url: saved.url,
      },
      bookmark: saved,
    })
  } catch (error) {
    console.error("[POST /api/webhook/bookmark error]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
