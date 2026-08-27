-- Panel configuration moved out of source control into Supabase.
-- These tables hold operator-specific data (hostnames, cloud project refs,
-- bookmarks). Column names are quoted camelCase so rows map 1:1 onto the
-- TypeScript definitions in src/config/*.ts and onto the gitignored
-- data/*.json fallback used when Supabase is unavailable.
--
-- Access is service-role only: RLS is enabled with no policies, so anon and
-- authenticated keys cannot read these tables.

create table if not exists public.panel_services (
  id           text primary key,
  name         text not null,
  description  text not null default '',
  "localUrl"   text not null,
  "tailnetUrl" text not null default '',
  "healthUrl"  text,
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.panel_serverless (
  id             text primary key,
  provider       text not null check (provider in ('firebase','supabase','vercel','netlify','cloudflare','other')),
  name           text not null,
  description    text not null default '',
  "projectUrl"   text not null,
  "dashboardUrl" text not null,
  "healthUrl"    text,
  position       int  not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.panel_bookmarks (
  id          text primary key,
  name        text not null,
  url         text not null,
  description text not null default '',
  category    text not null default 'General',
  "isCustom"  boolean not null default true,
  "createdAt" bigint,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.panel_services   enable row level security;
alter table public.panel_serverless enable row level security;
alter table public.panel_bookmarks  enable row level security;
