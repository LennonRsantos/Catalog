-- A brand-new Supabase project's `supabase_realtime` publication starts
-- with ZERO tables in it — creating a table (even with RLS enabled) does
-- NOT automatically add it. Every postgres_changes subscription in the app
-- (catalog, friendships, notifications, posts, likes, comments) was
-- silently inert until this ran — confirmed live: publishing a post never
-- reached an already-open feed because no WAL change event was ever
-- broadcast. RLS still gates what each subscriber actually receives; this
-- only turns the broadcast mechanism itself on.
alter publication supabase_realtime add table
  public.catalog_items,
  public.friendships,
  public.posts,
  public.likes,
  public.comments,
  public.notifications;
