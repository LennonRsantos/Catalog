-- Signup happens via auth.signUp() with the handle passed as user metadata,
-- consumed by handle_new_user() inside a trigger on auth.users insert. A
-- unique_violation raised inside that trigger correctly rolls back the
-- whole signup (confirmed empirically: no orphaned auth.users row) — but
-- GoTrue wraps it in an opaque "Database error saving new user" / 500, with
-- no distinguishable code, so the client can't show a precise "TAG taken"
-- message from that failure alone (verified live against this project).
--
-- Fix: check availability BEFORE calling auth.signUp() at all. SECURITY
-- DEFINER + granted to anon, since there is no session yet at that point —
-- the only thing it reveals is a boolean, never a full profile row.
create or replace function public.is_handle_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    candidate ~* '^@[a-zA-Z0-9_]{3,20}$'
    and lower(substring(candidate from 2)) <> 'todos'
    and not exists (select 1 from public.profiles where handle_lower = lower(candidate));
$$;

grant execute on function public.is_handle_available(text) to anon, authenticated;

-- The rare race (two people claiming the same tag in the same instant)
-- still needs a real reserved-word/format guard at the DB layer, not just
-- the pre-check above — same as an ordinary TAG change (see below).
create or replace function public.enforce_handle_format()
returns trigger
language plpgsql
as $$
begin
  if new.handle is not null then
    if new.handle !~* '^@[a-zA-Z0-9_]{3,20}$' then
      raise exception 'invalid handle format';
    end if;
    if lower(substring(new.handle from 2)) = 'todos' then
      raise exception 'handle is reserved';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_handle_format
  before insert or update on public.profiles
  for each row execute function public.enforce_handle_format();
