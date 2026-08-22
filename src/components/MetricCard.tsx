import type { ReactNode } from "react"

import { cx } from "./format"

export function Panel({
  children,
  className,
  accent = false,
}: {
  children: ReactNode
  className?: string
  accent?: boolean
}) {
  return (
    <section
      className={cx(
        "bg-surface border-line relative rounded-[10px] border",
        // A single hairline of accent along the top edge marks the lead panel.
        accent && "before:bg-accent/70 before:absolute before:inset-x-4 before:-top-px before:h-px",
        className,
      )}
    >
      {children}
    </section>
  )
}

export function MetricCard({
  label,
  value,
  unit,
  hint,
  children,
  accent = false,
  className,
}: {
  label: string
  value?: ReactNode
  unit?: string
  hint?: ReactNode
  children?: ReactNode
  accent?: boolean
  className?: string
}) {
  return (
    <Panel accent={accent} className={cx("flex flex-col gap-4 p-5", className)}>
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="label">{label}</h3>
        {hint ? <span className="text-faint text-xs tnum">{hint}</span> : null}
      </header>

      {value !== undefined ? (
        <p className="flex items-baseline gap-1.5">
          <span className="tnum text-fg text-[34px] leading-none font-medium tracking-tight">
            {value}
          </span>
          {unit ? <span className="text-muted text-sm">{unit}</span> : null}
        </p>
      ) : null}

      {children}
    </Panel>
  )
}
