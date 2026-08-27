/**
 * Config store for panel data that is personal to the operator (which services
 * run on which tailnet, which cloud projects, which bookmarks).
 *
 * None of it lives in source. At runtime it is read from Supabase when
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, and otherwise from
 * gitignored JSON under data/ so the panel still works offline.
 */
import fs from "fs/promises"
import path from "path"

export type StoreKind = "services" | "serverless" | "bookmarks" | "actions"

const TABLES: Record<StoreKind, string> = {
  services: "panel_services",
  serverless: "panel_serverless",
  bookmarks: "panel_bookmarks",
  actions: "panel_actions",
}

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, "")
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DATA_DIR = process.env.PANEL_DATA_DIR ?? path.join(process.cwd(), "data")
const TIMEOUT_MS = 5000

export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY)

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_KEY as string,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  }
}

async function request(pathname: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: headers(init.headers as Record<string, string>),
    })
  } finally {
    clearTimeout(timer)
  }
}

function fileFor(kind: StoreKind) {
  return path.join(DATA_DIR, `${kind}.json`)
}

async function readFile<T>(kind: StoreKind): Promise<T[]> {
  try {
    const raw = await fs.readFile(fileFor(kind), "utf-8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

async function writeFile<T>(kind: StoreKind, records: T[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(fileFor(kind), JSON.stringify(records, null, 2), "utf-8")
}

/** All records of a kind, Supabase first with a JSON fallback. */
export async function loadRecords<T>(kind: StoreKind): Promise<T[]> {
  if (supabaseEnabled) {
    try {
      const res = await request(`${TABLES[kind]}?select=*&order=position.asc`)
      if (res.ok) return (await res.json()) as T[]
      console.warn(`[panel-store ${kind}] supabase HTTP ${res.status}, falling back to file`)
    } catch (error) {
      console.warn(`[panel-store ${kind}] supabase unreachable, falling back to file`, error)
    }
  }
  return readFile<T>(kind)
}

/** Upsert one record by primary key `id`, mirrored into the JSON fallback. */
export async function upsertRecord<T extends { id: string }>(
  kind: StoreKind,
  record: T,
): Promise<T> {
  if (supabaseEnabled) {
    try {
      const res = await request(TABLES[kind], {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(record),
      })
      if (!res.ok) console.error(`[panel-store ${kind}] upsert HTTP ${res.status}`)
    } catch (error) {
      console.error(`[panel-store ${kind}] upsert failed`, error)
    }
  }

  const existing = await readFile<T>(kind)
  await writeFile(kind, [...existing.filter((item) => item.id !== record.id), record])
  return record
}

/** Delete one record by id from both Supabase and the JSON fallback. */
export async function deleteRecord(kind: StoreKind, id: string): Promise<boolean> {
  let deleted = false

  if (supabaseEnabled) {
    try {
      const res = await request(`${TABLES[kind]}?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      deleted = res.ok
    } catch (error) {
      console.error(`[panel-store ${kind}] delete failed`, error)
    }
  }

  const existing = await readFile<{ id: string }>(kind)
  const filtered = existing.filter((item) => item.id !== id)
  if (filtered.length !== existing.length) {
    await writeFile(kind, filtered)
    deleted = true
  }

  return deleted
}
