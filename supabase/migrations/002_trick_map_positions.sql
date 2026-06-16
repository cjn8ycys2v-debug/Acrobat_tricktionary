create table if not exists public.trick_map_positions (
  id uuid primary key default gen_random_uuid(),
  trick_id uuid unique not null references public.tricks(id) on delete cascade,
  x int not null,
  y int not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trick_map_positions_touch_updated_at on public.trick_map_positions;
create trigger trick_map_positions_touch_updated_at
before update on public.trick_map_positions
for each row execute function public.touch_updated_at();

alter table public.trick_map_positions enable row level security;

drop policy if exists "public reads map positions for published tricks" on public.trick_map_positions;
create policy "public reads map positions for published tricks"
on public.trick_map_positions for select
using (exists (select 1 from public.tricks t where t.id = trick_id and t.status = 'published'));

drop policy if exists "admins manage map positions" on public.trick_map_positions;
create policy "admins manage map positions"
on public.trick_map_positions for all
using (public.is_admin())
with check (public.is_admin());
