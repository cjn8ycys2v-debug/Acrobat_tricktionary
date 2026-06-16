create extension if not exists "pgcrypto";

create type public.trick_status as enum ('draft', 'published');
create type public.relation_type as enum ('prerequisite', 'progression', 'variation', 'combo');
create type public.media_type as enum ('video', 'poster');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer', 'admin')),
  display_name text,
  created_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  source_key text unique not null,
  title text not null,
  kind text not null check (kind in ('pdf', 'manual', 'video', 'coach-note')),
  url text,
  show_by_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tricks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  aliases text[] not null default '{}',
  summary text not null,
  description text not null,
  difficulty int not null check (difficulty between 1 and 5),
  risk_level int not null check (risk_level between 1 and 5),
  family text not null,
  axis text not null,
  takeoff text not null,
  landing text not null,
  rope_context text not null,
  tags text[] not null default '{}',
  level int check (level between 1 and 10),
  level_category text,
  status public.trick_status not null default 'draft',
  source_id uuid references public.sources(id) on delete set null,
  show_source boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.level_tests (
  id uuid primary key default gen_random_uuid(),
  level int unique not null check (level between 1 and 10),
  category text not null,
  title text not null,
  pass_condition text not null,
  trick_ids uuid[] not null default '{}',
  source_id uuid references public.sources(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trick_relations (
  id uuid primary key default gen_random_uuid(),
  from_trick_id uuid not null references public.tricks(id) on delete cascade,
  to_trick_id uuid not null references public.tricks(id) on delete cascade,
  type public.relation_type not null,
  note text not null default '',
  strength int not null default 3 check (strength between 1 and 5),
  created_at timestamptz not null default now(),
  constraint trick_relations_no_self check (from_trick_id <> to_trick_id),
  constraint trick_relations_unique unique (from_trick_id, to_trick_id, type)
);

create table public.trick_map_positions (
  id uuid primary key default gen_random_uuid(),
  trick_id uuid unique not null references public.tricks(id) on delete cascade,
  x int not null,
  y int not null,
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  trick_id uuid not null references public.tricks(id) on delete cascade,
  type public.media_type not null default 'video',
  storage_path text not null,
  duration int,
  credit text,
  consent_checked boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tricks_touch_updated_at
before update on public.tricks
for each row execute function public.touch_updated_at();

create trigger level_tests_touch_updated_at
before update on public.level_tests
for each row execute function public.touch_updated_at();

create trigger trick_map_positions_touch_updated_at
before update on public.trick_map_positions
for each row execute function public.touch_updated_at();

create or replace function public.prevent_learning_relation_cycle()
returns trigger
language plpgsql
as $$
begin
  if new.type not in ('prerequisite', 'progression') then
    return new;
  end if;

  if exists (
    with recursive walk(id) as (
      select new.to_trick_id
      union
      select tr.to_trick_id
      from public.trick_relations tr
      join walk on tr.from_trick_id = walk.id
      where tr.type in ('prerequisite', 'progression')
        and tr.id is distinct from new.id
    )
    select 1 from walk where id = new.from_trick_id
  ) then
    raise exception 'learning relation cycle detected';
  end if;

  return new;
end;
$$;

create trigger trick_relations_prevent_cycle
before insert or update on public.trick_relations
for each row execute function public.prevent_learning_relation_cycle();

alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.tricks enable row level security;
alter table public.level_tests enable row level security;
alter table public.trick_relations enable row level security;
alter table public.trick_map_positions enable row level security;
alter table public.media_assets enable row level security;

create policy "profiles can read own profile"
on public.profiles for select
using (auth.uid() = user_id or public.is_admin());

create policy "admins manage profiles"
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());

create policy "public reads visible sources"
on public.sources for select
using (show_by_default or public.is_admin());

create policy "admins manage sources"
on public.sources for all
using (public.is_admin())
with check (public.is_admin());

create policy "public reads published tricks"
on public.tricks for select
using (status = 'published' or public.is_admin());

create policy "admins manage tricks"
on public.tricks for all
using (public.is_admin())
with check (public.is_admin());

create policy "public reads level tests"
on public.level_tests for select
using (true);

create policy "admins manage level tests"
on public.level_tests for all
using (public.is_admin())
with check (public.is_admin());

create policy "public reads relations for published tricks"
on public.trick_relations for select
using (
  exists (select 1 from public.tricks t where t.id = from_trick_id and t.status = 'published')
  and exists (select 1 from public.tricks t where t.id = to_trick_id and t.status = 'published')
);

create policy "admins manage relations"
on public.trick_relations for all
using (public.is_admin())
with check (public.is_admin());

create policy "public reads map positions for published tricks"
on public.trick_map_positions for select
using (exists (select 1 from public.tricks t where t.id = trick_id and t.status = 'published'));

create policy "admins manage map positions"
on public.trick_map_positions for all
using (public.is_admin())
with check (public.is_admin());

create policy "public reads media for published tricks"
on public.media_assets for select
using (exists (select 1 from public.tricks t where t.id = trick_id and t.status = 'published'));

create policy "admins manage media"
on public.media_assets for all
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trick-media', 'trick-media', true, 314572800, array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "public reads trick media"
on storage.objects for select
using (bucket_id = 'trick-media');

create policy "admins upload trick media"
on storage.objects for insert
with check (bucket_id = 'trick-media' and public.is_admin());

create policy "admins update trick media"
on storage.objects for update
using (bucket_id = 'trick-media' and public.is_admin())
with check (bucket_id = 'trick-media' and public.is_admin());

create policy "admins delete trick media"
on storage.objects for delete
using (bucket_id = 'trick-media' and public.is_admin());
