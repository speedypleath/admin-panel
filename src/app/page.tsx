"use client"

import { useEffect, useState } from "react"

import { ServicesTab } from "@/components/ServicesTab"
import { Sidebar, type TabId } from "@/components/Sidebar"
import { SystemTab } from "@/components/SystemTab"
import { FilesTab } from "@/components/FilesTab"
import { ServerlessTab } from "@/components/ServerlessTab"
import { BookmarksTab } from "@/components/BookmarksTab"
import { ActionsTab } from "@/components/ActionsTab"
import { LoginModal } from "@/components/LoginModal"
import { cx, formatAgo } from "@/components/format"
import type { ServerlessResponse, ServicesResponse, SystemSnapshot } from "@/types"

type Poll<T> = { data: T | null; error: string | null; updatedAt: number | null }

function usePoll<T>(url: string, intervalMs: number): Poll<T> {
  const [state, setState] = useState<Poll<T>>({ data: null, error: null, updatedAt: null })

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function tick() {
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal })
        if (!response.ok) throw new Error(`${url} responded ${response.status}`)
        const data = (await response.json()) as T
        if (!cancelled) setState({ data, error: null, updatedAt: Date.now() })
      } catch (error) {
        if (cancelled || controller.signal.aborted) return
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error.message : "Request failed",
        }))
      }
    }

    void tick()
    const timer = setInterval(() => void tick(), intervalMs)

    return () => {
      cancelled = true
      controller.abort()
      clearInterval(timer)
    }
  }, [url, intervalMs])

  return state
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

const PAGE_META: Record<TabId, { title: string; subtitle: string }> = {
  services: {
    title: "Services",
    subtitle: "Health of everything published on the tailnet.",
  },
  system: {
    title: "System",
    subtitle: "Live resource usage for this host.",
  },
  files: {
    title: "Files",
    subtitle: "Local and remote file management.",
  },
  serverless: {
    title: "Serverless",
    subtitle: "Health of hosted backends (Supabase and friends).",
  },
  bookmarks: {
    title: "Bookmarks",
    subtitle: "Handy links, grouped and one click away.",
  },
  actions: {
    title: "Actions",
    subtitle: "Execute bash commands and pre-defined scripts.",
  },
}

export default function Page() {
  const [tab, setTab] = useState<TabId>("services")
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const now = useNow()

  const system = usePoll<SystemSnapshot>("/api/system", 2500)
  const services = usePoll<ServicesResponse>("/api/services", 5000)
  const serverless = usePoll<ServerlessResponse>("/api/serverless", 15000)

  const active = tab === "services" ? services : tab === "serverless" ? serverless : system
  const meta = PAGE_META[tab]
  const isStale = active.updatedAt !== null && now - active.updatedAt > 15_000
  const osLabel = system.data
    ? `${system.data.os.distro} ${system.data.os.release}`.trim()
    : null

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        active={tab}
        onSelect={setTab}
        hostname={system.data?.hostname ?? null}
        uptimeSeconds={system.data?.uptimeSeconds ?? null}
        osLabel={osLabel}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <main className="min-w-0 flex-1">
        <header className="border-line-soft bg-bg/85 sticky top-0 z-10 border-b px-5 py-5 backdrop-blur-sm sm:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <h1 className="text-fg text-[22px] leading-tight font-semibold tracking-tight">
                {meta.title}
              </h1>
              <p className="text-muted mt-1 text-[13px]">{meta.subtitle}</p>
            </div>

            <p
              className="text-faint flex items-center gap-2 text-[11px]"
              aria-live="polite"
              aria-atomic="true"
            >
              <span
                className={cx(
                  "inline-block size-1.5 rounded-full",
                  active.error || isStale ? "bg-warn" : "bg-accent",
                )}
              />
              {active.updatedAt === null
                ? "Connecting…"
                : `Last updated ${formatAgo(active.updatedAt, now)}`}
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
          {tab === "services" ? (
            <ServicesTab data={services.data} error={services.error} now={now} />
          ) : tab === "system" ? (
            <SystemTab snapshot={system.data} error={system.error} />
          ) : tab === "serverless" ? (
            <ServerlessTab data={serverless.data} error={serverless.error} now={now} />
          ) : tab === "bookmarks" ? (
            <BookmarksTab />
          ) : tab === "actions" ? (
            <ActionsTab />
          ) : (
            <FilesTab />
          )}
        </div>
      </main>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  )
}
