// Supabase Edge Function: generate-bookmark
// Project Ref: <supabase-project-ref>
// Endpoint: https://<supabase-project-ref>.supabase.co/functions/v1/generate-bookmark

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function cleanHtml(raw: string): string {
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

function inferCategory(url: string, title: string): string {
  const text = `${url} ${title}`.toLowerCase()
  if (text.includes("shop") || text.includes("store") || text.includes("buy") || url.includes(".ro")) {
    return "Shops"
  }
  if (text.includes("print") || text.includes("maker") || text.includes("3d") || text.includes("stl") || text.includes("cad")) {
    return "Making"
  }
  if (text.includes("music") || text.includes("audio") || text.includes("synth") || text.includes("sound") || text.includes("strudel")) {
    return "Music"
  }
  if (text.includes("firebase") || text.includes("supabase") || text.includes("serverless") || text.includes("cloud") || text.includes("lambda")) {
    return "Cloud & Serverless"
  }
  if (text.includes("github") || text.includes("docs") || text.includes("api") || text.includes("dev") || text.includes("code") || text.includes("self-hosted") || text.includes("tailscale")) {
    return "Dev"
  }
  return "General"
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const { url: rawUrl } = await req.json()
    if (!rawUrl) {
      return new Response(JSON.stringify({ error: "Missing 'url' in JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let normalizedUrl = rawUrl.trim()
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl
    }

    let hostname = ""
    try {
      hostname = new URL(normalizedUrl).hostname.replace(/^www\./, "")
    } catch {
      hostname = normalizedUrl
    }

    let name = hostname
    let description = `Bookmark for ${hostname}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)

    try {
      const fetchRes = await fetch(normalizedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      })
      clearTimeout(timer)

      if (fetchRes.ok) {
        const html = await fetchRes.text()

        // Extract title
        const ogTitle = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:title["']/i)
        const twitterTitle = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i)
        const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)

        const rawTitle = ogTitle?.[1] || twitterTitle?.[1] || titleTag?.[1]
        if (rawTitle) {
          let cleanTitle = cleanHtml(rawTitle)
          if (cleanTitle.length > 50 && cleanTitle.includes(" - ")) {
            cleanTitle = cleanTitle.split(" - ")[0].trim()
          } else if (cleanTitle.length > 50 && cleanTitle.includes(" | ")) {
            cleanTitle = cleanTitle.split(" | ")[0].trim()
          }
          name = cleanTitle.slice(0, 80)
        }

        // Extract description
        const ogDesc = html.match(/<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:description["']/i)
        const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)
        const twitterDesc = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i)

        const rawDesc = ogDesc?.[1] || metaDesc?.[1] || twitterDesc?.[1]
        if (rawDesc) {
          description = cleanHtml(rawDesc).slice(0, 180)
        }
      }
    } catch {
      // Fall back to hostname defaults on network/fetch timeout
    }

    const category = inferCategory(normalizedUrl, name)

    return new Response(
      JSON.stringify({
        success: true,
        generated: {
          name,
          description,
          category,
          url: normalizedUrl,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
