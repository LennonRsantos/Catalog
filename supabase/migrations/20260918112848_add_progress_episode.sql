-- Companion to progress_season/progress_minutes/progress_seconds — tracks
-- which episode of the current season the "Assistindo" item is on.
alter table public.catalog_items
  add column progress_episode integer;
