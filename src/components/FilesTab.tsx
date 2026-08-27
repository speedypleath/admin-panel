"use client"

import { useState, useEffect, useRef } from "react"
import { FolderIcon, FileIcon, DownloadIcon, UploadIcon, ExternalIcon, SystemIcon } from "./icons"
import { formatBytes, formatAgo } from "./format"
import { Skeleton } from "./Skeleton"
import { ErrorBanner } from "./ErrorBanner"
import type { FsListResponse, FsEntry } from "@/types"

function FileTable({
  entries,
  onNavigate,
  onAction,
  actionIcon: ActionIcon,
  actionLabel,
  loading,
}: {
  entries: FsEntry[]
  onNavigate: (entry: FsEntry) => void
  onAction: (entry: FsEntry) => void
  actionIcon: any
  actionLabel: string
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-line border-dashed">
        <p className="text-muted text-sm">Empty directory</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[500px] text-left text-sm">
        <thead>
          <tr className="border-b border-line-soft text-muted text-xs">
            <th className="font-medium pb-2 pr-4 pl-1 font-normal">Name</th>
            <th className="font-medium pb-2 px-4 font-normal">Size</th>
            <th className="font-medium pb-2 px-4 font-normal">Modified</th>
            <th className="font-medium pb-2 pl-4 pr-1 font-normal text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {entries.map((entry) => (
            <tr key={entry.name} className="hover:bg-surface/50 transition-colors">
              <td className="py-2 pr-4 pl-1">
                <button
                  type="button"
                  className="flex items-center gap-2 hover:text-accent disabled:opacity-50"
                  onClick={() => entry.isDir ? onNavigate(entry) : onAction(entry)}
                  disabled={!entry.isDir && !ActionIcon}
                >
                  {entry.isDir ? (
                    <FolderIcon className="text-accent shrink-0" />
                  ) : (
                    <FileIcon className="text-muted shrink-0" />
                  )}
                  <span className="truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                    {entry.name}
                  </span>
                </button>
              </td>
              <td className="py-2 px-4 tnum text-muted whitespace-nowrap">
                {entry.isDir ? "—" : formatBytes(entry.size)}
              </td>
              <td className="py-2 px-4 tnum text-muted whitespace-nowrap">
                {entry.mtimeMs ? new Date(entry.mtimeMs).toLocaleString() : "—"}
              </td>
              <td className="py-2 pl-4 pr-1 text-right">
                {!entry.isDir && (
                  <button
                    type="button"
                    onClick={() => onAction(entry)}
                    className="p-1.5 text-muted hover:text-fg hover:bg-surface rounded inline-flex items-center"
                    title={actionLabel}
                  >
                    <ActionIcon className="size-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FilesTab() {
  const [mode, setMode] = useState<"local" | "remote">("local")
  
  // Local state
  const [localPath, setLocalPath] = useState("")
  const [localInput, setLocalInput] = useState(localPath)
  const [localData, setLocalData] = useState<FsListResponse | null>(null)
  const [localError, setLocalError] = useState("")
  const [localLoading, setLocalLoading] = useState(false)
  const localUploadRef = useRef<HTMLInputElement>(null)
  
  // Remote state
  const [remotePath, setRemotePath] = useState("/")
  const [remoteInput, setRemoteInput] = useState(remotePath)
  const [remoteData, setRemoteData] = useState<FsListResponse | null>(null)
  const [remoteError, setRemoteError] = useState("")
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteConnected, setRemoteConnected] = useState(false)
  const [remoteSession, setRemoteSession] = useState<{ host: string; user: string; isDefault?: boolean }>({ host: "", user: "" })
  const [remoteStatus, setRemoteStatus] = useState("")
  const remoteUploadRef = useRef<HTMLInputElement>(null)

  // FTP Form State
  const [ftpForm, setFtpForm] = useState({
    host: "127.0.0.1",
    port: 21,
    user: "",
    password: "",
    secure: false
  })

  // Default server connection (the panel host's own FTP server)
  const [defaultFtp, setDefaultFtp] = useState<{ host: string; port: number; user: string } | null>(null)
  const [connectingDefault, setConnectingDefault] = useState(false)
  const [showManualFtp, setShowManualFtp] = useState(false)
  const autoConnectTried = useRef(false)

  useEffect(() => {
    if (mode === "local") {
      fetchLocalList(localPath)
    } else if (remoteConnected) {
      fetchRemoteList(remotePath)
    }
  }, [mode, localPath, remotePath, remoteConnected])

  // Load default server FTP info once
  useEffect(() => {
    fetch("/api/ftp/default")
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        if (info?.host) {
          setDefaultFtp({ host: info.host, port: info.port, user: info.user })
          setFtpForm((f) => ({ ...f, host: info.host, port: info.port, user: info.user }))
        }
      })
      .catch(() => {})
  }, [])

  // Open the FTP connection to the server by default when entering Remote view
  useEffect(() => {
    if (mode === "remote" && !remoteConnected && defaultFtp && !autoConnectTried.current && !connectingDefault) {
      autoConnectTried.current = true
      handleDefaultConnect()
    }
  }, [mode, remoteConnected, defaultFtp])

  async function fetchLocalList(p: string) {
    setLocalLoading(true)
    setLocalError("")
    try {
      const res = await fetch(`/api/fs/list?path=${encodeURIComponent(p)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load directory")
      setLocalData(data)
      setLocalPath(data.path)
      setLocalInput(data.path)
    } catch (err: any) {
      setLocalError(err.message)
    } finally {
      setLocalLoading(false)
    }
  }

  async function fetchRemoteList(p: string) {
    setRemoteLoading(true)
    setRemoteError("")
    try {
      const res = await fetch(`/api/ftp/list?path=${encodeURIComponent(p)}`)
      const data = await res.json()
      if (res.status === 409) {
        setRemoteConnected(false)
        throw new Error(data.error)
      }
      if (!res.ok) throw new Error(data.error || "Failed to load remote directory")
      setRemoteData({ path: data.path, parent: data.path === "/" ? null : data.path.replace(/\/[^/]+\/?$/, "") || "/", entries: data.entries })
      setRemotePath(data.path)
      setRemoteInput(data.path)
    } catch (err: any) {
      setRemoteError(err.message)
    } finally {
      setRemoteLoading(false)
    }
  }

  async function handleLocalUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append("file", file)
    formData.append("dir", localPath)
    
    setLocalLoading(true)
    try {
      const res = await fetch("/api/fs/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      fetchLocalList(localPath)
    } catch (err: any) {
      setLocalError(err.message)
      setLocalLoading(false)
    }
    if (localUploadRef.current) localUploadRef.current.value = ""
  }

  async function handleRemoteUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append("file", file)
    formData.append("remoteDir", remotePath)
    
    setRemoteLoading(true)
    setRemoteStatus("Uploading...")
    try {
      const res = await fetch("/api/ftp/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setRemoteStatus("Upload complete")
      fetchRemoteList(remotePath)
    } catch (err: any) {
      setRemoteError(err.message)
      setRemoteStatus("")
      setRemoteLoading(false)
    }
    if (remoteUploadRef.current) remoteUploadRef.current.value = ""
  }

  async function handleFtpConnect(e: React.FormEvent) {
    e.preventDefault()
    setRemoteError("")
    setRemoteLoading(true)
    try {
      const res = await fetch("/api/ftp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ftpForm)
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Connection failed")
      setRemoteSession({ host: ftpForm.host, user: ftpForm.user })
      setRemoteConnected(true)
      setRemotePath(data.cwd)
      setRemoteInput(data.cwd)
      setRemoteStatus("")
    } catch (err: any) {
      setRemoteError(err.message)
    } finally {
      setRemoteLoading(false)
    }
  }

  async function handleDefaultConnect() {
    setRemoteError("")
    setConnectingDefault(true)
    try {
      const res = await fetch("/api/ftp/connect-default", { method: "POST" })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Connection failed")
      setRemoteSession({ host: defaultFtp?.host ?? "server", user: defaultFtp?.user ?? "panel", isDefault: true })
      setRemoteConnected(true)
      setRemotePath(data.cwd)
      setRemoteInput(data.cwd)
      setRemoteStatus("")
      setShowManualFtp(false)
    } catch (err: any) {
      setRemoteError(err.message)
      setShowManualFtp(true)
    } finally {
      setConnectingDefault(false)
    }
  }

  async function handleFtpDisconnect() {
    await fetch("/api/ftp/disconnect", { method: "POST" })
    setRemoteConnected(false)
    setRemoteData(null)
    autoConnectTried.current = false
    setShowManualFtp(false)
  }

  async function handleRemoteDownload(entry: FsEntry) {
    setRemoteStatus(`Downloading ${entry.name}...`)
    try {
      const remoteFilePath = remotePath === "/" ? `/${entry.name}` : `${remotePath}/${entry.name}`
      const res = await fetch("/api/ftp/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remotePath: remoteFilePath, localDir: localPath })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Download failed")
      setRemoteStatus(`Saved to ${data.localPath}`)
    } catch (err: any) {
      setRemoteError(err.message)
      setRemoteStatus("")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 p-1 bg-surface border border-line rounded-lg w-max">
        <button
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === "local" ? "bg-accent/10 text-accent" : "text-muted hover:text-fg"}`}
          onClick={() => setMode("local")}
        >
          Local
        </button>
        <button
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === "remote" ? "bg-accent/10 text-accent" : "text-muted hover:text-fg"}`}
          onClick={() => setMode("remote")}
        >
          Remote (FTP)
        </button>
      </div>

      {mode === "local" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLocalList("")}
              className="p-2 border border-line bg-surface rounded hover:border-line-soft transition-colors"
              title="Home"
            >
              <SystemIcon className="size-4" />
            </button>
            <button
              onClick={() => localData?.parent && fetchLocalList(localData.parent)}
              disabled={!localData?.parent}
              className="p-2 border border-line bg-surface rounded hover:border-line-soft transition-colors disabled:opacity-50"
              title="Up"
            >
              <FolderIcon className="size-4" />
            </button>
            <form
              className="flex-1 flex gap-2"
              onSubmit={(e) => { e.preventDefault(); fetchLocalList(localInput); }}
            >
              <input
                type="text"
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                className="flex-1 bg-surface border border-line rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent text-fg font-mono"
              />
              <button type="submit" className="px-4 py-1.5 bg-surface border border-line rounded text-sm hover:border-line-soft">
                Go
              </button>
            </form>
            <input
              type="file"
              ref={localUploadRef}
              onChange={handleLocalUpload}
              className="hidden"
            />
            <button
              onClick={() => localUploadRef.current?.click()}
              className="flex items-center gap-2 px-4 py-1.5 bg-accent text-[#000] font-medium rounded text-sm hover:bg-accent/90"
            >
              <UploadIcon className="size-4" />
              Upload
            </button>
          </div>
          
          {localError && <ErrorBanner title="Local Error" detail={localError} />}
          
          <div className="bg-surface border border-line rounded-[10px] p-1">
            <FileTable
              entries={localData?.entries || []}
              onNavigate={(entry) => fetchLocalList(`${localPath.replace(/\/$/, '')}/${entry.name}`)}
              onAction={(entry) => {
                window.location.href = `/api/fs/download?path=${encodeURIComponent(`${localPath.replace(/\/$/, '')}/${entry.name}`)}`
              }}
              actionIcon={DownloadIcon}
              actionLabel="Download file"
              loading={localLoading && !localData}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {!remoteConnected ? (
            <div className="bg-surface border border-line rounded-[10px] p-6 max-w-md mx-auto w-full flex flex-col gap-4">
              <h2 className="text-fg font-medium">Connect to FTP</h2>
              <p className="text-muted text-sm">
                {defaultFtp
                  ? `Default connection to the server (${defaultFtp.host}:${defaultFtp.port} as ${defaultFtp.user}).`
                  : "Connect to an FTP server to manage files."}
              </p>
              {remoteError && <ErrorBanner title="Connection Error" detail={remoteError} />}
              {defaultFtp && !showManualFtp && (
                <button
                  type="button"
                  onClick={handleDefaultConnect}
                  disabled={connectingDefault}
                  className="bg-accent text-[#000] font-medium rounded py-2 hover:bg-accent/90 disabled:opacity-50"
                >
                  {connectingDefault ? "Connecting to server..." : "Connect to server (default)"}
                </button>
              )}
              {!showManualFtp && (
                <button
                  type="button"
                  onClick={() => setShowManualFtp(true)}
                  className="text-accent text-sm hover:underline self-start"
                >
                  Use another server
                </button>
              )}
              {showManualFtp && (
                <form onSubmit={handleFtpConnect} className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted">Host</span>
                  <input
                    type="text"
                    required
                    value={ftpForm.host}
                    onChange={(e) => setFtpForm({ ...ftpForm, host: e.target.value })}
                    className="bg-bg border border-line rounded px-3 py-2 text-fg focus:outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted">Port</span>
                  <input
                    type="number"
                    required
                    value={ftpForm.port}
                    onChange={(e) => setFtpForm({ ...ftpForm, port: parseInt(e.target.value) })}
                    className="bg-bg border border-line rounded px-3 py-2 text-fg focus:outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted">Username</span>
                  <input
                    type="text"
                    required
                    value={ftpForm.user}
                    onChange={(e) => setFtpForm({ ...ftpForm, user: e.target.value })}
                    className="bg-bg border border-line rounded px-3 py-2 text-fg focus:outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted">Password</span>
                  <input
                    type="password"
                    value={ftpForm.password}
                    onChange={(e) => setFtpForm({ ...ftpForm, password: e.target.value })}
                    className="bg-bg border border-line rounded px-3 py-2 text-fg focus:outline-none focus:border-accent"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-muted mt-2">
                  <input
                    type="checkbox"
                    checked={ftpForm.secure}
                    onChange={(e) => setFtpForm({ ...ftpForm, secure: e.target.checked })}
                    className="accent-accent"
                  />
                  Use TLS (FTPS)
                </label>
              </div>
                  <button
                    type="submit"
                    disabled={remoteLoading}
                    className="mt-2 bg-accent text-[#000] font-medium rounded py-2 hover:bg-accent/90 disabled:opacity-50"
                  >
                    {remoteLoading ? "Connecting..." : "Connect"}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-surface border border-line rounded-lg text-sm">
                <span className="text-muted">
                  Connected to <span className="text-fg font-medium">{remoteSession.host}</span> as <span className="text-fg font-medium">{remoteSession.user}</span>
                  {remoteSession.isDefault && <span className="ml-2 text-accent">· the server running this panel</span>}
                </span>
                <button
                  onClick={handleFtpDisconnect}
                  className="text-danger hover:text-danger/80"
                >
                  Disconnect
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => remoteData?.parent && fetchRemoteList(remoteData.parent)}
                  disabled={!remoteData?.parent}
                  className="p-2 border border-line bg-surface rounded hover:border-line-soft transition-colors disabled:opacity-50"
                  title="Up"
                >
                  <FolderIcon className="size-4" />
                </button>
                <form
                  className="flex-1 flex gap-2"
                  onSubmit={(e) => { e.preventDefault(); fetchRemoteList(remoteInput); }}
                >
                  <input
                    type="text"
                    value={remoteInput}
                    onChange={(e) => setRemoteInput(e.target.value)}
                    className="flex-1 bg-surface border border-line rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent text-fg font-mono"
                  />
                  <button type="submit" className="px-4 py-1.5 bg-surface border border-line rounded text-sm hover:border-line-soft">
                    Go
                  </button>
                </form>
                <input
                  type="file"
                  ref={remoteUploadRef}
                  onChange={handleRemoteUpload}
                  className="hidden"
                />
                <button
                  onClick={() => remoteUploadRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-1.5 bg-accent text-[#000] font-medium rounded text-sm hover:bg-accent/90"
                >
                  <UploadIcon className="size-4" />
                  Upload
                </button>
              </div>
              
              {remoteError && <ErrorBanner title="Remote Error" detail={remoteError} />}
              {remoteStatus && <div className="text-sm text-accent">{remoteStatus}</div>}
              
              <div className="bg-surface border border-line rounded-[10px] p-1">
                <FileTable
                  entries={remoteData?.entries || []}
                  onNavigate={(entry) => {
                    const newPath = remotePath === "/" ? `/${entry.name}` : `${remotePath}/${entry.name}`
                    fetchRemoteList(newPath)
                  }}
                  onAction={handleRemoteDownload}
                  actionIcon={DownloadIcon}
                  actionLabel="Download to local"
                  loading={remoteLoading && !remoteData}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
