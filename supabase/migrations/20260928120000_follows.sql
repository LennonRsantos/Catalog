-- follows: one-way, no-approval-needed relationship (unlike friendships,
-- which is symmetric and requires accept). Publicly readable — like
-- public_profiles, findability/counts aren't the privacy boundary here,
-- content still is. follower_uid is the leading PK column so "who do I
-- follow" is an index-only scan; followed_uid gets its own index for
-- "who follows me" / follower counts.

create table public.follows (
  follower_uid uuid not null references public.profiles (id) on delete cascade,
  followed_uid uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_uid, followed_uid),
  check (follower_uid <> followed_uid)
);

create index follows_followed_uid_idx on public.follows (followed_uid);

alter table public.follows enable row level security;

create policy "follows_select_all"
  on public.follows for select
  using (true);

create policy "follows_insert_self"
  on public.follows for insert
  with check (follower_uid = auth.uid());

create policy "follows_delete_self"
  on public.follows for delete
  using (follower_uid = auth.uid());

-- notifications.post_id/post_title/post_cover_url were NOT NULL because
-- every notification used to be about a post. 'follow' notifications have
-- none of those, so the three columns become optional and the type check
-- grows a fourth value.
alter table public.notifications alter column post_id drop not null;
alter table public.notifications alter column post_title drop not null;
alter table public.notifications alter column post_cover_url drop not null;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_post', 'like', 'comment', 'mention', 'follow'));

-- Mirrors comments_decrement_count's shape: a trigger on the plain
-- RLS-authorized table write (here, a client's direct insert into follows)
-- doing the one thing that write itself isn't allowed to do directly —
-- writing into another user's notifications inbox.
create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_avatar text;
begin
  select p.name, p.avatar_url into v_name, v_avatar from public.profiles p where p.id = new.follower_uid;

  insert into public.notifications (recipient_uid, type, actor_uid, actor_name, actor_avatar_url)
  values (new.followed_uid, 'follow', new.follower_uid, v_name, v_avatar);

  return new;
end;
$$;

create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_follow();
