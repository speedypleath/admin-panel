<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Admin Panel Knowledge & Operational Guidelines

## Production Deployment & Service Management
- **Local Port & Service**: The admin panel runs in production mode on port `8096` managed via macOS `launchd` service `com.openclaw.admin-panel` (`~/Library/LaunchAgents/com.openclaw.admin-panel.plist`).
- **Applying Code Changes**:
  1. Build the production bundle: `npm run build`
  2. Reload/restart the launchd service so changes take effect immediately:
     ```bash
     launchctl kickstart -k gui/$(id -u)/com.openclaw.admin-panel
     ```
  3. Verify the service responds: `curl -sI http://127.0.0.1:8096/`

## Bookmarks Management
- **Universal Deletability**: All bookmarks (preset and custom) are deletable by the user after confirming the deletion action (`confirm(...)`).
- **No Custom Badge**: Bookmarks should not display any distinguishing "Custom" badge.
- **Persistence**:
  - Bookmarks are stored in PostgreSQL (`bookmarks` table) with fallback to `data/bookmarks.json`.
  - Deleted bookmarks (including deleted preset bookmarks) are tracked in `deleted_bookmarks` table and `data/deleted_bookmarks.json` to prevent deleted presets from reappearing.

## Serverless & Cloud Functions
- **Supabase Edge Function**: `generate-bookmark` is deployed on Supabase project `<supabase-project-ref>` (`https://<supabase-project-ref>.supabase.co/functions/v1/generate-bookmark`).
- **Webhook Fallback**: The `/api/webhook/bookmark` endpoint uses the edge function for high-speed metadata generation with automatic graceful fallback to direct scraping.
