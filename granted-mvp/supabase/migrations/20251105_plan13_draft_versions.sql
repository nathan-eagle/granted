-- Plan13: section draft version history

create table if not exists section_draft_versions (
  id bigserial primary key,
  session_id uuid references sessions (id) on delete cascade,
  section_id text not null,
  markdown text not null,
  created_at timestamptz default now()
);

create index if not exists section_draft_versions_session_idx
  on section_draft_versions (session_id, section_id, created_at desc);

