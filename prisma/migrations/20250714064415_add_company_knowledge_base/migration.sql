-- CreateTable
CREATE TABLE "CompanyKnowledgeBase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "elevenLabsDocumentId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    CONSTRAINT "CompanyKnowledgeBase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompanyKnowledgeBase_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CompanyKnowledgeBase_companyId_idx" ON "CompanyKnowledgeBase"("companyId");

-- CreateIndex
CREATE INDEX "CompanyKnowledgeBase_elevenLabsDocumentId_idx" ON "CompanyKnowledgeBase"("elevenLabsDocumentId");

-- CreateIndex
CREATE INDEX "CompanyKnowledgeBase_createdBy_idx" ON "CompanyKnowledgeBase"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyKnowledgeBase_companyId_elevenLabsDocumentId_key" ON "CompanyKnowledgeBase"("companyId", "elevenLabsDocumentId");
