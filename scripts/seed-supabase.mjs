#!/usr/bin/env node
/**
 * Pushes the gitignored data/*.json fallback into Supabase.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
 *
 * Idempotent: rows are upserted on their primary key.
 */
import fs from "fs/promises"
import path from "path"

const url = process.env.SUPABASE_URL?.replace(/\/+$/, "")
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
  process.exit(1)
}

const TABLES = {
  services: "panel_services",
  serverless: "panel_serverless",
  bookmarks: "panel_bookmarks",
}

for (const [kind, table] of Object.entries(TABLES)) {
  const file = path.join(process.cwd(), "data", `${kind}.json`)
  let rows
  try {
    rows = JSON.parse(await fs.readFile(file, "utf-8"))
  } catch {
    console.log(`- ${kind}: no ${file}, skipped`)
    continue
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`- ${kind}: empty, skipped`)
    continue
  }

  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  })

  if (!res.ok) {
    console.error(`- ${kind}: HTTP ${res.status} ${await res.text()}`)
    process.exitCode = 1
  } else {
    console.log(`- ${kind}: upserted ${rows.length} rows into ${table}`)
  }
}
