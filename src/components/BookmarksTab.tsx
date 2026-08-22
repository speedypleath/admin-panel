"use client"

import { useState, useEffect } from "react"
import type { BookmarkDefinition } from "@/config/bookmarks"
import { BOOKMARKS } from "@/config/bookmarks"
import type { StoredBookmark } from "@/lib/bookmarks"
import { Panel } from "./MetricCard"
import { ExternalIcon, PlusIcon, TrashIcon, SparklesIcon, CrossIcon, RefreshIcon } from "./icons"
import { cx } from "./format"

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function groupByCategory(bookmarks: StoredBookmark[]): [string, StoredBookmark[]][] {
  const order: string[] = []
  const map = new Map<string, StoredBookmark[]>()
  for (const bookmark of bookmarks) {
    if (!map.has(bookmark.category)) {
      map.set(bookmark.category, [])
      order.push(bookmark.category)
    }
    map.get(bookmark.category)!.push(bookmark)
  }
  return order.map((category) => [category, map.get(category)!])
}

const PRESET_CATEGORIES = ["Dev", "Making", "Music", "Shops", "Cloud & Serverless", "General"]

function BookmarkCard({
  bookmark,
  onDelete,
}: {
  bookmark: StoredBookmark
  onDelete?: (id: string) => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  return (
    <Panel className="group relative flex flex-col justify-between gap-3 p-5 transition-colors hover:border-line">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-fg truncate text-[15px] font-medium">{bookmark.name}</h3>
          </div>
          <p className="text-muted mt-1 line-clamp-2 text-[13px] leading-relaxed">
            {bookmark.description}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {onDelete && (
            <button
              onClick={async () => {
                if (confirm(`Remove bookmark "${bookmark.name}"?`)) {
                  setIsDeleting(true)
                  try {
                    await onDelete(bookmark.id)
                  } finally {
                    setIsDeleting(false)
                  }
                }
              }}
              disabled={isDeleting}
              title="Delete bookmark"
              aria-label="Delete bookmark"
              className="text-faint hover:text-danger rounded-md p-1.5 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
            >
              <TrashIcon />
            </button>
          )}

          <a
            href={bookmark.url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Open ${bookmark.name}`}
            className="text-muted hover:text-accent shrink-0 rounded-md p-1.5 transition-colors"
          >
            <ExternalIcon />
          </a>
        </div>
      </div>

      <div className="border-line-soft border-t pt-3">
        <span className="text-faint tnum block truncate text-[11px]" title={bookmark.url}>
          {hostOf(bookmark.url)}
        </span>
      </div>
    </Panel>
  )
}

export function BookmarksTab() {
  const [bookmarks, setBookmarks] = useState<StoredBookmark[]>(() =>
    BOOKMARKS.map((b) => ({ ...b, isCustom: false })),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State
  const [url, setUrl] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("Dev")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [generatedNotice, setGeneratedNotice] = useState<string | null>(null)

  const fetchBookmarks = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/bookmarks", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.bookmarks)) {
          setBookmarks(data.bookmarks)
        }
      }
    } catch (err) {
      console.error("Failed to load bookmarks:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchBookmarks()
  }, [])

  const handleGenerateMetadata = async () => {
    if (!url.trim()) {
      setFormError("Please enter a URL first")
      return
    }
    setFormError(null)
    setGeneratedNotice(null)
    setIsGenerating(true)

    try {
      const res = await fetch("/api/webhook/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          category: category.trim() || undefined,
          persist: false,
        }),
      })

      if (!res.ok) {
        throw new Error(`Webhook error: ${res.statusText}`)
      }

      const data = await res.json()
      if (data.generated) {
        setName(data.generated.name || "")
        setDescription(data.generated.description || "")
        if (data.generated.category && (!category || category === "Dev" || category === "General")) {
          setCategory(data.generated.category)
        }
        setGeneratedNotice("Metadata generated via webhook!")
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to fetch metadata")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) {
      setFormError("URL is required")
      return
    }

    setFormError(null)
    setIsSaving(true)

    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          autoGenerate: !name.trim() || !description.trim(),
          webhookUrl: webhookUrl.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }

      const result = await res.json()
      if (result.bookmark) {
        setBookmarks((prev) => [
          ...prev.filter((b) => b.id !== result.bookmark.id),
          result.bookmark,
        ])
      }

      // Reset and close
      setUrl("")
      setName("")
      setDescription("")
      setCategory("Dev")
      setWebhookUrl("")
      setGeneratedNotice(null)
      setIsModalOpen(false)
      void fetchBookmarks()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save bookmark")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/bookmarks?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setBookmarks((prev) => prev.filter((b) => b.id !== id))
      }
    } catch (err) {
      console.error("Failed to delete bookmark:", err)
    }
  }

  const groups = groupByCategory(bookmarks)

  return (
    <div className="flex flex-col gap-7">
      {/* Action Header */}
      <div className="flex items-center justify-between gap-4 border-b border-line-soft pb-4">
        <div className="flex items-center gap-3">
          <span className="text-faint text-xs font-semibold uppercase tracking-wider">
            {bookmarks.length} {bookmarks.length === 1 ? "Bookmark" : "Bookmarks"}
          </span>
          <button
            onClick={() => void fetchBookmarks()}
            disabled={isLoading}
            className="text-faint hover:text-fg p-1 transition-colors"
            title="Refresh bookmarks"
          >
            <RefreshIcon className={cx(isLoading && "animate-spin")} />
          </button>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true)
            setFormError(null)
            setGeneratedNotice(null)
          }}
          className="flex items-center gap-2 rounded-lg bg-surface border border-line px-3.5 py-1.5 text-xs font-medium text-fg hover:border-accent/60 hover:text-accent transition-all cursor-pointer"
        >
          <PlusIcon />
          <span>Add Bookmark</span>
        </button>
      </div>

      {/* Bookmarks Grid */}
      {bookmarks.length === 0 ? (
        <Panel className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="text-fg text-sm font-medium">No bookmarks yet</p>
          <p className="text-muted max-w-sm text-[13px]">
            Click <span className="text-fg font-medium">Add Bookmark</span> above to add your first bookmark.
          </p>
        </Panel>
      ) : (
        groups.map(([groupCategory, items]) => (
          <section key={groupCategory} aria-label={groupCategory}>
            <h2 className="text-faint mb-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
              {groupCategory}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Add Bookmark Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) setIsModalOpen(false)
          }}
        >
          <div
            className="bg-surface border-line relative w-full max-w-lg rounded-xl border p-6 shadow-2xl transition-all"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-line-soft pb-3.5 mb-5">
              <div>
                <h2 className="text-fg text-base font-semibold">Add New Bookmark</h2>
                <p className="text-faint text-xs mt-0.5">
                  Enter a URL and auto-generate the title & description via webhook
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-faint hover:text-fg rounded-md p-1 transition-colors"
                aria-label="Close"
              >
                <CrossIcon />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                {formError}
              </div>
            )}

            {generatedNotice && (
              <div className="mb-4 rounded-md border border-accent/30 bg-accent/10 p-3 text-xs text-accent">
                {generatedNotice}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* URL Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-muted text-xs font-medium">URL *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/docs"
                    className="bg-surface-hi border-line flex-1 rounded-md border px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateMetadata}
                    disabled={isGenerating || !url.trim()}
                    className="flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-50 transition-colors cursor-pointer"
                    title="Activate webhook to fetch title and description"
                  >
                    <SparklesIcon className={cx(isGenerating && "animate-spin")} />
                    <span>{isGenerating ? "Generating…" : "Auto Webhook"}</span>
                  </button>
                </div>
              </div>

              {/* Name Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-muted text-xs font-medium">Name / Title</label>
                  <span className="text-faint text-[11px]">(Auto-generated if empty)</span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Firebase Console"
                  className="bg-surface-hi border-line rounded-md border px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
                />
              </div>

              {/* Description Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-muted text-xs font-medium">Short Description</label>
                  <span className="text-faint text-[11px]">(Auto-generated if empty)</span>
                </div>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary or description"
                  className="bg-surface-hi border-line rounded-md border px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none resize-none"
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-2">
                <label className="text-muted text-xs font-medium">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={cx(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                        category === cat
                          ? "bg-accent text-bg font-semibold"
                          : "bg-surface-hi border border-line text-muted hover:text-fg hover:border-line-soft",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Or custom category name"
                  className="bg-surface-hi border-line mt-1 rounded-md border px-3 py-1.5 text-xs text-fg placeholder:text-faint focus:border-accent focus:outline-none"
                />
              </div>

              {/* Optional Webhook Target */}
              <div className="flex flex-col gap-1.5 border-t border-line-soft pt-3">
                <label className="text-faint text-[11px] font-medium">
                  Custom Webhook Dispatch URL (Optional, Firebase / Supabase)
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://us-central1-project.cloudfunctions.net/bookmarkWebhook"
                  className="bg-surface-hi border-line rounded-md border px-3 py-1.5 text-xs text-fg placeholder:text-faint focus:border-accent focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-line-soft pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="rounded-md px-4 py-2 text-xs font-medium text-muted hover:text-fg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isGenerating || !url.trim()}
                  className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-bg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                >
                  {isSaving ? "Saving…" : "Save Bookmark"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
