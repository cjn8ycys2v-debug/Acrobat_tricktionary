alter table public.tricks
add column if not exists origin_note text not null default '',
add column if not exists practice_steps text[] not null default '{}',
add column if not exists common_mistakes text[] not null default '{}',
add column if not exists safety_notes text[] not null default '{}',
add column if not exists coach_comment text not null default '';
