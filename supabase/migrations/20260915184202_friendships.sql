-- friendships: composite PK (uid_a, uid_b) with uid_a < uid_b enforced by
-- CHECK — no synthetic pairId string to build/parse client-side, and no
-- denormalized "profiles" snapshot of name/avatar/handle: the app joins to
-- public_profiles live instead (see views migration). That live join is
-- strictly more correct than the old Firestore snapshot (no drift risk if a
-- background sync ever failed).

create table public.friendships (
  uid_a uuid not null references public.profiles (id) on delete cascade,
  uid_b uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null references public.profiles (id),
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (uid_a, uid_b),
  check (uid_a < uid_b),
  check (requested_by in (uid_a, uid_b))
);

create index friendships_uid_b_idx on public.friendships (uid_b);

alter table public.friendships enable row level security;
