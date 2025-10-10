-- CreateTable
CREATE TABLE "AgentKnowledgeBase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "vectorStoreId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentKnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentKnowledgeBaseFile" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "uploadId" TEXT,
    "vectorFileId" TEXT,
    "connectorId" TEXT,
    "source" TEXT NOT NULL,
    "version" TEXT,
    "releasedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentKnowledgeBaseFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentConflictLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "previous" JSONB,
    "next" JSONB,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConflictLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentKnowledgeBase_vectorStoreId_idx" ON "AgentKnowledgeBase"("vectorStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentKnowledgeBase_projectId_key" ON "AgentKnowledgeBase"("projectId");

-- CreateIndex
CREATE INDEX "AgentKnowledgeBaseFile_knowledgeBaseId_idx" ON "AgentKnowledgeBaseFile"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "AgentKnowledgeBaseFile_uploadId_idx" ON "AgentKnowledgeBaseFile"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentKnowledgeBaseFile_knowledgeBaseId_uploadId_key" ON "AgentKnowledgeBaseFile"("knowledgeBaseId", "uploadId");

-- CreateIndex
CREATE INDEX "AgentConflictLog_projectId_status_idx" ON "AgentConflictLog"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentConflictLog_projectId_key_key" ON "AgentConflictLog"("projectId", "key");

-- AddForeignKey
ALTER TABLE "AgentKnowledgeBase" ADD CONSTRAINT "AgentKnowledgeBase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentKnowledgeBaseFile" ADD CONSTRAINT "AgentKnowledgeBaseFile_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "AgentKnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentKnowledgeBaseFile" ADD CONSTRAINT "AgentKnowledgeBaseFile_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConflictLog" ADD CONSTRAINT "AgentConflictLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
