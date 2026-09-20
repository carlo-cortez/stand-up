-- Stand Up — cloud schema.
--
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Rounds are owned by the person who spoke them; row-level security is what
-- keeps them apart, which is why the anon key is safe in the browser.

create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,

  -- The round itself (handoff §6). Denormalised on purpose: topics may
  -- change or be generated later, and a past round should not change with them.
  started_at timestamptz not null,
  topic_id text not null,
  topic_text text not null,
  category text not null,
  difficulty text not null,
  prep_seconds integer not null,
  target_seconds integer not null,
  spoken_seconds integer not null,

  -- Storage path of the audio, or null once deleted or never recorded.
  recording_path text,
  audio_note text,

  ratings jsonb,
  note text,

  -- Sync: last writer wins by updated_at; deleted_at is a tombstone, so a
  -- delete on one device is not undone by an older copy on another.
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists sessions_user_updated_idx
  on public.sessions (user_id, updated_at desc);

alter table public.sessions enable row level security;

drop policy if exists "own rounds" on public.sessions;
create policy "own rounds" on public.sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Recordings live in their own private bucket, one folder per person.
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

drop policy if exists "own recordings" on storage.objects;
create policy "own recordings" on storage.objects
  for all
  using (bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]);
