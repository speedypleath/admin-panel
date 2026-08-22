import { SERVICES } from "@/config/services"
import type { ServiceHealth, ServiceStatus, ServicesResponse } from "@/types"

const TIMEOUT_MS = 4000
// Above this, the service answers but slowly enough that it is worth flagging.
const SLOW_MS = 1500

function describeError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return `No response within ${TIMEOUT_MS}ms`
  }
  if (error instanceof Error) {
    const cause = (error as { cause?: { code?: string } }).cause
    if (cause?.code === "ECONNREFUSED") return "Connection refused"
    if (cause?.code === "ENOTFOUND") return "Host not found"
    if (cause?.code) return cause.code
    return error.message
  }
  return "Unknown error"
}

async function checkService(service: (typeof SERVICES)[number]): Promise<ServiceStatus> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const startedAt = performance.now()

  const base = {
    id: service.id,
    name: service.name,
    description: service.description,
    localUrl: service.localUrl,
    tailnetUrl: service.tailnetUrl,
  }

  try {
    const probeUrl = service.healthUrl ?? service.localUrl
    const response = await fetch(probeUrl, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: { accept: "*/*" },
    })
    const latencyMs = Math.round(performance.now() - startedAt)

    let health: ServiceHealth = "up"
    let error: string | undefined
    if (!response.ok) {
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

export async function checkServices(): Promise<ServicesResponse> {
  const services = await Promise.all(SERVICES.map(checkService))
  return { services, checkedAt: Date.now() }
}
