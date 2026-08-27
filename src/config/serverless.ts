/**
 * Shape of a hosted/serverless backend card.
 *
 * Entries reference real cloud project ids, so they are never committed —
 * they live in Supabase (`panel_serverless`) or in gitignored
 * `data/serverless.json`. See `src/lib/panel-store.ts`.
 */
export type ServerlessProvider = "firebase" | "supabase" | "vercel" | "netlify" | "cloudflare" | "other"

export interface ServerlessDefinition {
  id: string
  provider: ServerlessProvider
  name: string
  description: string
  /** Base URL of the hosted project, e.g. https://<ref>.supabase.co */
  projectUrl: string
  /** Management dashboard for the project (opened from the card). */
  dashboardUrl: string
  /** Probe endpoint. Defaults to projectUrl. For hosted backends any HTTP
   *  answer (even 401/404) proves the gateway is alive, so that counts as up. */
  healthUrl?: string
}
