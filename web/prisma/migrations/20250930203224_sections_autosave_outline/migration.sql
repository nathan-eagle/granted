/*
  Warnings:

  - Added the required column `updatedAt` to the `Section` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "contentHtml" TEXT,
ADD COLUMN     "contentJson" JSONB,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "wordCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill updatedAt for existing rows
UPDATE "Section" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

-- AlterTable
ALTER TABLE "Upload" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "SectionSource" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,

    CONSTRAINT "SectionSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SectionSource_sectionId_uploadId_key" ON "SectionSource"("sectionId", "uploadId");

-- AddForeignKey
ALTER TABLE "SectionSource" ADD CONSTRAINT "SectionSource_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSource" ADD CONSTRAINT "SectionSource_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
