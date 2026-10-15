-- Cloud saves: one row per user per tool. `app` lets every Clash of Critters tool share this table and the same accounts.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists public.saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  app text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, app)
);

-- Row level security: a signed-in user can only see and change their own rows.
alter table public.saves enable row level security;

create policy "Read own saves" on public.saves
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Insert own saves" on public.saves
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Update own saves" on public.saves
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Delete own saves" on public.saves
  for delete to authenticated using ((select auth.uid()) = user_id);
