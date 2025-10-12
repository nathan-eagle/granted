"use server";

import { getOpenAI } from "./openai";
import { getSupabaseAdmin } from "./supabase";

export interface VectorStoreHandle {
  sessionId: string;
  projectId: string;
  vectorStoreId: string;
}

declare global {
  var __vectorStoreCache: Map<string, string> | undefined;
}

const cache: Map<string, string> = globalThis.__vectorStoreCache ?? new Map();
if (!globalThis.__vectorStoreCache) {
  globalThis.__vectorStoreCache = cache;
}

export async function ensureVectorStore(sessionId: string): Promise<VectorStoreHandle> {
  const supabase = await getSupabaseAdmin();
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, project_id")
    .eq("id", sessionId)
    .single();
  if (sessionError || !session || !session.project_id) {
    throw sessionError ?? new Error(`Session ${sessionId} not found`);
  }

  const projectId = session.project_id as string;
  let vectorStoreId = cache.get(projectId);

  if (!vectorStoreId) {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("vector_store_id")
      .eq("id", projectId)
      .single();
    if (projectError) {
      throw projectError;
    }

    vectorStoreId = project?.vector_store_id ?? null;
    if (!vectorStoreId) {
      const client = getOpenAI();
      const created = await client.vectorStores.create({
        name: `granted-project-${projectId}`,
      });
      vectorStoreId = created.id;
      const { error: updateError } = await supabase
        .from("projects")
        .update({ vector_store_id: vectorStoreId })
        .eq("id", projectId);
      if (updateError) {
        throw updateError;
      }
    }

    cache.set(projectId, vectorStoreId);
  }

  return {
    sessionId,
    projectId,
    vectorStoreId,
  };
}

export async function attachFilesToVectorStore(sessionId: string, fileIds: string[]): Promise<VectorStoreHandle> {
  const handle = await ensureVectorStore(sessionId);
  if (fileIds.length === 0) {
    return handle;
  }

  const client = getOpenAI();
  await client.vectorStores.fileBatches.create(handle.vectorStoreId, {
    file_ids: fileIds,
  });

  return handle;
}

export async function teardownVectorStore(sessionId: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { data: session } = await supabase
    .from("sessions")
    .select("project_id")
    .eq("id", sessionId)
    .maybeSingle();

  const projectId = session?.project_id as string | undefined;
  if (!projectId) return;

  const vectorStoreId = cache.get(projectId);
  if (!vectorStoreId) return;

  cache.delete(projectId);
  try {
    const client = getOpenAI();
    await client.vectorStores.delete(vectorStoreId);
  } catch (error) {
    console.warn("Failed to delete vector store", error);
  }
}
