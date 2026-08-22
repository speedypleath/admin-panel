const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const

/** Splits a byte count into a rounded value and its unit, for separate styling. */
export function splitBytes(bytes: number): { value: string; unit: string } {
  if (!Number.isFinite(bytes) || bytes <= 0) return { value: "0", unit: "B" }
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1)
  const scaled = bytes / 1024 ** exponent
  const decimals = scaled >= 100 || exponent === 0 ? 0 : scaled >= 10 ? 1 : 2
  return { value: scaled.toFixed(decimals), unit: BYTE_UNITS[exponent] }
}

export function formatBytes(bytes: number): string {
  const { value, unit } = splitBytes(bytes)
  return `${value} ${unit}`
}

export function formatRate(bytesPerSec: number): { value: string; unit: string } {
  const { value, unit } = splitBytes(bytesPerSec)
  return { value, unit: `${unit}/s` }
}

export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—"
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m ${Math.floor(seconds % 60)}s`
}

/** Compact uptime for the sidebar footer, where horizontal space is scarce. */
export function formatUptimeShort(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—"
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h`
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatAgo(timestamp: number | null, now: number): string {
  if (!timestamp) return "never"
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—"
  return value.toFixed(decimals)
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value))
}

/** Neutral until it matters: bars only take on colour once usage is notable. */
export function usageTone(percent: number): "normal" | "warn" | "critical" {
  if (percent >= 90) return "critical"
  if (percent >= 75) return "warn"
  return "normal"
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ")
}
