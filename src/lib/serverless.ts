import type { ServerlessDefinition } from "@/config/serverless"
import { loadRecords } from "@/lib/panel-store"
import type { ServerlessResponse, ServerlessStatus, ServiceHealth } from "@/types"

const TIMEOUT_MS = 6000
// Above this, the backend answers but slowly enough to flag.
const SLOW_MS = 2000

function describeError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return `No response within ${TIMEOUT_MS}ms`
  }
  if (error instanceof Error) {
    const cause = (error as { cause?: { code?: string } }).cause
    if (cause?.code === "ECONNREFUSED") return "Connection refused"
    if (cause?.code === "ENOTFOUND") return "Host not found"
    if (cause?.code === "ECONNRESET") return "Connection reset"
    if (cause?.code) return cause.code
    return error.message
  }
  return "Unknown error"
}

async function checkProject(project: ServerlessDefinition): Promise<ServerlessStatus> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const startedAt = performance.now()

  const base = {
    id: project.id,
    provider: project.provider,
    name: project.name,
    description: project.description,
    projectUrl: project.projectUrl,
    dashboardUrl: project.dashboardUrl,
  }

  try {
    const probeUrl = project.healthUrl ?? project.projectUrl
    const response = await fetch(probeUrl, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: { accept: "*/*" },
    })
    const latencyMs = Math.round(performance.now() - startedAt)

    // Hosted gateways answer 401/404 to unauthenticated probes — that still
    // proves the project is reachable, so only 5xx or a timeout is a problem.
    let health: ServiceHealth = "up"
    let error: string | undefined
    if (response.status >= 500) {
      health = "degraded"
      error = `HTTP ${response.status} ${response.statusText}`.trim()
    } else if (latencyMs > SLOW_MS) {
      health = "degraded"
      error = `Slow response (${latencyMs}ms)`
    }

    return { ...base, health, latencyMs, checkedAt: Date.now(), ...(error ? { error } : {}) }
  } catch (error) {
    return {
      ...base,
      health: "down",
      latencyMs: null,
      checkedAt: Date.now(),
      error: describeError(error),
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function checkServerless(): Promise<ServerlessResponse> {
  const defined = await loadRecords<ServerlessDefinition>("serverless")
  const projects = await Promise.all(defined.map(checkProject))
  return { projects, checkedAt: Date.now() }
}
