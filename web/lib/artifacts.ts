import { createSupabaseServerClient } from "./supabaseServer"
import { createCipheriv, createHash, randomBytes } from "crypto"

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

  const keyMaterial = process.env.ARTIFACT_ENCRYPTION_KEY
  let payload = bytes
  let metadata: Record<string, unknown> | undefined

  if (keyMaterial) {
    const key = createHash("sha256").update(keyMaterial).digest()
    const iv = randomBytes(12)
    const cipher = createCipheriv("aes-256-gcm", key, iv)
    const encrypted = Buffer.concat([cipher.update(Buffer.from(bytes)), cipher.final()])
    const tag = cipher.getAuthTag()
    payload = Buffer.concat([iv, tag, encrypted])
    metadata = { encrypted: true }
  }

  const path = `artifacts/runs/${runId}/${Date.now()}_${filename}`
  const { error } = await supabase.storage
    .from("uploads")
    .upload(path, payload, { contentType, upsert: false, metadata })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from("uploads").getPublicUrl(path)
  return data?.publicUrl ?? null
}
