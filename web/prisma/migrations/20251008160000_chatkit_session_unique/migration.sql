-- Ensure ChatKit sessions are unique per project/workflow pair
CREATE UNIQUE INDEX IF NOT EXISTS "ChatKitSession_projectId_workflowId_key" ON "ChatKitSession"("projectId", "workflowId");
