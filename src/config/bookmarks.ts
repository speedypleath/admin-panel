/**
 * Shape of a bookmark.
 *
 * The bookmark list is personal, so it is never committed — it lives in
 * Supabase (`panel_bookmarks`) or in gitignored `data/bookmarks.json`.
 * See `src/lib/panel-store.ts`.
 */
export interface BookmarkDefinition {
  id: string
  name: string
  url: string
  description: string
  category: string
}
