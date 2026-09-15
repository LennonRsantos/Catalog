-- The only three genuinely multi-table-atomic operations left, called via
-- supabase.rpc(...). Everything else (accept/decline friend request, change
-- handle, delete post/comment, mark notification read) is plain RLS-gated
-- DML — see rls_policies.sql — because a UNIQUE index and FK cascades
-- already give those the atomicity Firestore needed a client transaction
-- for. All three run SECURITY DEFINER so they can look up the caller's own
-- current name/avatar server-side (never trusting client-supplied values)
-- and write into other people's notification inboxes as part of one
-- already-authorized action — no per-notification-type authorization rule
-- to hand-maintain the way firestore.rules needed.

-- Same check as canUidReadPost in the old firestore.rules — needed here
-- because the mention TARGET is some third uid, never auth.uid().
create or replace function public.can_uid_read_post(target_uid uuid, target_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p.author_uid = target_uid
    or p.visibility = 'public'
    or (p.visibility = 'friends' and public.are_friends(p.author_uid, target_uid))
  from public.posts p
  where p.id = target_post_id;
$$;

revoke execute on function public.can_uid_read_post(uuid, uuid) from public;

-- Shared by add_comment and publish_post. mentions is a jsonb array of
-- {uid,handle,name} (already resolved client-side against the actor's own
-- friend list — see src/utils/mentions.ts); mentions_all expands to every
-- accepted friend of the actor. Best-effort per recipient: a target who
-- can't actually read the post (private post, or a "friends" post they're
-- not connected to the author of) is silently skipped, never blocks the
-- others or the comment/post itself.
create or replace function public._notify_mentions(
  p_post_id uuid,
  p_actor_uid uuid,
  p_actor_name text,
  p_actor_avatar_url text,
  p_post_title text,
  p_post_cover_url text,
  p_mentions jsonb,
  p_mentions_all boolean,
  p_exclude uuid[],
  p_comment_id uuid default null,
  p_comment_preview text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_targets uuid[];
begin
  if p_mentions_all then
    select array_agg(distinct case when uid_a = p_actor_uid then uid_b else uid_a end)
      into v_targets
      from public.friendships
      where p_actor_uid in (uid_a, uid_b) and status = 'accepted';
  else
    select array_agg(distinct (m ->> 'uid')::uuid) into v_targets
      from jsonb_array_elements(p_mentions) m;
  end if;

  insert into public.notifications
    (recipient_uid, type, actor_uid, actor_name, actor_avatar_url, post_id, post_title, post_cover_url, comment_id, comment_preview)
  select t, 'mention', p_actor_uid, p_actor_name, p_actor_avatar_url, p_post_id, p_post_title, p_post_cover_url, p_comment_id, p_comment_preview
  from unnest(coalesce(v_targets, array[]::uuid[])) t
  where t <> p_actor_uid
    and not (t = any(p_exclude))
    and public.can_uid_read_post(t, p_post_id);
end;
$$;

revoke execute on function public._notify_mentions(uuid, uuid, text, text, text, text, jsonb, boolean, uuid[], uuid, text) from public;

-- toggle_like ---------------------------------------------------------------
-- Server decides current state (never trusts a client-passed "currently
-- liked" boolean like the old client code did) — closes a small race window.
create or replace function public.toggle_like(p_post_id uuid)
-- Output columns are prefixed (out_...) on purpose: RETURNS TABLE column
-- names become implicitly-declared plpgsql variables inside the function
-- body, and a name matching a real posts column (like_count) makes every
-- bare reference to that column ambiguous ("is this the OUT param or the
-- table column?"), which plpgsql treats as a hard error. Prefixing avoids
-- the collision entirely instead of relying on table aliases everywhere.
returns table (out_liked boolean, out_like_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_avatar text;
  v_author uuid;
  v_title text;
  v_cover text;
  v_already boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_read_post(p_post_id) then
    raise exception 'post not readable';
  end if;

  select p.name, p.avatar_url into v_name, v_avatar from public.profiles p where p.id = v_uid;
  select po.author_uid, po.title, po.cover_url into v_author, v_title, v_cover from public.posts po where po.id = p_post_id;

  select exists (select 1 from public.likes l where l.post_id = p_post_id and l.liker_uid = v_uid) into v_already;

  if v_already then
    delete from public.likes where post_id = p_post_id and liker_uid = v_uid;
    update public.posts set like_count = greatest(0, like_count - 1) where id = p_post_id;
  else
    insert into public.likes (post_id, liker_uid, name, avatar_url) values (p_post_id, v_uid, v_name, v_avatar);
    update public.posts set like_count = like_count + 1 where id = p_post_id;
    if v_author <> v_uid then
      insert into public.notifications
        (recipient_uid, type, actor_uid, actor_name, actor_avatar_url, post_id, post_title, post_cover_url)
      values (v_author, 'like', v_uid, v_name, v_avatar, p_post_id, v_title, v_cover);
    end if;
  end if;

  return query select not v_already, po2.like_count from public.posts po2 where po2.id = p_post_id;
end;
$$;

grant execute on function public.toggle_like(uuid) to authenticated;

-- add_comment -----------------------------------------------------------
create or replace function public.add_comment(
  p_post_id uuid,
  p_text text,
  p_mentions jsonb default '[]'::jsonb,
  p_mentions_all boolean default false
) returns public.comments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_avatar text;
  v_author uuid;
  v_title text;
  v_cover text;
  v_visibility text;
  v_comment public.comments;
  v_exclude uuid[] := array[]::uuid[];
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_read_post(p_post_id) then
    raise exception 'post not readable';
  end if;
  if trim(p_text) = '' then
    raise exception 'empty comment';
  end if;

  select p.name, p.avatar_url into v_name, v_avatar from public.profiles p where p.id = v_uid;
  select po.author_uid, po.title, po.cover_url, po.visibility into v_author, v_title, v_cover, v_visibility
    from public.posts po where po.id = p_post_id;

  insert into public.comments (post_id, author_uid, author_name, author_avatar_url, text, mentions, mentions_all)
  values (p_post_id, v_uid, v_name, v_avatar, p_text, coalesce(p_mentions, '[]'::jsonb), coalesce(p_mentions_all, false))
  returning * into v_comment;

  update public.posts set comment_count = comment_count + 1 where id = p_post_id;

  if v_author <> v_uid then
    insert into public.notifications
      (recipient_uid, type, actor_uid, actor_name, actor_avatar_url, post_id, post_title, post_cover_url, comment_id, comment_preview)
    values (v_author, 'comment', v_uid, v_name, v_avatar, p_post_id, v_title, v_cover, v_comment.id, left(p_text, 80));
    v_exclude := array[v_author];
  end if;

  -- A private post can only ever be commented on by its own author (the
  -- only way can_read_post lets a comment through), so a mention there
  -- would point a friend at a post they can never open — skip.
  if v_visibility <> 'private' then
    perform public._notify_mentions(
      p_post_id, v_uid, v_name, v_avatar, v_title, v_cover,
      coalesce(p_mentions, '[]'::jsonb), coalesce(p_mentions_all, false),
      v_exclude, v_comment.id, left(p_text, 80)
    );
  end if;

  return v_comment;
end;
$$;

grant execute on function public.add_comment(uuid, text, jsonb, boolean) to authenticated;

-- publish_post ------------------------------------------------------------
create or replace function public.publish_post(
  p_tmdb_id integer,
  p_media_type text,
  p_type text,
  p_title text,
  p_cover_url text,
  p_rating numeric,
  p_review text,
  p_visibility text,
  p_mentions jsonb default '[]'::jsonb,
  p_mentions_all boolean default false
) returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_avatar text;
  v_post public.posts;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select p.name, p.avatar_url into v_name, v_avatar from public.profiles p where p.id = v_uid;

  insert into public.posts
    (author_uid, author_name, author_avatar_url, tmdb_id, media_type, type, title, cover_url, rating, review, visibility, mentions, mentions_all)
  values
    (v_uid, v_name, v_avatar, p_tmdb_id, p_media_type, p_type, p_title, p_cover_url, p_rating, p_review, p_visibility,
     coalesce(p_mentions, '[]'::jsonb), coalesce(p_mentions_all, false))
  returning * into v_post;

  if p_visibility <> 'private' then
    -- Set-based fan-out to every accepted friend — replaces the old
    -- per-friend writeBatch loop.
    insert into public.notifications
      (recipient_uid, type, actor_uid, actor_name, actor_avatar_url, post_id, post_title, post_cover_url)
    select
      case when uid_a = v_uid then uid_b else uid_a end,
      'new_post', v_uid, v_name, v_avatar, v_post.id, p_title, p_cover_url
    from public.friendships
    where v_uid in (uid_a, uid_b) and status = 'accepted';

    perform public._notify_mentions(
      v_post.id, v_uid, v_name, v_avatar, p_title, p_cover_url,
      coalesce(p_mentions, '[]'::jsonb), coalesce(p_mentions_all, false), array[]::uuid[]
    );
  end if;

  return v_post;
end;
$$;

grant execute on function public.publish_post(integer, text, text, text, text, numeric, text, text, jsonb, boolean) to authenticated;
