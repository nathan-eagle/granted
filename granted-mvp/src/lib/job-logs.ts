"use server";

import { getSupabaseAdmin } from "@/lib/supabase";

export type JobLogLevel = "info" | "warn" | "error";

export async function logJob(
  jobId: string,
  level: JobLogLevel,
  message: string,
  details?: Record<string, unknown> | null,
): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const payload = {
    job_id: jobId,
    level,
    message,
    details: details ?? null,
  };
  const { error } = await supabase.from("job_logs").insert(payload);
  if (error) {
    console.error("[job_logs] failed to insert", { error, payload });
  }
}

