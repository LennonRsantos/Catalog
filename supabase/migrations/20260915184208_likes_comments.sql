-- likes: PK (post_id, liker_uid) IS the "one like per person per post" rule
-- — no application logic needed for it, unlike Firestore's doc-id-as-uid trick.
create table public.likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  liker_uid uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  primary key (post_id, liker_uid)
);

alter table public.likes enable row level security;
-- No direct INSERT/DELETE policy: writes only happen through toggle_like()
-- (see rpcs migration), which is the only place that can also keep
-- posts.like_count correct atomically.
revoke insert, update, delete on public.likes from authenticated;

-- comments: author_name/author_avatar_url are point-in-time, same reasoning
-- as posts.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_uid uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  author_avatar_url text,
  text text not null,
  mentions jsonb not null default '[]'::jsonb,
  mentions_all boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index comments_post_created_idx on public.comments (post_id, created_at asc);

alter table public.comments enable row level security;

-- Keeps posts.comment_count correct for BOTH the add_comment() RPC path and
-- a plain client .delete() on comments (delete is authorized by ordinary
-- RLS, per rls_policies migration, so it doesn't go through an RPC).
create or replace function public.decrement_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
  return old;
end;
$$;

create trigger comments_decrement_count
  after delete on public.comments
  for each row execute function public.decrement_comment_count();
