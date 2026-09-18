-- "Sugestões e Reporte de Bugs" — one table for both kinds (discriminated by
-- `kind`), since the two forms share title/description/priority and only
-- differ in a few kind-specific optional columns. Submissions are
-- write-once from the client: no update/delete policy, matching how the
-- rest of this app treats append-only logs.
create table public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  author_uid uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('suggestion', 'bug')),
  title text not null,
  description text not null,
  category text,
  priority text,
  steps_to_reproduce text,
  expected_behavior text,
  actual_behavior text,
  attachment_path text,
  created_at timestamptz not null default now()
);

create index feedback_submissions_author_idx on public.feedback_submissions (author_uid, created_at desc);

alter table public.feedback_submissions enable row level security;

create policy "feedback_select_own_or_admin"
  on public.feedback_submissions for select
  using (author_uid = auth.uid() or public.is_admin());

create policy "feedback_insert_own"
  on public.feedback_submissions for insert
  with check (author_uid = auth.uid());

-- Attachments bucket: private (bug screenshots aren't meant to be publicly
-- browsable), owner can write their own, owner or admin can read — same
-- ownership-by-path-prefix convention as avatars/covers.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-attachments', 'feedback-attachments', false, 5242880, array['image/*', 'application/pdf', 'text/plain'])
on conflict (id) do nothing;

create policy "feedback_attachments_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'feedback-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "feedback_attachments_owner_or_admin_read"
  on storage.objects for select
  using (
    bucket_id = 'feedback-attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
