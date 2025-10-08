-- ux2-agentkit rev3: extend project + section + upload metadata

ALTER TABLE "Project"
  ADD COLUMN "coverageJson" JSONB,
  ADD COLUMN "rfpNormJson" JSONB,
  ADD COLUMN "rfpBundleMeta" JSONB,
  ADD COLUMN "conflictLogJson" JSONB,
  ADD COLUMN "eligibilityJson" JSONB,
  ADD COLUMN "sloJson" JSONB;

ALTER TABLE "Section"
  ADD COLUMN "formatLimits" JSONB;

ALTER TABLE "Upload"
  ADD COLUMN "kindDetail" TEXT;
