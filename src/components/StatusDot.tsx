import type { ServiceHealth } from "@/types"

import { cx } from "./format"

const TONE: Record<ServiceHealth, { dot: string; glow: string; label: string }> = {
  up: { dot: "bg-accent", glow: "shadow-[0_0_0_3px_rgba(45,212,167,0.14)]", label: "Online" },
  degraded: { dot: "bg-warn", glow: "shadow-[0_0_0_3px_rgba(251,191,36,0.14)]", label: "Degraded" },
  down: { dot: "bg-danger", glow: "shadow-[0_0_0_3px_rgba(248,113,113,0.14)]", label: "Offline" },
  unknown: { dot: "bg-faint", glow: "", label: "Unknown" },
}

export function healthLabel(health: ServiceHealth): string {
  return TONE[health].label
}

export function healthTextClass(health: ServiceHealth): string {
  switch (health) {
    case "up":
      return "text-accent"
    case "degraded":
      return "text-warn"
    case "down":
      return "text-danger"
    default:
      return "text-faint"
  }
}

export function StatusDot({ health, className }: { health: ServiceHealth; className?: string }) {
  const tone = TONE[health]
  return (
    <span
      role="img"
      aria-label={tone.label}
      className={cx("inline-block size-2 shrink-0 rounded-full", tone.dot, tone.glow, className)}
    />
  )
}
