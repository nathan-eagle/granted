-- Add agentSessionId linkage from Project to AgentSession
ALTER TABLE "Project" ADD COLUMN "agentSessionId" TEXT;

-- Ensure uniqueness so one project maps to at most one primary session
CREATE UNIQUE INDEX "Project_agentSessionId_key" ON "Project"("agentSessionId");

-- Establish foreign key to AgentSession
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_agentSessionId_fkey"
  FOREIGN KEY ("agentSessionId")
  REFERENCES "AgentSession"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
