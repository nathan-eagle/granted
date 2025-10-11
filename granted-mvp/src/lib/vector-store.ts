import { openai } from "./openai";

export interface VectorStoreHandle {
  sessionId: string;
  vectorStoreId: string;
}

declare global {
  var __vectorStoreCache: Map<string, VectorStoreHandle> | undefined;
}

const cache: Map<string, VectorStoreHandle> = globalThis.__vectorStoreCache ?? new Map();
if (!globalThis.__vectorStoreCache) {
  globalThis.__vectorStoreCache = cache;
}

export async function ensureVectorStore(sessionId: string): Promise<VectorStoreHandle> {
  const cached = cache.get(sessionId);
  if (cached) {
    return cached;
  }

  const created = await openai.vectorStores.create({
    name: `granted-session-${sessionId}`,
  });

  const handle: VectorStoreHandle = {
    sessionId,
    vectorStoreId: created.id,
  };
  cache.set(sessionId, handle);
  return handle;
}

export async function attachFilesToVectorStore(sessionId: string, fileIds: string[]): Promise<VectorStoreHandle> {
  const handle = await ensureVectorStore(sessionId);
  if (fileIds.length === 0) {
    return handle;
  }

  await openai.vectorStores.fileBatches.create(handle.vectorStoreId, {
    file_ids: fileIds,
  });

  return handle;
}

export async function teardownVectorStore(sessionId: string): Promise<void> {
  const handle = cache.get(sessionId);
  if (!handle) return;
  cache.delete(sessionId);
  try {
    await openai.vectorStores.delete(handle.vectorStoreId);
  } catch (error) {
    console.warn("Failed to delete vector store", error);
  }
}
