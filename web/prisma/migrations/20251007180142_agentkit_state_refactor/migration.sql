-- DropForeignKey
ALTER TABLE "EventLog" DROP CONSTRAINT "EventLog_agentRunId_fkey";

-- DropForeignKey
ALTER TABLE "Requirement" DROP CONSTRAINT "Requirement_rfpId_fkey";

-- AlterTable
ALTER TABLE "AgentRun" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RFP" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Section" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "AgentWorkflowRun" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "input" JSONB,
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentWorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentWorkflowRunEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentWorkflowRunEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatKitSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "workflowId" TEXT NOT NULL,
    "clientSecretHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ChatKitSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentWorkflowRun_workflowId_idx" ON "AgentWorkflowRun"("workflowId");

-- CreateIndex
CREATE INDEX "AgentWorkflowRun_projectId_idx" ON "AgentWorkflowRun"("projectId");

-- CreateIndex
CREATE INDEX "AgentWorkflowRunEvent_runId_createdAt_idx" ON "AgentWorkflowRunEvent"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatKitSession_workflowId_idx" ON "ChatKitSession"("workflowId");

-- CreateIndex
CREATE INDEX "ChatKitSession_projectId_idx" ON "ChatKitSession"("projectId");

-- CreateIndex
CREATE INDEX "EventLog_agentRunId_idx" ON "EventLog"("agentRunId");

-- AddForeignKey
ALTER TABLE "AgentWorkflowRun" ADD CONSTRAINT "AgentWorkflowRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentWorkflowRunEvent" ADD CONSTRAINT "AgentWorkflowRunEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentWorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatKitSession" ADD CONSTRAINT "ChatKitSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_rfpId_fkey" FOREIGN KEY ("rfpId") REFERENCES "RFP"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
