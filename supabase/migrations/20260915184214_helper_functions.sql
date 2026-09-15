-- Small set of helpers reused across RLS policies and views. Two are plain
-- (invoker-rights) functions that lean on the CALLING user's own RLS access
-- — they only ever check rows that user can already see (their own profile,
-- a friendship row they're a party to, a post visible under posts' own
-- policy) — so they can't be used to read anything the caller couldn't
-- already reach directly. is_profile_public is the one exception: it must
-- read an arbitrary OTHER person's profiles row, which owner-only RLS on
-- profiles would otherwise block, so it's SECURITY DEFINER on purpose.

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where uid_a = least(a, b) and uid_b = greatest(a, b) and status = 'accepted'
  );
$$;

-- Bypasses profiles' owner-only RLS on purpose — this is the ONE thing it's
-- allowed to reveal about a stranger's profile (whether it's public), never
-- any other column.
create or replace function public.is_profile_public(target_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select profile_visibility = 'public' from public.profiles where id = target_uid),
    false
  );
$$;

-- Deliberately does NOT re-implement the friends/public/owner logic — it
-- just asks "would a plain SELECT on posts return this row for me", which
-- posts' own RLS SELECT policy already answers correctly. This is what lets
-- likes/comments RLS reuse the exact same rule as posts without drift.
create or replace function public.can_read_post(target_post_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (select 1 from public.posts where id = target_post_id);
$$;
