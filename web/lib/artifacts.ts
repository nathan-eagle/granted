import { createSupabaseServerClient } from "./supabaseServer"

export async function uploadArtifact(
  runId: string,
  filename: string,
  bytes: Uint8Array,
  contentType = "application/octet-stream"
): Promise<string | null> {
  const supabase = createSupabaseServerClient()
  if (!supabase) {
    console.warn("uploadArtifact skipped: Supabase credentials missing")
    return null
  }

  const path = `artifacts/runs/${runId}/${Date.now()}_${filename}`
  const { error } = await supabase.storage
    .from("uploads")
    .upload(path, bytes, { contentType, upsert: false })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from("uploads").getPublicUrl(path)
  return data?.publicUrl ?? null
}
