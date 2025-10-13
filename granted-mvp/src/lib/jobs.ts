"use server";

import { getSupabaseAdmin, type DbJobRow } from "@/lib/supabase";

type JobKind = "normalize" | "autodraft" | "tighten" | "ingest_url" | "ingest_file";

export async function enqueueJob(sessionId: string, kind: JobKind, payload: Record<string, unknown> = {}): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("jobs")
    .select("id")
    .eq("session_id", sessionId)
    .eq("kind", kind)
    .in("status", ["queued", "running"])
    .limit(1);

  if (existing && existing.length > 0) {
    return;
  }

  const { error } = await supabase.from("jobs").insert({
    session_id: sessionId,
    kind,
    payload,
  });
  if (error) {
    console.error("Failed to enqueue job", error);
  }
}

export async function claimNextJob(sessionId?: string): Promise<DbJobRow | null> {
  const supabase = await getSupabaseAdmin();
  let query = supabase
    .from("jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data: candidate } = await query.maybeSingle();
  if (!candidate) {
    return null;
  }

  const { data, error } = await supabase
    .from("jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
    })
    .eq("id", candidate.id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return data as DbJobRow;
}

export async function completeJob(
  jobId: string,
  status: "done" | "error" | "canceled",
  result?: Record<string, unknown> | null,
  errorMessage?: string | null,
): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase
    .from("jobs")
    .update({
      status,
      result: result ?? null,
      error_message: errorMessage ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    console.error("Failed to complete job", error);
  }
}
