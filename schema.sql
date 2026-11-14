-- ULTIMATE GAMING CHAMPIONSHIP 2026 - Supabase schema
-- Run this whole file once in Supabase > SQL Editor.

create table if not exists public.players (
  player_id  text primary key check (player_id ~ '^[A-Za-z0-9_-]{1,32}$'),
  name       text not null check (length(trim(name)) > 0),
  age        int  not null check (age between 5 and 100),
  club_id    text not null check (length(trim(club_id)) > 0),
  phone      text not null check (length(trim(phone)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.leaderboard (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  game       text not null check (game in ('PUBG','PES 2026')),
  points     int  not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

alter table public.players     enable row level security;
alter table public.admins      enable row level security;
alter table public.leaderboard enable row level security;

-- players: NO public table access. Only admins can read/write the table.
drop policy if exists "admins manage players" on public.players;
create policy "admins manage players" on public.players
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- admins: a signed-in user may only see their own row (used to confirm admin status)
drop policy if exists "read own admin row" on public.admins;
create policy "read own admin row" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- leaderboard: public read, admin write
drop policy if exists "public read leaderboard" on public.leaderboard;
create policy "public read leaderboard" on public.leaderboard
  for select to anon, authenticated using (true);
drop policy if exists "admins write leaderboard" on public.leaderboard;
create policy "admins write leaderboard" on public.leaderboard
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Public lookup: returns exactly one player for an exact Player ID, nothing else.
create or replace function public.lookup_player(p_id text)
returns table (player_id text, name text, age int, club_id text, phone text)
language sql security definer stable set search_path = public as $$
  select p.player_id, p.name, p.age, p.club_id, p.phone
  from public.players p
  where p.player_id = trim(p_id)
  limit 1;
$$;

create or replace function public.player_count()
returns int language sql security definer stable set search_path = public as $$
  select count(*)::int from public.players;
$$;

revoke all on function public.lookup_player(text) from public;
revoke all on function public.player_count() from public;
grant execute on function public.lookup_player(text) to anon, authenticated;
grant execute on function public.player_count()      to anon, authenticated;

-- Initial players (phone numbers stored as text to keep leading zeros)
insert into public.players (player_id, name, age, club_id, phone) values
  ('23', 'Yassin Hassan Ahmed',  16, '40780', '01144010125'),
  ('24', 'Rodaina Hassan Ahmed', 13, '40720', '01143107974')
on conflict (player_id) do nothing;

-- AFTER creating your admin user in Authentication > Users, run:
-- insert into public.admins (user_id) select id from auth.users where email = 'YOUR_ADMIN_EMAIL';
