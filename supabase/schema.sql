-- NASEC ERP — Supabase schema
-- Run this once in your Supabase project's SQL editor (Database → SQL Editor → "+ New query").

-- 1. Single key/value table that mirrors the localStorage interface
create table if not exists public.nasec_kv (
    key         text primary key,
    value       text not null,
    updated_at  timestamptz not null default now(),
    updated_by  text
);

create index if not exists nasec_kv_updated_at_idx on public.nasec_kv (updated_at desc);

-- 2. Realtime — turn on for the table so the browser app gets live updates
-- In Supabase Dashboard → Database → Replication → set "nasec_kv" to "Realtime: on"
-- (Or run the next line via SQL editor — exact syntax varies by version)
alter publication supabase_realtime add table public.nasec_kv;

-- 3. Row Level Security
-- For day-1 demo we permit any authenticated user to read/write everything.
-- Tighten this once you wire SSO + role-aware RLS.
alter table public.nasec_kv enable row level security;

create policy "anon read" on public.nasec_kv
    for select using (true);

create policy "anon write" on public.nasec_kv
    for insert with check (true);

create policy "anon update" on public.nasec_kv
    for update using (true) with check (true);

create policy "anon delete" on public.nasec_kv
    for delete using (true);

-- 4. Storage bucket for file uploads (drawings, contracts, photos, etc.)
-- Run from Storage → "New bucket" with name "nasec-files" and public off,
-- OR via the CLI: supabase storage ls (requires the CLI).
-- Anyone authenticated can read/write for now.
