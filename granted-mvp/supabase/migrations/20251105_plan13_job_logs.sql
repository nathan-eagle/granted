-- Plan13: job logs and fact provenance enhancements

alter table if exists rfp_facts
  add column if not exists source text not null default 'ingested';

alter table if exists rfp_facts
  add column if not exists annotations jsonb;

create table if not exists job_logs (
  id bigserial primary key,
  job_id uuid references jobs(id) on delete cascade,
  level text not null default 'info',
  message text not null,
  details jsonb,
  created_at timestamptz default now()
);

create index if not exists job_logs_job_idx on job_logs (job_id, created_at desc);
create index if not exists job_logs_level_idx on job_logs (level);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sources' and column_name = 'metadata'
  ) then
    alter table public.sources add column metadata jsonb;
  end if;
end$$;
