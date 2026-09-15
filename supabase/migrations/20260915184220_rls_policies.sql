-- profiles ---------------------------------------------------------------
-- Owner-only, full stop (matches firestore.rules exactly: isOwner || isAdmin,
-- no friend/public branch — that's what the views are for).

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "profiles_delete_own_or_admin"
  on public.profiles for delete
  using (id = auth.uid() or public.is_admin());

-- role is already protected by the enforce_role_immutable trigger; this is
-- defense in depth so a client can't even attempt it via PostgREST.
revoke insert, update (role) on public.profiles from authenticated;

-- catalog_items -----------------------------------------------------------
-- Owner-only for every operation — no exceptions. Friends/public only ever
-- see the projected favorites_public/public_genre_prefs views.

create policy "catalog_select_own_or_admin"
  on public.catalog_items for select
  using (owner_uid = auth.uid() or public.is_admin());

create policy "catalog_insert_own"
  on public.catalog_items for insert
  with check (owner_uid = auth.uid());

create policy "catalog_update_own_or_admin"
  on public.catalog_items for update
  using (owner_uid = auth.uid() or public.is_admin())
  with check (owner_uid = auth.uid() or public.is_admin());

create policy "catalog_delete_own_or_admin"
  on public.catalog_items for delete
  using (owner_uid = auth.uid() or public.is_admin());

-- friendships ---------------------------------------------------------------

create policy "friendships_select_party"
  on public.friendships for select
  using (auth.uid() in (uid_a, uid_b));

create policy "friendships_insert_requester"
  on public.friendships for insert
  with check (
    auth.uid() in (uid_a, uid_b)
    and requested_by = auth.uid()
    and status = 'pending'
  );

-- Only the OTHER party may accept (mirrors "requester can't self-accept").
create policy "friendships_accept_by_other_party"
  on public.friendships for update
  using (
    auth.uid() in (uid_a, uid_b)
    and status = 'pending'
    and requested_by <> auth.uid()
  )
  with check (status = 'accepted');

create policy "friendships_delete_party"
  on public.friendships for delete
  using (auth.uid() in (uid_a, uid_b));

-- uid_a/uid_b/requested_by never change after creation; only status/
-- responded_at do (the accept flow above).
revoke update on public.friendships from authenticated;
grant update (status, responded_at) on public.friendships to authenticated;

-- posts ---------------------------------------------------------------------

create policy "posts_select_visible"
  on public.posts for select
  using (
    author_uid = auth.uid()
    or visibility = 'public'
    or (visibility = 'friends' and public.are_friends(author_uid, auth.uid()))
  );

create policy "posts_insert_own"
  on public.posts for insert
  with check (author_uid = auth.uid() and like_count = 0 and comment_count = 0);

-- Content edits only — like_count/comment_count are never client-writable
-- (see column grant below); they only change inside toggle_like/
-- add_comment, which run as the table owner and aren't subject to this
-- column-privilege restriction.
create policy "posts_update_own_content"
  on public.posts for update
  using (author_uid = auth.uid())
  with check (author_uid = auth.uid());

create policy "posts_delete_own_or_admin"
  on public.posts for delete
  using (author_uid = auth.uid() or public.is_admin());

revoke update on public.posts from authenticated;
grant update (rating, review, visibility, mentions, mentions_all) on public.posts to authenticated;

-- likes -----------------------------------------------------------------
-- Read-only for clients; every write goes through toggle_like() (insert/
-- update/delete already revoked in the likes_comments migration).

create policy "likes_select_readable_post"
  on public.likes for select
  using (public.can_read_post(post_id));

-- comments ------------------------------------------------------------------

create policy "comments_select_readable_post"
  on public.comments for select
  using (public.can_read_post(post_id));

-- No insert policy — comments are only ever created via add_comment(), which
-- also needs to bump posts.comment_count and fan out notifications
-- atomically. Direct client inserts would silently skip both.
revoke insert on public.comments from authenticated;

create policy "comments_update_own"
  on public.comments for update
  using (author_uid = auth.uid())
  with check (author_uid = auth.uid());

revoke update on public.comments from authenticated;
grant update (text, mentions, mentions_all, edited_at) on public.comments to authenticated;

-- Three authorized parties, matching firestore.rules exactly: the comment's
-- own author, the POST's author (moderating their own post), or an admin.
create policy "comments_delete_authorized"
  on public.comments for delete
  using (
    author_uid = auth.uid()
    or auth.uid() = (select p.author_uid from public.posts p where p.id = post_id)
    or public.is_admin()
  );

-- notifications ---------------------------------------------------------
-- Recipient-only. No insert policy at all (see notifications migration) —
-- every notification is created by a SECURITY DEFINER RPC as part of an
-- already-authorized action. post_id's ON DELETE CASCADE is what replaces
-- the old "post author can clear cross-inbox notifications when deleting
-- their post" rule — deleting the post now cleans these up automatically.

create policy "notifications_select_own"
  on public.notifications for select
  using (recipient_uid = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (recipient_uid = auth.uid())
  with check (recipient_uid = auth.uid());

revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

create policy "notifications_delete_own_or_admin"
  on public.notifications for delete
  using (recipient_uid = auth.uid() or public.is_admin());
