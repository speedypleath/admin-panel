import { cx, usageTone } from "./format"

const FILL: Record<ReturnType<typeof usageTone>, string> = {
  normal: "bg-fg/75",
  warn: "bg-warn",
  critical: "bg-danger",
}

export function UsageBar({
  percent,
  className,
  ariaLabel,
}: {
  percent: number
  className?: string
  ariaLabel?: string
}) {
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div
      role="meter"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx("bg-line-soft relative h-1.5 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className={cx("meter-fill h-full rounded-full", FILL[usageTone(clamped)])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

/** Vertical strip of per-core meters — reads like a channel meter, not a chart. */
export function CoreMeters({ cores }: { cores: number[] }) {
  if (cores.length === 0) {
    return <p className="text-faint text-xs">Per-core load unavailable on this host.</p>
  }

  return (
    <div className="flex h-12 w-full items-end gap-[3px]" aria-hidden="true">
      {cores.map((load, index) => {
        const clamped = Math.min(100, Math.max(0, load))
        return (
          <div
            key={index}
            title={`Core ${index}: ${clamped.toFixed(0)}%`}
            className="bg-line-soft relative flex h-full max-w-[9px] min-w-[3px] flex-1 items-end overflow-hidden rounded-[2px]"
          >
            <div
              className={cx("meter-fill-v w-full rounded-[2px]", FILL[usageTone(clamped)])}
              style={{ height: `${Math.max(3, clamped)}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}
