-- Pacenotes multi-user schema.
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to run once on a fresh project. Not written to be re-run idempotently.

-- ---------- profiles ----------
-- Supabase Auth owns auth.users; we mirror a public-facing row per user so
-- routes/games can reference something readable by other users (auth.users
-- itself is not queryable from the client).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up. Username defaults to
-- part of their email; they can change it later.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- games ----------
-- Shared catalog, not per-user -- this is what lets guides for the same
-- game end up discoverable together instead of siloed per account.
create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "games are publicly readable"
  on public.games for select
  using (true);

create policy "authenticated users can add a game"
  on public.games for insert
  with check (auth.uid() is not null);

-- ---------- routes ----------
-- Segments stay as JSONB (array of {id,title,notes,target_ms}) rather than
-- a child table -- it matches the app's existing shape almost exactly, so
-- the client-side split/roller/roadbook code barely has to change. Can be
-- normalized into a real child table later if per-segment queries across
-- routes become a real need.
create table public.routes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  segments jsonb not null default '[]'::jsonb,
  target_ms bigint,
  use_target boolean not null default true,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index routes_game_id_idx on public.routes(game_id);
create index routes_owner_id_idx on public.routes(owner_id);
create index routes_visibility_idx on public.routes(visibility);

alter table public.routes enable row level security;

create policy "public routes are readable by anyone, private routes by their owner"
  on public.routes for select
  using (visibility = 'public' or owner_id = auth.uid());

create policy "owners can insert their own routes"
  on public.routes for insert
  with check (owner_id = auth.uid());

create policy "owners can update their own routes"
  on public.routes for update
  using (owner_id = auth.uid());

create policy "owners can delete their own routes"
  on public.routes for delete
  using (owner_id = auth.uid());

create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger routes_set_updated_at
  before update on public.routes
  for each row execute procedure public.set_updated_at();

-- ---------- runs ----------
-- One row per completed attempt. This is what "your PB on someone else's
-- guide" is built from -- keyed by (route_id, user_id), not just route_id.
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_ms bigint not null,
  splits jsonb not null, -- cumulative split times, same shape as today's pb.segments
  created_at timestamptz not null default now()
);

create index runs_route_user_idx on public.runs(route_id, user_id);

alter table public.runs enable row level security;

create policy "users can read their own runs"
  on public.runs for select
  using (user_id = auth.uid());

create policy "users can log a run on a route they can see"
  on public.runs for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.routes r
      where r.id = route_id and (r.visibility = 'public' or r.owner_id = auth.uid())
    )
  );

create policy "users can delete their own runs"
  on public.runs for delete
  using (user_id = auth.uid());

-- ---------- personal_bests ----------
-- Denormalized on purpose (mirrors the old route.pb shape) so the app can
-- read a PB in one query instead of MIN()-ing the runs table on every
-- screen. "Reset PB" is just deleting this row -- run history is untouched.
-- Readable by anyone who can see the route, which leaves the door open for
-- a future leaderboard without another migration.
create table public.personal_bests (
  route_id uuid not null references public.routes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_ms bigint not null,
  splits jsonb not null,
  achieved_at timestamptz not null default now(),
  primary key (route_id, user_id)
);

alter table public.personal_bests enable row level security;

create policy "pbs are readable by anyone who can see the route"
  on public.personal_bests for select
  using (
    exists (
      select 1 from public.routes r
      where r.id = route_id and (r.visibility = 'public' or r.owner_id = auth.uid())
    )
  );

create policy "users can upsert their own pb"
  on public.personal_bests for insert
  with check (user_id = auth.uid());

create policy "users can update their own pb"
  on public.personal_bests for update
  using (user_id = auth.uid());

create policy "users can delete (reset) their own pb"
  on public.personal_bests for delete
  using (user_id = auth.uid());

-- ---------- library ----------
-- Routes a user has added to their own sidebar. Owned routes don't need a
-- row here -- the app shows (owner_id = me) UNION (route_id IN my library).
create table public.library (
  user_id uuid not null references public.profiles(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, route_id)
);

alter table public.library enable row level security;

create policy "users manage their own library"
  on public.library for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
