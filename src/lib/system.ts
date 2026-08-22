import os from "node:os"
import si from "systeminformation"

import type {
  CpuInfo,
  DiskInfo,
  MemInfo,
  NetworkInfo,
  ProcessInfo,
  SystemSnapshot,
} from "@/types"

/**
 * Every probe below is isolated: a metric that fails (permissions, an OS that
 * does not expose the counter, a slow `ps`) degrades to a neutral value instead
 * of taking the whole snapshot — and therefore the API route — down with it.
 */
async function probe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.warn(`[system] ${label} probe failed:`, error)
    return fallback
  }
}

const num = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

const clampPercent = (value: unknown): number => Math.min(100, Math.max(0, num(value)))

// Mounts that describe kernel plumbing rather than storage the operator cares about.
const VIRTUAL_FS = /^(tmpfs|devfs|overlay|map\b|none|devtmpfs|squashfs|autofs|proc|sysfs|efivarfs)/i
const VIRTUAL_MOUNT =
  /^(\/dev($|\/)|\/proc($|\/)|\/sys($|\/)|\/run($|\/)|\/private\/(var\/folders|tmp)|\/System\/Volumes\/(VM|Preboot|Update|xarts|iSCPreboot|Hardware))/i

function isPhysicalMount(entry: { fs?: string; mount?: string; type?: string; size?: number }): boolean {
  if (!entry.mount || num(entry.size) === 0) return false
  if (entry.fs && VIRTUAL_FS.test(entry.fs)) return false
  if (entry.type && VIRTUAL_FS.test(entry.type)) return false
  if (entry.type && /^(msdos|vfat)$/i.test(entry.type) && /efi/i.test(entry.mount)) return false
  if (/efi/i.test(entry.mount)) return false
  if (VIRTUAL_MOUNT.test(entry.mount)) return false
  return true
}

async function getOsInfo(): Promise<{
  os: SystemSnapshot["os"]
  hostname: string
}> {
  return probe(
    "osInfo",
    async () => {
      const info = await si.osInfo()
      return {
        os: {
          platform: info.platform || os.platform(),
          distro: info.distro || info.platform || os.type(),
          release: info.release || os.release(),
          arch: info.arch || os.arch(),
        },
        hostname: info.hostname || os.hostname(),
      }
    },
    {
      os: {
        platform: os.platform(),
        distro: os.type(),
        release: os.release(),
        arch: os.arch(),
      },
      hostname: os.hostname(),
    },
  )
}

function readLoadAvg(): [number, number, number] {
  const [one = 0, five = 0, fifteen = 0] = os.loadavg()
  return [num(one), num(five), num(fifteen)]
}

async function getCpu(): Promise<CpuInfo> {
  const loadAvg = readLoadAvg()

  const staticInfo = await probe(
    "cpu",
    async () => {
      const cpu = await si.cpu()
      return {
        model: [cpu.manufacturer, cpu.brand].filter(Boolean).join(" ").trim() || "Unknown CPU",
        cores: num(cpu.physicalCores, os.cpus().length),
        threads: num(cpu.cores, os.cpus().length),
      }
    },
    { model: "Unknown CPU", cores: os.cpus().length, threads: os.cpus().length },
  )

  const load = await probe(
    "currentLoad",
    async () => {
      const current = await si.currentLoad()
      return {
        usagePercent: clampPercent(current.currentLoad),
        perCore: (current.cpus ?? []).map((core) => clampPercent(core.load)),
      }
    },
    { usagePercent: 0, perCore: [] as number[] },
  )

  return {
    model: staticInfo.model,
    cores: staticInfo.cores,
    threads: staticInfo.threads || load.perCore.length,
    usagePercent: load.usagePercent,
    loadAvg,
    perCore: load.perCore,
  }
}

async function getMem(): Promise<MemInfo> {
  return probe(
    "mem",
    async () => {
      const mem = await si.mem()
      const totalBytes = num(mem.total, os.totalmem())
      const freeBytes = num(mem.free, os.freemem())
      const usedBytes = Math.max(0, totalBytes - freeBytes)
      return {
        totalBytes,
        usedBytes,
        freeBytes,
        usagePercent: totalBytes > 0 ? clampPercent((usedBytes / totalBytes) * 100) : 0,
      }
    },
    (() => {
      const totalBytes = os.totalmem()
      const freeBytes = os.freemem()
      const usedBytes = Math.max(0, totalBytes - freeBytes)
      return {
        totalBytes,
        usedBytes,
        freeBytes,
        usagePercent: totalBytes > 0 ? clampPercent((usedBytes / totalBytes) * 100) : 0,
      }
    })(),
  )
}

async function getDisks(): Promise<DiskInfo[]> {
  return probe(
    "fsSize",
    async () => {
      const volumes = await si.fsSize()
      const seen = new Set<string>()
      let disks = volumes
        .filter(isPhysicalMount)
        .filter((volume) => {
          const key = `${volume.fs}@${volume.mount}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .map<DiskInfo>((volume) => {
          const sizeBytes = num(volume.size)
          const usedBytes = num(volume.used)
          return {
            mount: volume.mount,
            fs: volume.fs || "unknown",
            sizeBytes,
            usedBytes,
            usagePercent: clampPercent(
              typeof volume.use === "number" && Number.isFinite(volume.use)
                ? volume.use
                : sizeBytes > 0
                  ? (usedBytes / sizeBytes) * 100
                  : 0,
            ),
          }
        })

      // macOS APFS: "/" is a sealed system snapshot that under-reports real
      // usage. Fold the Data volume's numbers into the root entry and drop
      // the redundant Data entry so the panel shows the disk as it is.
      if (process.platform === "darwin") {
        const data = disks.find((d) => d.mount === "/System/Volumes/Data")
        const root = disks.find((d) => d.mount === "/")
        if (data && root) {
          root.usedBytes = data.usedBytes
          root.sizeBytes = data.sizeBytes
          root.usagePercent = data.usagePercent
          root.fs = data.fs
          disks = disks.filter((d) => d.mount !== "/System/Volumes/Data")
        }
      }

      return disks.sort((a, b) => b.sizeBytes - a.sizeBytes)
    },
    [],
  )
}

async function getNetwork(): Promise<NetworkInfo> {
  return probe(
    "networkStats",
    async () => {
      const stats = await si.networkStats("*")
      const interfaces = stats
        .filter((iface) => iface.iface && !/^(lo|lo0|utun|awdl|llw|bridge)/i.test(iface.iface))
        .filter((iface) => iface.operstate !== "down")
        .map((iface) => ({
          name: iface.iface,
          // The first sample of a counter comes back as -1; treat it as idle.
          rxBytesPerSec: Math.max(0, num(iface.rx_sec)),
          txBytesPerSec: Math.max(0, num(iface.tx_sec)),
        }))

      return {
        rxBytesPerSec: interfaces.reduce((sum, iface) => sum + iface.rxBytesPerSec, 0),
        txBytesPerSec: interfaces.reduce((sum, iface) => sum + iface.txBytesPerSec, 0),
        interfaces,
      }
    },
    { rxBytesPerSec: 0, txBytesPerSec: 0, interfaces: [] },
  )
}

async function getProcesses(): Promise<SystemSnapshot["processes"]> {
  return probe(
    "processes",
    async () => {
      const result = await si.processes()
      const list = result.list ?? []
      const top = [...list]
        .sort((a, b) => num(b.cpu) - num(a.cpu))
        .slice(0, 5)
        .map<ProcessInfo>((proc) => ({
          pid: num(proc.pid),
          name: proc.name || "unknown",
          cpuPercent: clampPercent(proc.cpu),
          memPercent: clampPercent(proc.mem),
        }))

      return { total: num(result.all, list.length), top }
    },
    { total: 0, top: [] },
  )
}

export async function getSystemSnapshot(): Promise<SystemSnapshot> {
  const [osInfo, cpu, mem, disk, network, processes] = await Promise.all([
    getOsInfo(),
    getCpu(),
    getMem(),
    getDisks(),
    getNetwork(),
    getProcesses(),
  ])

  return {
    timestamp: Date.now(),
    hostname: osInfo.hostname,
    os: osInfo.os,
    uptimeSeconds: Math.round(os.uptime()),
    cpu,
    mem,
    disk,
    network,
    processes,
  }
}
