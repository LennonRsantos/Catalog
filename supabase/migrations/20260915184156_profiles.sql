-- profiles: one row per auth.users, created automatically on signup by
-- handle_new_user() below (never inserted directly by the client — this is
-- what makes signup atomic: a failed insert here fails the whole signup,
-- no more orphaned Auth account like the old Firestore rollback dance).
--
-- No separate "publicProfiles" collection and no "handles" reservation
-- table: findability/uniqueness are handled by the public_profiles view
-- (see 20260915184217_views.sql) and a case-insensitive UNIQUE index below.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  favorite_genre_ids integer[] not null default '{}',
  role text not null default 'user' check (role in ('admin', 'user')),
  avatar_url text,
  cover_url text,
  birthdate date,
  handle text,
  profile_visibility text not null default 'friends'
    check (profile_visibility in ('public', 'friends', 'private')),
  feed_visibility text not null default 'friends'
    check (feed_visibility in ('public', 'friends', 'private')),
  auto_share_on_watched boolean not null default false,
  name_lower text generated always as (lower(name)) stored,
  handle_lower text generated always as (lower(handle)) stored,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness ("@Abc" and "@abc" can't both exist) — this
-- single index IS the TAG-reservation mechanism; no transaction needed
-- (see change_handle in 20260915184220_rls_policies.sql).
create unique index profiles_handle_lower_key on public.profiles (handle_lower)
  where handle is not null;

-- text_pattern_ops so `WHERE name_lower LIKE $1 || '%'` can actually use the
-- index (a plain btree on a non-C-collation column can't serve prefix scans).
create index profiles_name_lower_prefix_idx on public.profiles (name_lower text_pattern_ops);
create index profiles_handle_lower_prefix_idx on public.profiles (handle_lower text_pattern_ops);

alter table public.profiles enable row level security;

-- Single source of truth for the admin bootstrap email (was duplicated in
-- firestore.rules AND useAuth.ts before). Change this one value if the
-- admin account ever changes.
create or replace function public.is_admin_email(email text)
returns boolean
language sql
immutable
as $$
  select email = 'lennonreis619@gmail.com';
$$;

-- Generates a stable handle like "@L7nnoca" for a new signup, mirroring the
-- old client-side generateHandle() — first letter of the name + 6 random
-- base36 chars. Not checked for uniqueness here: collisions are astronomically
-- unlikely at this app's scale, matching the original reasoning; the unique
-- index above still protects correctness if one ever happens (insert just
-- fails and the trigger errors, same as any other constraint violation).
create or replace function public.generate_handle(display_name text)
returns text
language plpgsql
volatile
as $$
declare
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  first_letter text := upper(coalesce(nullif(substring(regexp_replace(display_name, '[^a-zA-Z]', '', 'g') from 1 for 1), ''), 'U'));
  suffix text := '';
begin
  for i in 1..6 loop
    suffix := suffix || substring(chars from (floor(random() * length(chars)) + 1)::int for 1);
  end loop;
  return '@' || first_letter || suffix;
end;
$$;

-- Creates the profiles row the moment someone signs up (email/password or
-- Google) — replaces the old client-side ensureProfile() dance entirely.
-- role is only ever 'admin' for the hardcoded bootstrap email, decided here
-- server-side (never trusted from client input, same guarantee the old
-- Firestore create-rule gave).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    case when public.is_admin_email(new.email) then 'admin' else 'user' end,
    coalesce(new.raw_user_meta_data ->> 'handle', public.generate_handle(coalesce(new.raw_user_meta_data ->> 'name', 'Usuario')))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- role is immutable after creation (no self-promotion) — a BEFORE UPDATE
-- trigger is the correct tool here, not a WITH CHECK clause, since RLS
-- policies can't cleanly compare NEW against OLD.
create or replace function public.enforce_role_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed after creation';
  end if;
  return new;
end;
$$;

create trigger profiles_role_immutable
  before update on public.profiles
  for each row execute function public.enforce_role_immutable();
