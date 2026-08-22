// Firebase Cloud Function (v2): generateBookmarkMeta
// Deployed to project: <firebase-project-id> (https://console.firebase.google.com/project/<firebase-project-id>)

const { onRequest } = require("firebase-functions/v2/https")
const axios = require("axios")

exports.generateBookmarkMeta = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" })
    return
  }

  const { url } = req.body
  if (!url) {
    res.status(400).json({ error: "Missing 'url' in body" })
    return
  }

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
      },
      timeout: 5000,
    })

    const html = response.data
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)

    const name = (titleMatch ? titleMatch[1] : new URL(url).hostname).trim()
    const description = (descMatch ? descMatch[1] : `Resource at ${url}`).trim()

    res.json({
      success: true,
      generated: {
        name,
        description,
        url,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
