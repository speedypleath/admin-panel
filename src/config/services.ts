/**
 * Shape of a self-hosted service card.
 *
 * The entries themselves are operator-specific (hostnames, ports, tailnet
 * names) and are never committed — they live in Supabase (`panel_services`)
 * or in gitignored `data/services.json`. See `src/lib/panel-store.ts`.
 */
export interface ServiceDefinition {
  id: string
  name: string
  description: string
  localUrl: string
  tailnetUrl: string
  healthUrl?: string
}
