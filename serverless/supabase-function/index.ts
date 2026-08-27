// Supabase Edge Function: generate-bookmark
// Deployed to project: <supabase-project-ref> (https://<supabase-project-ref>.supabase.co/functions/v1/generate-bookmark)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const reqStart = Date.now()
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  try {
    const { url } = await req.json()
    if (!url) {
      console.warn("[EdgeFunction] Missing 'url' in request body")
      return new Response(JSON.stringify({ error: "Missing 'url' in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log(`[EdgeFunction] Scraping metadata for ${url}`)
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
      },
    })

    const html = await res.text()
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)

    const name = (titleMatch ? titleMatch[1] : new URL(url).hostname).trim()
    const description = (descMatch ? descMatch[1] : `Resource at ${url}`).trim()

    const duration = Date.now() - reqStart
    console.log(`[EdgeFunction] Generated metadata for ${url} in ${duration}ms: title="${name}"`)

    return new Response(
      JSON.stringify({
        success: true,
        generated: {
          name,
          description,
          url,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  } catch (err) {
    console.error("[EdgeFunction] Error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
