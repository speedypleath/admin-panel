import { type BookmarkDefinition } from "@/config/bookmarks"
import { deleteRecord, loadRecords, upsertRecord } from "@/lib/panel-store"

export interface StoredBookmark extends BookmarkDefinition {
  isCustom?: boolean
  createdAt?: number
}

export async function getAllBookmarks(): Promise<StoredBookmark[]> {
  const stored = await loadRecords<StoredBookmark>("bookmarks")
  const seen = new Set<string>()
  return stored.filter((bookmark) => {
    if (seen.has(bookmark.id)) return false
    seen.add(bookmark.id)
    return true
  })
}

export async function saveBookmark(bookmark: BookmarkDefinition): Promise<StoredBookmark> {
  const stored: StoredBookmark = { ...bookmark, isCustom: true, createdAt: Date.now() }
  await upsertRecord("bookmarks", stored)
  return stored
}

export async function deleteBookmark(id: string): Promise<boolean> {
  return deleteRecord("bookmarks", id)
}

function cleanHtmlText(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function inferCategoryFromUrl(rawUrl: string, title: string): string {
  const urlLower = rawUrl.toLowerCase()
  const textLower = (rawUrl + " " + title).toLowerCase()

  if (textLower.includes("shop") || textLower.includes("store") || textLower.includes("buy") || urlLower.includes(".ro")) {
    return "Shops"
  }
  if (textLower.includes("print") || textLower.includes("maker") || textLower.includes("3d") || textLower.includes("stl") || textLower.includes("cad")) {
    return "Making"
  }
  if (textLower.includes("music") || textLower.includes("audio") || textLower.includes("sound") || textLower.includes("synth") || textLower.includes("strudel")) {
    return "Music"
  }
  if (textLower.includes("firebase") || textLower.includes("supabase") || textLower.includes("serverless") || textLower.includes("cloud") || textLower.includes("lambda")) {
    return "Cloud & Serverless"
  }
  if (
    textLower.includes("github") ||
    textLower.includes("docs") ||
    textLower.includes("api") ||
    textLower.includes("developer") ||
    textLower.includes("code") ||
    textLower.includes("self-hosted") ||
    textLower.includes("linux") ||
    textLower.includes("tailscale")
  ) {
    return "Dev"
  }
  return "General"
}

// Optional: set BOOKMARK_EDGE_FUNCTION_URL (or SUPABASE_URL, from which the
// function URL is derived) to enrich bookmarks via the Supabase edge function.
// Without it we fall back to scraping the page directly.
const SUPABASE_EDGE_FUNCTION_URL =
  process.env.BOOKMARK_EDGE_FUNCTION_URL ||
  (process.env.SUPABASE_URL
    ? `${process.env.SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/generate-bookmark`
    : "")

export async function fetchUrlMetadata(targetUrl: string): Promise<{
  name: string
  description: string
  category: string
}> {
  let normalized = targetUrl.trim()
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = "https://" + normalized
  }

  let hostname = ""
  try {
    hostname = new URL(normalized).hostname.replace(/^www\./, "")
  } catch {
    hostname = normalized
  }

  // 1. First attempt: Delegate to Supabase Edge Function (low latency, fast cold start)
  try {
    if (!SUPABASE_EDGE_FUNCTION_URL) throw new Error("edge function not configured")

    const edgeController = new AbortController()
    const edgeTimer = setTimeout(() => edgeController.abort(), 3500)

    const edgeRes = await fetch(SUPABASE_EDGE_FUNCTION_URL, {
      method: "POST",
      signal: edgeController.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: normalized }),
    })
    clearTimeout(edgeTimer)

    if (edgeRes.ok) {
      const data = await edgeRes.json()
      if (data?.generated?.name) {
        return {
          name: data.generated.name,
          description: data.generated.description || `${data.generated.name} (${hostname})`,
          category: data.generated.category || inferCategoryFromUrl(normalized, data.generated.name),
        }
      }
    }
  } catch (err) {
    // Edge function unreachable or not yet deployed - gracefully continue to direct scrape
  }

  // 2. Fallback: Direct metadata extraction
  let name = hostname
  let description = `Bookmark for ${hostname}`
  const category = inferCategoryFromUrl(normalized, name)

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(normalized, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    })
    clearTimeout(timer)

    if (res.ok) {
      const html = await res.text()

      // Extract title
      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i)
      const twitterTitleMatch = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i)
      const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)

      const extractedTitle = ogTitleMatch?.[1] || twitterTitleMatch?.[1] || titleTagMatch?.[1]
      if (extractedTitle) {
        let cleanTitle = cleanHtmlText(extractedTitle)
        if (cleanTitle.length > 50 && cleanTitle.includes(" - ")) {
          cleanTitle = cleanTitle.split(" - ")[0].trim()
        } else if (cleanTitle.length > 50 && cleanTitle.includes(" | ")) {
          cleanTitle = cleanTitle.split(" | ")[0].trim()
        }
        name = cleanTitle.slice(0, 80)
      }

      // Extract description
      const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i)
      const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)
      const twitterDescMatch = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i)

      const extractedDesc = ogDescMatch?.[1] || metaDescMatch?.[1] || twitterDescMatch?.[1]
      if (extractedDesc) {
        description = cleanHtmlText(extractedDesc).slice(0, 160)
      } else if (name) {
        description = `${name} (${hostname})`
      }
    }
  } catch (err) {
    console.warn(`[metadata fetch failed for ${normalized}]`, err)
  }

  return {
    name: name || hostname,
    description: description || `Resource at ${hostname}`,
    category: inferCategoryFromUrl(normalized, name),
  }
}

export async function triggerBookmarkWebhook(
  event: "created" | "deleted" | "generated",
  bookmark: BookmarkDefinition,
  webhookUrl?: string,
) {
  const targetWebhook = webhookUrl || process.env.BOOKMARK_WEBHOOK_URL
  if (!targetWebhook) return

  try {
    await fetch(targetWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: `bookmark.${event}`,
        timestamp: Date.now(),
        bookmark,
      }),
    })
  } catch (err) {
    console.error("[bookmark webhook dispatch failed]", err)
  }
}
