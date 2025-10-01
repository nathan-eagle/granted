CREATE TABLE "Embedding" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "chunk" TEXT NOT NULL,
    "vector" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Embedding_projectId_idx" ON "Embedding"("projectId");
CREATE INDEX "Embedding_uploadId_idx" ON "Embedding"("uploadId");
