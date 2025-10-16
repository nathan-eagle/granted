-- Plan15: discovered DoD storage + coverage provenance

create table if not exists rfp_discovered_dod (
  session_id        uuid primary key references sessions(id) on delete cascade,
  version           integer not null default 1,
  dod               jsonb   not null,
  sources_signature text    not null,
  vector_store_id   text    not null,
  files_json        jsonb   not null,
  model_id          text    not null,
  created_job_id    uuid    null references jobs(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists rfp_discovered_dod_sig_idx
  on rfp_discovered_dod (sources_signature);

create table if not exists rfp_discovered_dod_history (
  id                bigserial primary key,
  session_id        uuid not null references sessions(id) on delete cascade,
  version           integer not null,
  dod               jsonb   not null,
  sources_signature text    not null,
  vector_store_id   text    not null,
  files_json        jsonb   not null,
  model_id          text    not null,
  created_job_id    uuid    null references jobs(id),
  created_at        timestamptz default now()
);

create index if not exists rfp_discovered_dod_hist_sess_ver_idx
  on rfp_discovered_dod_history (session_id, version desc);

alter table if exists coverage_snapshots
  add column if not exists dod_version integer;
