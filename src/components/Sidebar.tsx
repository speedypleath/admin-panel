import type { ComponentType, SVGProps } from "react"

import { cx, formatUptimeShort } from "./format"
import { ServicesIcon, SystemIcon, Wordmark, FolderIcon, ServerlessIcon, BookmarkIcon } from "./icons"

export type TabId = "services" | "system" | "files" | "serverless" | "bookmarks"

const NAV: { id: TabId; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: "services", label: "Services", Icon: ServicesIcon },
  { id: "system", label: "System", Icon: SystemIcon },
  { id: "files", label: "Files", Icon: FolderIcon },
  { id: "serverless", label: "Serverless", Icon: ServerlessIcon },
  { id: "bookmarks", label: "Bookmarks", Icon: BookmarkIcon },
]

export function Sidebar({
  active,
  onSelect,
  hostname,
  uptimeSeconds,
  osLabel,
}: {
  active: TabId
  onSelect: (tab: TabId) => void
  hostname: string | null
  uptimeSeconds: number | null
  osLabel: string | null
}) {
  return (
    <aside className="bg-rail border-line sticky top-0 flex h-dvh w-[68px] shrink-0 flex-col border-r lg:w-[236px]">
      <div className="flex h-16 items-center justify-center border-b border-line-soft lg:justify-start lg:px-5">
        <Wordmark className="text-accent shrink-0" />
        <span className="ml-3 hidden text-[13px] font-semibold tracking-[0.16em] uppercase lg:inline">
          Control
          <span className="text-faint font-normal"> Panel</span>
        </span>
      </div>

      <nav aria-label="Sections" className="flex flex-col gap-1 px-2 py-4 lg:px-3">
        {NAV.map(({ id, label, Icon }) => {
          const isActive = id === active
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={isActive ? "page" : undefined}
              title={label}
              className={cx(
                "flex h-10 items-center rounded-lg text-sm transition-colors",
                "justify-center lg:justify-start lg:px-3",
                isActive
                  ? "bg-accent/8 text-accent"
                  : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <Icon className="shrink-0" />
              <span className="ml-3 hidden font-medium lg:inline">{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-line-soft px-2 py-4 lg:px-5">
        <dl className="hidden flex-col gap-2.5 lg:flex">
          <div>
            <dt className="label">Host</dt>
            <dd className="text-fg mt-1 truncate text-[13px]" title={hostname ?? undefined}>
              {hostname ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="label">Uptime</dt>
            <dd className="tnum text-muted mt-1 text-[13px]">
              {uptimeSeconds === null ? "—" : formatUptimeShort(uptimeSeconds)}
            </dd>
          </div>
          {osLabel ? (
            <div>
              <dt className="label">Platform</dt>
              <dd className="text-muted mt-1 truncate text-[13px]" title={osLabel}>
                {osLabel}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="flex flex-col items-center gap-1 lg:hidden">
          <span className="label">Up</span>
          <span className="tnum text-muted text-[11px]">
            {uptimeSeconds === null ? "—" : formatUptimeShort(uptimeSeconds)}
          </span>
        </div>
      </div>
    </aside>
  )
}
