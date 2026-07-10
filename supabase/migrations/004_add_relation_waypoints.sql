alter table public.trick_relations
add column if not exists waypoints jsonb not null default '[]'::jsonb;
