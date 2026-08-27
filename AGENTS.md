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
- **Supabase Edge Function**: `generate-bookmark` is deployed on the Supabase project referenced by `SUPABASE_URL` (see `.env.example`). The function URL is derived as `$SUPABASE_URL/functions/v1/generate-bookmark`, or overridden with `BOOKMARK_EDGE_FUNCTION_URL`. Never hardcode the project ref in source.
- **Webhook Fallback**: The `/api/webhook/bookmark` endpoint uses the edge function for high-speed metadata generation with automatic graceful fallback to direct scraping.

## Configuration & Personal Data

Operator-specific data (service hostnames, tailnet names, cloud project refs,
bookmarks, credential paths) must never be committed. It lives in:

- **Supabase** — tables `panel_services`, `panel_serverless`, `panel_bookmarks`
  (schema in `supabase/migrations/`), read at runtime via `src/lib/panel-store.ts`
  when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.
- **`data/*.json`** — gitignored local fallback used when Supabase is not
  configured or unreachable, so the panel still renders offline.

The Actions tab follows the same rule: preset commands reference operator
paths and machine-local tooling, so they live in `panel_actions` /
`data/actions.json`, never in `src/components/ActionsTab.tsx`.

The panel is behind HTTP Basic auth (`PANEL_AUTH_USER` / `PANEL_AUTH_PASSWORD`
in `.env.local`, enforced by `src/middleware.ts`). `POST /api/actions` refuses
to execute anything while those are unset. Health checks return 401 unless you
pass credentials — that still proves the server is up.

Files under `src/config/` define *types only*. Adding a service or bookmark
means inserting a row, not editing source. Copy `.env.example` to `.env.local`
and fill it in; `.env*` is gitignored.
