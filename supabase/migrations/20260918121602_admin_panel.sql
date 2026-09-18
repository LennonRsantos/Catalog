-- Admin panel backend: role user/owner (renamed from user/admin — same
-- single-owner bootstrap-by-email model, just the external name the spec
-- asked for), account suspension, feedback triage, app-wide settings, and
-- an admin action log. is_admin() keeps its name (touching every RLS policy
-- that already calls it is unnecessary churn) but now means "is owner".

-- role: admin -> owner ------------------------------------------------------

alter table public.profiles drop constraint if exists profiles_role_check;

-- profiles_role_immutable (profiles.sql) blocks ALL role changes, including
-- this one-time admin->owner label rename. Rather than disabling that
-- trigger (even temporarily), teach it about exactly this one legacy
-- transition — narrow enough that it can never be used to grant elevated
-- access, since nothing ever sets role='admin' again after this migration
-- (the constraint below removes 'admin' from the allowed values entirely).
create or replace function public.enforce_role_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not (old.role = 'admin' and new.role = 'owner') then
    raise exception 'role cannot be changed after creation';
  end if;
  return new;
end;
$$;

update public.profiles set role = 'owner' where role = 'admin';

alter table public.profiles add constraint profiles_role_check check (role in ('owner', 'user'));

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
    case when public.is_admin_email(new.email) then 'owner' else 'user' end,
    coalesce(new.raw_user_meta_data ->> 'handle', public.generate_handle(coalesce(new.raw_user_meta_data ->> 'name', 'Usuario')))
  );
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  );
$$;

-- account suspension ---------------------------------------------------------

alter table public.profiles
  add column status text not null default 'active' check (status in ('active', 'suspended'));

-- profiles_update_own_or_admin (rls_policies.sql) already lets the owner
-- update any profile's non-role columns, so no new policy is needed for
-- suspend/reactivate — it's a plain UPDATE on `status` through that policy.

-- feedback triage -------------------------------------------------------------

alter table public.feedback_submissions
  add column status text not null default 'novo'
    check (status in ('novo', 'em_analise', 'respondido', 'resolvido', 'fechado')),
  add column admin_response text,
  add column responded_at timestamptz;

-- Owner-only: moderation actions (status/response), never the author.
create policy "feedback_update_admin"
  on public.feedback_submissions for update
  using (public.is_admin())
  with check (public.is_admin());

-- app settings ----------------------------------------------------------------
-- Single-row table (boolean PK forces exactly one row) for the handful of
-- global toggles the panel exposes. Maintenance mode and the signup toggle
-- are enforced client-side (checked before rendering the app / before
-- calling auth.signUp) — this app has no server middleware layer to gate
-- them at, unlike feedback_enabled below, which IS enforced in the DB.
create table public.app_settings (
  id boolean primary key default true check (id),
  signup_enabled boolean not null default true,
  maintenance_mode boolean not null default false,
  feedback_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (true);

alter table public.app_settings enable row level security;

create policy "app_settings_select_authenticated"
  on public.app_settings for select
  to authenticated
  using (true);

create policy "app_settings_update_admin"
  on public.app_settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- feedback_enabled is enforced here, not just in the UI: an insert while
-- the toggle is off is rejected at the database, not merely hidden client-side.
drop policy if exists "feedback_insert_own" on public.feedback_submissions;
create policy "feedback_insert_own"
  on public.feedback_submissions for insert
  with check (
    author_uid = auth.uid()
    and coalesce((select feedback_enabled from public.app_settings limit 1), true)
  );

-- admin action log ------------------------------------------------------------

create table public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  actor_uid uuid not null references auth.users (id) on delete cascade,
  action text not null,
  target_uid uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index admin_action_logs_created_idx on public.admin_action_logs (created_at desc);

alter table public.admin_action_logs enable row level security;

create policy "admin_action_logs_select_admin"
  on public.admin_action_logs for select
  using (public.is_admin());

create policy "admin_action_logs_insert_admin"
  on public.admin_action_logs for insert
  with check (public.is_admin() and actor_uid = auth.uid());
