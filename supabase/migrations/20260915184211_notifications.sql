-- notifications: recipient-only inbox. post_id has ON DELETE CASCADE, which
-- is what replaces the old Firestore collection-group batch-delete
-- (deletePost() scanning every recipient's inbox for dangling notifications)
-- — deleting a post now cleans up every notification pointing at it for free.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_uid uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('new_post', 'like', 'comment', 'mention')),
  actor_uid uuid not null references public.profiles (id) on delete cascade,
  actor_name text not null,
  actor_avatar_url text,
  post_id uuid not null references public.posts (id) on delete cascade,
  post_title text not null,
  post_cover_url text not null,
  comment_id uuid,
  comment_preview text,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

create index notifications_recipient_created_idx on public.notifications (recipient_uid, created_at desc);

alter table public.notifications enable row level security;
-- No client INSERT policy at all — every notification is created inside a
-- SECURITY DEFINER RPC (toggle_like/add_comment/publish_post) as part of an
-- already-authorized action, so there's nothing for a client-facing create
-- rule to re-validate (unlike the old firestore.rules, which needed a
-- three-branch authorization check reproduced by hand for every notification
-- type).
revoke insert on public.notifications from authenticated;
