alter table public.tricks
add column if not exists discipline text not null default 'ダブルダッチ';
