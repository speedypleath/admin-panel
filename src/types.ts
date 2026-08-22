export interface CpuInfo {
  model: string
  cores: number // physical cores
  threads: number // logical processors
  usagePercent: number // 0-100
  loadAvg: [number, number, number] // 1, 5, 15 min
  perCore: number[] // per-logical-processor usage 0-100
}

export interface MemInfo {
  totalBytes: number
  usedBytes: number
  freeBytes: number
  usagePercent: number // 0-100
}

export interface DiskInfo {
  mount: string
  fs: string
  sizeBytes: number
  usedBytes: number
  usagePercent: number // 0-100
}

export interface NetworkInfo {
  rxBytesPerSec: number
  txBytesPerSec: number
  interfaces: { name: string; rxBytesPerSec: number; txBytesPerSec: number }[]
}

export interface ProcessInfo {
  pid: number
  name: string
  cpuPercent: number
  memPercent: number
}

export interface SystemSnapshot {
  timestamp: number
  hostname: string
  os: { platform: string; distro: string; release: string; arch: string }
  uptimeSeconds: number
  cpu: CpuInfo
  mem: MemInfo
  disk: DiskInfo[]
  network: NetworkInfo
  processes: { total: number; top: ProcessInfo[] }
}

export type ServiceHealth = "up" | "down" | "degraded" | "unknown"

export interface ServiceStatus {
  id: string
  name: string
  description: string
  localUrl: string
  tailnetUrl: string
  health: ServiceHealth
  latencyMs: number | null
  checkedAt: number
  error?: string
}

export interface ServicesResponse {
  services: ServiceStatus[]
  checkedAt: number
}

export interface FsEntry {
  name: string
  isDir: boolean
  size: number
  mtimeMs: number
}

export interface FsListResponse {
  path: string
  parent: string | null
  entries: FsEntry[]
}

export interface ErrorResponse {
  error: string
}

export interface ServerlessStatus {
  id: string
  provider: string
  name: string
  description: string
  projectUrl: string
  dashboardUrl: string
  health: ServiceHealth
  latencyMs: number | null
  checkedAt: number
  error?: string
}

export interface ServerlessResponse {
  projects: ServerlessStatus[]
  checkedAt: number
}
