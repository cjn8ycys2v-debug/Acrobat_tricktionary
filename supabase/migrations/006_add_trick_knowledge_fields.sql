alter table public.tricks
add column if not exists origin_note text not null default '',
add column if not exists practice_steps text[] not null default '{}',
add column if not exists common_mistakes text[] not null default '{}',
add column if not exists safety_notes text[] not null default '{}',
add column if not exists coach_comment text not null default '',
add column if not exists knowledge_status text not null default 'draft',
add column if not exists knowledge_reviewed_by text not null default '',
add column if not exists knowledge_source_urls text[] not null default '{}',
add column if not exists show_knowledge_sources boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tricks_knowledge_status_check'
      and conrelid = 'public.tricks'::regclass
  ) then
    alter table public.tricks
    add constraint tricks_knowledge_status_check
    check (knowledge_status in ('draft', 'reviewing', 'reviewed'));
  end if;
end $$;
