-- Supabase's client SDK has no self-service "delete my own account" call —
-- that's only exposed via the admin API (service-role key), which must
-- never reach the browser. This RPC is the replacement: it deletes the
-- caller's own auth.users row, which cascades (via profiles.id references
-- auth.users(id) on delete cascade, and every other FK chained off
-- profiles) to wipe everything derived from the account — same "cascade on
-- delete" behavior already decided for the rest of the schema.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_my_account() to authenticated;
