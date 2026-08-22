import type { SystemSnapshot } from "@/types"

import { ErrorBanner } from "./ErrorBanner"
import { MetricCard, Panel } from "./MetricCard"
import { GridSkeleton } from "./Skeleton"
import { CoreMeters, UsageBar } from "./UsageBar"
import {
  cx,
  formatBytes,
  formatCount,
  formatPercent,
  formatRate,
  formatUptime,
  splitBytes,
  usageTone,
} from "./format"

function loadTone(value: number, threads: number): string {
  if (threads <= 0) return "text-fg"
  const ratio = value / threads
  if (ratio >= 1) return "text-danger"
  if (ratio >= 0.7) return "text-warn"
  return "text-fg"
}

function CpuCard({ snapshot }: { snapshot: SystemSnapshot }) {
  const { cpu } = snapshot
  return (
    <MetricCard
      label="CPU load"
      value={formatPercent(cpu.usagePercent)}
      unit="%"
      hint={`${cpu.cores}C / ${cpu.threads}T`}
      accent
    >
      <CoreMeters cores={cpu.perCore} />
      <p className="text-faint truncate text-xs" title={cpu.model}>
        {cpu.model}
      </p>
    </MetricCard>
  )
}

function MemoryCard({ snapshot }: { snapshot: SystemSnapshot }) {
  const { mem } = snapshot
  const used = splitBytes(mem.usedBytes)
  return (
    <MetricCard
      label="Memory"
      value={used.value}
      unit={`${used.unit} used`}
      hint={`${formatPercent(mem.usagePercent, 0)}%`}
    >
      <UsageBar percent={mem.usagePercent} ariaLabel="Memory usage" />
      <dl className="text-muted flex justify-between text-xs">
        <div className="flex gap-1.5">
          <dt className="text-faint">Free</dt>
          <dd className="tnum">{formatBytes(mem.freeBytes)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-faint">Total</dt>
          <dd className="tnum">{formatBytes(mem.totalBytes)}</dd>
        </div>
      </dl>
    </MetricCard>
  )
}

function UptimeCard({ snapshot }: { snapshot: SystemSnapshot }) {
  return (
    <MetricCard label="Uptime" value={formatUptime(snapshot.uptimeSeconds)} hint={`${snapshot.os.distro} ${snapshot.os.release} · ${snapshot.os.arch}`}>
      <p className="text-faint text-xs">since boot</p>
    </MetricCard>
  )
}

function LoadCard({ snapshot }: { snapshot: SystemSnapshot }) {
  const windows = ["1 min", "5 min", "15 min"]
  return (
    <MetricCard label="Load average" hint={`${snapshot.cpu.threads} threads`}>
      <dl className="grid grid-cols-3 gap-3">
        {snapshot.cpu.loadAvg.map((value, index) => (
          <div key={windows[index]} className="flex flex-col gap-1">
            <dd
              className={cx(
                "tnum text-[22px] leading-none font-medium",
                loadTone(value, snapshot.cpu.threads),
              )}
            >
              {value.toFixed(2)}
            </dd>
            <dt className="text-faint text-[11px]">{windows[index]}</dt>
          </div>
        ))}
      </dl>
    </MetricCard>
  )
}

function NetworkCard({ snapshot }: { snapshot: SystemSnapshot }) {
  const down = formatRate(snapshot.network.rxBytesPerSec)
  const up = formatRate(snapshot.network.txBytesPerSec)
  const rows = snapshot.network.interfaces.slice(0, 4)

  return (
    <MetricCard label="Network" hint={`${snapshot.network.interfaces.length} iface`}>
      <div className="grid grid-cols-2 gap-4">
        {[
          { dir: "Down", ...down },
          { dir: "Up", ...up },
        ].map((item) => (
          <div key={item.dir} className="flex flex-col gap-1">
            <span className="text-faint text-[11px]">{item.dir}</span>
            <span className="flex items-baseline gap-1">
              <span className="tnum text-fg text-[22px] leading-none font-medium">{item.value}</span>
              <span className="text-muted text-xs">{item.unit}</span>
            </span>
          </div>
        ))}
      </div>

      {rows.length > 0 ? (
        <ul className="border-line-soft flex flex-col gap-1.5 border-t pt-3">
          {rows.map((iface) => (
            <li key={iface.name} className="text-muted flex justify-between text-xs">
              <span className="truncate">{iface.name}</span>
              <span className="tnum text-faint shrink-0">
                {formatBytes(iface.rxBytesPerSec)}/s ↓ {formatBytes(iface.txBytesPerSec)}/s ↑
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-faint border-line-soft border-t pt-3 text-xs">
          No active interfaces reported.
        </p>
      )}
    </MetricCard>
  )
}

function ProcessesCard({ snapshot }: { snapshot: SystemSnapshot }) {
  const { processes } = snapshot
  return (
    <MetricCard label="Processes" value={formatCount(processes.total)} unit="running" hint="top by CPU">
      {processes.top.length === 0 ? (
        <p className="text-faint text-xs">Process list unavailable on this host.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-faint">
              <th className="label pb-2 text-left font-semibold">Process</th>
              <th className="label pb-2 text-right font-semibold">CPU</th>
              <th className="label pb-2 text-right font-semibold">MEM</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            {processes.top.map((proc) => (
              <tr key={proc.pid} className="border-line-soft border-t">
                <td className="text-fg max-w-0 truncate py-1.5 pr-3" title={`pid ${proc.pid}`}>
                  {proc.name}
                </td>
                <td className="tnum py-1.5 text-right">{proc.cpuPercent.toFixed(1)}%</td>
                <td className="tnum py-1.5 text-right">{proc.memPercent.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </MetricCard>
  )
}

function DiskCard({ snapshot }: { snapshot: SystemSnapshot }) {
  const { disk } = snapshot
  return (
    <Panel className="flex flex-col gap-4 p-5 sm:col-span-2 xl:col-span-3">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="label">Storage</h3>
        <span className="text-faint text-xs tnum">{disk.length} volumes</span>
      </header>

      {disk.length === 0 ? (
        <p className="text-faint text-xs">No physical volumes detected.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {disk.map((volume) => (
            <li key={`${volume.fs}-${volume.mount}`} className="flex flex-col gap-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="text-fg truncate text-[13px] font-medium">{volume.mount}</span>
                  <span className="text-faint truncate text-[11px]">{volume.fs}</span>
                </div>
                <span className="tnum text-muted shrink-0 text-xs">
                  {formatBytes(volume.usedBytes)}
                  <span className="text-faint"> / {formatBytes(volume.sizeBytes)}</span>
                  <span
                    className={cx(
                      "ml-3 inline-block w-10 text-right",
                      usageTone(volume.usagePercent) === "critical"
                        ? "text-danger"
                        : usageTone(volume.usagePercent) === "warn"
                          ? "text-warn"
                          : "text-fg",
                    )}
                  >
                    {formatPercent(volume.usagePercent, 0)}%
                  </span>
                </span>
              </div>
              <UsageBar percent={volume.usagePercent} ariaLabel={`${volume.mount} usage`} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function SystemTab({
  snapshot,
  error,
}: {
  snapshot: SystemSnapshot | null
  error: string | null
}) {
  if (!snapshot) {
    return (
      <div className="flex flex-col gap-5">
        {error ? <ErrorBanner title="Could not read host metrics" detail={error} /> : null}
        <GridSkeleton count={6} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <ErrorBanner title="Metrics poll failed — showing last good snapshot" detail={error} />
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CpuCard snapshot={snapshot} />
        <MemoryCard snapshot={snapshot} />
        <UptimeCard snapshot={snapshot} />
        <LoadCard snapshot={snapshot} />
        <NetworkCard snapshot={snapshot} />
        <ProcessesCard snapshot={snapshot} />
        <DiskCard snapshot={snapshot} />
      </div>
    </div>
  )
}
