alter table public.media_assets
add column if not exists reference_url text,
add column if not exists reference_start_sec int,
add column if not exists reference_end_sec int,
add column if not exists rights_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_reference_start_non_negative'
      and conrelid = 'public.media_assets'::regclass
  ) then
    alter table public.media_assets
    add constraint media_reference_start_non_negative
    check (reference_start_sec is null or reference_start_sec >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_reference_end_non_negative'
      and conrelid = 'public.media_assets'::regclass
  ) then
    alter table public.media_assets
    add constraint media_reference_end_non_negative
    check (reference_end_sec is null or reference_end_sec >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_reference_range'
      and conrelid = 'public.media_assets'::regclass
  ) then
    alter table public.media_assets
    add constraint media_reference_range
    check (
      reference_start_sec is null
      or reference_end_sec is null
      or reference_end_sec >= reference_start_sec
    );
  end if;
end $$;
