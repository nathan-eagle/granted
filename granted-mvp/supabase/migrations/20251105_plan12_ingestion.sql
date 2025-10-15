-- Plan12: structured fact ingestion tables

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'fact_event_kind' and n.nspname = 'public'
  ) then
    create type fact_event_kind as enum ('ingested','promoted','deprecated');
  end if;
end$$;

create table if not exists rfp_facts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions (id) on delete cascade,
  slot_id text not null,
  value_text text not null,
  value_json jsonb,
  confidence numeric(4,3) not null default 0.5,
  evidence_file_id text,
  evidence_page integer,
  evidence_snippet text,
  evidence_href text,
  evidence_offsets jsonb,
  hash text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (session_id, slot_id, hash)
);

create index if not exists rfp_facts_session_slot_idx on rfp_facts (session_id, slot_id);
create index if not exists rfp_facts_hash_idx on rfp_facts (hash);

create table if not exists rfp_facts_events (
  id bigserial primary key,
  fact_id uuid references rfp_facts (id) on delete cascade,
  session_id uuid references sessions (id) on delete cascade,
  kind fact_event_kind not null,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists rfp_facts_events_session_idx on rfp_facts_events (session_id, created_at desc);
create index if not exists rfp_facts_events_fact_idx on rfp_facts_events (fact_id, created_at desc);

