-- Predefined Actions moved out of source control into Supabase.
--
-- The commands reference operator-specific paths and locally installed tooling
-- (backup volumes, machine maintenance CLIs), so they must not live in the
-- repository. Same conventions as 20260827000000_panel_config.sql: quoted
-- camelCase columns mapping 1:1 onto src/config/actions.ts and the gitignored
-- data/actions.json fallback, service-role-only access via RLS with no policies.

create table if not exists public.panel_actions (
  id         text primary key,
  label      text not null,
  command    text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

alter table public.panel_actions enable row level security;
