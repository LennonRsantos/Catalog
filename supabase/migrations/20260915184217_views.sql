-- These two views are the ONLY place a privacy boundary is crossed via
-- column-level (not row-level) filtering. Both are owned by the migration
-- role, so they run with that role's privileges and bypass the underlying
-- table's RLS — that's what lets them expose a narrow, safe column subset
-- of an otherwise-locked-down table. The visibility check therefore has to
-- live IN the view's WHERE clause itself; the base table's RLS staying
-- locked down is what stops anyone from getting the rest of the row by
-- querying the table directly instead of the view.

-- Replaces the old "publicProfiles" collection AND the syncPublicProfile/
-- syncFriendshipSnapshots fan-out that kept it in sync — there's nothing to
-- sync anymore, this is always current. Readable by anyone signed in
-- (findability by design, same as before: privacy gates CONTENT, not
-- whether someone can be found by name/handle).
create view public.public_profiles as
select
  id as uid,
  name,
  name_lower,
  handle,
  handle_lower,
  avatar_url,
  cover_url,
  profile_visibility
from public.profiles;

grant select on public.public_profiles to authenticated;

-- Replaces profiles/{uid}/favorites. catalog_items itself stays owner-only
-- (see catalog migration) — review/status/progress must never appear here.
create view public.favorites_public as
select
  owner_uid,
  id,
  tmdb_id,
  case when type = 'Série' then 'tv' else 'movie' end as media_type,
  type,
  title,
  cover_url,
  rating,
  favorited_at as rated_at,
  favorite_rank
from public.catalog_items
where is_favorite
  and (
    owner_uid = auth.uid()
    or public.is_admin()
    or public.are_friends(owner_uid, auth.uid())
    or public.is_profile_public(owner_uid)
  );

grant select on public.favorites_public to authenticated;

-- Replaces profiles/{uid}/publicMeta/genres — same friends-or-public gate
-- as favorites, kept as its own narrow view for the same reason: genre
-- prefs are one column on the otherwise-locked-down profiles table, not a
-- collection of rows, so this is the column-level escape hatch for it.
create view public.public_genre_prefs as
select
  id as uid,
  favorite_genre_ids
from public.profiles
where (
    id = auth.uid()
    or public.is_admin()
    or public.are_friends(id, auth.uid())
    or public.is_profile_public(id)
  );

grant select on public.public_genre_prefs to authenticated;
