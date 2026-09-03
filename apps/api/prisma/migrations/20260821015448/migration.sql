-- CreateTable
CREATE TABLE "ProcessSummary" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "analyzedDocumentCount" INTEGER NOT NULL DEFAULT 0,
    "pendingDocumentCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessSummary_processId_key" ON "ProcessSummary"("processId");

-- AddForeignKey
ALTER TABLE "ProcessSummary" ADD CONSTRAINT "ProcessSummary_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
