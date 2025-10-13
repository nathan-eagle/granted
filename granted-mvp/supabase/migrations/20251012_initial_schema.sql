-- Granted MVP Supabase schema

create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique,
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled project',
  rfp_url text,
  vector_store_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table projects
  add column if not exists owner_id uuid references app_users(id) on delete set null;

create index if not exists projects_owner_idx on projects (owner_id, updated_at desc);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  agent_id text,
  agent_thread_id text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists messages (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool','system')),
  content text not null,
  envelope jsonb,
  created_at timestamptz default now()
);

create table if not exists sources (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('file','url')),
  href text,
  openai_file_id text not null,
  created_at timestamptz default now()
);

create unique index if not exists sources_session_file_unique on sources (session_id, openai_file_id);

create table if not exists drafts (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  section_id text not null,
  markdown text not null default '',
  updated_at timestamptz default now(),
  unique (session_id, section_id)
);

create table if not exists coverage_snapshots (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  score numeric not null,
  summary text,
  payload jsonb not null,
  created_at timestamptz default now()
);

create table if not exists tighten_snapshots (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  within_limit boolean not null,
  word_estimate integer,
  page_estimate numeric,
  payload jsonb not null,
  created_at timestamptz default now()
);

create table if not exists provenance_snapshots (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  total_paragraphs integer not null,
  paragraphs_with_provenance integer not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

create index if not exists messages_session_id_created_at_idx on messages (session_id, created_at);
create index if not exists sources_session_id_idx on sources (session_id);
create index if not exists coverage_snapshots_session_id_idx on coverage_snapshots (session_id, created_at desc);
create index if not exists tighten_snapshots_session_id_idx on tighten_snapshots (session_id, created_at desc);
create index if not exists provenance_snapshots_session_id_idx on provenance_snapshots (session_id, created_at desc);

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
