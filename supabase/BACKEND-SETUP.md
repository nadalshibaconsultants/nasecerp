# NASEC ERP — Backend Setup (Supabase)

This guide takes you from the demo localStorage build to a real multi-user backend in ~15 minutes.

## Step 1 — Create a Supabase project

1. Go to https://supabase.com and sign up (free).
2. Create a new project — pick any region close to UAE (Frankfurt or Mumbai work well).
3. Set a strong database password — write it down somewhere safe.
4. Wait ~2 minutes while the project provisions.

## Step 2 — Run the schema

1. In the project dashboard, open **SQL Editor** in the left sidebar.
2. Click **+ New query**.
3. Paste the contents of `supabase/schema.sql` from this repo into the editor.
4. Click **Run**. You should see "Success. No rows returned." plus the `nasec_kv` table appears under **Database → Tables**.

## Step 3 — Enable Realtime

1. **Database → Replication** in the sidebar.
2. Find the `nasec_kv` table and toggle Realtime **on**.

(If the SQL `alter publication` line in step 2 worked, it's already on — but verifying via the UI is harmless.)

## Step 4 — Get your API credentials

1. **Settings (gear icon) → API**.
2. Copy two values:
   - **Project URL** (e.g. `https://abcdefghijk.supabase.co`)
   - **anon public** key (a long token starting with `eyJ…`)

## Step 5 — Connect the ERP to Supabase

1. Open your deployed NASEC ERP URL.
2. Sign in as **Director**.
3. Go to **Settings** (top-right user menu → Settings).
4. Open the **Backend** tab.
5. Paste the **Project URL** and **anon key** from step 4.
6. Click **Connect & switch backend**.
7. Within ~10 seconds the status indicator turns green and shows "Connected to https://…".
8. Refresh the page. From now on, any data you create/edit syncs to your Supabase database.

## Step 6 — Verify multi-user

1. On computer A, sign in as PM and create a task.
2. On computer B (or a private window), sign in as Director.
3. The task you just created appears immediately on computer B.

## Reverting to localStorage

If you want to disconnect (say, for offline use or to demo on a different network), Settings → Backend → **Disconnect** drops you back to browser-only storage. Data already written to Supabase stays there; localStorage continues from where you were before.

## Production hardening (later)

The day-1 RLS policies in `schema.sql` allow anonymous read/write for ease of bring-up. Before going live with real client data, swap them for authenticated-only policies tied to your SSO / Supabase Auth user IDs:

```sql
-- Tighten policies once auth is wired
drop policy "anon read" on public.nasec_kv;
drop policy "anon write" on public.nasec_kv;
drop policy "anon update" on public.nasec_kv;
drop policy "anon delete" on public.nasec_kv;

create policy "auth read"   on public.nasec_kv for select using (auth.role() = 'authenticated');
create policy "auth write"  on public.nasec_kv for insert with check (auth.role() = 'authenticated');
create policy "auth update" on public.nasec_kv for update using (auth.role() = 'authenticated');
create policy "auth delete" on public.nasec_kv for delete using (auth.role() = 'authenticated');
```

## Troubleshooting

- **"Backend connecting…" hangs**: the Supabase JS package isn't bundled in the ERP. Run `pnpm add @supabase/supabase-js` and rebuild before deploying.
- **Multi-user updates not appearing**: Realtime not enabled (Step 3) or the browser is offline.
- **"Failed to write"**: most likely the RLS policies block the operation. Check the SQL editor and make sure all four policies in `schema.sql` were created.
