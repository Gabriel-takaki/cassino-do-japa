create extension if not exists pgcrypto;

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  checked_in_at timestamptz not null default now()
);

create unique index if not exists checkins_unique_name
  on public.checkins (lower(btrim(name)));

alter table public.checkins enable row level security;

revoke all on table public.checkins from anon, authenticated;
grant insert on table public.checkins to anon, authenticated;

drop policy if exists "public can check in" on public.checkins;
create policy "public can check in"
  on public.checkins
  for insert
  to anon, authenticated
  with check (char_length(btrim(name)) between 2 and 60);

create or replace function public.checkin_count()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*) from public.checkins;
$$;

revoke all on function public.checkin_count() from public;
grant execute on function public.checkin_count() to anon, authenticated;
