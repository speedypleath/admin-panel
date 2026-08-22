import { AlertIcon } from "./icons"

export function ErrorBanner({ title, detail }: { title: string; detail?: string }) {
  return (
    <div
      role="alert"
      className="border-danger/35 bg-danger/8 text-danger flex items-start gap-3 rounded-[10px] border px-4 py-3"
    >
      <AlertIcon className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {detail ? <p className="text-danger/75 mt-0.5 text-xs break-words">{detail}</p> : null}
      </div>
    </div>
  )
}
