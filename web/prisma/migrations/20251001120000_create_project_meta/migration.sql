CREATE TABLE "ProjectMeta" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT,
    "dueDate" TIMESTAMP(3),
    "amountRequested" TEXT,
    "amountAwarded" TEXT,
    "funder" TEXT,
    "programs" TEXT,
    "submissionLinks" TEXT,
    CONSTRAINT "ProjectMeta_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectMeta_projectId_key" UNIQUE ("projectId"),
    CONSTRAINT "ProjectMeta_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
