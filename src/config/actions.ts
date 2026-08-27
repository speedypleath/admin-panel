/**
 * Shape of a predefined action button.
 *
 * The commands are operator-specific (backup volumes, machine-local tooling),
 * so they are never committed — they live in Supabase (`panel_actions`) or in
 * gitignored `data/actions.json`. See `src/lib/panel-store.ts`.
 */
export interface ActionDefinition {
  id: string
  label: string
  command: string
}
