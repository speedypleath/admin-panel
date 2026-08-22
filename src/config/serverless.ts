// Serverless backends shown in the control panel. Add/remove entries here to
// extend — each entry is a hosted project (Supabase today, others later).
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

export const SERVERLESS: ServerlessDefinition[] = []
