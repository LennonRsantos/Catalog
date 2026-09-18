-- Friend suggestions based on mutual friends ("people you may know"). Needs
-- SECURITY DEFINER because friendships RLS only lets each row's two parties
-- read it — computing 2nd-degree connections means reading OTHER people's
-- accepted friendships too, which the definer bypass exists for (same
-- pattern as is_profile_public/public_profiles: this function only ever
-- returns uid/name/handle/avatar, already globally readable via
-- public_profiles, plus a mutual-friend count — nothing private leaks).
create or replace function public.suggested_friends(p_limit integer default 10)
returns table (
  uid uuid,
  name text,
  handle text,
  avatar_url text,
  mutual_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with my_friends as (
    select case when uid_a = auth.uid() then uid_b else uid_a end as friend_uid
    from public.friendships
    where status = 'accepted' and auth.uid() in (uid_a, uid_b)
  ),
  candidates as (
    select
      case when f.uid_a = mf.friend_uid then f.uid_b else f.uid_a end as candidate_uid,
      count(*) as mutual_count
    from my_friends mf
    join public.friendships f
      on f.status = 'accepted' and mf.friend_uid in (f.uid_a, f.uid_b)
    group by 1
  ),
  excluded as (
    select friend_uid as uid from my_friends
    union
    select case when uid_a = auth.uid() then uid_b else uid_a end
    from public.friendships
    where status = 'pending' and auth.uid() in (uid_a, uid_b)
    union
    select auth.uid()
  )
  select p.id as uid, p.name, p.handle, p.avatar_url, c.mutual_count::integer
  from candidates c
  join public.profiles p on p.id = c.candidate_uid
  where c.candidate_uid not in (select excluded.uid from excluded)
  order by c.mutual_count desc, p.name asc
  limit p_limit;
$$;

grant execute on function public.suggested_friends(integer) to authenticated;
