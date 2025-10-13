"use server";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("SUPABASE_URL is not set");
  }
  return url;
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return key;
}

export async function getSupabaseAdmin(): Promise<SupabaseClient> {
  if (adminClient) {
    return adminClient;
  }

  adminClient = createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { persistSession: false },
    db: { schema: "public" },
  });

  return adminClient;
}

export type DbSession = {
  id: string;
  project_id: string | null;
  agent_thread_id: string | null;
  status: string | null;
  created_at: string;
};

export type DbProject = {
  id: string;
  name: string;
  visibility: string;
  vector_store_id: string | null;
  created_at: string;
  updated_at: string;
  owner_id: string | null;
};

export type DbMessageRow = {
  id: number;
  session_id: string;
  role: string;
  content: string;
  run_id: string | null;
  envelope: Record<string, unknown> | null;
  created_at: string;
};

export type DbSourceRow = {
  id: string;
  session_id: string;
  label: string;
  kind: "file" | "url";
  href: string | null;
  openai_file_id: string | null;
  content_hash: string | null;
  created_at: string;
};

export type DbDraftRow = {
  id: number;
  session_id: string;
  section_id: string;
  markdown: string | null;
  updated_at: string;
};

export type DbCoverageSnapshotRow = {
  id: number;
  session_id: string;
  score: number;
  summary: string | null;
  slots: unknown;
  created_at: string;
};

export type DbTightenSnapshotRow = {
  id: number;
  session_id: string;
  within_limit: boolean;
  word_estimate: number | null;
  page_estimate: number | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type DbProvenanceRow = {
  id: number;
  session_id: string;
  total_paragraphs: number;
  paragraphs_with_provenance: number;
  payload: Record<string, unknown>;
  created_at: string;
};

export type DbAppUser = {
  id: string;
  email: string | null;
  created_at: string;
};

export type DbJobRow = {
  id: string;
  session_id: string;
  kind: string;
  status: string;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};
