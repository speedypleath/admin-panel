import * as ftp from "basic-ftp"
import path from "path"
import os from "os"
import fs from "fs"

let client: ftp.Client | null = null
let currentCwd = "/"

export async function ftpConnect({ host, port = 21, user, password, secure = false }: any) {
  if (client && !client.closed) {
    client.close()
  }
  
  client = new ftp.Client()
  client.ftp.verbose = false
  
  try {
    await client.access({
      host,
      port,
      user,
      password,
      secure,
      secureOptions: { rejectUnauthorized: false }
    })
    const cwd = await client.pwd()
    currentCwd = cwd || "/"
    return { ok: true, cwd: currentCwd }
  } catch (err: any) {
    client.close()
    client = null
    return { ok: false, error: err.message }
  }
}

export function ftpDisconnect() {
  if (client) {
    client.close()
    client = null
  }
  return { ok: true }
}

export async function ftpList(reqPath: string) {
  if (!client || client.closed) {
    throw new Error("not connected")
  }
  
  const p = reqPath || "/"
  const list = await client.list(p)
  
  const entries = list.map(item => ({
    name: item.name,
    isDir: item.type === 2, // ftp.FileType.Directory = 2, File = 1, Unknown = 0, Symbol = 3
    size: item.size,
    mtimeMs: item.modifiedAt ? item.modifiedAt.getTime() : 0
  }))
  
  entries.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1
    if (!a.isDir && b.isDir) return 1
    return a.name.localeCompare(b.name, undefined, { numeric: true })
  })
  
  return { path: p, entries }
}

export async function ftpDownload(remotePath: string, localDir: string) {
  if (!client || client.closed) {
    throw new Error("not connected")
  }
  
  await fs.promises.mkdir(localDir, { recursive: true })
  
  const localPath = path.join(localDir, path.basename(remotePath))
  await client.downloadTo(localPath, remotePath)
  
  return localPath
}

export async function ftpUpload(remoteDir: string, localPath: string) {
  if (!client || client.closed) {
    throw new Error("not connected")
  }
  
  const remotePath = path.posix.join(remoteDir, path.basename(localPath))
  await client.uploadFrom(localPath, remotePath)
  
  return remotePath
}

const DEFAULT_CREDS_PATH = "<home>/.openclaw/admin-panel/ftp-credentials.json"

export function getDefaultFtpInfo() {
  try {
    const creds = JSON.parse(fs.readFileSync(DEFAULT_CREDS_PATH, "utf-8"))
    return {
      host: creds.host ?? "127.0.0.1",
      port: creds.port ?? 2121,
      user: creds.user ?? "panel",
    }
  } catch {
    return null
  }
}

export async function ftpConnectDefault() {
  try {
    const creds = JSON.parse(fs.readFileSync(DEFAULT_CREDS_PATH, "utf-8"))
    return await ftpConnect({
      host: creds.host,
      port: creds.port,
      user: creds.user,
      password: creds.password,
      secure: creds.secure ?? true,
    })
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
