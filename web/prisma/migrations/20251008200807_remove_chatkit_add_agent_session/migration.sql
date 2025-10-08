/*
  Warnings:

  - You are about to drop the `ChatKitSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatKitSession" DROP CONSTRAINT "ChatKitSession_projectId_fkey";

-- DropTable
DROP TABLE "ChatKitSession";

-- CreateTable
CREATE TABLE "AgentSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "agentRunId" TEXT,
    "memoryId" TEXT,
    "transcriptJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentSession_projectId_idx" ON "AgentSession"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentSession_agentRunId_key" ON "AgentSession"("agentRunId");

-- AddForeignKey
ALTER TABLE "AgentSession" ADD CONSTRAINT "AgentSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
