-- catalog: owner-only, full stop — no friend/public read branch here, ever.
-- "Top 10 favorites" visible to friends/public is served ONLY through the
-- favorites_public view (20260915184217_views.sql), which projects a safe
-- column subset. Never relax this table's own RLS to expose favorites —
-- review/status/progress must never leak to another user (see plan notes).

create table public.catalog_items (
  id text primary key,
  owner_uid uuid not null references public.profiles (id) on delete cascade,
  tmdb_id integer,
  title text not null,
  type text not null check (type in ('Filme', 'Série')),
  status text not null check (status in ('Quero Ver', 'Assistindo', 'Visto')),
  rating numeric not null default 0,
  review text not null default '',
  cover_url text not null,
  genre_ids integer[],
  runtime_minutes integer,
  progress_season integer,
  progress_minutes integer,
  progress_seconds integer,
  is_favorite boolean not null default false,
  favorite_rank smallint,
  favorited_at timestamptz,
  created_at timestamptz not null default now()
);

create index catalog_items_owner_created_idx on public.catalog_items (owner_uid, created_at desc);
create index catalog_items_owner_favorite_idx on public.catalog_items (owner_uid, type) where is_favorite;

alter table public.catalog_items enable row level security;

-- Keeps favorited_at accurate without every call site having to remember to
-- set it — mirrors the old syncFavoriteSnapshot's client-side `ratedAt:
-- Date.now()`, just computed server-side on the transition into favorite.
create or replace function public.set_favorited_at()
returns trigger
language plpgsql
as $$
begin
  if new.is_favorite and not old.is_favorite then
    new.favorited_at := now();
  elsif not new.is_favorite then
    new.favorited_at := null;
  end if;
  return new;
end;
$$;

create trigger catalog_items_set_favorited_at
  before update on public.catalog_items
  for each row execute function public.set_favorited_at();

create or replace function public.set_favorited_at_on_insert()
returns trigger
language plpgsql
as $$
begin
  if new.is_favorite then
    new.favorited_at := now();
  end if;
  return new;
end;
$$;

create trigger catalog_items_set_favorited_at_insert
  before insert on public.catalog_items
  for each row execute function public.set_favorited_at_on_insert();
