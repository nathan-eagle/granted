# CLI Notes for Granted Agents

## Supabase CLI
- **Required secrets**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, and the `SUPABASE_DB_URL` that now includes the Postgres password (`postgresql://postgres:ZZ81BiLxnlCDrXhm@db.rziggkbirlabvnvdcnkc.supabase.co:5432/postgres`).
- **Login**: run `supabase login` and paste a personal access token (`sbp_…`) from Supabase → Account Settings. This is still manual; without it the CLI returns “Access token not provided”.
- **Link project**: `supabase link --project-ref rziggkbirlabvnvdcnkc --password ZZ81BiLxnlCDrXhm`.
- **Run SQL**: once linked, use either
  - `supabase db remote run --file path/to/migration.sql`, or
  - `supabase db remote execute --sql 'select 1;'` (CLI v2.51+).
- **Direct psql fallback**: `psql "postgresql://postgres:ZZ81BiLxnlCDrXhm@db.rziggkbirlabvnvdcnkc.supabase.co:5432/postgres?sslmode=require" -c 'select 1;'`.

## Vercel CLI
- Auth token is stored in `~/Library/Application Support/com.vercel.cli/auth.json` (currently `OEX4bVjd5JEyIiUKp0VlhPWm`).
- **Bypass protected deployments**: export `VERCEL_AUTOMATION_BYPASS_SECRET=nfDHeJ87lsexj350wjwLOOsevIifcH3c`.
- **Examples**:
  - Tail logs: `VERCEL_AUTOMATION_BYPASS_SECRET=… vercel logs dpl_4sfhNCNwJ65CMozh8495jex2QnPk --scope nathans-projects-7ebab953 --token OEX4bVjd5JEyIiUKp0VlhPWm`.
  - Inspect envs: `vercel env ls`.

## Secrets
- Local `.env.local` inside `granted-mvp/` contains the same values; keep it in sync with Vercel when keys rotate.
- Vercel environments (Development/Preview/Production) now include:
  - `SUPABASE_DB_URL=postgresql://postgres:ZZ81BiLxnlCDrXhm@db.rziggkbirlabvnvdcnkc.supabase.co:5432/postgres`
  - `SUPABASE_JWT_SECRET=345bb4bb-64f8-4b4a-9d64-fefb067076e4`
  - `VERCEL_AUTOMATION_BYPASS_SECRET=nfDHeJ87lsexj350wjwLOOsevIifcH3c`
