-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('UNREVIEWED', 'REVIEWED', 'IGNORED', 'CONFIRMED');

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "documentId" TEXT,
    "page" INTEGER,
    "severity" "FindingSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Finding_processId_status_severity_idx" ON "Finding"("processId", "status", "severity");

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
