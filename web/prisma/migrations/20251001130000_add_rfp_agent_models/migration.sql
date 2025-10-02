CREATE TABLE "RFP" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "oppNumber" TEXT,
    "title" TEXT,
    "agency" TEXT,
    "postedDate" TIMESTAMP(3),
    "closeDate" TIMESTAMP(3),
    "synopsis" TEXT,
    "raw" JSONB,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RFP_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "rfpId" TEXT NOT NULL,
    "key" TEXT,
    "title" TEXT NOT NULL,
    "targetWords" INTEGER,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "instructions" TEXT,
    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Requirement_rfpId_fkey" FOREIGN KEY ("rfpId") REFERENCES "RFP"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "rfpId" TEXT,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "steps" JSONB,
    "scores" JSONB,
    "docxUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EventLog_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
