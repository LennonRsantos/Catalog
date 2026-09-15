-- posts: author_name/author_avatar_url are DELIBERATELY kept as literal
-- point-in-time columns, not a live join to profiles — this preserves the
-- product behavior of an old post showing the name the author had back
-- then, exactly like today. Do not "simplify" this into a join.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_uid uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  author_avatar_url text,
  tmdb_id integer,
  media_type text not null check (media_type in ('movie', 'tv')),
  type text not null check (type in ('Filme', 'Série')),
  title text not null,
  cover_url text not null,
  rating numeric not null,
  review text not null default '',
  visibility text not null check (visibility in ('public', 'friends', 'private')),
  like_count integer not null default 0,
  comment_count integer not null default 0,
  mentions jsonb not null default '[]'::jsonb,
  mentions_all boolean not null default false,
  created_at timestamptz not null default now()
);

-- Mirrors firestore.indexes.json's two composite indexes exactly (own feed
-- query, and friends'-posts-by-visibility query).
create index posts_author_created_idx on public.posts (author_uid, created_at desc);
create index posts_author_visibility_created_idx on public.posts (author_uid, visibility, created_at desc);

alter table public.posts enable row level security;
