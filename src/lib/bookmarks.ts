import { Pool } from "pg"
import fs from "fs/promises"
import path from "path"
import { BOOKMARKS, type BookmarkDefinition } from "@/config/bookmarks"

export interface StoredBookmark extends BookmarkDefinition {
  isCustom?: boolean
  createdAt?: number
}

const pool = new Pool({
  host: process.env.PGHOST ?? "127.0.0.1",
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD ?? "postgres",
  database: process.env.PGDATABASE ?? "admin_panel",
  max: 5,
  idleTimeoutMillis: 30000,
})

const FALLBACK_FILE = path.join(process.cwd(), "data", "bookmarks.json")
const DELETED_FALLBACK_FILE = path.join(process.cwd(), "data", "deleted_bookmarks.json")

async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS deleted_bookmarks (
        id VARCHAR(64) PRIMARY KEY,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
  } catch (err) {
    console.error("[bookmarks db init error]", err)
  }
}

// Initialize on first load
void ensureTable()

async function getDeletedBookmarkIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  try {
    const res = await pool.query<{ id: string }>(`SELECT id FROM deleted_bookmarks`)
    for (const row of res.rows) {
      ids.add(row.id)
    }
  } catch {}

  try {
    const raw = await fs.readFile(DELETED_FALLBACK_FILE, "utf-8")
    const list = JSON.parse(raw) as string[]
    if (Array.isArray(list)) {
      for (const id of list) {
        ids.add(id)
      }
    }
  } catch {}

  return ids
}

async function recordDeletedBookmarkId(id: string) {
  try {
    await ensureTable()
    await pool.query(
      `INSERT INTO deleted_bookmarks (id, deleted_at) VALUES ($1, NOW()) ON CONFLICT (id) DO NOTHING`,
      [id],
    )
  } catch (err) {
    console.error("[bookmarks db record deleted error]", err)
  }

  try {
    await fs.mkdir(path.dirname(DELETED_FALLBACK_FILE), { recursive: true })
    let list: string[] = []
    try {
      const raw = await fs.readFile(DELETED_FALLBACK_FILE, "utf-8")
      list = JSON.parse(raw)
      if (!Array.isArray(list)) list = []
    } catch {}
    if (!list.includes(id)) {
      list.push(id)
      await fs.writeFile(DELETED_FALLBACK_FILE, JSON.stringify(list, null, 2), "utf-8")
    }
  } catch (err) {
    console.error("[bookmarks json record deleted error]", err)
  }
}

async function unmarkDeletedBookmarkId(id: string) {
  try {
    await pool.query(`DELETE FROM deleted_bookmarks WHERE id = $1`, [id])
  } catch {}

  try {
    const raw = await fs.readFile(DELETED_FALLBACK_FILE, "utf-8")
    const list = JSON.parse(raw)
    if (Array.isArray(list)) {
      const filtered = list.filter((item) => item !== id)
      await fs.writeFile(DELETED_FALLBACK_FILE, JSON.stringify(filtered, null, 2), "utf-8")
    }
  } catch {}
}

async function getCustomBookmarksFromDb(): Promise<StoredBookmark[]> {
  try {
    const res = await pool.query<{
      id: string
      name: string
      url: string
      description: string
      category: string
      created_at: Date
    }>(`SELECT id, name, url, description, category, created_at FROM bookmarks ORDER BY created_at ASC`)
    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      description: row.description,
      category: row.category,
      isCustom: true,
      createdAt: new Date(row.created_at).getTime(),
    }))
  } catch (err) {
    console.warn("[bookmarks db read fallback to json]", err)
    return getCustomBookmarksFromJson()
  }
}

async function getCustomBookmarksFromJson(): Promise<StoredBookmark[]> {
  try {
    const raw = await fs.readFile(FALLBACK_FILE, "utf-8")
    const list = JSON.parse(raw) as StoredBookmark[]
    return list.map((item) => ({ ...item, isCustom: true }))
  } catch {
    return []
  }
}

async function saveCustomBookmarkToFallback(bookmark: StoredBookmark) {
  try {
    await fs.mkdir(path.dirname(FALLBACK_FILE), { recursive: true })
    const existing = await getCustomBookmarksFromJson()
    const updated = [...existing.filter((b) => b.id !== bookmark.id), bookmark]
    await fs.writeFile(FALLBACK_FILE, JSON.stringify(updated, null, 2), "utf-8")
  } catch (err) {
    console.error("[bookmarks json write error]", err)
  }
}

export async function getAllBookmarks(): Promise<StoredBookmark[]> {
  const [custom, deletedIds] = await Promise.all([
    getCustomBookmarksFromDb(),
    getDeletedBookmarkIds(),
  ])
  const customIds = new Set(custom.map((b) => b.id))
  const staticBookmarks = BOOKMARKS.filter(
    (b) => !customIds.has(b.id) && !deletedIds.has(b.id),
  ).map((b) => ({
    ...b,
    isCustom: false,
  }))
  const activeCustom = custom.filter((b) => !deletedIds.has(b.id))
  return [...staticBookmarks, ...activeCustom]
}

export async function saveBookmark(bookmark: BookmarkDefinition): Promise<StoredBookmark> {
  const customBookmark: StoredBookmark = {
    ...bookmark,
    isCustom: true,
    createdAt: Date.now(),
  }

  await unmarkDeletedBookmarkId(bookmark.id)

  try {
    await ensureTable()
    await pool.query(
      `INSERT INTO bookmarks (id, name, url, description, category, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         url = EXCLUDED.url,
         description = EXCLUDED.description,
         category = EXCLUDED.category`,
      [bookmark.id, bookmark.name, bookmark.url, bookmark.description, bookmark.category],
    )
  } catch (err) {
    console.error("[bookmarks db insert error]", err)
  }

  await saveCustomBookmarkToFallback(customBookmark)
  return customBookmark
}

export async function deleteBookmark(id: string): Promise<boolean> {
  let deleted = false
  try {
    const res = await pool.query(`DELETE FROM bookmarks WHERE id = $1`, [id])
    if ((res.rowCount ?? 0) > 0) {
      deleted = true
    }
  } catch (err) {
    console.error("[bookmarks db delete error]", err)
  }

  try {
    const existing = await getCustomBookmarksFromJson()
    const filtered = existing.filter((b) => b.id !== id)
    if (filtered.length !== existing.length) {
      await fs.writeFile(FALLBACK_FILE, JSON.stringify(filtered, null, 2), "utf-8")
      deleted = true
    }
  } catch {}

  // Record in deleted list so preset / static bookmarks also stay deleted
  await recordDeletedBookmarkId(id)
  deleted = true

  return deleted
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

const SUPABASE_EDGE_FUNCTION_URL =
  process.env.BOOKMARK_EDGE_FUNCTION_URL ||
  "https://<supabase-project-ref>.supabase.co/functions/v1/generate-bookmark"

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
