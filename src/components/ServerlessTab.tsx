import type { ServerlessResponse, ServerlessStatus } from "@/types"

import { ErrorBanner } from "./ErrorBanner"
import { Panel } from "./MetricCard"
import { Skeleton } from "./Skeleton"
import { StatusDot, healthLabel, healthTextClass } from "./StatusDot"
import { cx, formatAgo } from "./format"
import { ExternalIcon } from "./icons"

const PROVIDER_LABEL: Record<string, string> = {
  firebase: "Firebase",
  supabase: "Supabase",
  vercel: "Vercel",
  netlify: "Netlify",
  cloudflare: "Cloudflare",
  other: "Other",
}

function ProjectCard({ project }: { project: ServerlessStatus }) {
  const isUp = project.health === "up"

  return (
    <Panel className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <StatusDot health={project.health} className="mt-1.5" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-fg truncate text-[15px] font-medium">{project.name}</h3>
              <span className="border-line bg-surface-hi text-faint rounded-md border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                {PROVIDER_LABEL[project.provider] ?? project.provider}
              </span>
            </div>
            <p className="text-muted mt-0.5 text-[13px]">{project.description}</p>
          </div>
        </div>

        <span
          className={cx(
            "tnum border-line bg-surface-hi shrink-0 rounded-md border px-2 py-1 text-[11px]",
            isUp ? "text-accent" : healthTextClass(project.health),
          )}
        >
          {project.latencyMs === null ? healthLabel(project.health) : `${project.latencyMs}ms`}
        </span>
      </div>

      {project.error ? (
        <p className={cx("text-xs", healthTextClass(project.health))}>{project.error}</p>
      ) : null}

      <div className="border-line-soft flex items-center justify-between gap-3 border-t pt-3.5">
        <span className="text-faint tnum truncate text-[11px]" title={project.projectUrl}>
          {project.projectUrl.replace(/^https?:\/\//, "")}
        </span>
        <a
          href={project.dashboardUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-muted hover:text-accent inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium transition-colors"
        >
          Dashboard
          <ExternalIcon />
        </a>
      </div>
    </Panel>
  )
}

function Tally({ projects }: { projects: ServerlessStatus[] }) {
  const counts = {
    up: projects.filter((p) => p.health === "up").length,
    degraded: projects.filter((p) => p.health === "degraded").length,
    down: projects.filter((p) => p.health === "down").length,
  }

  return (
    <div className="text-muted flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
      <span className="inline-flex items-center gap-2">
        <StatusDot health="up" />
        <span className="tnum">{counts.up}</span> online
      </span>
      <span className="inline-flex items-center gap-2">
        <StatusDot health="degraded" />
        <span className="tnum">{counts.degraded}</span> degraded
      </span>
      <span className="inline-flex items-center gap-2">
        <StatusDot health="down" />
        <span className="tnum">{counts.down}</span> offline
      </span>
    </div>
  )
}

export function ServerlessTab({
  data,
  error,
  now,
}: {
  data: ServerlessResponse | null
  error: string | null
  now: number
}) {
  if (!data) {
    return (
      <div className="flex flex-col gap-5">
        {error ? <ErrorBanner title="Could not reach the health checker" detail={error} /> : null}
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          role="status"
          aria-label="Loading serverless projects"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="bg-surface border-line flex flex-col gap-4 rounded-[10px] border p-5"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (data.projects.length === 0) {
    return (
      <Panel className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <p className="text-fg text-sm font-medium">No serverless projects configured</p>
        <p className="text-muted max-w-sm text-[13px]">
          Add entries to <span className="text-fg">src/config/serverless.ts</span> and they will
          show up here on the next poll.
        </p>
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <ErrorBanner title="Health check failed — showing last known state" detail={error} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tally projects={data.projects} />
        <span className="text-faint text-[11px]">checked {formatAgo(data.checkedAt, now)}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
