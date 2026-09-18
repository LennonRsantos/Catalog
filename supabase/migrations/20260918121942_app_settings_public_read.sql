-- signup_enabled has to be checkable from the signup screen, which by
-- definition has no session yet — widen the read policy to `anon` too.
-- Still nothing sensitive in this row (3 booleans), so this is safe.
drop policy if exists "app_settings_select_authenticated" on public.app_settings;
create policy "app_settings_select_all"
  on public.app_settings for select
  using (true);
