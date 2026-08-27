import fs from "fs"
import os from "os"
import path from "path"

/** Directory the Files tab opens on. Never hardcode an operator home path. */
export const HOME_DIR = process.env.PANEL_HOME_DIR ?? os.homedir()

export async function listLocal(reqPath: string) {
  if (!reqPath || reqPath.includes("\0")) {
    throw new Error("Invalid path")
  }
  
  const absPath = path.resolve(reqPath)
  
  try {
    const stat = await fs.promises.stat(absPath)
    if (!stat.isDirectory()) {
      throw new Error("Not a directory")
    }
  } catch (err: any) {
    if (err.code === "ENOENT") {
      throw new Error("Directory not found")
    }
    throw err
  }
  
  const parent = absPath === "/" ? null : path.dirname(absPath)
  
  const dirents = await fs.promises.readdir(absPath, { withFileTypes: true })
  const entries = []
  
  for (const dirent of dirents) {
    try {
      const entryPath = path.join(absPath, dirent.name)
      const st = await fs.promises.stat(entryPath)
      entries.push({
        name: dirent.name,
        isDir: st.isDirectory(),
        size: st.size,
        mtimeMs: st.mtimeMs,
      })
    } catch (e) {
      // Skip files that we can't stat (e.g. permission denied)
    }
  }
  
  entries.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1
    if (!a.isDir && b.isDir) return 1
    return a.name.localeCompare(b.name, undefined, { numeric: true })
  })
  
  return { path: absPath, parent, entries }
}
