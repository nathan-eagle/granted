-- AlterTable
ALTER TABLE "AgentWorkflowRun" ADD COLUMN     "agentSessionId" TEXT,
ADD COLUMN     "metrics" JSONB;

-- CreateIndex
CREATE INDEX "AgentWorkflowRun_agentSessionId_idx" ON "AgentWorkflowRun"("agentSessionId");

-- AddForeignKey
ALTER TABLE "AgentWorkflowRun" ADD CONSTRAINT "AgentWorkflowRun_agentSessionId_fkey" FOREIGN KEY ("agentSessionId") REFERENCES "AgentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
