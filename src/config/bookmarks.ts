// Bookmarks shown in the control panel. Add/remove entries here to extend.
export interface BookmarkDefinition {
  id: string
  name: string
  url: string
  description: string
  category: string
}

export const BOOKMARKS: BookmarkDefinition[] = []