import { useState } from "react"
import { TerminalIcon, RefreshIcon } from "./icons"

const PRESET_ACTIONS = [
  { label: "List Files", command: "ls -la" },
  { label: "Check Disk Space", command: "df -h" },
  { label: "System Uptime", command: "uptime" },
  { label: "Check Memory", command: "vm_stat" },
  { label: "List Node Processes", command: "ps aux | grep node" },
  { label: "Restart Openclaw", command: "openclaw gateway restart" },
  { label: "Backup Openclaw", command: "openclaw backup create --output /Volumes/Kingston/Backups" },
  { label: "Clean Caches", command: "cleanmymac clean --force" },
  { label: "Free RAM", command: "cleanmymac optimize ram" },
  { label: "Purge Space", command: "cleanmymac optimize purgeable" },
]

export function ActionsTab() {
  const [command, setCommand] = useState("")
  const [output, setOutput] = useState<{ stdout: string; stderr: string; error?: string } | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return

    setIsRunning(true)
    setOutput(null)

    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        setOutput({ stdout: "", stderr: data.stderr || "", error: data.error || "Execution failed" })
      } else {
        setOutput(data)
      }
    } catch (err: unknown) {
      const e = err as Error
      setOutput({ stdout: "", stderr: "", error: e.message || "Network error" })
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeCommand(command)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface border-line rounded-xl border p-5 sm:p-6">
        <h2 className="text-fg mb-4 text-base font-semibold">Predefined Actions</h2>
        <div className="flex flex-wrap gap-3">
          {PRESET_ACTIONS.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCommand(action.command)
                executeCommand(action.command)
              }}
              disabled={isRunning}
              className="flex items-center gap-2 rounded-lg bg-surface-hi border border-line px-4 py-2 text-sm font-medium text-fg hover:border-accent hover:text-accent disabled:opacity-50 transition-colors"
            >
              <TerminalIcon className="size-4" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border-line flex flex-col rounded-xl border overflow-hidden">
        <div className="border-b border-line-soft bg-surface-hi px-4 py-3 sm:px-6">
          <h2 className="text-fg text-sm font-semibold">Custom Bash Command</h2>
        </div>
        
        <div className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. ps aux | grep next"
              className="bg-bg border-line flex-1 rounded-md border px-4 py-2 font-mono text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
              disabled={isRunning}
            />
            <button
              type="submit"
              disabled={isRunning || !command.trim()}
              className="flex items-center justify-center rounded-md bg-accent px-5 py-2 font-semibold text-bg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isRunning ? (
                <RefreshIcon className="size-4 animate-spin" />
              ) : (
                "Execute"
              )}
            </button>
          </form>
        </div>

        {output && (
          <div className="border-t border-line-soft bg-[#0a0a0a] p-4 font-mono text-xs text-zinc-300 sm:p-6 overflow-x-auto max-h-[500px] overflow-y-auto">
            {output.error && (
              <div className="mb-4 text-danger">
                <strong>Error: </strong>
                {output.error}
              </div>
            )}
            
            {output.stdout && (
              <div className="mb-4">
                <div className="text-accent mb-2 font-semibold select-none">$ stdout</div>
                <pre className="whitespace-pre-wrap">{output.stdout}</pre>
              </div>
            )}

            {output.stderr && (
              <div className="text-warn">
                <div className="mb-2 font-semibold select-none">$ stderr</div>
                <pre className="whitespace-pre-wrap">{output.stderr}</pre>
              </div>
            )}

            {!output.error && !output.stdout && !output.stderr && (
              <div className="text-faint italic">Command executed successfully with no output.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
