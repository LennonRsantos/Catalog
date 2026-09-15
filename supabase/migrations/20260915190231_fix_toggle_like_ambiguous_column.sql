-- Fixes a real bug found by the smoke test: RETURNS TABLE(liked boolean,
-- like_count integer) implicitly declares "like_count" as a plpgsql
-- variable, colliding with posts.like_count inside the function body and
-- making every bare reference to it ambiguous (hard error, not a warning).
-- Renamed to out_liked/out_like_count. See rpcs migration for the full
-- explanation and the corrected function body — this migration just
-- reapplies it to a project that already had the broken version.

-- CREATE OR REPLACE can't change a function's OUT-parameter names/types,
-- only its body — the signature is genuinely different, so drop first.
drop function if exists public.toggle_like(uuid);

create function public.toggle_like(p_post_id uuid)
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
