-- Granted MVP Supabase schema (Plan 11)

create extension if not exists "pgcrypto";

-- Profiles mirror Supabase auth users
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  created_at timestamptz default now()
);

create type project_visibility as enum ('private', 'shared');

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles (id) on delete set null,
  name text not null default 'Untitled project',
  visibility project_visibility not null default 'private',
  vector_store_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists projects_owner_idx on projects (owner_id, updated_at desc);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects (id) on delete cascade,
  agent_thread_id text,
  status text not null default 'active',
  created_at timestamptz default now()
);

create type msg_role as enum ('user','assistant','system');

create table if not exists messages (
  id bigserial primary key,
  session_id uuid references sessions (id) on delete cascade,
  role msg_role not null,
  content text not null,
  run_id text,
  envelope jsonb,
  created_at timestamptz default now()
);

create index if not exists messages_session_created_idx on messages (session_id, created_at);

create type source_kind as enum ('file','url');

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions (id) on delete cascade,
  label text not null,
  href text,
  openai_file_id text,
  kind source_kind not null,
  content_hash text,
  created_at timestamptz default now(),
  unique (session_id, coalesce(href, openai_file_id))
);

create index if not exists sources_session_idx on sources (session_id);

create table if not exists coverage_snapshots (
  id bigserial primary key,
  session_id uuid references sessions (id) on delete cascade,
  score numeric,
  summary text,
  slots jsonb not null,
  created_at timestamptz default now()
);

create index if not exists coverage_snapshots_session_idx on coverage_snapshots (session_id, created_at desc);

create type section_status as enum ('missing','partial','complete');

create table if not exists section_drafts (
  id bigserial primary key,
  session_id uuid references sessions (id) on delete cascade,
  section_id text not null,
  status section_status not null default 'missing',
  markdown text,
  updated_at timestamptz default now(),
  unique (session_id, section_id)
);

create table if not exists tighten_snapshots (
  id bigserial primary key,
  session_id uuid references sessions (id) on delete cascade,
  within_limit boolean not null,
  word_estimate integer,
  page_estimate numeric,
  payload jsonb not null,
  created_at timestamptz default now()
);

create table if not exists provenance_snapshots (
  id bigserial primary key,
  session_id uuid references sessions (id) on delete cascade,
  total_paragraphs integer not null,
  paragraphs_with_provenance integer not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

create type job_kind as enum ('normalize','autodraft','tighten','ingest_url','ingest_file');
create type job_status as enum ('queued','running','done','error','canceled');

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions (id) on delete cascade,
  kind job_kind not null,
  status job_status not null default 'queued',
  payload jsonb,
  result jsonb,
  error_message text,
  created_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists jobs_session_status_idx on jobs (session_id, status, created_at);

create or replace function touch_project_for_session(target_session_id uuid)
returns void
language plpgsql
as $$
declare
  project_uuid uuid;
begin
  select project_id into project_uuid from sessions where id = target_session_id;
  if project_uuid is null then
    return;
  end if;
  update projects set updated_at = now() where id = project_uuid;
end;
$$;
